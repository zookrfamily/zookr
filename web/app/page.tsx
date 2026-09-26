import { Nav, Foot } from "./nav.tsx";

export default function Home() {
  return (
    <>
      <Nav />
      <section className="hero">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static mark */}
          <img src="/logo.png" alt="Zookr" width={132} height={132} />
          <h1>Native ZEC rewards<br />for holders</h1>
          <p>Hold a token on Robinhood Chain in your own wallet. Register a Zcash address once. A funded pool pays you shielded ZEC every ten minutes. No staking, no claim.</p>
          <div className="ctas">
            <a className="btn primary" href="/dashboard">Open dashboard →</a>
            <a className="btn ghost" href="/explore">Explore pools</a>
          </div>
        </div>
      </section>
      <div className="steps">
        <div><b>01</b><h3>A pool is funded</h3><p>The pool operator sends real ZEC to a shielded pool address and sets an emission per day.</p></div>
        <div><b>02</b><h3>You hold</h3><p>Keep the pool&apos;s token in your wallet. A new buy skips one round, then qualifies for every round after.</p></div>
        <div><b>03</b><h3>Rounds allocate</h3><p>Every ten minutes the round&apos;s ZEC is split pro-rata across eligible holders. Allocations are final.</p></div>
        <div><b>04</b><h3>You are paid</h3><p>Register a u1 address on-chain. Once you have accrued the minimum, ZEC arrives in your wallet with a receipt.</p></div>
      </div>
      <Foot />
    </>
  );
}
