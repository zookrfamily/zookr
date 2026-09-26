"use client";

import { useEffect, useMemo, useState } from "react";
import { encodeFunctionData } from "viem";
import { Nav, Foot } from "../nav.tsx";
import { useWallet, reader, friendly } from "../wallet.ts";
import { useData } from "../data.ts";
import { EligibleWallets } from "../eligible.tsx";
import { REGISTRY, registryAbi, zec, short, ZEC_EXPLORER, EXPLORER } from "../../src/site.ts";

export default function Dashboard() {
  const w = useWallet();
  const { d, err } = useData();
  const me = w.address?.toLowerCase() ?? "";
  const [dest, setDest] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [range, setRange] = useState<"1h" | "6h" | "all">("all");
  const [tab, setTab] = useState<"holdings" | "payments">("holdings");

  // the registered destination, straight from the contract
  useEffect(() => {
    if (!w.address || !REGISTRY) { setDest(null); return; }
    reader().readContract({ address: REGISTRY, abi: registryAbi, functionName: "destinationOf", args: [w.address] }).then((s) => setDest(s || "")).catch(() => setDest(""));
  }, [w.address, msg]);

  const register = async () => {
    const ua = input.trim();
    if (!REGISTRY || !w.address) return;
    if (!/^u1[a-z0-9]{100,}$/.test(ua)) { setMsg({ ok: false, text: "Paste a mainnet Unified Address starting with u1." }); return; }
    setBusy(true); setMsg(null);
    try {
      await w.send({ to: REGISTRY, data: encodeFunctionData({ abi: registryAbi, functionName: "register", args: [ua] }) });
      setMsg({ ok: true, text: "Registered. Payouts to this address start with the next payment run." }); setInput("");
    } catch (e) { setMsg({ ok: false, text: friendly(e) }); } finally { setBusy(false); }
  };

  const mine = useMemo(() => {
    if (!d || !me) return null;
    const accrued = d.accrued[me] ?? 0, paid = d.paid[me] ?? 0;
    const pays = d.payments.filter((p) => p.wallet === me);
    // pending: what the next round would give at current eligibility
    let pending = 0;
    const holdings = d.pools.map((p) => {
      const h = p.wallets[me]; const eligible = Number(h?.eligible ?? 0), bal = Number(h?.balance ?? 0);
      const total = Object.values(p.wallets).reduce((s, x) => s + Number(x.eligible), 0);
      const share = total > 0 ? eligible / total : 0; pending += share * p.perRoundZat;
      return { p, bal, eligible, waiting: Math.max(0, bal - eligible), share };
    });
    return { accrued, paid, pays, pending, holdings };
  }, [d, me]);

  const now = Date.now();
  const cutoff = range === "1h" ? now - 3600e3 : range === "6h" ? now - 6 * 3600e3 : 0;
  const series = (mine?.pays ?? []).filter((p) => new Date(p.at).getTime() >= cutoff);
  const cum = series.reduce<number[]>((a, p) => [...a, (a[a.length - 1] ?? 0) + p.zat], []);
  const max = Math.max(1, ...cum);

  return (
    <>
      <Nav />
      <main className="wrap page">
        <div className="page-head">
          <div><span className="k">Native ZEC rewards</span><h1>My rewards</h1></div>
          <span className={`pill ${w.address ? "ok" : ""}`}><i />{w.address ? `${short(w.address)} on RH Chain` : "Wallet not connected"}</span>
        </div>
        {err && <div className="msg err">data unavailable: {err}</div>}
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}

        <div className="card g2">
          <div className="card-pad">
            <span className="k">Receive your ZEC</span>
            <h2 style={{ fontSize: 24, margin: "8px 0 6px" }}>Zcash payout address</h2>
            <p style={{ color: "var(--dim)", margin: "0 0 14px", fontSize: 14 }}>Add the Zcash address that will receive your rewards.</p>
            {dest ? (
              <div>
                <span className="k">Registered on-chain</span>
                <p className="mono" style={{ fontSize: 12, margin: "6px 0 0" }}>{dest}</p>
              </div>
            ) : (
              <div className="inp">
                <input placeholder="Paste your u1… address" value={input} onChange={(e) => setInput(e.target.value)} disabled={!w.address || busy} />
                {w.address
                  ? <button className="btn primary" onClick={register} disabled={busy || !REGISTRY}>{busy ? "Signing…" : REGISTRY ? "Register" : "Registry not deployed"}</button>
                  : <button className="btn primary" onClick={() => void w.connect()}>Connect wallet to register</button>}
              </div>
            )}
            <p style={{ color: "var(--dim)", fontSize: 12.5, margin: "14px 0 0" }}>Connect your Robinhood Chain holder wallet, then paste a mainnet Zcash Unified Address starting with u1. Registration is public and permanent. Only your connected wallet can authorize it.</p>
          </div>
          <div className="card-pad">
            <span className="k">Payment status</span>
            {!w.address ? <p style={{ color: "var(--dim)", marginTop: 10 }}>Connect a wallet to see delivery status.</p> : !mine ? <p style={{ color: "var(--dim)", marginTop: 10 }}>Loading…</p> : (
              <div style={{ marginTop: 10 }}>
                <div className="kv"><span>Destination</span><b>{dest ? "registered" : "not registered"}</b></div>
                <div className="kv"><span>Earned, unpaid</span><b>{zec(mine.accrued)} ZEC</b></div>
                <div className="kv"><span>Payment minimum</span><b>{zec(d?.minPayoutZat ?? 0, 3)} ZEC</b></div>
                <div className="kv"><span>Next payment</span><b>{!dest ? "register first" : mine.accrued >= (d?.minPayoutZat ?? 0) ? "next run" : "below minimum"}</b></div>
                <div className="kv"><span>Last payment</span><b>{mine.pays.length ? new Date(mine.pays[mine.pays.length - 1].at).toLocaleString() : "—"}</b></div>
              </div>
            )}
          </div>
        </div>

        <div className="g31">
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="onpaper"><span style={{ opacity: .8 }}>ZEC received</span><div className="big">{mine ? zec(mine.paid, 4) : "—"}</div><span className="k">completed payments, cumulative</span></div>
              <div className="tabs">{(["1h", "6h", "all"] as const).map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r.toUpperCase()}</button>)}</div>
            </div>
            {!w.address ? <div className="empty onpaper" style={{ borderTop: "1px solid rgba(255,255,255,.3)", borderBottom: "1px solid rgba(255,255,255,.3)", margin: "30px 0" }}>↗<br />Connect a wallet to see your rewards</div>
              : series.length === 0 ? <div className="empty onpaper" style={{ borderTop: "1px solid rgba(255,255,255,.3)", borderBottom: "1px solid rgba(255,255,255,.3)", margin: "30px 0" }}>No completed payments in this range yet.</div>
              : <div className="bars" style={{ margin: "20px 0" }}>{cum.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%` }} title={`${zec(v)} ZEC`} />)}</div>}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "30px 0 12px" }}>
              <h2 style={{ fontSize: 20, color: "#fff" }}>{tab === "holdings" ? "Holdings" : "Payments"}</h2>
              <div className="tabs"><button className={tab === "holdings" ? "on" : ""} onClick={() => setTab("holdings")}>Holdings</button><button className={tab === "payments" ? "on" : ""} onClick={() => setTab("payments")}>Payments</button></div>
            </div>
            <div className="card">
              {!w.address || !mine ? <div className="empty">Connect a wallet to see holdings and eligibility.</div> : tab === "holdings" ? (
                <div className="table-wrap"><table>
                  <thead><tr><th>Pool</th><th className="r">Balance</th><th className="r">Eligible</th><th className="r">Waiting</th><th className="r">Share</th><th className="r">Per round</th></tr></thead>
                  <tbody>{mine.holdings.map(({ p, bal, eligible, waiting, share }) => (
                    <tr key={p.id}><td><a href={`/pools/${p.id}`}><b>{p.symbol}</b> <span style={{ color: "var(--dim)" }}>{p.name}</span></a></td><td className="r mono">{bal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="r mono">{eligible.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="r mono">{waiting.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="r mono">{(share * 100).toFixed(3)}%</td><td className="r mono">{zec(share * p.perRoundZat)} ZEC</td></tr>
                  ))}</tbody>
                </table></div>
              ) : mine.pays.length === 0 ? <div className="empty">No payments yet.</div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Time (UTC)</th><th className="r">ZEC</th><th>Destination</th><th>Zcash tx</th></tr></thead>
                  <tbody>{[...mine.pays].reverse().map((p, i) => (
                    <tr key={i}><td className="mono">{p.at.replace("T", " ").slice(0, 19)}</td><td className="r mono">{zec(p.zat)}</td><td className="mono">{short(p.to)}</td><td className="mono"><a href={`${ZEC_EXPLORER}/${p.txid}`} target="_blank" rel="noreferrer">{short(p.txid)} ↗</a></td></tr>
                  ))}</tbody>
                </table></div>
              )}
            </div>
          </div>

          <aside className="onpaper">
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Rewards</h2>
            <div className="kv"><span>Pending · next round</span><b>{mine ? `${zec(mine.pending)} ZEC` : "—"}</b></div>
            <div className="kv"><span>Earned, unpaid</span><b>{mine ? `${zec(mine.accrued)} ZEC` : "—"}</b></div>
            <div className="kv"><span>ZEC received</span><b>{mine ? `${zec(mine.paid)} ZEC` : "—"}</b></div>
            <p style={{ color: "var(--dim)", fontSize: 13, margin: "14px 0 10px" }}>Your rewards stay with your wallet</p>
            {!w.address && <button className="btn primary" onClick={() => void w.connect()}>Connect wallet</button>}
            {d && (
              <div style={{ marginTop: 30 }}>
                <span className="k">The pool</span>
                <div className="kv"><span>Spendable</span><b>{zec(d.pool.balanceZat, 4)} ZEC</b></div>
                <div className="kv"><span>Owed to holders</span><b>{zec(d.pool.owedZat, 4)} ZEC</b></div>
                <div className="kv"><span>Paid out</span><b>{zec(d.totals.paidZat, 4)} ZEC</b></div>
                <div className="kv"><span>Registered wallets</span><b>{d.registered}</b></div>
                <div className="kv"><span>Registry</span><b>{d.registry ? <a href={`${EXPLORER}/address/${d.registry}`} target="_blank" rel="noreferrer">{short(d.registry)} ↗</a> : "—"}</b></div>
                <div className="kv"><span>Updated</span><b>{new Date(d.generatedAt).toLocaleTimeString()}</b></div>
              </div>
            )}
          </aside>
        </div>

        {d && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <h2 style={{ fontSize: 20, color: "#fff" }}>Who the next round pays</h2>
              <span className="k" style={{ color: "rgba(255,255,255,.8)" }}>automatic · pro-rata · every {d.roundSeconds / 60} min</span>
            </div>
            <EligibleWallets d={d} me={me} />
          </div>
        )}
      </main>
      <Foot />
    </>
  );
}
