import { Nav, Foot } from "../nav.tsx";
import { Ca } from "../tokenrow.tsx";
import { ZKZEC } from "../../src/site.ts";

const STEPS: [string, string][] = [
  ["Hold ZOOKR in your own wallet", "Any wallet on Robinhood Chain: MetaMask, Rabby, the Robinhood wallet. Tokens held through one full 10-minute round start earning. No staking, no sign-up."],
  ["Rewards accrue every 10 minutes", "Fees from every token launched on Zookr are converted to ZEC and split pro-rata across holders. Open the dashboard any time to see what your wallet has earned."],
  ["ZEC lands in your wallet every 2 hours", "Once you have earned at least 0.001 ZEC, it is minted to your wallet as zkZEC: 1 zkZEC = 1 ZEC, backed by Zookr's shielded pool. Add the token to your wallet to see it."],
  ["Redeem to native ZEC whenever you like", "Optional. On the dashboard, enter an amount and a Zcash Unified Address (u1…) and click Redeem. Your zkZEC is burned and shielded ZEC reaches your Zcash wallet within minutes."],
];

export default function Tutorial() {
  return (
    <>
      <Nav />
      <main className="wrap page">
        <div className="page-head"><div><span className="k">Tutorial</span><h1>Just hold. Get paid in ZEC.</h1></div><span className="pill ok"><i />no registration</span></div>
        <div style={{ marginBottom: 18 }}><Ca address={ZKZEC} symbol="zkZEC" onpaper /></div>
        <div className="steps" style={{ margin: 0 }}>
          {STEPS.map(([h, p], i) => <div key={h}><b>0{i + 1}</b><h3>{h}</h3><p>{p}</p></div>)}
        </div>
        <div className="g31" style={{ marginTop: 26 }}>
          <div className="card card-pad">
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Add zkZEC to your wallet</h2>
            <p style={{ color: "var(--dim)", margin: "0 0 12px", fontSize: 14 }}>Wallets only show tokens they know. Either click &quot;Add zkZEC to wallet&quot; on the dashboard, or import it manually:</p>
            <div className="kv"><span>Contract</span><b className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>{ZKZEC}</b></div>
            <div className="kv"><span>Symbol</span><b>zkZEC</b></div>
            <div className="kv"><span>Decimals</span><b>8</b></div>
            <div className="kv"><span>Network</span><b>Robinhood Chain (4663)</b></div>
          </div>
          <aside className="onpaper">
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Want it as native Zcash?</h2>
            <p style={{ fontSize: 14, opacity: .9 }}>Get a u1 address from a free Zcash wallet, then redeem on the dashboard.</p>
            <div className="kv"><span>Zashi</span><b><a href="https://electriccoin.co/zashi/" target="_blank" rel="noreferrer">Android · iOS ↗</a></b></div>
            <div className="kv"><span>Ywallet</span><b><a href="https://ywallet.app/" target="_blank" rel="noreferrer">Android · iOS · desktop ↗</a></b></div>
            <div className="kv"><span>Nighthawk</span><b><a href="https://nighthawkwallet.com/" target="_blank" rel="noreferrer">Android · iOS ↗</a></b></div>
            <p style={{ fontSize: 13, opacity: .9, marginTop: 12 }}>Never share a seed phrase; Zookr never asks for one.</p>
            <a className="btn primary" href="/dashboard" style={{ marginTop: 10 }}>Open the dashboard →</a>
          </aside>
        </div>
      </main>
      <Foot />
    </>
  );
}
