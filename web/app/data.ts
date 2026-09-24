"use client";

import { useEffect, useState } from "react";
import type { PublicData } from "../src/site.ts";

/** The worker's public.json, refreshed every 30 seconds. */
export function useData() {
  const [d, setD] = useState<PublicData | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    const load = () => fetch("/api/data").then((r) => r.json()).then((j) => { if (!live) return; if (j.error) setErr(j.error); else setD(j); }).catch((e) => live && setErr(String(e)));
    load(); const t = setInterval(load, 30_000);
    return () => { live = false; clearInterval(t); };
  }, []);
  return { d, err };
}
