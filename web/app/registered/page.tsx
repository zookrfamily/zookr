"use client";

import { useState } from "react";
import { Nav, Foot } from "../nav.tsx";
import { useData } from "../data.ts";
import { useWallet } from "../wallet.ts";
import { zec, short, hhmm, EXPLORER, ZEC_EXPLORER, ZKZEC } from "../../src/site.ts";

/* Every wallet that has been paid, with what it received and its last payment.
   Payments are zkZEC mints on Robinhood Chain (public) or, for redemptions,
   shielded native ZEC. */
export default function Paid() {
  const { d, err } = useData();
  const w = useWallet();
  const me = w.address?.toLowerCase() ?? "";
  const [q, setQ] = useState("");
  const list = Object.entries(d?.paid ?? {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([wallet, paid], i) => {
    const pays = (d?.payments ?? []).filter((p) => p.wallet === wallet);
    return { n: i + 1, wallet, paid, accrued: d?.accrued[wallet] ?? 0, last: pays[pays.length - 1] };
  }).filter((r) => !q || r.wallet.includes(q.toLowerCase()));
  const due = Object.values(d?.accrued ?? {}).filter((v) => v >= (d?.minPayoutZat ?? 0)).length;
  const redeems = d?.zkzec?.redeems ?? [];

  return (
    <>
      <Nav />
      <main className="wrap page">
        <div className="page-head"><div><span className="k">Payouts</span><h1>Paid wallets</h1></div>{d && <span className="pill ok"><i />Updated {new Date(d.generatedAt).toUTCString().slice(17, 25)} UTC</span>}</div>
        {err && <div className="msg err">data unavailable: {err}</div>}
        <div className="card gstat g4">
          <div className="card-pad"><span className="k">Wallets paid</span><div className="big">{d ? list.length : "—"}</div><span className="k">{d?.totals.payments ?? 0} payments in total</span></div>
          <div className="card-pad"><span className="k">ZEC paid out</span><div className="big">{d ? zec(d.totals.paidZat, 4) : "—"}</div><span className="k">as zkZEC to wallets · no registration</span></div>
          <div className="card-pad"><span className="k">Due next window</span><div className="big">{d ? due : "—"}</div><span className="k">at or above {zec(d?.minPayoutZat ?? 0, 3)} ZEC · {d?.nextPayout ? hhmm(d.nextPayout) : "—"}</span></div>
          <div className="card-pad"><span className="k">Redeemed to native</span><div className="big">{d ? zec(redeems.filter((r) => r.status === "paid").reduce((s, r) => s + r.zat, 0), 4) : "—"}</div><span className="k">{redeems.filter((r) => r.status === "pending").length} pending · coverage {((d?.zkzec?.coverageBps ?? 10000) / 100).toFixed(0)}%</span></div>
        </div>
        <div className="inp" style={{ margin: "22px 0 14px" }}><input placeholder="Search wallet" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="card">
          <div className="table-wrap"><table>
            <thead><tr><th>#</th><th>Wallet</th><th className="r">Paid</th><th className="r">Accrued, unpaid</th><th>Last payment</th></tr></thead>
            <tbody>
              {!d ? <tr><td colSpan={5} className="empty">Loading…</td></tr>
                : list.length === 0 ? <tr><td colSpan={5} className="empty">No payment yet. The first window is {d.nextPayout ? hhmm(d.nextPayout) : "soon"}.</td></tr>
                : list.map((r) => (
                  <tr key={r.wallet} className={r.wallet === me ? "me" : undefined}>
                    <td className="mono">{r.n}</td>
                    <td className="mono"><a href={`${EXPLORER}/address/${r.wallet}`} target="_blank" rel="noreferrer">{short(r.wallet)}</a>{r.wallet === me ? " · you" : ""}</td>
                    <td className="r mono">{zec(r.paid, 5)} ZEC</td>
                    <td className="r mono">{zec(r.accrued)} ZEC</td>
                    <td className="mono">{r.last ? <a href={r.last.kind === "mint" ? `${EXPLORER}/tx/${r.last.txid}` : `${ZEC_EXPLORER}/${r.last.txid}`} target="_blank" rel="noreferrer">{r.last.at.replace("T", " ").slice(0, 16)} · {r.last.kind === "mint" ? "zkZEC" : "native"} ↗</a> : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table></div>
        </div>
        {redeems.length > 0 && (
          <>
            <h2 style={{ fontSize: 20, color: "#fff", margin: "30px 0 12px" }}>Redemptions to native ZEC</h2>
            <div className="card"><div className="table-wrap"><table>
              <thead><tr><th>#</th><th>Wallet</th><th className="r">ZEC</th><th>Requested (UTC)</th><th>Status</th><th>Zcash tx</th></tr></thead>
              <tbody>{[...redeems].reverse().map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td className="mono">{short(r.wallet)}</td><td className="r mono">{zec(r.zat)}</td><td className="mono">{r.at.replace("T", " ").slice(0, 16)}</td><td>{r.status}</td><td className="mono">{r.txid ? <a href={`${ZEC_EXPLORER}/${r.txid}`} target="_blank" rel="noreferrer">{short(r.txid)} ↗</a> : "—"}</td></tr>)}</tbody>
            </table></div></div>
          </>
        )}
        <p style={{ color: "rgba(255,255,255,.85)", fontSize: 13, marginTop: 14, maxWidth: 680 }}>zkZEC mints are public transactions on Robinhood Chain (<a href={`${EXPLORER}/token/${ZKZEC}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>token</a>). Redemptions are shielded on Zcash: the amount and destination are visible only here and in the recipient&apos;s own wallet.</p>
      </main>
      <Foot />
    </>
  );
}
