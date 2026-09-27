"use client";

import type { Token } from "../src/site.ts";

/** Logo or a two-letter tile - the reference shows the same fallback. */
export function Logo({ t, size = 40 }: { t: Pick<Token, "logo" | "symbol">; size?: number }) {
  const s = { width: size, height: size, borderRadius: Math.round(size * .28), flex: "none" } as const;
  if (t.logo && /^(https?:|data:image)/.test(t.logo)) {
    // eslint-disable-next-line @next/next/no-img-element -- user supplied
    return <img src={t.logo} alt="" style={{ ...s, objectFit: "cover", background: "#fff", border: "1px solid var(--line)" }} />;
  }
  return <span style={{ ...s, display: "inline-grid", placeItems: "center", background: "var(--grad)", color: "#4A1B26", fontFamily: "var(--mono)", fontWeight: 700, fontSize: Math.round(size * .36) }}>{(t.symbol || "?").slice(0, 2).toUpperCase()}</span>;
}

export const Venue = ({ v }: { v: "curve" | "uniswap" }) => (
  <span className={`pill ${v === "uniswap" ? "ok" : ""}`} style={{ boxShadow: "none", padding: "4px 10px", whiteSpace: "nowrap" }}><i style={v === "curve" ? { background: "var(--ok)" } : undefined} />{v === "uniswap" ? "On Uniswap" : "On the curve"}</span>
);
