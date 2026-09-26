"use client";

import { useState } from "react";
import { Nav, Foot, Tg } from "./nav.tsx";
import { useData } from "./data.ts";
import { zec, short, TELEGRAM_URL, GITHUB_URL, REGISTRY, EXPLORER } from "../src/site.ts";

const FAQ: [string, string][] = [
  ["Do I need to stake or claim?", "No. Hold the pool's token in your own wallet. Rewards accrue to your address automatically and are paid out automatically. Nothing ever leaves your wallet."],
  ["I just bought - when do I qualify?", "A new amount skips the next scheduled round and qualifies for the one after. Buy at minute 9 and you are in the minute-20 round. Your older tokens keep their place."],
  ["What if I sell after a round?", "Allocations are final the moment a round is processed. Selling afterwards does not erase what you earned. Sells consume your newest tokens first."],
  ["Is it real ZEC?", "Yes. Native ZEC on the Zcash network, sent shielded to the u1 address you register. Not a wrapped token, not an IOU on another chain."],
  ["What is the minimum payout?", "0.001 ZEC accrued across all pools. Below that, your balance keeps accumulating and is paid when it crosses the line."],
  ["Is my Zcash address private?", "The registration is public on Robinhood Chain: anyone can see which u1 address your wallet authorized. The payments themselves are shielded, so amounts and timing are private on Zcash."],
  ["Who runs the pool?", "The pool is a shielded Zcash wallet the operator funds and holds. The registry is a contract with no admin. Every allocation is published so you can audit the split."],
];

export default function Home() {
  const { d } = useData();
  const [open, setOpen] = useState<number | null>(0);
  const pool = d?.pools[0];
  const eligible = pool ? Object.entries(pool.wallets).map(([w, v]) => ({ w, el: Number(v.eligible) })).filter((x) => x.el > 0).sort((a, b) => b.el - a.el) : [];
  const totalEl = eligible.reduce((s, x) => s + x.el, 0);
  const runway = d && pool && pool.emissionZatPerDay > 0 ? Math.max(0, (d.pool.balanceZat - d.pool.owedZat) / pool.emissionZatPerDay) : 0;

  return (
    <>
      <Nav />

      {/* ---- hero ---- */}
      <section className="hero" style={{ minHeight: "calc(100vh - 60px)" }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static mark */}
          <img src="/logo.png" alt="Zookr" width={132} height={132} />
          <h1>Native ZEC rewards<br />for holders</h1>
          <p>Hold a token on Robinhood Chain in your own wallet. Register a Zcash address once. A funded pool pays you shielded ZEC every ten minutes. No staking, no claim.</p>
          <div className="ctas">
            <a className="btn primary" href="/dashboard">Open dashboard →</a>
            <a className="btn ghost" href="/explore">Explore pools</a>
            <a className="btn ghost" href={TELEGRAM_URL} target="_blank" rel="noreferrer"><Tg /> Telegram</a>
          </div>
          <div className="hero-stats">
            <div><b>{d ? pool?.holders ?? 0 : "—"}</b><span>holders tracked</span></div>
            <div><b>{d ? eligible.length : "—"}</b><span>eligible next round</span></div>
            <div><b>{d ? zec(d.totals.paidZat, 4) : "—"}</b><span>ZEC paid out</span></div>
            <div><b>{d ? `${d.roundSeconds / 60} min` : "—"}</b><span>per round</span></div>
          </div>
        </div>
      </section>

      {/* ---- how ---- */}
      <section className="wrap sec">
        <div className="sec-head"><span className="k">How it works</span><h2>Four steps, no middleman</h2></div>
        <div className="steps" style={{ margin: 0 }}>
          <div><b>01</b><h3>A pool is funded</h3><p>The operator sends real ZEC to a shielded pool address and sets an emission per day. Deposits show on the pool page.</p></div>
          <div><b>02</b><h3>You hold</h3><p>Keep the pool&apos;s token in your wallet. A new buy skips one round, then qualifies for every round after. Contracts and LP pools are excluded.</p></div>
          <div><b>03</b><h3>Rounds allocate</h3><p>Every ten minutes the round&apos;s ZEC is split pro-rata across eligible holders. Allocations are final and published.</p></div>
          <div><b>04</b><h3>You are paid</h3><p>Register a u1 address on-chain. Once you have accrued 0.001 ZEC, a shielded payment lands in your wallet with a receipt.</p></div>
        </div>
      </section>

      {/* ---- the pool, live ---- */}
      <section className="wrap sec">
        <div className="sec-head"><span className="k">Live</span><h2>The pool right now</h2></div>
        <div className="card gstat g4">
          <div className="card-pad"><span className="k">Pool balance</span><div className="big">{d ? zec(d.pool.balanceZat, 4) : "—"}</div><span className="k">spendable ZEC</span></div>
          <div className="card-pad"><span className="k">Emission</span><div className="big">{pool ? zec(pool.emissionZatPerDay, 3) : "—"}</div><span className="k">ZEC / day · {pool ? zec(pool.perRoundZat) : "—"} per round</span></div>
          <div className="card-pad"><span className="k">Rounds processed</span><div className="big">{pool?.rounds ?? "—"}</div><span className="k">next {pool ? new Date(pool.nextRound * 1000).toUTCString().slice(17, 25) : "—"} UTC</span></div>
          <div className="card-pad"><span className="k">Runway</span><div className="big">{d ? `${runway.toFixed(1)} d` : "—"}</div><span className="k">at current emission</span></div>
        </div>
        <div className="g31" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="card-head"><span className="k">Who the next round pays · {pool?.symbol ?? "…"}</span><span className="k">{eligible.length} wallets</span></div>
            {eligible.length === 0 ? <div className="empty">No eligible wallet yet.</div> : (
              <div className="table-wrap"><table>
                <thead><tr><th>Wallet</th><th className="r">Eligible</th><th className="r">Share</th><th className="r">Per round</th></tr></thead>
                <tbody>{eligible.slice(0, 8).map((x) => <tr key={x.w}><td className="mono"><a href={`${EXPLORER}/address/${x.w}`} target="_blank" rel="noreferrer">{short(x.w)}</a></td><td className="r mono">{x.el.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td><td className="r mono">{totalEl ? ((x.el / totalEl) * 100).toFixed(2) : "0.00"}%</td><td className="r mono">{zec(totalEl ? (x.el / totalEl) * (pool?.perRoundZat ?? 0) : 0)} ZEC</td></tr>)}</tbody>
              </table></div>
            )}
          </div>
          <aside className="onpaper">
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Fund the pool</h2>
            <p style={{ fontSize: 14, opacity: .9 }}>Native ZEC only, on the Zcash network. Send from any Zcash wallet to the shielded pool address. Every deposit extends the runway at the current emission.</p>
            <p className="mono" style={{ fontSize: 11, wordBreak: "break-all", background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.4)", borderRadius: 12, padding: "10px 12px" }}>{d?.pool.address || "—"}</p>
            <div className="kv"><span>Token</span><b>{pool ? `${pool.symbol}` : "—"}</b></div>
            <div className="kv"><span>Min hold</span><b>{pool ? `${Number(pool.minHold).toLocaleString("en-US")} ${pool.symbol}` : "—"}</b></div>
            <div className="kv"><span>Registered wallets</span><b>{d?.registered ?? "—"}</b></div>
            <a className="btn primary" href="/dashboard" style={{ marginTop: 14 }}>Register my Zcash address →</a>
          </aside>
        </div>
      </section>

      {/* ---- why ---- */}
      <section className="wrap sec">
        <div className="sec-head"><span className="k">Why Zookr</span><h2>Built to be checked, not trusted</h2></div>
        <div className="why">
          <div className="card card-pad"><h3>Real, shielded ZEC</h3><p>Payouts are native Zcash sent to Orchard addresses. No wrapped asset, no bridge, no token you have to sell to get out.</p></div>
          <div className="card card-pad"><h3>Nothing to lock</h3><p>Your tokens stay in your wallet the whole time. Sell whenever you like; you keep every round that already closed.</p></div>
          <div className="card card-pad"><h3>Automatic, every ten minutes</h3><p>A scheduled job reads Robinhood Chain, allocates, pays and publishes. No claim button, no operator clicking send.</p></div>
          <div className="card card-pad"><h3>Registry with no admin</h3><p>One contract maps your wallet to your Zcash address. Once, permanently, only by you. {REGISTRY && <a className="mono" style={{ fontSize: 12 }} href={`${EXPLORER}/address/${REGISTRY}`} target="_blank" rel="noreferrer">{short(REGISTRY)} ↗</a>}</p></div>
          <div className="card card-pad"><h3>Every allocation is public</h3><p>The full state - lots, eligibility, accruals, payments and txids - is published each round. Audit the split yourself.</p></div>
          <div className="card card-pad"><h3>Open source</h3><p>Contract, rounds engine and this site are in one public repository. <a className="mono" style={{ fontSize: 12 }} href={GITHUB_URL} target="_blank" rel="noreferrer">github.com/zookrfamily/zookr ↗</a></p></div>
        </div>
      </section>

      {/* ---- faq ---- */}
      <section className="wrap sec">
        <div className="sec-head"><span className="k">FAQ</span><h2>Common questions</h2></div>
        <div className="card">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={`faq${open === i ? " open" : ""}`}>
              <button onClick={() => setOpen(open === i ? null : i)}>{q}<span>{open === i ? "−" : "+"}</span></button>
              {open === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ---- cta ---- */}
      <section className="wrap sec" style={{ textAlign: "center" }}>
        <div className="onpaper">
          <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)" }}>Join the family</h2>
          <p style={{ maxWidth: 560, margin: "14px auto 24px", opacity: .9 }}>Announcements, pool top-ups and payout reports go out on Telegram first.</p>
          <div className="ctas" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn primary" href={TELEGRAM_URL} target="_blank" rel="noreferrer"><Tg /> t.me/ZookrFamily</a>
            <a className="btn ghost" href="/docs">Read the docs</a>
          </div>
        </div>
      </section>
      <Foot />
    </>
  );
}
