"use client";

import { useMemo, useState } from "react";
import { Nav, Foot } from "../nav.tsx";
import { useData } from "../data.ts";
import { Logo, Venue, Ca } from "../tokenrow.tsx";
import { zec, eth, usd, hhmm, EXPLORER } from "../../src/site.ts";

type Filter = "all" | "curve" | "uniswap";
type Sort = "newest" | "mcap" | "rewards";

export default function Explore() {
  const { d, err } = useData();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const rows = useMemo(() => {
    if (!d) return [];
    const s = q.trim().toLowerCase();
    return d.tokens
      .filter((t) => filter === "all" || t.venue === filter)
      .filter((t) => !s || t.name.toLowerCase().includes(s) || t.symbol.toLowerCase().includes(s) || t.token.includes(s))
      .sort((a, b) => sort === "mcap" ? b.mcapUsd - a.mcapUsd : sort === "rewards" ? b.allocatedZat - a.allocatedZat : b.launchedAt - a.launchedAt);
  }, [d, q, filter, sort]);
  const onCurve = d?.tokens.filter((t) => t.venue === "curve").length ?? 0;
  const platform = d?.platformToken ? d.tokens.find((t) => t.token === d.platformToken.toLowerCase()) : null;

  return (
    <>
      <Nav />
      <main className="wrap page">
        <div className="page-head">
          <div><span className="k">Explore</span><h1>Launched tokens</h1></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {d && <span className="pill ok"><i />Up to date</span>}
            <a className="btn primary" href="/launch">Launch a token →</a>
          </div>
        </div>
        {err && <div className="msg err">data unavailable: {err}</div>}
        <div style={{ marginBottom: 18 }}><Ca onpaper /></div>

        <div className="card gstat g3">
          <div className="card-pad"><span className="k">Tokens launched</span><div className="big">{d ? d.tokens.length : "—"}</div><span className="k">{onCurve} on the curve · {d ? d.tokens.length - onCurve : 0} on Uniswap</span></div>
          <div className="card-pad"><span className="k">ZEC paid across Zookr</span><div className="big">{d && d.totals.paidZat > 0 ? zec(d.totals.paidZat, 4) : "—"} <span style={{ fontSize: 18 }}>ZEC</span></div><span className="k">Each payment counted once</span></div>
          <div className="card-pad"><span className="k">Platform rewards paid</span><div className="big">{d && d.totals.platformPaidZat > 0 ? zec(d.totals.platformPaidZat, 4) : "—"} <span style={{ fontSize: 18 }}>ZEC</span></div>{platform ? <a className="k" href={`/tokens/${platform.token}`} style={{ color: "var(--ink)" }}>View platform pool ↗</a> : <span className="k">Platform token not set yet</span>}</div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "26px 0 14px" }}>
          <div className="inp" style={{ flex: "1 1 260px" }}><input placeholder="Search name, symbol or address" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="tabs">
            {([["all", "All"], ["curve", "On the curve"], ["uniswap", "On Uniswap"]] as [Filter, string][]).map(([v, l]) => <button key={v} className={filter === v ? "on" : ""} onClick={() => setFilter(v)}>{l}</button>)}
          </div>
          <label className="k" style={{ color: "rgba(255,255,255,.85)", display: "inline-flex", gap: 8, alignItems: "center" }}>Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ font: "inherit", fontFamily: "var(--mono)", fontSize: 12, padding: "7px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,.7)", background: "var(--card)", color: "var(--ink)", textTransform: "none", letterSpacing: 0 }}>
              <option value="newest">Newest</option><option value="mcap">Market cap</option><option value="rewards">Rewards paid</option>
            </select>
          </label>
        </div>

        <div className="card">
          <div className="table-wrap"><table>
            <thead><tr><th>Token</th><th>Market cap</th><th>ZEC paid</th><th>Fees collected</th><th>Next reward round</th><th>Venue</th><th></th></tr></thead>
            <tbody>
              {!d ? <tr><td colSpan={7} className="empty">Loading tokens…</td></tr>
                : rows.length === 0 ? <tr><td colSpan={7} className="empty">{d.tokens.length === 0 ? <>No token launched yet. <a href="/launch" style={{ textDecoration: "underline" }}>Be the first →</a></> : "Nothing matches."}</td></tr>
                : rows.map((t) => (
                  <tr key={t.token}>
                    <td><a href={`/tokens/${t.token}`} style={{ display: "flex", gap: 12, alignItems: "center" }}><Logo t={t} /><span><b>{t.name}</b>{d?.platformToken?.toLowerCase() === t.token && <span className="pill ok" style={{ boxShadow: "none", padding: "2px 8px", marginLeft: 8 }}><i />platform</span>}<br /><span className="mono" style={{ fontSize: 11.5, color: "var(--dim)" }}>{t.symbol}</span></span></a></td>
                    <td className="mono">{usd(t.mcapUsd)}<br /><span className="k" style={{ letterSpacing: ".06em" }}>USD · estimate</span></td>
                    <td className="mono">{t.allocatedZat > 0 ? zec(t.allocatedZat, 5) : "—"}<br /><span className="k" style={{ letterSpacing: ".06em" }}>ZEC · to holders</span></td>
                    <td className="mono">{eth(t.feesEthCollected)} ETH</td>
                    <td>{hhmm(t.nextRound)}<br /><span className="k" style={{ letterSpacing: ".06em", color: "var(--ok)" }}>ZEC rewards enabled</span></td>
                    <td><Venue v={t.venue} /></td>
                    <td className="r"><a href={`${EXPLORER}/token/${t.token}`} target="_blank" rel="noreferrer" title="Explorer">↗</a></td>
                  </tr>
                ))}
            </tbody>
          </table></div>
          {d && rows.length > 0 && <div className="card-head" style={{ borderTop: "1px solid var(--line)", borderBottom: 0 }}><span className="k">1–{rows.length} of {rows.length}</span><span className="k">1 / 1</span></div>}
        </div>
      </main>
      <Foot />
    </>
  );
}
