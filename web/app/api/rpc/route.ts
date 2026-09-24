// JSON-RPC proxy for Robinhood Chain: rpc.*.chain.robinhood.com is DNS-blocked
// by some ISPs, so browsers call us and we call upstream.
export const runtime = "nodejs";
const TARGET = (process.env.EVM_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com").trim();

export async function POST(req: Request) {
  const body = await req.text();
  try {
    const r = await fetch(TARGET, { method: "POST", headers: { "content-type": "application/json" }, body, cache: "no-store" });
    return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "RPC upstream unreachable" } }, { status: 502 });
  }
}
