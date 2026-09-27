import { Nav, Foot } from "../nav.tsx";

const TOC: [string, string][] = [["how", "How Zookr works"], ["launch", "Launching a token"], ["fees", "Fees to ZEC"], ["qualify", "Who qualifies"], ["rounds", "Reward rounds"], ["selling", "Selling & transfers"], ["payments", "Payments & the minimum"], ["address", "Your Zcash address (video)"], ["dashboard", "The dashboard"], ["verify", "Check a payment"], ["trust", "What you are trusting"]];

export default function Docs() {
  return (
    <>
      <Nav />
      <main className="wrap page docs">
        <nav className="docs-toc"><span className="k" style={{ paddingLeft: 12, marginBottom: 6, color: "rgba(255,255,255,.75)" }}>Quick guide</span>{TOC.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</nav>
        <div className="docs-main">
          <h2 id="how">How Zookr works.</h2>
          <p>Zookr is a launchpad on Robinhood Chain whose tokens pay their holders automatic rewards in native, shielded ZEC. You hold tokens in your own wallet. There is no staking deposit and no claim transaction.</p>
          <p>Every token launched through Zookr carries a fixed 2% creator fee on buys and sells. The fee is collected in ETH, converted to ZEC, and credited to that token&apos;s reward pool. Every ten minutes a round splits the credited ZEC pro-rata across eligible holders. Holders who registered a Zcash address are paid once their accrued rewards reach the minimum.</p>

          <h2 id="launch">Launching a token</h2>
          <p>Open Launch, connect a wallet on Robinhood Chain, fill in a name, symbol, image and optional links, and sign one transaction. The launchpad deploys the token on Pons V2 (1,000,000,000 supply, ETH-quoted bonding curve, graduation to a Uniswap V4 pool at 4.2 ETH) with a fresh fee vault as the creator-fee recipient.</p>
          <table><tbody>
            <tr><td><b>Cost</b></td><td>The Pons launch fee of 0.0005 ETH plus gas. Nothing goes to Zookr at launch.</td></tr>
            <tr><td><b>Initial buy</b></td><td>Optional ETH added to the same transaction is spent on the curve for your wallet, exempt from the launch-window snipe tax.</td></tr>
            <tr><td><b>Fee profile</b></td><td>Fixed for every token: 2% creator tax, 90% of the converted ZEC to the token&apos;s holders, 10% to platform-token holders. Creators have no fee controls.</td></tr>
            <tr><td><b>Trading</b></td><td>Happens on Pons as usual. Pons&apos; own 1% curve fee and Uniswap fees after graduation apply separately.</td></tr>
          </tbody></table>

          <h2 id="fees">Fees to ZEC</h2>
          <p>Creator tax accrues on the bonding curve until swept, and is credited to the token&apos;s vault. Once a vault holds at least 0.003 ETH, the rounds engine collects it, quotes a swap from Robinhood Chain ETH to native ZEC (via NEAR Intents), and sends the ETH to the swap deposit address. When the swap lands, the ZEC arrives at the pool&apos;s transparent address, is shielded, and 90% is credited to the token&apos;s pool, 10% to the platform pool.</p>
          <p>Collected fees, funded ZEC, earned rewards and completed payments are separate stages; each token&apos;s page shows all four.</p>

          <h2 id="qualify">Who qualifies?</h2>
          <p>Holding is passive: keep a launched token in your own wallet and it qualifies for reward rounds. Amounts are tracked as lots, so you can hold 1,500 tokens while only 1,000 are eligible for the next round. Contracts - the bonding curve, the vault, liquidity pools - are never holders.</p>
          <table><tbody>
            <tr><td><b>Opening round</b></td><td>The first round is ten minutes after the token launches. Tokens bought in the launch transaction qualify for it.</td></tr>
            <tr><td><b>Buy at minute 9</b></td><td>Can qualify for the minute-20 round, not the minute-10 one.</td></tr>
            <tr><td><b>Buying more</b></td><td>Does not make your older eligible holdings start waiting again.</td></tr>
          </tbody></table>

          <h2 id="rounds">Reward rounds</h2>
          <p>Rounds are scheduled every ten minutes from the launch. A newly acquired amount skips the next scheduled round and qualifies for the following one. A round&apos;s allocation is final the moment the round is processed - selling afterwards does not erase it.</p>
          <p>A round allocates whatever ZEC has been credited to that token and not yet allocated, as long as the shielded pool can cover it. With no new fees, rounds pass with no allocation.</p>

          <h2 id="selling">Selling and transfers</h2>
          <p>Outgoing amounts consume your newest lots first. Only the affected portion loses its pending eligibility. A transfer creates fresh eligibility for the receiver, and buying back does not restore the waiting time of the tokens you sold.</p>

          <h2 id="payments">Payments and the minimum</h2>
          <p>Payments are automatic. A payment needs at least the minimum (0.001 ZEC) of accrued rewards for your holder wallet, counted across every token. Below-minimum amounts are not lost; they remain owed and keep accumulating.</p>
          <p>Payments go out in batched shielded transactions, up to 25 holders per transaction, after each round. A busy round can take two runs to clear.</p>

          <h2 id="address">Your Zcash address</h2>
          <p>Open the dashboard, connect your holder wallet, and paste a mainnet Unified Address starting with <code>u1</code> that includes an Orchard receiver. Sign the registration on Robinhood Chain.</p>
          <video controls playsInline preload="metadata" poster="/tutorial-register.jpg" src="/tutorial-register.mp4" style={{ display: "block", width: "100%", maxWidth: 680, aspectRatio: "16 / 9", borderRadius: 16, background: "#2a0d14", margin: "14px 0 6px" }} />
          <p style={{ fontSize: 13 }}>19 seconds: dashboard, connect, paste the u1 address, register. A free wallet that gives you a u1 address: Zashi, Ywallet or Nighthawk. Exchange addresses (t1…) cannot receive shielded payouts.</p>
          <table><tbody>
            <tr><td><b>Public and permanent</b></td><td>The registered address is intentionally public and cannot be edited, reset, or replaced. A different destination needs a different wallet.</td></tr>
            <tr><td><b>Only you authorize it</b></td><td>The registry has no owner and no override. Nothing ever asks for a seed phrase or viewing key.</td></tr>
            <tr><td><b>Not required to earn</b></td><td>You accrue rewards without registering. Registration is required before rewards can be delivered.</td></tr>
          </tbody></table>

          <h2 id="dashboard">Follow your rewards</h2>
          <p>The dashboard is personal to the connected wallet: pending (what the next round would give at your current eligibility), earned unpaid, ZEC received, your holdings per token, and every completed payment with its Zcash transaction. Each token page shows its fees, conversions, funded ZEC and who the next round pays.</p>

          <h2 id="verify">Check a payment yourself</h2>
          <p>Every payment lists the Zcash transaction id. Shielded transactions reveal nothing on a block explorer beyond their existence, so the receipt is the wallet: the ZEC lands at the address you registered. The public registry proves which destination you authorized; the memo on each payment names your holder wallet.</p>

          <h2 id="trust">What you are trusting</h2>
          <p>The registry and the launchpad are contracts with no admin over funds: the launchpad only creates vaults and its operator key can only move vault ETH out for conversion. Everything else is operated: the pool is a shielded Zcash wallet the operator holds, and the rounds engine is a scheduled job that reads Robinhood Chain and publishes its state. You can audit the allocations from the published data, but you are trusting the operator to run the job and complete the conversions.</p>
        </div>
      </main>
      <Foot />
    </>
  );
}
