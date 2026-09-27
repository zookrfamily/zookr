// Zookr worker - the rounds engine.
//
// Runs once per invocation (every ten minutes from CI) and is idempotent:
// everything it learned lives in data/state.json, so a rerun never
// double-allocates, double-converts or double-pays.
//
//   launches  read Launched events off the Zookr launchpad; every token gets
//             its own ledger, vault and reward pool.
//   ledger    per token, pull Transfer logs since the last seen block and keep
//             lots {amount, at} per wallet. Sells consume the newest lots first.
//             Contracts (curve, vault, LP) are never holders.
//   fees      per token, read what its vault can collect (curve + escrow +
//             balance). Past the minimum, the operator collects, quotes a
//             swap on NEAR Intents (RH Chain ETH -> native ZEC to the pool's
//             transparent address) and sweeps the ETH to the deposit address.
//             When the swap reports success, 90% of the ZEC is credited to the
//             token's pool and 10% to the platform-token pool.
//   wallet    sync the shielded pool wallet, shield whatever landed on the
//             transparent address, read spendable and deposits.
//   rounds    every ten-minute boundary since the token launched, a pool's
//             uncredited-to-holders ZEC is split pro-rata across wallets whose
//             tokens were held through the previous round. Allocations are final.
//   payouts   registered wallets with accrued >= minimum are paid in one
//             batched shielded transaction. The txid is the receipt.
//   publish   data/public.json - everything the site needs, no secrets.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { createPublicClient, createWalletClient, http, parseAbiItem, formatUnits, formatEther, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ------------------------------------------------------------------ config
const env = (k, d) => process.env[k] ?? d;
const RPC = env("RPC_URL", "https://rpc.mainnet.chain.robinhood.com");
const ZINGO = env("ZINGO_BIN", "zingo-cli");
const WALLET_DIR = env("WALLET_DIR", "./wallet");
const SEED = env("ZCASH_SEED");
const BIRTHDAY = env("ZCASH_BIRTHDAY");
const SERVER = env("LIGHTWALLETD", "https://zec.rocks:443");
const DATA = env("DATA_DIR", "./data");
const DRY = env("DRY_RUN", "0") === "1";
const OPERATOR_KEY = env("OPERATOR_KEY");
const CFG = JSON.parse(readFileSync(new URL("./config.json", import.meta.url), "utf8"));
const ROUND = CFG.roundSeconds;
const SUPPLY = BigInt(CFG.supply);

const chain = { id: 4663, name: "RH Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const transport = http(RPC, { timeout: 60_000, retryCount: 6, retryDelay: 4_000 });
const client = createPublicClient({ chain, transport });
const operator = OPERATOR_KEY ? privateKeyToAccount(OPERATOR_KEY) : null;
const wallet = operator ? createWalletClient({ chain, transport, account: operator }) : null;

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const REGISTERED = parseAbiItem("event Registered(address indexed wallet, string zcashAddress)");
const LAUNCHED = parseAbiItem("event Launched(address indexed token, address indexed curve, address indexed vault, address creator, string name, string symbol, uint256 initialBuy)");
const vaultAbi = [
  { type: "function", name: "collectable", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimedTotal", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "sweptTotal", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "sweep", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
];
const padAbi = [{ type: "function", name: "collect", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }];
const curveAbi = [
  { type: "function", name: "getReserves", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }, { type: "uint256" }] },
  { type: "function", name: "graduated", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
];

// ------------------------------------------------------------------- state
mkdirSync(DATA, { recursive: true });
const STATE = `${DATA}/state.json`;
const revive = (k, v) => (typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v);
const fresh = () => ({ v: 2, launches: { lastBlock: CFG.launchpadFromBlock - 1 }, tokens: {}, platform: { creditedZat: 0n, allocatedZat: 0n, lastRound: 0, rounds: 0 },
  registry: { lastBlock: 0, dest: {} }, accrued: {}, paid: {}, payments: [], conversions: [], pool: { balanceZat: 0, deposits: [], address: "", taddress: "", transparentZat: 0 } });
let state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8"), revive) : fresh();
if (state.v !== 2) { console.log("[state] old schema, starting the v2 ledger fresh"); state = fresh(); }
const save = () => writeFileSync(STATE, JSON.stringify(state, (k, v) => (typeof v === "bigint" ? `${v}n` : v), 1));
const big = (x) => (typeof x === "bigint" ? x : BigInt(x ?? 0));

// ---------------------------------------------------------------- launches
async function discoverLaunches() {
  if (!CFG.launchpad) return;
  const head = Number(await client.getBlockNumber()) - 2;
  for (let from = state.launches.lastBlock + 1; from <= head; from += 20_000) {
    const to = Math.min(from + 19_999, head);
    const logs = await client.getLogs({ address: CFG.launchpad, event: LAUNCHED, fromBlock: BigInt(from), toBlock: BigInt(to) });
    for (const l of logs) {
      const t = l.args.token.toLowerCase();
      if (state.tokens[t]) continue;
      const b = await client.getBlock({ blockNumber: l.blockNumber });
      const meta = await tokenMeta(t); // metadata lives on the Pons token itself
      state.tokens[t] = { token: t, symbol: l.args.symbol, name: l.args.name, curve: l.args.curve.toLowerCase(), vault: l.args.vault.toLowerCase(), creator: l.args.creator.toLowerCase(),
        launchedAt: Number(b.timestamp), launchBlock: Number(l.blockNumber), lastBlock: Number(l.blockNumber) - 1, lots: {}, contracts: {}, blockTimes: {},
        lastRound: 0, rounds: 0, creditedZat: 0n, allocatedZat: 0n, feesEthCollected: 0n, feesEthConverted: 0n, graduated: false, mcapUsd: 0, ...meta };
      console.log(`[launches] ${l.args.symbol} ${t} launched at block ${l.blockNumber}`);
    }
    state.launches.lastBlock = to;
  }
  // tokens launched on Pons directly, adopted with a vault of their own (config.tokens)
  for (const m of CFG.tokens ?? []) {
    const t = m.token.toLowerCase();
    if (state.tokens[t]) continue;
    const pons = await client.readContract({ address: CFG.factory, abi: ponsAbi, functionName: "getLaunchedToken", args: [t] });
    const b = await client.getBlock({ blockNumber: BigInt(m.fromBlock) });
    const meta = await tokenMeta(t);
    const ercName = (n) => client.readContract({ address: t, abi: [{ type: "function", name: n, stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }], functionName: n });
    state.tokens[t] = { token: t, symbol: await ercName("symbol"), name: await ercName("name"), curve: pons.curve.toLowerCase(), vault: m.vault.toLowerCase(), creator: pons.deployer.toLowerCase(), adopted: true,
      launchedAt: Number(b.timestamp), launchBlock: m.fromBlock, lastBlock: m.fromBlock - 1, lots: {}, contracts: {}, blockTimes: {},
      lastRound: 0, rounds: 0, creditedZat: 0n, allocatedZat: 0n, feesEthCollected: 0n, feesEthConverted: 0n, graduated: false, mcapUsd: 0, ...meta };
    console.log(`[launches] adopted ${state.tokens[t].symbol} ${t} from block ${m.fromBlock}`);
  }
  save();
}
const ponsAbi = [{ type: "function", name: "getLaunchedToken", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "tuple", components: [{ name: "token", type: "address" }, { name: "curve", type: "address" }, { name: "deployer", type: "address" }, { name: "creatorFeeRecipient", type: "address" }, { name: "pairToken", type: "address" }, { name: "graduationThreshold", type: "uint256" }, { name: "poolFee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "creatorTaxBps", type: "uint16" }, { name: "phase", type: "uint8" }] }] }];
async function tokenMeta(t) {
  const meta = { logo: "", description: "", socials: {} };
  try {
    const rd = (name, outputs) => client.readContract({ address: t, abi: [{ type: "function", name, stateMutability: "view", inputs: [], outputs }], functionName: name });
    meta.logo = await rd("logo", [{ type: "string" }]); meta.description = await rd("description", [{ type: "string" }]);
    const s = await rd("socials", [{ type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }]);
    meta.socials = { twitter: s[0], telegram: s[1], discord: s[2], website: s[3], farcaster: s[4] };
  } catch (e) { console.warn(`[launches] ${t} metadata:`, e.message.split("\n")[0]); }
  if (meta.logo.length > 400_000) meta.logo = ""; // ponytail: a 2 MB data URL would bloat public.json; link logos are unaffected
  if (meta.logo.startsWith("ipfs://")) meta.logo = `https://ipfs.io/ipfs/${meta.logo.slice(7)}`;
  return meta;
}

// ------------------------------------------------------------------ ledger
async function blockTime(ts, n) {
  if (ts.blockTimes[n]) return ts.blockTimes[n];
  const b = await client.getBlock({ blockNumber: BigInt(n) });
  ts.blockTimes[n] = Number(b.timestamp);
  return ts.blockTimes[n];
}
async function pullTransfers(ts) {
  const head = Number(await client.getBlockNumber()) - 2;
  const skip = new Set([ts.token, ts.curve, ts.vault, "0x0000000000000000000000000000000000000000"]);
  for (let from = ts.lastBlock + 1; from <= head; from += 20_000) {
    const to = Math.min(from + 19_999, head);
    const logs = await client.getLogs({ address: ts.token, event: TRANSFER, fromBlock: BigInt(from), toBlock: BigInt(to) });
    logs.sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex);
    for (const l of logs) {
      const at = await blockTime(ts, Number(l.blockNumber));
      const s = l.args.from.toLowerCase(), d = l.args.to.toLowerCase(), value = l.args.value;
      if (!skip.has(s)) {
        let left = value; const lots = ts.lots[s] ?? [];
        while (left > 0n && lots.length) { const top = lots[lots.length - 1]; if (top.amount <= left) { left -= top.amount; lots.pop(); } else { top.amount -= left; left = 0n; } }
        ts.lots[s] = lots;
      }
      if (!skip.has(d)) (ts.lots[d] ??= []).push({ amount: value, at });
    }
    ts.lastBlock = to;
    if (logs.length) console.log(`[ledger] ${ts.symbol} blocks ${from}-${to}: ${logs.length} transfers`);
  }
  if (Object.keys(ts.blockTimes).length > 5000) ts.blockTimes = {};
  for (const w of Object.keys(ts.lots)) {
    if (w in ts.contracts) continue;
    const code = await client.getCode({ address: w }).catch(() => "0x");
    ts.contracts[w] = !!code && code !== "0x";
  }
  save();
}
const isHolder = (ts, w) => !ts.contracts?.[w];

// ---------------------------------------------------------------- registry
async function pullRegistry() {
  if (!CFG.registry) return;
  const head = Number(await client.getBlockNumber()) - 2;
  const r = state.registry;
  for (let from = (r.lastBlock || CFG.registryFromBlock || head - 1) + 1; from <= head; from += 20_000) {
    const to = Math.min(from + 19_999, head);
    const logs = await client.getLogs({ address: CFG.registry, event: REGISTERED, fromBlock: BigInt(from), toBlock: BigInt(to) });
    for (const l of logs) r.dest[l.args.wallet.toLowerCase()] = l.args.zcashAddress;
    r.lastBlock = to;
  }
  save();
}

// ------------------------------------------------------------------ market
let ethUsd = 0;
async function readMarket() {
  try { const t = await (await fetch("https://1click.chaindefuser.com/v0/tokens")).json(); ethUsd = Number(t.find((x) => x.assetId === "nep141:hood.omft.near")?.price ?? 0); } catch { /* keep 0 */ }
  for (const ts of Object.values(state.tokens)) {
    try {
      ts.graduated = await client.readContract({ address: ts.curve, abi: curveAbi, functionName: "graduated" });
      if (!ts.graduated) {
        const [q, t] = await client.readContract({ address: ts.curve, abi: curveAbi, functionName: "getReserves" });
        // price in ETH per token = quoteReserve / tokenReserve; market cap = price * supply
        ts.mcapUsd = t > 0n ? Number(formatEther((q * SUPPLY) / t)) * ethUsd : 0;
      }
    } catch (e) { console.warn(`[market] ${ts.symbol}:`, e.message.split("\n")[0]); }
  }
}

// -------------------------------------------------------------------- fees
async function quoteToPool(wei) {
  const body = { dry: false, swapType: "EXACT_INPUT", slippageTolerance: 100, originAsset: "nep141:hood.omft.near", depositType: "ORIGIN_CHAIN", destinationAsset: "nep141:zec.omft.near",
    amount: wei.toString(), refundTo: operator.address, refundType: "ORIGIN_CHAIN", recipient: state.pool.taddress, recipientType: "DESTINATION_CHAIN", deadline: new Date(Date.now() + 30 * 60_000).toISOString() };
  const r = await fetch("https://1click.chaindefuser.com/v0/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`1click quote ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return (await r.json()).quote;
}
async function collectFees() {
  if (!operator || !wallet || !state.pool.taddress || DRY) return console.log("[fees] skipped (no operator key, no pool t-address, or dry run)");
  const min = BigInt(CFG.convertMinWei);
  for (const ts of Object.values(state.tokens)) {
    let collectable = 0n;
    try { collectable = await client.readContract({ address: ts.vault, abi: vaultAbi, functionName: "collectable" }); } catch (e) { console.warn(`[fees] ${ts.symbol} collectable:`, e.message.split("\n")[0]); continue; }
    ts.feesEthPending = collectable;
    if (collectable < min) continue;
    try {
      // 1. sweep the curve + claim the escrow into the vault (adopted tokens are unknown to the launchpad, so hit the vault directly)
      const h1 = ts.adopted
        ? await wallet.sendTransaction({ to: ts.vault, data: encodeFunctionData({ abi: [{ type: "function", name: "collect", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] }], functionName: "collect" }) })
        : await wallet.sendTransaction({ to: CFG.launchpad, data: encodeFunctionData({ abi: padAbi, functionName: "collect", args: [ts.token] }) });
      await client.waitForTransactionReceipt({ hash: h1 });
      const bal = await client.getBalance({ address: ts.vault });
      if (bal < min) continue;
      // 2. quote ETH -> native ZEC to the pool's transparent address, 3. sweep to the deposit address
      const q = await quoteToPool(bal);
      const h2 = await wallet.sendTransaction({ to: ts.vault, data: encodeFunctionData({ abi: vaultAbi, functionName: "sweep", args: [q.depositAddress, bal] }) });
      await client.waitForTransactionReceipt({ hash: h2 });
      ts.feesEthCollected = big(ts.feesEthCollected) + bal;
      state.conversions.push({ token: ts.token, symbol: ts.symbol, wei: bal, depositAddress: q.depositAddress, expectZec: q.amountOutFormatted, status: "PENDING", txs: [h1, h2], at: new Date().toISOString(), zat: 0 });
      console.log(`[fees] ${ts.symbol}: ${formatEther(bal)} ETH -> ~${q.amountOutFormatted} ZEC via ${q.depositAddress}`);
    } catch (e) { console.error(`[fees] ${ts.symbol}:`, e.message.split("\n")[0]); }
    save();
  }
}
async function settleConversions() {
  for (const c of state.conversions) {
    if (c.status !== "PENDING" && c.status !== "PROCESSING" && c.status !== "PENDING_DEPOSIT") continue;
    try {
      const s = await (await fetch(`https://1click.chaindefuser.com/v0/status?depositAddress=${c.depositAddress}`)).json();
      c.status = s.status ?? c.status;
      if (s.status === "SUCCESS") {
        const zat = Math.round(Number(s.swapDetails?.amountOutFormatted ?? c.expectZec ?? 0) * 1e8);
        c.zat = zat; c.zcashTx = s.swapDetails?.destinationChainTxHashes?.[0]?.hash ?? "";
        const ts = state.tokens[c.token];
        const holders = BigInt(Math.floor((zat * CFG.holderShareBps) / 10_000)), platform = BigInt(zat) - holders;
        ts.creditedZat = big(ts.creditedZat) + holders; ts.feesEthConverted = big(ts.feesEthConverted) + big(c.wei);
        state.platform.creditedZat = big(state.platform.creditedZat) + platform;
        console.log(`[fees] ${c.symbol}: swap done, ${zat / 1e8} ZEC -> holders ${Number(holders) / 1e8}, platform ${Number(platform) / 1e8}`);
      } else if (s.status === "REFUNDED" || s.status === "FAILED") {
        const ts = state.tokens[c.token]; ts.feesEthCollected = big(ts.feesEthCollected) - big(c.wei);
        console.warn(`[fees] ${c.symbol}: swap ${s.status}, ETH back with the operator`);
      }
    } catch (e) { console.warn("[fees] status:", e.message.split("\n")[0]); }
  }
  save();
}

// ------------------------------------------------------------------ wallet
class Zingo {
  constructor() {
    const args = ["--data-dir", WALLET_DIR, "--server", SERVER, "--remember-online"];
    if (!existsSync(`${WALLET_DIR}/zingo-wallet.dat`) && SEED) args.push("--seed", SEED, ...(BIRTHDAY ? ["--birthday", BIRTHDAY] : []));
    this.p = spawn(ZINGO, args, { stdio: ["pipe", "pipe", "pipe"] });
    this.buf = ""; this.err = "";
    this.p.stdout.on("data", (d) => { this.buf += d; });
    this.p.stderr.on("data", (d) => { this.err += d; });
    this.exited = new Promise((res) => this.p.on("exit", res));
  }
  async cmd(line, timeoutMs = 180_000) {
    const start = this.buf.length;
    this.p.stdin.write(`${line}\nheight\n`);
    const t0 = Date.now();
    for (;;) {
      const chunk = this.buf.slice(start);
      const m = chunk.match(/\{\s*"height"\s*:\s*(\d+)\s*\}\s*$/);
      if (m) { const raw = chunk.slice(0, m.index).trim(); this.height = Number(m[1]); try { return raw ? JSON.parse(raw) : null; } catch { return raw; } }
      if (Date.now() - t0 > timeoutMs) throw new Error(`${line.split(" ")[0]}: no answer in ${timeoutMs / 1000}s\n${this.err.slice(-400)}`);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  async synced(maxMs = 12 * 60_000) {
    const t0 = Date.now(); let last = "";
    for (;;) {
      const s = await this.cmd("sync status", 60_000);
      const ranges = s?.scan_ranges ?? [];
      const done = ranges.length > 0 && ranges.every((r) => r.priority === "Scanned") && Number(s.percentage_total_blocks_scanned) >= 100;
      const line = `${s?.total_blocks_scanned ?? 0} blocks, ${s?.percentage_total_blocks_scanned ?? 0}%`;
      if (line !== last) { console.log(`[wallet] sync ${line}`); last = line; }
      if (done) return s;
      if (Date.now() - t0 > maxMs) throw new Error(`sync did not finish: ${line}`);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  async quit() {
    try { this.p.stdin.write("quit\n"); } catch { /* gone */ }
    await Promise.race([this.exited, new Promise((r) => setTimeout(r, 15_000))]);
    if (this.p.exitCode === null) this.p.kill();
  }
}
async function readPool(z) {
  const addrs = await z.cmd("addresses");
  const first = Array.isArray(addrs) ? addrs[0] : addrs;
  const ua = typeof first === "string" ? first : (first?.encoded_address ?? first?.address ?? "");
  if (typeof ua === "string" && ua.startsWith("u1")) state.pool.address = ua;
  let tas = await z.cmd("t_addresses"); let tlist = Array.isArray(tas) ? tas : (tas?.t_addresses ?? []);
  if (!tlist.length) { await z.cmd("new_taddress"); tas = await z.cmd("t_addresses"); tlist = Array.isArray(tas) ? tas : (tas?.t_addresses ?? []); }
  const t0 = tlist[0]; const ta = typeof t0 === "string" ? t0 : (t0?.encoded_address ?? t0?.address ?? "");
  if (typeof ta === "string" && ta.startsWith("t1")) state.pool.taddress = ta;
  const balText = String(await z.cmd("balance") ?? "");
  const pick = (k) => Number((balText.match(new RegExp(`(?<![a-z_])${k}:\\s*(\\d+)`)) ?? [])[1] ?? 0);
  const tconf = pick("confirmed_transparent_balance");
  console.log(`[pool] balances: orchard ${pick("total_orchard_balance") / 1e8} ironwood ${pick("total_ironwood_balance") / 1e8} transparent ${tconf / 1e8} (+${pick("unconfirmed_transparent_balance") / 1e8} unconfirmed)`);
  if (tconf > 0 && !DRY) {
    try { const r = await z.cmd("quickshield", 10 * 60_000); console.log(`[pool] shield: ${JSON.stringify(r).slice(0, 200)}`); }
    catch (e) { console.warn("[pool] shield failed:", e.message.split("\n").slice(0, 2).join(" | ")); }
  }
  const bal = await z.cmd("spendable_balance");
  state.pool.balanceZat = Number(bal?.spendable_balance ?? 0);
  state.pool.transparentZat = tconf;
  const vts = await z.cmd("value_transfers");
  const list = Array.isArray(vts) ? vts : (vts?.value_transfers ?? []);
  if (list.length && !state.pool.sampleLogged) { console.log("[pool] value_transfers sample:", JSON.stringify(list[0]).slice(0, 400)); state.pool.sampleLogged = true; }
  const seen = new Set(state.pool.deposits.map((d) => d.txid));
  for (const v of list) {
    const kind = (v.kind ?? v.type ?? v.direction ?? "").toString().toLowerCase();
    if (!/receiv|incoming|\bin\b/.test(kind) || seen.has(v.txid)) continue;
    state.pool.deposits.push({ txid: v.txid, zat: Number(v.value ?? v.amount ?? 0), at: v.datetime ?? v.timestamp ?? null, memo: v.memos?.[0] ?? v.memo ?? "" });
  }
  save();
  console.log(`[pool] ${state.pool.address.slice(0, 14)}… height ${z.height} spendable ${(state.pool.balanceZat / 1e8).toFixed(6)} ZEC, ${state.pool.deposits.length} deposits`);
}

// ------------------------------------------------------------------ rounds
const owedZat = () => Object.values(state.accrued).reduce((s, v) => s + big(v), 0n);
/** Split `amount` across wallets whose lots were held through the previous round. */
function allocate(ts, prevBoundary, amount, label) {
  const eligible = []; let total = 0n;
  for (const [w, lots] of Object.entries(ts.lots)) {
    if (!isHolder(ts, w)) continue;
    const amt = lots.filter((l) => l.at < prevBoundary).reduce((s, l) => s + l.amount, 0n);
    if (amt > 0n) { eligible.push([w, amt]); total += amt; }
  }
  if (total === 0n || amount <= 0n) return 0n;
  let given = 0n;
  for (const [w, amt] of eligible) { const zat = (amount * amt) / total; if (zat > 0n) { state.accrued[w] = big(state.accrued[w]) + zat; given += zat; } }
  console.log(`[rounds] ${label}: ${Number(given) / 1e8} ZEC across ${eligible.length} wallets`);
  return given;
}
function processRounds(nowSec) {
  const spendable = BigInt(state.pool.balanceZat);
  // ZEC in the pool that no token owns (operator deposits, dust) belongs to the platform-token holders
  const pt = CFG.platformToken && state.tokens[CFG.platformToken.toLowerCase()];
  if (pt && spendable > 0n) {
    const reserved = owedZat() + Object.values(state.tokens).reduce((s, t) => s + big(t.creditedZat) - big(t.allocatedZat), 0n) + big(state.platform.creditedZat) - big(state.platform.allocatedZat);
    const free = spendable - reserved - 20_000n; // keep a fee margin behind
    if (free > 0n) { state.platform.creditedZat = big(state.platform.creditedZat) + free; console.log(`[rounds] ${Number(free) / 1e8} ZEC unassigned in the pool -> credited to ${pt.symbol} holders`); }
  }
  for (const ts of Object.values(state.tokens)) {
    let boundary = ts.lastRound ? ts.lastRound + ROUND : ts.launchedAt + ROUND;
    while (boundary <= nowSec) {
      const distributable = big(ts.creditedZat) - big(ts.allocatedZat);
      // only allocate what the shielded pool can actually cover right now
      const cover = spendable - owedZat();
      const amount = distributable < cover ? distributable : (cover > 0n ? cover : 0n);
      if (amount > 0n) ts.allocatedZat = big(ts.allocatedZat) + allocate(ts, boundary - ROUND, amount, ts.symbol);
      ts.lastRound = boundary; ts.rounds++; boundary += ROUND;
    }
  }
  if (pt) {
    const p = state.platform;
    let boundary = p.lastRound ? p.lastRound + ROUND : pt.launchedAt + ROUND;
    while (boundary <= nowSec) {
      const distributable = big(p.creditedZat) - big(p.allocatedZat);
      const cover = spendable - owedZat();
      const amount = distributable < cover ? distributable : (cover > 0n ? cover : 0n);
      if (amount > 0n) p.allocatedZat = big(p.allocatedZat) + allocate(pt, boundary - ROUND, amount, `platform/${pt.symbol}`);
      p.lastRound = boundary; p.rounds++; boundary += ROUND;
    }
  }
  save();
}

// ----------------------------------------------------------------- payouts
async function payouts(z) {
  const due = Object.entries(state.accrued).map(([w, zat]) => [w, big(zat)]).filter(([w, zat]) => zat >= BigInt(CFG.minPayoutZat) && state.registry.dest[w]);
  if (!due.length) return console.log("[payouts] nothing due");
  const batch = due.slice(0, 25);
  const total = batch.reduce((s, [, z]) => s + z, 0n);
  if (Number(total) + 100_000 > state.pool.balanceZat) return console.warn(`[payouts] pool short: owes ${Number(total) / 1e8} ZEC, has ${state.pool.balanceZat / 1e8}`);
  const recipients = batch.map(([w, zat]) => ({ address: state.registry.dest[w], amount: Number(zat), memo: `zookr reward ${w.slice(0, 10)}` }));
  if (DRY) return console.log("[payouts] DRY", JSON.stringify(recipients));
  const r = await z.cmd(`quicksend ${JSON.stringify(recipients)}`, 10 * 60_000);
  const txid = r?.txids?.[0] ?? (typeof r === "string" ? r.slice(0, 80) : "");
  if (!txid || /error/i.test(txid)) throw new Error(`quicksend answered: ${JSON.stringify(r).slice(0, 300)}`);
  const at = new Date().toISOString();
  for (const [w, zat] of batch) { state.payments.push({ wallet: w, to: state.registry.dest[w], zat: Number(zat), txid, at }); state.paid[w] = (state.paid[w] ?? 0) + Number(zat); state.accrued[w] = 0n; }
  save();
  console.log(`[payouts] ${batch.length} holders, ${Number(total) / 1e8} ZEC, txid ${txid}`);
}

// ----------------------------------------------------------------- publish
function publish() {
  const tokens = Object.values(state.tokens).map((ts) => {
    const holders = Object.entries(ts.lots).filter(([w]) => isHolder(ts, w)).map(([w, lots]) => {
      const bal = lots.reduce((s, l) => s + l.amount, 0n);
      const held = lots.filter((l) => l.at < ts.lastRound).reduce((s, l) => s + l.amount, 0n);
      return { w, bal, eligible: held };
    }).filter((h) => h.bal > 0n);
    // ZEC paid to this token's holders: payments are per wallet across pools, so attribute by allocation share
    return {
      token: ts.token, symbol: ts.symbol, name: ts.name, curve: ts.curve, vault: ts.vault, creator: ts.creator, launchedAt: ts.launchedAt, logo: ts.logo ?? "", description: ts.description ?? "", socials: ts.socials ?? {},
      venue: ts.graduated ? "uniswap" : "curve", mcapUsd: ts.mcapUsd ?? 0,
      feesEthPending: formatEther(big(ts.feesEthPending)), feesEthCollected: formatEther(big(ts.feesEthCollected)), feesEthConverted: formatEther(big(ts.feesEthConverted)),
      creditedZat: Number(big(ts.creditedZat)), allocatedZat: Number(big(ts.allocatedZat)),
      rounds: ts.rounds, lastRound: ts.lastRound, nextRound: (ts.lastRound || ts.launchedAt) + ROUND,
      holders: holders.length, eligibleHolders: holders.filter((h) => h.eligible > 0n).length,
      wallets: Object.fromEntries(holders.map((h) => [h.w, { balance: formatUnits(h.bal, 18), eligible: formatUnits(h.eligible, 18) }])),
    };
  }).sort((a, b) => b.launchedAt - a.launchedAt);
  const out = {
    generatedAt: new Date().toISOString(), roundSeconds: ROUND, minPayoutZat: CFG.minPayoutZat, registry: CFG.registry, launchpad: CFG.launchpad, platformToken: CFG.platformToken, holderShareBps: CFG.holderShareBps, ethUsd,
    pool: { address: state.pool.address, taddress: state.pool.taddress, transparentZat: state.pool.transparentZat, balanceZat: state.pool.balanceZat, depositedZat: state.pool.deposits.reduce((s, d) => s + d.zat, 0), deposits: state.pool.deposits.slice(-50), owedZat: Number(owedZat()) },
    platform: { creditedZat: Number(big(state.platform.creditedZat)), allocatedZat: Number(big(state.platform.allocatedZat)), rounds: state.platform.rounds },
    tokens,
    conversions: state.conversions.slice(-100).map((c) => ({ ...c, wei: formatEther(big(c.wei)) })),
    accrued: Object.fromEntries(Object.entries(state.accrued).map(([w, z]) => [w, Number(big(z))])),
    paid: state.paid, payments: state.payments.slice(-500), registered: Object.keys(state.registry.dest).length, registeredWallets: Object.keys(state.registry.dest),
    totals: { paidZat: state.payments.reduce((s, x) => s + x.zat, 0), payments: state.payments.length, tokens: tokens.length, feesEthCollected: formatEther(Object.values(state.tokens).reduce((s, t) => s + big(t.feesEthCollected), 0n)), platformPaidZat: Number(big(state.platform.allocatedZat)) },
  };
  writeFileSync(`${DATA}/public.json`, JSON.stringify(out, null, 1));
  console.log(`[publish] ${tokens.length} token(s), ${out.totals.payments} payments, ${(out.totals.paidZat / 1e8).toFixed(6)} ZEC paid`);
}

// -------------------------------------------------------------------- main
const cmd = process.argv[2] ?? "round";
const now = Math.floor(Date.now() / 1000);
try {
  await discoverLaunches();
  for (const ts of Object.values(state.tokens)) await pullTransfers(ts);
  await pullRegistry();
  await readMarket();
} catch (e) { console.error("[chain] read failed, continuing with last state:", e.message.split("\n")[0]); }
let z = null;
if (SEED && !DRY && cmd !== "dry") {
  try { z = new Zingo(); await z.synced(); await readPool(z); }
  catch (e) { console.warn("[pool] unavailable:", e.message.split("\n").slice(0, 3).join(" | ")); if (z) { await z.quit(); z = null; } }
} else console.log("[pool] skipped (no seed or dry run)");
try { await settleConversions(); await collectFees(); } catch (e) { console.error("[fees]", e.message.split("\n")[0]); }
processRounds(now);
if (z) { try { await payouts(z); } catch (e) { console.error("[payouts]", e.message.split("\n").slice(0, 3).join(" | ")); } await z.quit(); }
publish();
