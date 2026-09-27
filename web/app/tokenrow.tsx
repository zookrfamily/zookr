"use client";

import { useState } from "react";
import type { Token } from "../src/site.ts";
import { EXPLORER, PLATFORM_TOKEN, PONS } from "../src/site.ts";

/** The platform token's contract address, copyable, with explorer + trade links. */
export function Ca({ address = PLATFORM_TOKEN, symbol = "ZOOKR", onpaper = false }: { address?: string; symbol?: string; onpaper?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { void navigator.clipboard?.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  const box = onpaper
    ? { background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.4)", color: "#fff" }
    : { background: "#fff", border: "1px solid var(--line-2)", color: "var(--ink)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", ...box, borderRadius: 14, padding: "8px 8px 8px 14px", maxWidth: "100%" }}>
      <span className="k" style={{ color: onpaper ? "rgba(255,255,255,.8)" : "var(--dim)" }}>{symbol} CA</span>
      <span className="mono" style={{ fontSize: 12, flex: 1, minWidth: 0 }}>{address}</span>
      <button className="btn sm" onClick={copy} style={{ padding: "5px 11px" }}>{copied ? "Copied" : "Copy"}</button>
      <a className="btn sm" href={`${EXPLORER}/token/${address}`} target="_blank" rel="noreferrer" style={{ padding: "5px 11px" }}>Explorer ↗</a>
      <a className="btn sm primary" href={`${PONS}/token/${address}`} target="_blank" rel="noreferrer" style={{ padding: "5px 11px" }}>Buy ↗</a>
    </div>
  );
}

/** Logo or a two-letter tile - the reference shows the same fallback. */
export function Logo({ t, size = 40 }: { t: Pick<Token, "logo" | "symbol">; size?: number }) {
  const [broken, setBroken] = useState(false);
  const s = { width: size, height: size, borderRadius: Math.round(size * .28), flex: "none" } as const;
  if (!broken && t.logo && /^(https?:|data:image)/.test(t.logo)) {
    const src = t.logo.replace(/^https:\/\/(ipfs\.io|dweb\.link)\/ipfs\//, "https://gateway.pinata.cloud/ipfs/"); // those gateways rate-limit
    // eslint-disable-next-line @next/next/no-img-element -- user supplied
    return <img src={src} alt="" onError={() => setBroken(true)} style={{ ...s, objectFit: "cover", background: "#fff", border: "1px solid var(--line)" }} />;
  }
  return <span style={{ ...s, display: "inline-grid", placeItems: "center", background: "var(--grad)", color: "#4A1B26", fontFamily: "var(--mono)", fontWeight: 700, fontSize: Math.round(size * .36) }}>{(t.symbol || "?").slice(0, 2).toUpperCase()}</span>;
}

export const Venue = ({ v }: { v: "curve" | "uniswap" }) => (
  <span className={`pill ${v === "uniswap" ? "ok" : ""}`} style={{ boxShadow: "none", padding: "4px 10px", whiteSpace: "nowrap", color: "var(--dim)" }}><i style={v === "curve" ? { background: "var(--ok)" } : undefined} />{v === "uniswap" ? "On Uniswap" : "On the curve"}</span>
);
