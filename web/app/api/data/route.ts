// The worker publishes data/public.json every round. In production DATA_URL
// points at the raw file in the repo; locally we read the sibling folder.
import { readFile } from "node:fs/promises";
import { DATA_URL } from "../../../src/site.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (DATA_URL) {
      const r = await fetch(DATA_URL, { next: { revalidate: 30 } });
      return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json", "cache-control": "public, max-age=30" } });
    }
    const text = await readFile(new URL("../../../../worker/data/public.json", import.meta.url), "utf8");
    return new Response(text, { headers: { "content-type": "application/json" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
