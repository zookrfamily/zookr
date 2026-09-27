/* Where things live. Two contracts (registry, launchpad); the pool is a shielded
   Zcash wallet the worker holds; the data the site shows is the JSON the worker
   publishes every round. */
export const REGISTRY = (process.env.NEXT_PUBLIC_REGISTRY ?? "") as `0x${string}` | "";
export const LAUNCHPAD = (process.env.NEXT_PUBLIC_LAUNCHPAD ?? "") as `0x${string}` | "";
export const DATA_URL = process.env.DATA_URL ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/zookrfamily/zookr";
export const TELEGRAM_URL = "https://t.me/ZookrFamily";
export const EXPLORER = "https://robinhoodchain.blockscout.com";
export const ZEC_EXPLORER = "https://mainnet.zcashexplorer.app/transactions";
export const PONS = "https://pons.trade";
export const LAUNCH_FEE_ETH = "0.0005";

export const registryAbi = [
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ name: "zcashAddress", type: "string" }], outputs: [] },
  { type: "function", name: "destinationOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "string" }] },
  { type: "function", name: "isRegistered", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
] as const;

export const launchpadAbi = [
  { type: "function", name: "launch", stateMutability: "payable", outputs: [{ type: "address" }, { type: "address" }, { type: "address" }],
    inputs: [{ name: "input", type: "tuple", components: [
      { name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "logo", type: "string" }, { name: "description", type: "string" },
      { name: "socials", type: "tuple", components: [{ name: "twitter", type: "string" }, { name: "telegram", type: "string" }, { name: "discord", type: "string" }, { name: "website", type: "string" }, { name: "farcaster", type: "string" }] },
      { name: "minTokensOut", type: "uint256" },
    ] }] },
  { type: "event", name: "Launched", inputs: [
    { name: "token", type: "address", indexed: true }, { name: "curve", type: "address", indexed: true }, { name: "vault", type: "address", indexed: true },
    { name: "creator", type: "address", indexed: false }, { name: "name", type: "string", indexed: false }, { name: "symbol", type: "string", indexed: false }, { name: "initialBuy", type: "uint256", indexed: false },
  ] },
] as const;

/* Shape of worker/data/public.json */
export type Token = {
  token: string; symbol: string; name: string; curve: string; vault: string; creator: string; launchedAt: number; logo: string; description: string;
  socials: { twitter?: string; telegram?: string; website?: string };
  venue: "curve" | "uniswap"; mcapUsd: number;
  feesEthPending: string; feesEthCollected: string; feesEthConverted: string;
  creditedZat: number; allocatedZat: number; rounds: number; lastRound: number; nextRound: number;
  holders: number; eligibleHolders: number;
  wallets: Record<string, { balance: string; eligible: string }>;
};
export type Payment = { wallet: string; to: string; zat: number; txid: string; at: string };
export type Conversion = { token: string; symbol: string; wei: string; depositAddress: string; expectZec: string; status: string; txs: string[]; at: string; zat: number; zcashTx?: string };
export type PublicData = {
  generatedAt: string; roundSeconds: number; minPayoutZat: number; registry: string; launchpad: string; platformToken: string; holderShareBps: number; ethUsd: number;
  pool: { address: string; taddress?: string; transparentZat?: number; balanceZat: number; depositedZat: number; deposits: { txid: string; zat: number; at: string | null; memo: string }[]; owedZat: number };
  platform: { creditedZat: number; allocatedZat: number; rounds: number };
  tokens: Token[]; conversions: Conversion[];
  accrued: Record<string, number>; paid: Record<string, number>; payments: Payment[]; registered: number; registeredWallets?: string[];
  totals: { paidZat: number; payments: number; tokens: number; feesEthCollected: string; platformPaidZat: number };
};

export const zec = (zat: number, d = 6) => (zat / 1e8).toFixed(d);
export const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const eth = (s: string | number, d = 5) => Number(s || 0).toFixed(d).replace(/\.?0+$/, "") || "0";
export const usd = (n: number) => (n > 0 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—");
export const hhmm = (sec: number) => `${new Date(sec * 1000).toUTCString().slice(17, 22)} UTC`;
/** Per-token share of what a wallet has been paid: allocation-weighted, since payments are per wallet. */
export const dash = (v: number | string, unit: string) => (Number(v) > 0 ? `${v} ${unit}` : "—");
