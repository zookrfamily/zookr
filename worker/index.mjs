// Zookr worker - the rounds engine.
//
// Runs once per invocation (GitHub Actions calls it every ten minutes) and is
// idempotent: everything it learned lives in data/state.json, so a rerun never
// double-allocates or double-pays.
//
//   ledger   pull Transfer logs for each pool token since the last seen block
//            and keep, per wallet, a list of lots {amount, at}. Sells consume
//            the newest lots first, as on Z Bridge.
//   rounds   for every ten-minute boundary that has passed since the last
//            processed one: a lot qualifies if it was acquired before the
//            previous boundary (a new buy skips one round). Each qualifying
//            wallet gets emissionPerRound × its share. Allocations are final
//            the moment the round is processed.
//   pool     read the wallet: balance, incoming value transfers (deposits).
//   payouts  registered wallets (ZecRegistry on-chain) with accrued >= minimum
//            are paid in one batched shielded transaction via zingo-cli
//            quicksend. Txids are recorded against each payment.
//   publish  write data/public.json - everything the site needs, no secrets.
//
// What this is not: a contract. The pool is a shielded Zcash wallet the
// operator holds; the registry is the only on-chain part. That is the trade
// for paying real, private ZEC.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";

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
const CFG = JSON.parse(readFileSync(new URL("./pools.json", import.meta.url), "utf8"));
const ROUND = CFG.roundSeconds;

const client = createPublicClient({ transport: http(RPC, { timeout: 60_000, retryCount: 3 }) });
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const REGISTERED = parseAbiItem("event Registered(address indexed wallet, string zcashAddress)");

// ------------------------------------------------------------------- state
mkdirSync(DATA, { recursive: true });
const STATE = `${DATA}/state.json`;
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8"), (k, v) => (typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v))
  : { pools: {}, registry: { lastBlock: 0, dest: {} }, accrued: {}, payments: [], paid: {}, pool: { balanceZat: 0, deposits: [], address: "" } };
const save = () => writeFileSync(STATE, JSON.stringify(state, (k, v) => (typeof v === "bigint" ? `${v}n` : v), 1));
const poolState = (p) => (state.pools[p.id] ??= { lastBlock: p.fromBlock - 1, lots: {}, lastRound: 0, rounds: 0, allocatedZat: 0, blockTimes: {} });

// ------------------------------------------------------------------ ledger
const CHUNK = 20_000;
async function blockTime(ps, n) {
  if (ps.blockTimes[n]) return ps.blockTimes[n];
  const b = await client.getBlock({ blockNumber: BigInt(n) });
  ps.blockTimes[n] = Number(b.timestamp);
  return ps.blockTimes[n];
}
async function pullTransfers(p) {
  const ps = poolState(p);
  const head = Number(await client.getBlockNumber()) - 2;
  const exclude = new Set([p.token.toLowerCase(), "0x0000000000000000000000000000000000000000", ...(p.exclude ?? []).map((a) => a.toLowerCase())]);
  for (let from = ps.lastBlock + 1; from <= head; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, head);
    const logs = await client.getLogs({ address: p.token, event: TRANSFER, fromBlock: BigInt(from), toBlock: BigInt(to) });
    logs.sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex);
    for (const l of logs) {
      const at = await blockTime(ps, Number(l.blockNumber));
      const { from: src, to: dst, value } = l.args;
      const s = src.toLowerCase(), d = dst.toLowerCase();
      // sells and transfers out: newest lots go first
      if (!exclude.has(s)) {
        let left = value; const lots = ps.lots[s] ?? [];
        while (left > 0n && lots.length) { const top = lots[lots.length - 1]; if (top.amount <= left) { left -= top.amount; lots.pop(); } else { top.amount -= left; left = 0n; } }
        ps.lots[s] = lots;
      }
      if (!exclude.has(d)) (ps.lots[d] ??= []).push({ amount: value, at });
    }
    ps.lastBlock = to;
    console.log(`[ledger] ${p.symbol} blocks ${from}-${to}: ${logs.length} transfers`);
  }
  // drop the block-time cache once it is big; it only helps within a pull
  if (Object.keys(ps.blockTimes).length > 5000) ps.blockTimes = {};
  save();
}

// Contracts - LP pools, routers, vaults - hold tokens but are not holders.
// Checked once per address and remembered.
async function markContracts(p) {
  const ps = poolState(p); ps.contracts ??= {};
  for (const w of Object.keys(ps.lots)) {
    if (w in ps.contracts) continue;
    const code = await client.getCode({ address: w }).catch(() => "0x");
    ps.contracts[w] = !!code && code !== "0x";
  }
  save();
}
const isHolder = (ps, w) => !ps.contracts?.[w];

// ------------------------------------------------------------------ rounds
const perRoundZat = (p) => Math.floor((p.emissionZatPerDay * ROUND) / 86400);
function processRounds(p, nowSec) {
  const ps = poolState(p);
  const start = Math.floor(new Date(p.startsAt).getTime() / 1000);
  const end = p.endsAt ? Math.floor(new Date(p.endsAt).getTime() / 1000) : Infinity;
  const minHold = BigInt(p.minHold ?? "0") * 10n ** BigInt(p.decimals);
  // rounds are the boundaries start + k*ROUND; a round can be processed once
  // the chain data covers it (we only use lots acquired before the previous boundary)
  let boundary = ps.lastRound ? ps.lastRound + ROUND : start + ROUND;
  let n = 0;
  while (boundary <= nowSec && boundary <= end) {
    const prev = boundary - ROUND;
    const eligible = [];
    let total = 0n;
    for (const [w, lots] of Object.entries(ps.lots)) {
      if (!isHolder(ps, w)) continue;
      const amt = lots.filter((l) => l.at < prev).reduce((s, l) => s + l.amount, 0n);
      if (amt >= minHold && amt > 0n) { eligible.push([w, amt]); total += amt; }
    }
    const emission = BigInt(perRoundZat(p));
    // a round only allocates what the pool can actually cover
    const funded = !DRY && state.pool.balanceZat - owedZat() >= Number(emission);
    if (total > 0n && funded) {
      let given = 0n;
      for (const [w, amt] of eligible) {
        const zat = (emission * amt) / total;
        if (zat > 0n) { state.accrued[w] = (state.accrued[w] ?? 0n) + zat; given += zat; }
      }
      ps.allocatedZat = Number(BigInt(ps.allocatedZat) + given);
    }
    ps.lastRound = boundary; ps.rounds++; n++;
    boundary += ROUND;
  }
  if (n) console.log(`[rounds] ${p.symbol}: ${n} round(s) processed, next at ${new Date((ps.lastRound + ROUND) * 1000).toISOString()}`);
  save();
}
// unpaid allocations across all wallets - what the pool still owes
const owedZat = () => Number(Object.values(state.accrued).reduce((s, v) => s + BigInt(v), 0n));

// ---------------------------------------------------------------- registry
async function pullRegistry() {
  if (!CFG.registry) return;
  const head = Number(await client.getBlockNumber()) - 2;
  const r = state.registry;
  for (let from = (r.lastBlock || CFG.registryFromBlock || head - 1) + 1; from <= head; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, head);
    const logs = await client.getLogs({ address: CFG.registry, event: REGISTERED, fromBlock: BigInt(from), toBlock: BigInt(to) });
    for (const l of logs) r.dest[l.args.wallet.toLowerCase()] = l.args.zcashAddress;
    r.lastBlock = to;
  }
  save();
}

// ------------------------------------------------------------------ wallet
function zingo(cmd, ...args) {
  const base = ["--data-dir", WALLET_DIR, "--server", SERVER, "--online"];
  if (!existsSync(`${WALLET_DIR}/zingo-wallet.dat`) && SEED) base.push("--seed", SEED, ...(BIRTHDAY ? ["--birthday", BIRTHDAY] : []));
  const out = execFileSync(ZINGO, [...base, "--waitsync", cmd, ...args], { encoding: "utf8", maxBuffer: 64 << 20, timeout: 20 * 60_000 });
  // zingo prints logs before the JSON result; take the last JSON block
  const m = out.match(/[\{\[][\s\S]*[\}\]]\s*$/);
  return m ? JSON.parse(m[0]) : out.trim();
}
function readPool() {
  const addrs = zingo("addresses");
  const ua = Array.isArray(addrs) ? (addrs[0]?.address ?? addrs[0]?.unified ?? addrs[0]) : addrs;
  if (typeof ua === "string") state.pool.address = ua;
  const bal = zingo("spendable_balance");
  state.pool.balanceZat = Number(bal.spendable_balance ?? bal);
  // deposits: incoming value transfers, deduplicated by txid
  let vts = [];
  try { vts = zingo("value_transfers"); } catch (e) { console.warn("[pool] value_transfers:", e.message.split("\n")[0]); }
  const list = Array.isArray(vts) ? vts : (vts.value_transfers ?? []);
  const seen = new Set(state.pool.deposits.map((d) => d.txid));
  for (const v of list) {
    const kind = (v.kind ?? v.type ?? "").toString().toLowerCase();
    if (!/received|incoming/.test(kind) || seen.has(v.txid)) continue;
    state.pool.deposits.push({ txid: v.txid, zat: Number(v.value ?? v.amount ?? 0), at: v.datetime ?? v.timestamp ?? null, memo: v.memos?.[0] ?? v.memo ?? "" });
  }
  save();
  console.log(`[pool] ${state.pool.address.slice(0, 12)}… spendable ${(state.pool.balanceZat / 1e8).toFixed(6)} ZEC, ${state.pool.deposits.length} deposits`);
}

// ----------------------------------------------------------------- payouts
function payouts() {
  const due = Object.entries(state.accrued)
    .map(([w, zat]) => [w, BigInt(zat)])
    .filter(([w, zat]) => zat >= BigInt(CFG.minPayoutZat) && state.registry.dest[w]);
  if (!due.length) return console.log("[payouts] nothing due");
  // cap the batch so one transaction stays small; the rest goes next run
  const batch = due.slice(0, 25);
  const total = batch.reduce((s, [, z]) => s + z, 0n);
  if (Number(total) + 100_000 > state.pool.balanceZat) return console.warn(`[payouts] pool short: owes ${Number(total) / 1e8} ZEC, has ${state.pool.balanceZat / 1e8}`);
  const recipients = batch.map(([w, zat]) => ({ address: state.registry.dest[w], amount: Number(zat), memo: `zookr reward ${w.slice(0, 10)}` }));
  if (DRY) return console.log("[payouts] DRY", JSON.stringify(recipients));
  const r = zingo("quicksend", JSON.stringify(recipients));
  const txid = r.txids?.[0] ?? String(r);
  const at = new Date().toISOString();
  for (const [w, zat] of batch) {
    state.payments.push({ wallet: w, to: state.registry.dest[w], zat: Number(zat), txid, at });
    state.paid[w] = (state.paid[w] ?? 0) + Number(zat);
    state.accrued[w] = 0n;
  }
  save();
  console.log(`[payouts] ${batch.length} holders, ${Number(total) / 1e8} ZEC, txid ${txid}`);
}

// ----------------------------------------------------------------- publish
function publish() {
  const pools = CFG.pools.map((p) => {
    const ps = poolState(p);
    const minHold = BigInt(p.minHold ?? "0") * 10n ** BigInt(p.decimals);
    // eligible mirrors the round rule exactly: held through the previous round, and at least minHold
    const holders = Object.entries(ps.lots).filter(([w]) => isHolder(ps, w)).map(([w, lots]) => {
      const bal = lots.reduce((s, l) => s + l.amount, 0n);
      const held = lots.filter((l) => l.at < ps.lastRound).reduce((s, l) => s + l.amount, 0n);
      return { w, bal, eligible: held >= minHold ? held : 0n };
    }).filter((h) => h.bal > 0n);
    return {
      id: p.id, token: p.token, symbol: p.symbol, name: p.name, decimals: p.decimals,
      emissionZatPerDay: p.emissionZatPerDay, perRoundZat: perRoundZat(p), startsAt: p.startsAt, endsAt: p.endsAt, minHold: p.minHold ?? "0",
      rounds: ps.rounds, lastRound: ps.lastRound, nextRound: (ps.lastRound || Math.floor(new Date(p.startsAt).getTime() / 1000)) + ROUND,
      allocatedZat: ps.allocatedZat, holders: holders.length, eligibleHolders: holders.filter((h) => h.eligible > 0n).length,
      lastBlock: ps.lastBlock,
      wallets: Object.fromEntries(holders.map((h) => [h.w, { balance: formatUnits(h.bal, p.decimals), eligible: formatUnits(h.eligible, p.decimals) }])),
    };
  });
  const out = {
    generatedAt: new Date().toISOString(), roundSeconds: ROUND, minPayoutZat: CFG.minPayoutZat, registry: CFG.registry,
    pool: { address: state.pool.address, balanceZat: state.pool.balanceZat, depositedZat: state.pool.deposits.reduce((s, d) => s + d.zat, 0), deposits: state.pool.deposits.slice(-50), owedZat: owedZat() },
    pools,
    accrued: Object.fromEntries(Object.entries(state.accrued).map(([w, z]) => [w, Number(z)])),
    paid: state.paid, payments: state.payments.slice(-500), registered: Object.keys(state.registry.dest).length,
    registeredWallets: Object.keys(state.registry.dest),
    totals: { paidZat: state.payments.reduce((s, x) => s + x.zat, 0), payments: state.payments.length },
  };
  writeFileSync(`${DATA}/public.json`, JSON.stringify(out, null, 1));
  console.log(`[publish] ${pools.length} pool(s), ${out.totals.payments} payments, ${(out.totals.paidZat / 1e8).toFixed(6)} ZEC paid`);
}

// -------------------------------------------------------------------- main
const cmd = process.argv[2] ?? "round";
if (cmd === "address") { console.log(zingo("addresses")); }
else if (cmd === "status") { readPool(); publish(); }
else {
  const now = Math.floor(Date.now() / 1000);
  for (const p of CFG.pools) { await pullTransfers(p); await markContracts(p); }
  await pullRegistry();
  // no wallet (no seed, no binary, or a dry run): rounds still advance, but
  // nothing is allocated or paid - the pool balance reads as zero
  let wallet = false;
  if (SEED && !DRY) { try { readPool(); wallet = true; } catch (e) { console.warn("[pool] unavailable:", e.message.split("\n")[0]); } }
  else console.log("[pool] skipped (no seed or dry run)");
  for (const p of CFG.pools) processRounds(p, now);
  if (wallet) { try { payouts(); } catch (e) { console.error("[payouts]", e.message.split("\n")[0]); } }
  publish();
}
