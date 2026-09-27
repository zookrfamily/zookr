import { Nav, Foot } from "../nav.tsx";

const STEPS: [string, string][] = [
  ["Open the dashboard", "Go to zookr.family/dashboard from the wallet browser or your desktop browser with MetaMask or Rabby installed."],
  ["Connect the wallet that holds ZOOKR", "Any wallet on Robinhood Chain. Rewards already accrue to it; connecting only lets you register where the ZEC should go."],
  ["Paste your Zcash u1 address", "From a Zcash wallet that gives you a Unified Address starting with u1: Zashi, Ywallet or Nighthawk. Exchange addresses (t1…) cannot receive shielded payouts."],
  ["Click Register and sign", "One transaction on Robinhood Chain, a little ETH for gas. Registration is public and permanent for that wallet."],
];

export default function Tutorial() {
  return (
    <>
      <Nav />
      <main className="wrap page">
        <div className="page-head"><div><span className="k">Tutorial</span><h1>Register your Zcash address</h1></div><span className="pill ok"><i />19 seconds</span></div>
        <div className="card">
          <video controls playsInline preload="metadata" poster="/tutorial-register.jpg" src="/tutorial-register.mp4" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", background: "#2a0d14" }} />
        </div>
        <div className="steps" style={{ margin: "18px 0 0" }}>
          {STEPS.map(([h, p], i) => <div key={h}><b>0{i + 1}</b><h3>{h}</h3><p>{p}</p></div>)}
        </div>
        <div className="g31" style={{ marginTop: 26 }}>
          <div className="card card-pad">
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>After you register</h2>
            <p style={{ color: "var(--dim)", margin: 0, fontSize: 14 }}>Nothing else to do. Every ten minutes a round splits the funded ZEC across eligible holders. Once your accrued rewards pass 0.001 ZEC, a shielded payment lands at your u1 address with a receipt on the dashboard. Selling later keeps every round that already closed.</p>
          </div>
          <aside className="onpaper">
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Get a u1 address</h2>
            <div className="kv"><span>Zashi</span><b><a href="https://electriccoin.co/zashi/" target="_blank" rel="noreferrer">Android · iOS ↗</a></b></div>
            <div className="kv"><span>Ywallet</span><b><a href="https://ywallet.app/" target="_blank" rel="noreferrer">Android · iOS · desktop ↗</a></b></div>
            <div className="kv"><span>Nighthawk</span><b><a href="https://nighthawkwallet.com/" target="_blank" rel="noreferrer">Android · iOS ↗</a></b></div>
            <p style={{ fontSize: 13, opacity: .9, marginTop: 12 }}>Copy the Unified Address (u1…) from the wallet&apos;s receive screen. Never share a seed phrase; Zookr never asks for one.</p>
            <a className="btn primary" href="/dashboard" style={{ marginTop: 10 }}>Open the dashboard →</a>
          </aside>
        </div>
      </main>
      <Foot />
    </>
  );
}
