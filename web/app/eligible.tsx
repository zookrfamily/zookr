"use client";

import type { PublicData } from "../src/site.ts";
import { zec, short, EXPLORER } from "../src/site.ts";

/* Every wallet the next round will pay, across all tokens, with what it has
   accrued and been paid. Public: the whole point is that anyone can see the
   split is automatic and pro-rata. */
export function EligibleWallets({ d, me }: { d: PublicData; me: string }) {
  const rows = new Map<string, { eligible: number; perRound: number; tokens: string[] }>();
  for (const t of d.tokens) {
    const total = Object.values(t.wallets).reduce((s, x) => s + Number(x.eligible), 0);
    const funded = Math.max(0, t.creditedZat - t.allocatedZat);
    for (const [w, v] of Object.entries(t.wallets)) {
      const el = Number(v.eligible); if (el <= 0) continue;
      const r = rows.get(w) ?? { eligible: 0, perRound: 0, tokens: [] };
      r.eligible += el; r.perRound += total > 0 ? (el / total) * funded : 0; r.tokens.push(t.symbol);
      rows.set(w, r);
    }
  }
  const list = [...rows.entries()].sort((a, b) => b[1].perRound - a[1].perRound);
  const paid = Object.values(d.paid).filter((v) => v > 0).length;
  return (
    <div className="card">
      <div className="card-head"><span className="k">Eligible wallets · next round</span><span className="k">{list.length} wallets · <a href="/registered" style={{ textDecoration: "underline" }}>{paid} paid</a></span></div>
      {list.length === 0 ? <div className="empty">No wallet is eligible yet. Tokens qualify once they have been held through one full round.</div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Wallet</th><th>Token</th><th className="r">Eligible</th><th className="r">Next round</th><th className="r">Accrued</th><th className="r">Paid</th></tr></thead>
          <tbody>{list.slice(0, 100).map(([w, r]) => (
            <tr key={w} className={w === me ? "me" : undefined}>
              <td className="mono"><a href={`${EXPLORER}/address/${w}`} target="_blank" rel="noreferrer">{short(w)}</a>{w === me ? " · you" : ""}</td>
              <td className="mono">{r.tokens.join(", ")}</td>
              <td className="r mono">{r.eligible.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
              <td className="r mono">{zec(r.perRound)} ZEC</td>
              <td className="r mono">{zec(d.accrued[w] ?? 0)} ZEC</td>
              <td className="r mono">{zec(d.paid[w] ?? 0, 4)} ZEC</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
