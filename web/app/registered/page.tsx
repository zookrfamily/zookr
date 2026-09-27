"use client";

import { useState } from "react";
import { Nav, Foot } from "../nav.tsx";
import { useData } from "../data.ts";
import { useWallet } from "../wallet.ts";
import { zec, short, EXPLORER, ZEC_EXPLORER } from "../../src/site.ts";

/* Every wallet that registered a Zcash payout address, with what it has
   accrued and been paid. Public by design: the registry is on-chain. */
export default function Registered() {
  const { d, err } = useData();
  const w = useWallet();
  const me = w.address?.toLowerCase() ?? "";
  const [q, setQ] = useState("");
  const list = (d?.registeredList ?? []).map((r, i) => {
    const pays = (d?.payments ?? []).filter((p) => p.wallet === r.wallet);
    return { n: i + 1, ...r, accrued: d?.accrued[r.wallet] ?? 0, paid: d?.paid[r.wallet] ?? 0, last: pays[pays.length - 1] };
  }).filter((r) => !q || r.wallet.includes(q.toLowerCase()) || r.zcash.includes(q.toLowerCase()));
  const paidWallets = list.filter((r) => r.paid > 0).length;
  const due = list.filter((r) => r.accrued >= (d?.minPayoutZat ?? 0)).length;

  return (
    <>
      <Nav />
      <main className="wrap page">
        <div className="page-head"><div><span className="k">Registry</span><h1>Registered wallets</h1></div>{d && <span className="pill ok"><i />Updated {new Date(d.generatedAt).toUTCString().slice(17, 25)} UTC</span>}</div>
        {err && <div className="msg err">data unavailable: {err}</div>}
        <div className="card gstat g4">
          <div className="card-pad"><span className="k">Registered</span><div className="big">{d ? d.registered : "—"}</div><span className="k">wallets with a Zcash address</span></div>
          <div className="card-pad"><span className="k">Paid at least once</span><div className="big">{d ? paidWallets : "—"}</div><span className="k">{d?.totals.payments ?? 0} payments in total</span></div>
          <div className="card-pad"><span className="k">Due next window</span><div className="big">{d ? due : "—"}</div><span className="k">at or above {zec(d?.minPayoutZat ?? 0, 3)} ZEC</span></div>
          <div className="card-pad"><span className="k">ZEC paid out</span><div className="big">{d ? zec(d.totals.paidZat, 4) : "—"}</div><span className="k">next window {d?.nextPayout ? `${new Date(d.nextPayout * 1000).toUTCString().slice(17, 22)} UTC` : "—"}</span></div>
        </div>
        <div className="inp" style={{ margin: "22px 0 14px" }}><input placeholder="Search wallet or Zcash address" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="card">
          <div className="table-wrap"><table>
            <thead><tr><th>#</th><th>Wallet</th><th>Zcash address</th><th className="r">Accrued</th><th className="r">Paid</th><th>Last payment</th></tr></thead>
            <tbody>
              {!d ? <tr><td colSpan={6} className="empty">Loading…</td></tr>
                : list.length === 0 ? <tr><td colSpan={6} className="empty">No registered wallet yet. <a href="/dashboard" style={{ textDecoration: "underline" }}>Register yours →</a></td></tr>
                : list.map((r) => (
                  <tr key={r.wallet} className={r.wallet === me ? "me" : undefined}>
                    <td className="mono">{r.n}</td>
                    <td className="mono"><a href={`${EXPLORER}/address/${r.wallet}`} target="_blank" rel="noreferrer">{short(r.wallet)}</a>{r.wallet === me ? " · you" : ""}</td>
                    <td className="mono" title={r.zcash}>{r.zcash.slice(0, 14)}…{r.zcash.slice(-6)}</td>
                    <td className="r mono">{zec(r.accrued)} ZEC</td>
                    <td className="r mono">{zec(r.paid, 4)} ZEC</td>
                    <td className="mono">{r.last ? <a href={`${ZEC_EXPLORER}/${r.last.txid}`} target="_blank" rel="noreferrer">{r.last.at.replace("T", " ").slice(0, 16)} ↗</a> : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table></div>
        </div>
        <p style={{ color: "rgba(255,255,255,.85)", fontSize: 13, marginTop: 14, maxWidth: 680 }}>Registration is a public transaction on Robinhood Chain, so this list is public too. Payments are shielded: the amounts and destinations are only visible here and in the recipient&apos;s own wallet.</p>
      </main>
      <Foot />
    </>
  );
}
