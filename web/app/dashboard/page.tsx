"use client";

import { useEffect, useMemo, useState } from "react";
import { encodeFunctionData } from "viem";
import { Nav, Foot } from "../nav.tsx";
import { useWallet, reader, friendly } from "../wallet.ts";
import { useData } from "../data.ts";
import { EligibleWallets } from "../eligible.tsx";
import { Logo, Ca } from "../tokenrow.tsx";
import { REGISTRY, registryAbi, ZKZEC, zkzecAbi, zec, short, hhmm, ZEC_EXPLORER, EXPLORER } from "../../src/site.ts";

type Eth = { request: (a: { method: string; params?: unknown }) => Promise<unknown> };
const paylink = (p: { kind?: string; txid: string }) => (p.kind === "mint" ? `${EXPLORER}/tx/${p.txid}` : `${ZEC_EXPLORER}/${p.txid}`);

export default function Dashboard() {
  const w = useWallet();
  const { d, err } = useData();
  const me = w.address?.toLowerCase() ?? "";
  const [bal, setBal] = useState<bigint | null>(null);
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");
  const [u1, setU1] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [range, setRange] = useState<"1h" | "6h" | "all">("all");
  const [tab, setTab] = useState<"holdings" | "payments" | "redeems">("holdings");

  // zkZEC balance straight from the chain, plus any Zcash address this wallet registered earlier (prefills redeem)
  useEffect(() => {
    if (!w.address) { setBal(null); setDest(""); return; }
    const r = reader();
    r.readContract({ address: ZKZEC, abi: zkzecAbi, functionName: "balanceOf", args: [w.address] }).then(setBal).catch(() => setBal(null));
    if (REGISTRY) r.readContract({ address: REGISTRY, abi: registryAbi, functionName: "destinationOf", args: [w.address] }).then((s) => { setDest(s || ""); if (s && !u1) setU1(s); }).catch(() => {});
  }, [w.address, msg]); // eslint-disable-line react-hooks/exhaustive-deps -- u1 prefill once

  const addToWallet = async () => {
    const eth = (window as unknown as { ethereum?: Eth }).ethereum;
    if (!eth) return;
    try { await eth.request({ method: "wallet_watchAsset", params: { type: "ERC20", options: { address: ZKZEC, symbol: "zkZEC", decimals: 8, image: `${location.origin}/logo.png` } } }); } catch { /* user closed it */ }
  };

  const redeem = async () => {
    const ua = u1.trim(); const zat = BigInt(Math.round(Number(amount || "0") * 1e8));
    if (!/^u1[a-z0-9]{100,}$/.test(ua)) { setMsg({ ok: false, text: "Paste a mainnet Unified Address starting with u1." }); return; }
    if (zat < 100_000n) { setMsg({ ok: false, text: "Minimum redemption is 0.001 ZEC." }); return; }
    if (bal !== null && zat > bal) { setMsg({ ok: false, text: "That is more zkZEC than this wallet holds." }); return; }
    setBusy(true); setMsg(null);
    try {
      await w.send({ to: ZKZEC, data: encodeFunctionData({ abi: zkzecAbi, functionName: "redeem", args: [zat, ua] }) });
      setMsg({ ok: true, text: `Redeemed ${zec(Number(zat))} ZEC. Native shielded ZEC reaches your u1 address on the next run, usually within 10 minutes.` }); setAmount("");
    } catch (e) { setMsg({ ok: false, text: friendly(e) }); } finally { setBusy(false); }
  };

  const mine = useMemo(() => {
    if (!d || !me) return null;
    const accrued = d.accrued[me] ?? 0, paid = d.paid[me] ?? 0;
    const pays = d.payments.filter((p) => p.wallet === me);
    const redeems = (d.zkzec?.redeems ?? []).filter((r) => r.wallet === me);
    let pending = 0;
    const holdings = d.tokens.map((t) => {
      const h = t.wallets[me]; const eligible = Number(h?.eligible ?? 0), bal = Number(h?.balance ?? 0);
      const total = Object.values(t.wallets).reduce((s, x) => s + Number(x.eligible), 0);
      const share = total > 0 ? eligible / total : 0; const funded = Math.max(0, t.creditedZat - t.allocatedZat); pending += share * funded;
      return { t, bal, eligible, waiting: Math.max(0, bal - eligible), share, next: share * funded };
    }).filter((h) => h.bal > 0);
    return { accrued, paid, pays, redeems, pending, holdings };
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
            <span className="k">Paid to your wallet · nothing to register</span>
            <h2 style={{ fontSize: 24, margin: "8px 0 6px" }}>Your ZEC</h2>
            <div className="big">{bal !== null ? zec(Number(bal), 5) : "—"} <span style={{ fontSize: 16 }}>zkZEC</span></div>
            <p style={{ color: "var(--dim)", margin: "8px 0 14px", fontSize: 14 }}>Every {(d?.payoutSeconds ?? 7200) / 3600} hours your earned ZEC is minted as zkZEC straight to this wallet. 1 zkZEC = 1 ZEC, backed by the shielded pool. Hold it, send it, or redeem it for native ZEC below.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {w.address ? <button className="btn sm" onClick={() => void addToWallet()}>Add zkZEC to wallet</button> : <button className="btn primary sm" onClick={() => void w.connect()}>Connect wallet</button>}
              <a className="btn sm" href={`${EXPLORER}/token/${ZKZEC}`} target="_blank" rel="noreferrer">Token ↗</a>
            </div>
          </div>
          <div className="card-pad">
            <span className="k">Optional</span>
            <h2 style={{ fontSize: 24, margin: "8px 0 6px" }}>Redeem to native ZEC</h2>
            <p style={{ color: "var(--dim)", margin: "0 0 12px", fontSize: 14 }}>Burn zkZEC, receive shielded ZEC on the Zcash network at a Unified Address (u1…) from Zashi, Ywallet or Nighthawk. Minimum 0.001 ZEC.</p>
            <div className="inp" style={{ marginBottom: 8 }}>
              <input placeholder="Amount in ZEC" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} disabled={!w.address || busy} style={{ flex: "0 1 160px", minWidth: 120 }} />
              <button className="btn sm" onClick={() => bal !== null && setAmount((Number(bal) / 1e8).toFixed(8))} disabled={!bal}>Max</button>
            </div>
            <div className="inp">
              <input placeholder="Your u1… address" value={u1} onChange={(e) => setU1(e.target.value)} disabled={!w.address || busy} />
              {w.address ? <button className="btn primary" onClick={redeem} disabled={busy || !bal}>{busy ? "Signing…" : "Redeem"}</button> : <button className="btn primary" onClick={() => void w.connect()}>Connect wallet</button>}
            </div>
            {dest && <p className="k" style={{ marginTop: 8 }}>prefilled from your registered address</p>}
          </div>
        </div>

        <div className="g31">
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="onpaper"><span style={{ opacity: .8 }}>ZEC received</span><div className="big">{mine ? zec(mine.paid, 4) : "—"}</div><span className="k">paid to this wallet, cumulative</span></div>
              <div className="tabs">{(["1h", "6h", "all"] as const).map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r.toUpperCase()}</button>)}</div>
            </div>
            {!w.address ? <div className="empty onpaper" style={{ borderTop: "1px solid rgba(255,255,255,.3)", borderBottom: "1px solid rgba(255,255,255,.3)", margin: "30px 0" }}>↗<br />Connect a wallet to see your rewards</div>
              : series.length === 0 ? <div className="empty onpaper" style={{ borderTop: "1px solid rgba(255,255,255,.3)", borderBottom: "1px solid rgba(255,255,255,.3)", margin: "30px 0" }}>No completed payments in this range yet.</div>
              : <div className="bars" style={{ margin: "20px 0" }}>{cum.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%` }} title={`${zec(v)} ZEC`} />)}</div>}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "30px 0 12px", flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontSize: 20, color: "#fff" }}>{tab === "holdings" ? "Holdings" : tab === "payments" ? "Payments" : "Redemptions"}</h2>
              <div className="tabs"><button className={tab === "holdings" ? "on" : ""} onClick={() => setTab("holdings")}>Holdings</button><button className={tab === "payments" ? "on" : ""} onClick={() => setTab("payments")}>Payments</button><button className={tab === "redeems" ? "on" : ""} onClick={() => setTab("redeems")}>Redemptions</button></div>
            </div>
            <div className="card">
              {!w.address || !mine ? <div className="empty">Connect a wallet to see holdings and eligibility.</div> : tab === "holdings" ? (mine.holdings.length === 0 ? <div className="empty">You hold no launched token yet. <a href="/explore" style={{ textDecoration: "underline" }}>Explore tokens →</a></div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Token</th><th className="r">Balance</th><th className="r">Eligible</th><th className="r">Waiting</th><th className="r">Share</th><th className="r">Next round</th></tr></thead>
                  <tbody>{mine.holdings.map(({ t, bal, eligible, waiting, share, next }) => (
                    <tr key={t.token}><td><a href={`/tokens/${t.token}`} style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo t={t} size={28} /><span><b>{t.symbol}</b> <span style={{ color: "var(--dim)" }}>{t.name}</span></span></a></td><td className="r mono">{bal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="r mono">{eligible.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="r mono">{waiting.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="r mono">{(share * 100).toFixed(3)}%</td><td className="r mono">{zec(next)} ZEC</td></tr>
                  ))}</tbody>
                </table></div>
              )) : tab === "payments" ? (mine.pays.length === 0 ? <div className="empty">No payments yet. The next window is {d?.nextPayout ? hhmm(d.nextPayout) : "soon"}.</div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Time (UTC)</th><th className="r">ZEC</th><th>How</th><th>Transaction</th></tr></thead>
                  <tbody>{[...mine.pays].reverse().map((p, i) => (
                    <tr key={i}><td className="mono">{p.at.replace("T", " ").slice(0, 19)}</td><td className="r mono">{zec(p.zat)}</td><td>{p.kind === "mint" ? "zkZEC to wallet" : "native, shielded"}</td><td className="mono"><a href={paylink(p)} target="_blank" rel="noreferrer">{short(p.txid)} ↗</a></td></tr>
                  ))}</tbody>
                </table></div>
              )) : (mine.redeems.length === 0 ? <div className="empty">No redemptions yet.</div> : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Requested (UTC)</th><th className="r">ZEC</th><th>Status</th><th>Zcash tx</th></tr></thead>
                  <tbody>{[...mine.redeems].reverse().map((r) => (
                    <tr key={r.id}><td className="mono">{r.at.replace("T", " ").slice(0, 19)}</td><td className="r mono">{zec(r.zat)}</td><td>{r.status === "paid" ? <span className="pill ok" style={{ boxShadow: "none", padding: "3px 8px" }}><i />paid</span> : <span className="pill warn" style={{ boxShadow: "none", padding: "3px 8px" }}><i />pending</span>}</td><td className="mono">{r.txid ? <a href={`${ZEC_EXPLORER}/${r.txid}`} target="_blank" rel="noreferrer">{short(r.txid)} ↗</a> : "—"}</td></tr>
                  ))}</tbody>
                </table></div>
              ))}
            </div>
          </div>

          <aside className="onpaper">
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Rewards</h2>
            <div className="kv"><span>Pending · next round</span><b>{mine ? `${zec(mine.pending)} ZEC` : "—"}</b></div>
            <div className="kv"><span>Earned, not yet paid</span><b>{mine ? `${zec(mine.accrued)} ZEC` : "—"}</b></div>
            <div className="kv"><span>Payment minimum</span><b>{zec(d?.minPayoutZat ?? 0, 3)} ZEC</b></div>
            <div className="kv"><span>Next payout window</span><b>{d?.nextPayout ? hhmm(d.nextPayout) : "—"}</b></div>
            <div className="kv"><span>ZEC received</span><b>{mine ? `${zec(mine.paid)} ZEC` : "—"}</b></div>
            <p style={{ color: "var(--dim)", fontSize: 13, margin: "14px 0 10px" }}>Just hold. Rewards land in your wallet as zkZEC.</p>
            {!w.address && <button className="btn primary" onClick={() => void w.connect()}>Connect wallet</button>}
            {d && (
              <div style={{ marginTop: 30 }}>
                <span className="k">The pool</span>
                <div className="kv"><span>Backing · shielded ZEC</span><b>{zec(d.pool.balanceZat, 4)} ZEC</b></div>
                <div className="kv"><span>zkZEC in circulation</span><b>{zec(d.zkzec?.supply ?? 0, 4)}</b></div>
                <div className="kv"><span>Coverage</span><b>{((d.zkzec?.coverageBps ?? 10000) / 100).toFixed(0)}%</b></div>
                <div className="kv"><span>Owed to holders</span><b>{zec(d.pool.owedZat, 4)} ZEC</b></div>
                <div className="kv"><span>Paid out</span><b>{zec(d.totals.paidZat, 4)} ZEC</b></div>
                <div className="kv"><span>Tokens launched</span><b>{d.tokens.length}</b></div>
                <div className="kv"><span>Paid wallets</span><b><a href="/registered">{Object.values(d.paid).filter((v) => v > 0).length} · list →</a></b></div>
                <div className="kv"><span>Updated</span><b>{new Date(d.generatedAt).toLocaleTimeString()}</b></div>
                <div style={{ marginTop: 14 }}><Ca address={ZKZEC} symbol="zkZEC" onpaper /></div>
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
