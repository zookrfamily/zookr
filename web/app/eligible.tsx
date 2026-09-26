"use client";

import type { PublicData } from "../src/site.ts";
import { zec, short, EXPLORER } from "../src/site.ts";

/* Every wallet the next round will pay, across all pools, with what it has
   accrued and whether a Zcash destination is registered. Public: the whole
   point is that anyone can see the split is automatic and pro-rata. */
export function EligibleWallets({ d, me }: { d: PublicData; me: string }) {
  const reg = new Set((d.registeredWallets ?? []).map((a) => a.toLowerCase()));
  const rows = new Map<string, { eligible: number; perRound: number; pools: string[] }>();
  for (const p of d.pools) {
    const total = Object.values(p.wallets).reduce((s, x) => s + Number(x.eligible), 0);
    for (const [w, v] of Object.entries(p.wallets)) {
      const el = Number(v.eligible); if (el <= 0) continue;
      const r = rows.get(w) ?? { eligible: 0, perRound: 0, pools: [] };
      r.eligible += el; r.perRound += total > 0 ? (el / total) * p.perRoundZat : 0; r.pools.push(p.symbol);
      rows.set(w, r);
    }
  }
  const list = [...rows.entries()].sort((a, b) => b[1].perRound - a[1].perRound);
  return (
    <div className="card">
      <div className="card-head"><span className="k">Eligible wallets · next round</span><span className="k">{list.length} wallets · {reg.size} registered</span></div>
      {list.length === 0 ? <div className="empty">No wallet is eligible yet. Tokens qualify once they have been held through one full round.</div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Wallet</th><th>Pool</th><th className="r">Eligible</th><th className="r">Per round</th><th className="r">Accrued</th><th className="r">Paid</th><th>Zcash address</th></tr></thead>
          <tbody>{list.slice(0, 100).map(([w, r]) => (
            <tr key={w} className={w === me ? "me" : undefined}>
              <td className="mono"><a href={`${EXPLORER}/address/${w}`} target="_blank" rel="noreferrer">{short(w)}</a>{w === me ? " · you" : ""}</td>
              <td className="mono">{r.pools.join(", ")}</td>
              <td className="r mono">{r.eligible.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
              <td className="r mono">{zec(r.perRound)} ZEC</td>
              <td className="r mono">{zec(d.accrued[w] ?? 0)} ZEC</td>
              <td className="r mono">{zec(d.paid[w] ?? 0, 4)} ZEC</td>
              <td>{reg.has(w) ? <span className="pill ok" style={{ boxShadow: "none", padding: "3px 8px" }}><i />registered</span> : <span className="pill" style={{ boxShadow: "none", padding: "3px 8px", color: "var(--dim)" }}><i style={{ background: "var(--faint)" }} />not yet</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
