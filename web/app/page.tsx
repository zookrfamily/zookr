"use client";

import { useState } from "react";
import { Nav, Foot, Tg } from "./nav.tsx";
import { useData } from "./data.ts";
import { Logo, Venue, Ca } from "./tokenrow.tsx";
import { zec, short, eth, usd, hhmm, TELEGRAM_URL, GITHUB_URL, REGISTRY, LAUNCHPAD, EXPLORER } from "../src/site.ts";

const FAQ: [string, string][] = [
  ["Where does the ZEC come from?", "Every token launched on Zookr carries a fixed 2% creator fee on buys and sells. The fee is collected in ETH, converted to native ZEC, and 90% is credited to that token's holders. The other 10% goes to holders of the platform token."],
  ["Do I need to stake or claim?", "No. Hold a launched token in your own wallet. Rewards accrue to your address automatically and are paid out automatically. Nothing ever leaves your wallet."],
  ["I just bought - when do I qualify?", "A new amount skips the next scheduled round and qualifies for the one after. Buy at minute 9 and you are in the minute-20 round. Your older tokens keep their place."],
  ["What if I sell after a round?", "Allocations are final the moment a round is processed. Selling afterwards does not erase what you earned. Sells consume your newest tokens first."],
  ["Is it real ZEC?", "Yes. Native ZEC on the Zcash network, sent shielded to the u1 address you register. Not a wrapped token, not an IOU on another chain."],
  ["What is the minimum payout?", "0.001 ZEC accrued across all tokens. Below that, your balance keeps accumulating and is paid when it crosses the line."],
  ["What does launching cost?", "The Pons launch fee of 0.0005 ETH plus gas. You can add an initial buy in the same transaction; it lands in your wallet, exempt from the launch-window snipe tax. Creators get no fee controls: the 90/10 profile is fixed for everyone."],
  ["Who runs this?", "The registry and the launchpad are contracts with no admin over your funds. The pool is a shielded Zcash wallet the operator holds, and the rounds engine is a scheduled job. Every allocation is published so you can audit the split."],
];

export default function Home() {
  const { d } = useData();
  const [open, setOpen] = useState<number | null>(0);
  const tokens = d?.tokens ?? [];
  const latest = tokens.slice(0, 5);

  return (
    <>
      <Nav />

      {/* ---- hero ---- */}
      <section className="hero" style={{ minHeight: "calc(100vh - 60px)" }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static mark */}
          <img src="/logo.png" alt="Zookr" width={132} height={132} />
          <h1>Launch a token.<br />Holders earn ZEC.</h1>
          <p>Every token launched on Zookr pays its holders native, shielded ZEC from a fixed 2% trading fee. Hold in your own wallet, register a Zcash address once, get paid every ten minutes. No staking, no claim.</p>
          <div className="ctas">
            <a className="btn primary" href="/launch">Launch a token →</a>
            <a className="btn ghost" href="/explore">Explore tokens</a>
            <a className="btn ghost" href={TELEGRAM_URL} target="_blank" rel="noreferrer"><Tg /> Telegram</a>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}><Ca onpaper /></div>
          <div className="hero-stats">
            <div><b>{d ? tokens.length : "—"}</b><span>tokens launched</span></div>
            <div><b>{d ? eth(d.totals.feesEthCollected, 4) : "—"} ETH</b><span>fees collected</span></div>
            <div><b>{d ? zec(d.totals.paidZat, 4) : "—"}</b><span>ZEC paid out</span></div>
            <div><b>{d ? `${d.roundSeconds / 60} min` : "—"}</b><span>per round</span></div>
          </div>
        </div>
      </section>

      {/* ---- how ---- */}
      <section className="wrap sec">
        <div className="sec-head"><span className="k">How it works</span><h2>Four steps, no middleman</h2></div>
        <div className="steps" style={{ margin: 0 }}>
          <div><b>01</b><h3>A token launches</h3><p>Anyone launches on Pons through Zookr. A fixed 2% creator fee on every buy and sell is routed to a vault that belongs to that token.</p></div>
          <div><b>02</b><h3>Fees become ZEC</h3><p>The rounds engine collects the vault, swaps the ETH for native ZEC, and credits 90% to the token&apos;s holders and 10% to platform-token holders.</p></div>
          <div><b>03</b><h3>Rounds allocate</h3><p>Every ten minutes the credited ZEC is split pro-rata across wallets that held through the previous round. Allocations are final and published.</p></div>
          <div><b>04</b><h3>You are paid</h3><p>Register a u1 address on-chain. Once you have accrued 0.001 ZEC, a shielded payment lands in your wallet with a receipt.</p></div>
        </div>
      </section>

      {/* ---- live ---- */}
      <section className="wrap sec">
        <div className="sec-head"><span className="k">Live</span><h2>Launched on Zookr</h2></div>
        <div className="card gstat g4">
          <div className="card-pad"><span className="k">Tokens launched</span><div className="big">{d ? tokens.length : "—"}</div><span className="k">{tokens.filter((t) => t.venue === "curve").length} on the curve · {tokens.filter((t) => t.venue === "uniswap").length} on Uniswap</span></div>
          <div className="card-pad"><span className="k">Fees collected</span><div className="big">{d ? eth(d.totals.feesEthCollected, 4) : "—"}</div><span className="k">ETH · converted to ZEC</span></div>
          <div className="card-pad"><span className="k">Pool balance</span><div className="big">{d ? zec(d.pool.balanceZat, 4) : "—"}</div><span className="k">spendable ZEC · {d ? zec(d.pool.owedZat, 4) : "—"} owed</span></div>
          <div className="card-pad"><span className="k">ZEC paid out</span><div className="big">{d ? zec(d.totals.paidZat, 4) : "—"}</div><span className="k">{d?.totals.payments ?? 0} payments, each counted once</span></div>
        </div>
        <div className="g31" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="card-head"><span className="k">Newest tokens</span><a className="k" href="/explore" style={{ color: "var(--ink)" }}>All tokens →</a></div>
            {latest.length === 0 ? <div className="empty">No token launched yet. <a href="/launch" style={{ textDecoration: "underline" }}>Be the first →</a></div> : (
              <div className="table-wrap"><table>
                <thead><tr><th>Token</th><th>Market cap</th><th className="r">ZEC paid</th><th className="r">Fees</th><th>Next round</th><th>Venue</th></tr></thead>
                <tbody>{latest.map((t) => <tr key={t.token}><td><a href={`/tokens/${t.token}`} style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo t={t} size={30} /><span><b>{t.name}</b> <span className="mono" style={{ fontSize: 11, color: "var(--dim)" }}>{t.symbol}</span></span></a></td><td className="mono">{usd(t.mcapUsd)}</td><td className="r mono">{t.allocatedZat > 0 ? zec(t.allocatedZat, 5) : "—"}</td><td className="r mono">{eth(t.feesEthCollected)} ETH</td><td className="mono">{hhmm(t.nextRound)}</td><td><Venue v={t.venue} /></td></tr>)}</tbody>
              </table></div>
            )}
          </div>
          <aside className="onpaper">
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Every trade keeps rewarding</h2>
            <p style={{ fontSize: 14, opacity: .9 }}>A fixed 2% creator fee on buys and sells funds automatic native-ZEC rewards. Creators cannot change it, redirect it or switch it off.</p>
            <div className="kv"><b style={{ fontSize: 26, fontFamily: "var(--mono)" }}>90%</b><span style={{ flex: 1, color: "#fff" }}>to the token&apos;s eligible holders</span></div>
            <div className="kv"><b style={{ fontSize: 26, fontFamily: "var(--mono)" }}>10%</b><span style={{ flex: 1, color: "#fff" }}>to platform-token holders</span></div>
            <div className="kv"><span>Launch fee</span><b>0.0005 ETH</b></div>
            <div className="kv"><span>Supply</span><b>1,000,000,000</b></div>
            <div className="kv"><span>Graduates to Uniswap at</span><b>4.2 ETH</b></div>
            <div className="kv"><span>Registered wallets</span><b>{d?.registered ?? "—"}</b></div>
            <div style={{ marginTop: 14 }}><span className="k" style={{ color: "rgba(255,255,255,.8)" }}>Platform token · holders get 10% of every token&apos;s fees</span><div style={{ marginTop: 6 }}><Ca onpaper /></div></div>
            <a className="btn primary" href="/launch" style={{ marginTop: 14 }}>Launch a token →</a>
          </aside>
        </div>
      </section>

      {/* ---- why ---- */}
      <section className="wrap sec">
        <div className="sec-head"><span className="k">Why Zookr</span><h2>Built to be checked, not trusted</h2></div>
        <div className="why">
          <div className="card card-pad"><h3>Real, shielded ZEC</h3><p>Payouts are native Zcash sent to Orchard addresses. No wrapped asset, no bridge, no token you have to sell to get out.</p></div>
          <div className="card card-pad"><h3>Nothing to lock</h3><p>Your tokens stay in your wallet the whole time. Sell whenever you like; you keep every round that already closed.</p></div>
          <div className="card card-pad"><h3>Automatic, every ten minutes</h3><p>A scheduled job reads Robinhood Chain, collects fees, converts, allocates, pays and publishes. No claim button.</p></div>
          <div className="card card-pad"><h3>Fixed fee profile</h3><p>One launchpad contract sets the 2% fee and its vault for every token. {LAUNCHPAD && <a className="mono" style={{ fontSize: 12 }} href={`${EXPLORER}/address/${LAUNCHPAD}`} target="_blank" rel="noreferrer">{short(LAUNCHPAD)} ↗</a>}</p></div>
          <div className="card card-pad"><h3>Registry with no admin</h3><p>One contract maps your wallet to your Zcash address. Once, permanently, only by you. {REGISTRY && <a className="mono" style={{ fontSize: 12 }} href={`${EXPLORER}/address/${REGISTRY}`} target="_blank" rel="noreferrer">{short(REGISTRY)} ↗</a>}</p></div>
          <div className="card card-pad"><h3>Open source</h3><p>Contracts, rounds engine and this site are in one public repository. <a className="mono" style={{ fontSize: 12 }} href={GITHUB_URL} target="_blank" rel="noreferrer">github.com/zookrfamily/zookr ↗</a></p></div>
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
          <p style={{ maxWidth: 560, margin: "14px auto 24px", opacity: .9 }}>New launches, fee conversions and payout reports go out on Telegram first.</p>
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
