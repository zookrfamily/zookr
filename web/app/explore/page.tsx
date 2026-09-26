"use client";

import { Nav, Foot } from "../nav.tsx";
import { useData } from "../data.ts";
import { zec, short, EXPLORER } from "../../src/site.ts";

export default function Explore() {
  const { d, err } = useData();
  const daysLeft = (balance: number, owed: number, perDay: number) => (perDay > 0 ? Math.max(0, (balance - owed) / perDay) : Infinity);
  return (
    <>
      <Nav />
      <main className="wrap page">
        <div className="page-head"><div><span className="k">Pools</span><h1>Explore</h1></div>{d && <span className="pill ok"><i />Updated {new Date(d.generatedAt).toLocaleTimeString()}</span>}</div>
        {err && <div className="msg err">data unavailable: {err}</div>}
        <div className="card g2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="card-pad"><span className="k">Pools</span><div className="big">{d?.pools.length ?? "—"}</div></div>
          <div className="card-pad" style={{ borderLeft: "1px solid var(--line)" }}><span className="k">ZEC paid across Zookr</span><div className="big">{d ? zec(d.totals.paidZat, 4) : "—"}</div><span className="k">{d?.totals.payments ?? 0} payments, each counted once</span></div>
          <div className="card-pad" style={{ borderLeft: "1px solid var(--line)" }}><span className="k">Pool balance</span><div className="big">{d ? zec(d.pool.balanceZat, 4) : "—"}</div><span className="k">spendable ZEC · {d ? zec(d.pool.owedZat, 4) : "—"} owed</span></div>
        </div>
        <div className="card" style={{ marginTop: 34 }}>
          <div className="table-wrap"><table>
            <thead><tr><th>Token</th><th className="r">Emission / day</th><th className="r">Per round</th><th className="r">Holders</th><th className="r">Eligible</th><th className="r">Allocated</th><th className="r">Runway</th><th>Next round</th><th></th></tr></thead>
            <tbody>
              {!d ? <tr><td colSpan={9} className="empty">Loading pools…</td></tr> : d.pools.map((p) => {
                const left = daysLeft(d.pool.balanceZat, d.pool.owedZat, p.emissionZatPerDay);
                return (
                  <tr key={p.id}>
                    <td><a href={`/pools/${p.id}`}><b>{p.symbol}</b> <span style={{ color: "var(--dim)" }}>{p.name}</span></a><br /><a className="mono" style={{ fontSize: 11, color: "var(--dim)" }} href={`${EXPLORER}/token/${p.token}`} target="_blank" rel="noreferrer">{short(p.token)} ↗</a></td>
                    <td className="r mono">{zec(p.emissionZatPerDay, 4)} ZEC</td>
                    <td className="r mono">{zec(p.perRoundZat)} ZEC</td>
                    <td className="r mono">{p.holders}</td>
                    <td className="r mono">{p.eligibleHolders}</td>
                    <td className="r mono">{zec(p.allocatedZat, 4)} ZEC</td>
                    <td className="r mono">{Number.isFinite(left) ? `${left.toFixed(1)} d` : "∞"}</td>
                    <td className="mono">{new Date(p.nextRound * 1000).toUTCString().slice(17, 25)} UTC</td>
                    <td className="r"><a href={`/pools/${p.id}`} className="btn sm">Open</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      </main>
      <Foot />
    </>
  );
}
