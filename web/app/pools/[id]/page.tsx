"use client";

import { use } from "react";
import { Nav, Foot } from "../../nav.tsx";
import { useData } from "../../data.ts";
import { useWallet } from "../../wallet.ts";
import { zec, short, EXPLORER, ZEC_EXPLORER } from "../../../src/site.ts";

export default function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { d, err } = useData();
  const w = useWallet();
  const p = d?.pools.find((x) => x.id === id);
  const me = w.address?.toLowerCase() ?? "";
  const totalEligible = p ? Object.values(p.wallets).reduce((s, x) => s + Number(x.eligible), 0) : 0;
  const top = p ? Object.entries(p.wallets).map(([a, v]) => ({ a, bal: Number(v.balance), el: Number(v.eligible) })).sort((x, y) => y.el - x.el).slice(0, 25) : [];
  const runway = d && p && p.emissionZatPerDay > 0 ? Math.max(0, (d.pool.balanceZat - d.pool.owedZat) / p.emissionZatPerDay) : 0;
  return (
    <>
      <Nav />
      <main className="wrap page">
        <a href="/explore" className="k">← Explore</a>
        {err && <div className="msg err">data unavailable: {err}</div>}
        {!d ? <div className="empty">Loading…</div> : !p ? <div className="empty">No such pool.</div> : (
          <>
            <div className="page-head" style={{ marginTop: 14 }}>
              <div><span className="k">Native ZEC rewards</span><h1>{p.name} / {p.symbol}</h1><a className="mono" style={{ fontSize: 12, color: "var(--dim)" }} href={`${EXPLORER}/token/${p.token}`} target="_blank" rel="noreferrer">{p.token} ↗</a></div>
              <span className="pill ok"><i />Round {p.rounds} · next {new Date(p.nextRound * 1000).toUTCString().slice(17, 25)} UTC</span>
            </div>
            <div className="card g2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="card-pad"><span className="k">Emission</span><div className="big" style={{ fontSize: 24 }}>{zec(p.emissionZatPerDay, 3)}</div><span className="k">ZEC / day · {zec(p.perRoundZat)} per round</span></div>
              <div className="card-pad" style={{ borderLeft: "2px solid var(--line)" }}><span className="k">Allocated so far</span><div className="big" style={{ fontSize: 24 }}>{zec(p.allocatedZat, 4)}</div><span className="k">ZEC over {p.rounds} rounds</span></div>
              <div className="card-pad" style={{ borderLeft: "2px solid var(--line)" }}><span className="k">Holders</span><div className="big" style={{ fontSize: 24 }}>{p.holders}</div><span className="k">{p.eligibleHolders} eligible this round</span></div>
              <div className="card-pad" style={{ borderLeft: "2px solid var(--line)" }}><span className="k">Runway</span><div className="big" style={{ fontSize: 24 }}>{runway.toFixed(1)} d</div><span className="k">at current emission</span></div>
            </div>

            <div className="g31">
              <div>
                <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>Top eligible holders</h2>
                <div className="card"><div className="table-wrap"><table>
                  <thead><tr><th>Wallet</th><th className="r">Balance</th><th className="r">Eligible</th><th className="r">Share</th><th className="r">Per round</th></tr></thead>
                  <tbody>{top.map((h) => (
                    <tr key={h.a} style={h.a === me ? { background: "var(--paper-2)" } : undefined}><td className="mono"><a href={`${EXPLORER}/address/${h.a}`} target="_blank" rel="noreferrer">{short(h.a)}</a>{h.a === me ? " · you" : ""}</td><td className="r mono">{h.bal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td><td className="r mono">{h.el.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td><td className="r mono">{totalEligible ? ((h.el / totalEligible) * 100).toFixed(2) : "0.00"}%</td><td className="r mono">{zec(totalEligible ? (h.el / totalEligible) * p.perRoundZat : 0)}</td></tr>
                  ))}</tbody>
                </table></div></div>
                <h2 style={{ fontSize: 20, margin: "30px 0 12px" }}>Recent payments</h2>
                <div className="card">{d.payments.length === 0 ? <div className="empty">Verified ZEC payments will appear here.</div> : (
                  <div className="table-wrap"><table>
                    <thead><tr><th>Time (UTC)</th><th>Wallet</th><th className="r">ZEC</th><th>Zcash tx</th></tr></thead>
                    <tbody>{[...d.payments].reverse().slice(0, 30).map((x, i) => <tr key={i}><td className="mono">{x.at.replace("T", " ").slice(0, 19)}</td><td className="mono">{short(x.wallet)}</td><td className="r mono">{zec(x.zat)}</td><td className="mono"><a href={`${ZEC_EXPLORER}/${x.txid}`} target="_blank" rel="noreferrer">{short(x.txid)} ↗</a></td></tr>)}</tbody>
                  </table></div>
                )}</div>
              </div>
              <aside>
                <h2 style={{ fontSize: 20, marginBottom: 10 }}>How this pool pays</h2>
                <div className="kv"><span>Round length</span><b>{d.roundSeconds / 60} min</b></div>
                <div className="kv"><span>Min hold</span><b>{Number(p.minHold).toLocaleString()} {p.symbol}</b></div>
                <div className="kv"><span>Started</span><b>{p.startsAt.slice(0, 10)}</b></div>
                <div className="kv"><span>Ends</span><b>{p.endsAt ? p.endsAt.slice(0, 10) : "while funded"}</b></div>
                <div className="kv"><span>Pool address</span><b className="mono" style={{ fontSize: 11, wordBreak: "break-all" }}>{d.pool.address || "—"}</b></div>
                <div className="kv"><span>Deposited</span><b>{zec(d.pool.depositedZat, 4)} ZEC</b></div>
                <p style={{ color: "var(--dim)", fontSize: 13, marginTop: 14 }}>Each round splits {zec(p.perRoundZat)} ZEC across every wallet whose {p.symbol} was held through the previous round. A new buy skips one round. Sells consume your newest tokens first.</p>
                <a className="btn" href="/dashboard" style={{ marginTop: 10 }}>My rewards →</a>
              </aside>
            </div>
          </>
        )}
      </main>
      <Foot />
    </>
  );
}
