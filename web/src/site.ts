/* Where things live. The registry is the only contract; the pool is a shielded
   Zcash wallet the worker holds; the data the site shows is the JSON the worker
   publishes every round. */
export const REGISTRY = (process.env.NEXT_PUBLIC_REGISTRY ?? "") as `0x${string}` | "";
export const DATA_URL = process.env.DATA_URL ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL ?? "";
export const EXPLORER = "https://robinhoodchain.blockscout.com";
export const ZEC_EXPLORER = "https://mainnet.zcashexplorer.app/transactions";

export const registryAbi = [
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ name: "zcashAddress", type: "string" }], outputs: [] },
  { type: "function", name: "destinationOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "string" }] },
  { type: "function", name: "isRegistered", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
] as const;

/* Shape of worker/data/public.json */
export type Pool = {
  id: string; token: string; symbol: string; name: string; decimals: number;
  emissionZatPerDay: number; perRoundZat: number; startsAt: string; endsAt: string | null; minHold: string;
  rounds: number; lastRound: number; nextRound: number; allocatedZat: number; holders: number; eligibleHolders: number; lastBlock: number;
  wallets: Record<string, { balance: string; eligible: string }>;
};
export type Payment = { wallet: string; to: string; zat: number; txid: string; at: string };
export type PublicData = {
  generatedAt: string; roundSeconds: number; minPayoutZat: number; registry: string;
  pool: { address: string; balanceZat: number; depositedZat: number; deposits: { txid: string; zat: number; at: string | null; memo: string }[]; owedZat: number };
  pools: Pool[];
  accrued: Record<string, number>; paid: Record<string, number>; payments: Payment[]; registered: number;
  totals: { paidZat: number; payments: number };
};

export const zec = (zat: number, d = 6) => (zat / 1e8).toFixed(d);
export const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
