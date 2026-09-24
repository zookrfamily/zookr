import { Nav, Foot } from "../nav.tsx";

const TOC: [string, string][] = [["how", "How Zookr works"], ["qualify", "Who qualifies"], ["rounds", "Reward rounds"], ["selling", "Selling & transfers"], ["payments", "Payments & the minimum"], ["address", "Your Zcash address"], ["dashboard", "The dashboard"], ["verify", "Check a payment"], ["pool", "Funding a pool"], ["trust", "What you are trusting"]];

export default function Docs() {
  return (
    <>
      <Nav />
      <main className="wrap page docs">
        <nav className="docs-toc"><span className="k" style={{ paddingLeft: 12, marginBottom: 6 }}>Quick guide</span>{TOC.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</nav>
        <div className="docs-main">
          <h2 id="how">How Zookr works.</h2>
          <p>A funded pool pays automatic rewards to holders, in native shielded ZEC. You hold tokens in your own wallet on Robinhood Chain. There is no staking deposit and no claim transaction.</p>
          <p>The pool operator sends real ZEC to the pool&apos;s shielded address and sets an emission per day. Every ten minutes, one round&apos;s worth of that emission is split pro-rata across eligible holders. Eligible holders who registered a Zcash address are paid once their accrued rewards reach the minimum.</p>

          <h2 id="qualify">Who qualifies?</h2>
          <p>Holding is passive: keep the pool&apos;s token in your own wallet and it can qualify for reward rounds. Amounts are tracked as lots, so you can hold 1,500 tokens while only 1,000 are eligible for the next round.</p>
          <table><tbody>
            <tr><td><b>Opening round</b></td><td>The first round is ten minutes after the pool starts. Tokens held before the start qualify for it.</td></tr>
            <tr><td><b>Buy at minute 9</b></td><td>Can qualify for the minute-20 round, not the minute-10 one.</td></tr>
            <tr><td><b>Buying more</b></td><td>Does not make your older eligible holdings start waiting again.</td></tr>
            <tr><td><b>Minimum hold</b></td><td>Each pool sets a minimum eligible balance. Below it, a wallet is skipped for that round.</td></tr>
          </tbody></table>

          <h2 id="rounds">Reward rounds</h2>
          <p>Rounds are scheduled every ten minutes from the pool&apos;s start. A newly acquired amount skips the next scheduled round and qualifies for the following one. A round&apos;s allocation is final the moment the round is processed - selling afterwards does not erase it.</p>
          <p>A round only allocates if the pool can cover it. When the pool runs dry, rounds pass with no allocation until it is topped up.</p>

          <h2 id="selling">Selling and transfers</h2>
          <p>Outgoing amounts consume your newest lots first. Only the affected portion loses its pending eligibility. A transfer creates fresh eligibility for the receiver, and buying back does not restore the waiting time of the tokens you sold.</p>

          <h2 id="payments">Payments and the minimum</h2>
          <p>Payments are automatic. A payment needs at least the minimum (0.001 ZEC) of accrued rewards for your holder wallet, counted across every pool. Below-minimum amounts are not lost; they remain owed and keep accumulating.</p>
          <p>Payments go out in batched shielded transactions, up to 25 holders per transaction, after each round. A busy round can take two runs to clear.</p>

          <h2 id="address">Your Zcash address</h2>
          <p>Open the dashboard, connect your holder wallet, and paste a mainnet Unified Address starting with <code>u1</code> that includes an Orchard receiver. Sign the registration on Robinhood Chain.</p>
          <table><tbody>
            <tr><td><b>Public and permanent</b></td><td>The registered address is intentionally public and cannot be edited, reset, or replaced. A different destination needs a different wallet.</td></tr>
            <tr><td><b>Only you authorize it</b></td><td>The registry has no owner and no override. Nothing ever asks for a seed phrase or viewing key.</td></tr>
            <tr><td><b>Not required to earn</b></td><td>You accrue rewards without registering. Registration is required before rewards can be delivered.</td></tr>
          </tbody></table>

          <h2 id="dashboard">Follow your rewards</h2>
          <p>The dashboard is personal to the connected wallet: pending (what the next round would give at your current eligibility), earned unpaid, ZEC received, your holdings per pool, and every completed payment with its Zcash transaction.</p>

          <h2 id="verify">Check a payment yourself</h2>
          <p>Every payment lists the Zcash transaction id. Shielded transactions reveal nothing on a block explorer beyond their existence, so the receipt is the wallet: the ZEC lands at the address you registered. The public registry proves which destination you authorized; the memo on each payment names your holder wallet.</p>

          <h2 id="pool">Funding a pool</h2>
          <p>A pool is one token, one emission per day, one shielded pool address. The operator funds it by sending ZEC to that address; deposits show up on the pool page. Rounds keep allocating while the balance covers them.</p>

          <h2 id="trust">What you are trusting</h2>
          <p>The registry is a contract with no admin. Everything else is operated: the pool is a shielded Zcash wallet the operator holds, and the rounds engine is a scheduled job that reads Robinhood Chain and publishes its state. You can audit the allocations from the published data, but you are trusting the operator to keep the pool funded and the job running.</p>
        </div>
      </main>
      <Foot />
    </>
  );
}
