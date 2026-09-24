// The worker publishes data/public.json every round. In production DATA_URL
// points at the raw file in the repo; locally we read the sibling worker
// folder, and a deploy without DATA_URL falls back to a copy in web/data.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DATA_URL } from "../../../src/site.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (DATA_URL) {
      const r = await fetch(DATA_URL, { next: { revalidate: 30 } });
      return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json", "cache-control": "public, max-age=30" } });
    }
    for (const p of [join(process.cwd(), "..", "worker", "data", "public.json"), join(process.cwd(), "data", "public.json")]) {
      try { return new Response(await readFile(p, "utf8"), { headers: { "content-type": "application/json" } }); } catch { /* next */ }
    }
    throw new Error("no data published yet");
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
