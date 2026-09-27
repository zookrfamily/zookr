"use client";

import { use, useState } from "react";
import { Nav, Foot } from "../../nav.tsx";
import { useData } from "../../data.ts";
import { useWallet } from "../../wallet.ts";
import { Logo, Venue, Ca } from "../../tokenrow.tsx";
import { zec, short, eth, usd, hhmm, EXPLORER, ZEC_EXPLORER, PONS } from "../../../src/site.ts";

export default function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { d, err } = useData();
  const w = useWallet();
  const [range, setRange] = useState<"1h" | "6h" | "all">("all");
  const [tab, setTab] = useState<"rewards" | "funding">("rewards");
  const [copied, setCopied] = useState(false);
  const t = d?.tokens.find((x) => x.token === address.toLowerCase());
  const me = w.address?.toLowerCase() ?? "";
  const mine = t?.wallets[me];
  const totalEligible = t ? Object.values(t.wallets).reduce((s, x) => s + Number(x.eligible), 0) : 0;
  const share = t && mine && totalEligible > 0 ? Number(mine.eligible) / totalEligible : 0;
  // payments are per wallet across tokens; this token's paid figure is its allocated ZEC that has cleared the pool
  const cutoff = range === "1h" ? Date.now() - 3600e3 : range === "6h" ? Date.now() - 6 * 3600e3 : 0;
  const convs = t ? (d?.conversions ?? []).filter((c) => c.token === t.token) : [];
  const pays = t ? (d?.payments ?? []).filter((p) => t.wallets[p.wallet] && new Date(p.at).getTime() >= cutoff) : [];
  const cum = pays.reduce<number[]>((a, p) => [...a, (a[a.length - 1] ?? 0) + p.zat], []);
  const max = Math.max(1, ...cum);
  const copy = () => { void navigator.clipboard?.writeText(t?.token ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1200); };

  return (
    <>
      <Nav />
      <main className="wrap page">
        <a href="/explore" className="k" style={{ color: "rgba(255,255,255,.85)" }}>← Explore</a>
        {err && <div className="msg err">data unavailable: {err}</div>}
        {!d ? <div className="empty">Loading…</div> : !t ? <div className="empty onpaper">This token is not in the launchpad yet. New launches appear within ten minutes.</div> : (
          <>
            <div className="page-head" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <Logo t={t} size={56} />
                <div>
                  <span className="k">Native ZEC rewards</span>
                  <h1>{t.name} <span style={{ opacity: .7 }}>/ {t.symbol}</span></h1>
                  <span className="mono" style={{ fontSize: 12, color: "rgba(255,255,255,.85)" }}>{t.token} <button className="btn sm" style={{ padding: "2px 10px", marginLeft: 6 }} onClick={copy}>{copied ? "Copied" : "Copy"}</button></span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="pill ok"><i />Up to date</span><a className="btn primary" href={`${PONS}/token/${t.token}`} target="_blank" rel="noreferrer">Trade ↗</a></div>
            </div>
            <div style={{ marginBottom: 26 }}><Ca address={t.token} symbol={t.symbol} onpaper /></div>

            <div className="g31" style={{ marginTop: 0 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div className="onpaper"><span style={{ opacity: .85 }}>ZEC paid to holders</span><div className="big">{t.allocatedZat > 0 ? zec(t.allocatedZat, 5) : "—"}</div><span className="k">native ZEC · allocated to {t.symbol} holders</span></div>
                  <div className="tabs">{(["1h", "6h", "all"] as const).map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r.toUpperCase()}</button>)}</div>
                </div>
                {pays.length === 0
                  ? <div className="empty onpaper" style={{ borderTop: "1px solid rgba(255,255,255,.3)", borderBottom: "1px solid rgba(255,255,255,.3)", margin: "24px 0" }}>Verified ZEC payments will appear here.</div>
                  : <div className="bars" style={{ margin: "20px 0" }}>{cum.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%` }} title={`${zec(v)} ZEC`} />)}</div>}
                <div className="card g2" style={{ marginTop: 20 }}>
                  <div className="card-pad">
                    <span className="k">My eligible holdings</span>
                    <div className="big" style={{ fontSize: 26 }}>{me && mine ? Number(mine.eligible).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}</div>
                    {!me ? <p style={{ color: "var(--dim)", fontSize: 13.5, margin: "8px 0 0" }}>Connect a wallet to see your position. <button className="btn sm" onClick={() => void w.connect()}>Connect wallet</button></p>
                      : <p style={{ color: "var(--dim)", fontSize: 13.5, margin: "8px 0 0" }}>{mine ? `${Number(mine.balance).toLocaleString("en-US", { maximumFractionDigits: 0 })} held · ${(share * 100).toFixed(3)}% of the next round` : `You do not hold ${t.symbol}.`}</p>}
                  </div>
                  <div className="card-pad">
                    <span className="k">My rewards · this token</span>
                    <div className="big" style={{ fontSize: 26 }}>{me && mine ? `${zec(share * (t.creditedZat - t.allocatedZat))} ZEC` : "—"}</div>
                    <p style={{ color: "var(--dim)", fontSize: 13.5, margin: "8px 0 0" }}>{me ? <>share of what is funded and not yet allocated · <a href="/dashboard" style={{ textDecoration: "underline" }}>all my rewards</a></> : "Personal rewards appear here."}</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "30px 0 12px" }}>
                  <h2 style={{ fontSize: 20, color: "#fff" }}>Activity</h2>
                  <div className="tabs"><button className={tab === "rewards" ? "on" : ""} onClick={() => setTab("rewards")}>Rewards &amp; payouts</button><button className={tab === "funding" ? "on" : ""} onClick={() => setTab("funding")}>Collection &amp; funding</button></div>
                </div>
                <div className="card">
                  {tab === "rewards" ? (pays.length === 0 ? <div className="empty">Verified reward activity has not been published yet.</div> : (
                    <div className="table-wrap"><table>
                      <thead><tr><th>Time (UTC)</th><th>Event</th><th>Wallet</th><th className="r">ZEC</th><th>Reference</th></tr></thead>
                      <tbody>{[...pays].reverse().slice(0, 50).map((p, i) => <tr key={i} className={p.wallet === me ? "me" : undefined}><td className="mono">{p.at.replace("T", " ").slice(0, 19)}</td><td>Payout</td><td className="mono">{short(p.wallet)}</td><td className="r mono">{zec(p.zat)}</td><td className="mono"><a href={`${ZEC_EXPLORER}/${p.txid}`} target="_blank" rel="noreferrer">{short(p.txid)} ↗</a></td></tr>)}</tbody>
                    </table></div>
                  )) : (convs.length === 0 ? <div className="empty">No fee collection yet. Fees are collected once the vault holds at least 0.003 ETH.</div> : (
                    <div className="table-wrap"><table>
                      <thead><tr><th>Time (UTC)</th><th>Event</th><th className="r">ETH</th><th className="r">ZEC</th><th>Reference</th></tr></thead>
                      <tbody>{[...convs].reverse().map((c, i) => <tr key={i}><td className="mono">{c.at.replace("T", " ").slice(0, 19)}</td><td>Collect &amp; convert · <span className="mono" style={{ fontSize: 11 }}>{c.status}</span></td><td className="r mono">{eth(c.wei)}</td><td className="r mono">{c.zat > 0 ? zec(c.zat) : `~${Number(c.expectZec).toFixed(6)}`}</td><td className="mono">{c.txs.map((h) => <a key={h} href={`${EXPLORER}/tx/${h}`} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{short(h)} ↗</a>)}</td></tr>)}</tbody>
                    </table></div>
                  ))}
                </div>

                <div className="card card-pad" style={{ marginTop: 30 }}>
                  <h2 style={{ fontSize: 20, marginBottom: 8 }}>About {t.name}</h2>
                  <p style={{ color: "var(--dim)", margin: 0, whiteSpace: "pre-wrap" }}>{t.description || "No description provided."}</p>
                  {(t.socials?.twitter || t.socials?.telegram || t.socials?.website) && (
                    <p style={{ margin: "10px 0 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {t.socials.twitter && <a className="btn sm" href={t.socials.twitter} target="_blank" rel="noreferrer">X ↗</a>}
                      {t.socials.telegram && <a className="btn sm" href={t.socials.telegram} target="_blank" rel="noreferrer">Telegram ↗</a>}
                      {t.socials.website && <a className="btn sm" href={t.socials.website} target="_blank" rel="noreferrer">Website ↗</a>}
                    </p>
                  )}
                  <h3 style={{ fontSize: 16, margin: "22px 0 6px" }}>How rewards work</h3>
                  <p style={{ color: "var(--dim)", margin: 0, fontSize: 14 }}>90% of this token&apos;s distributable reward revenue is paid to its eligible holders in native ZEC. The other 10% is allocated to platform-token holders.{d.platformToken?.toLowerCase() === t.token && <> <b>{t.symbol} is the platform token</b>: its holders also receive 10% of every other token&apos;s converted fees and any ZEC deposited to the pool.</>}</p>
                  <p style={{ color: "var(--dim)", margin: "8px 0 0", fontSize: 14 }}>Fees are collected in ETH and converted to ZEC before payment. Collected fees, funded ZEC, earned rewards and completed payments are separate stages.</p>
                </div>
              </div>

              <aside className="onpaper">
                <h2 style={{ fontSize: 20, marginBottom: 10 }}>Totals</h2>
                <div className="kv"><span>Creator fees collected</span><b>{eth(t.feesEthCollected)} ETH</b></div>
                <div className="kv"><span>Fees waiting to be collected</span><b>{eth(t.feesEthPending)} ETH</b></div>
                <div className="kv"><span>ZEC funded for holders</span><b>{t.creditedZat > 0 ? zec(t.creditedZat, 5) : "—"} ZEC</b></div>
                <div className="kv"><span>ZEC paid to holders</span><b style={{ color: "#fff" }}>{t.allocatedZat > 0 ? zec(t.allocatedZat, 5) : "—"} ZEC</b></div>
                {d.platformToken?.toLowerCase() === t.token
                  ? <div className="kv"><span>Platform share funded (10% of every token)</span><b>{d.platform.creditedZat > 0 ? zec(d.platform.creditedZat, 5) : "—"} ZEC</b></div>
                  : <div className="kv"><span>Platform allocation funded</span><b>{d.platform.creditedZat > 0 ? zec(d.platform.creditedZat, 5) : "—"} ZEC</b></div>}
                <div style={{ margin: "18px 0 4px" }}><span className="k">Reward round</span><div style={{ fontSize: 18, fontWeight: 700 }}>ZEC rewards enabled</div><span className="k">round {t.rounds} · next {hhmm(t.nextRound)} · {t.eligibleHolders} eligible</span></div>

                <h2 style={{ fontSize: 20, margin: "30px 0 10px" }}>Token details</h2>
                <div className="kv"><span>Venue</span><b><Venue v={t.venue} /></b></div>
                <div className="kv"><span>Market cap · estimate</span><b>{usd(t.mcapUsd)}</b></div>
                <div className="kv"><span>Current supply</span><b>1,000,000,000 {t.symbol}</b></div>
                <div className="kv"><span>Holders</span><b>{t.holders}</b></div>
                <div className="kv"><span>Launched</span><b>{new Date(t.launchedAt * 1000).toUTCString().slice(5, 16)}</b></div>
                <div className="kv"><span>Token</span><b><a href={`${EXPLORER}/token/${t.token}`} target="_blank" rel="noreferrer">{short(t.token)} ↗</a></b></div>
                <div className="kv"><span>Fee vault</span><b><a href={`${EXPLORER}/address/${t.vault}`} target="_blank" rel="noreferrer">{short(t.vault)} ↗</a></b></div>
                <div className="kv"><span>Creator</span><b><a href={`${EXPLORER}/address/${t.creator}`} target="_blank" rel="noreferrer">{short(t.creator)} ↗</a></b></div>
                <div className="kv"><span>Bonding curve</span><b><a href={`${EXPLORER}/address/${t.curve}`} target="_blank" rel="noreferrer">{short(t.curve)} ↗</a></b></div>
                <p className="k" style={{ marginTop: 14, color: "rgba(255,255,255,.7)" }}>Updated {new Date(d.generatedAt).toUTCString().slice(17, 25)} UTC</p>
              </aside>
            </div>
          </>
        )}
      </main>
      <Foot />
    </>
  );
}
