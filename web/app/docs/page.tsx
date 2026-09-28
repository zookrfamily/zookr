import { Nav, Foot } from "../nav.tsx";

const TOC: [string, string][] = [["how", "How Zookr works"], ["launch", "Launching a token"], ["fees", "Fees to ZEC"], ["qualify", "Who qualifies"], ["rounds", "Reward rounds"], ["selling", "Selling & transfers"], ["payments", "Payments & the minimum"], ["address", "Redeem to native Zcash"], ["dashboard", "The dashboard"], ["verify", "Check a payment"], ["trust", "What you are trusting"]];

export default function Docs() {
  return (
    <>
      <Nav />
      <main className="wrap page docs">
        <nav className="docs-toc"><span className="k" style={{ paddingLeft: 12, marginBottom: 6, color: "rgba(255,255,255,.75)" }}>Quick guide</span>{TOC.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}</nav>
        <div className="docs-main">
          <h2 id="how">How Zookr works.</h2>
          <p>Zookr is a launchpad on Robinhood Chain whose tokens pay their holders automatic rewards in ZEC. You hold tokens in your own wallet. There is no staking deposit, no claim transaction and no registration.</p>
          <p>Every token launched through Zookr carries a fixed 2% creator fee on buys and sells. The fee is collected in ETH, converted to native ZEC held in Zookr&apos;s shielded pool, and credited to that token&apos;s reward pool. Every ten minutes a round splits the credited ZEC pro-rata across eligible holders. Every two hours, each holder&apos;s earned ZEC is paid to the holder&apos;s own wallet as zkZEC, a token backed 1:1 by the pool and redeemable for native shielded Zcash at any time.</p>

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
          <p>Holding is passive: keep a launched token in your own wallet and it qualifies for reward rounds. Amounts are tracked as lots, so you can hold 1,500 tokens while only 1,000 are eligible for the next round. Contracts - the bonding curve, the vault, liquidity pools - and burn addresses are never holders.</p>
          <p>Each round is split strictly pro-rata: your share equals your eligible tokens divided by all eligible tokens held by real wallets. Tokens sitting on the curve or burned are left out of that denominator, so a wallet holding 0.5% of the total supply receives more than 0.5% of the round - the same rule for everyone, with nothing set aside for anyone.</p>
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
          <p>Payments are automatic and need nothing from you. Every two hours, each wallet with at least the minimum (0.001 ZEC) of accrued rewards, counted across every token, receives that amount in its own wallet as <b>zkZEC</b>. Below-minimum amounts are not lost; they remain owed and keep accumulating. Rounds keep allocating every ten minutes in between; the payment window just collects them.</p>
          <p>zkZEC is Zookr&apos;s ZEC token on Robinhood Chain: 8 decimals, 1 unit = 1 zatoshi, so 1 zkZEC = 1 ZEC. Every unit in circulation is backed by native ZEC in the shielded pool; the pool balance, the supply and the coverage are published every round. Contract: <code>0x553F77633bc5ec8aE851648AC6f4133463c01362</code>. Add it to your wallet from the dashboard to see the balance.</p>

          <h2 id="address">Redeeming to native Zcash</h2>
          <p>Optional, any time, any amount from 0.001 ZEC. On the dashboard, enter the amount and a mainnet Unified Address starting with <code>u1</code> (Zashi, Ywallet or Nighthawk give you one; exchange <code>t1</code> addresses cannot receive shielded funds) and click Redeem. Your zkZEC is burned on Robinhood Chain and the rounds engine sends the same amount of shielded ZEC to that address on its next run, usually within ten minutes.</p>
          <table><tbody>
            <tr><td><b>Public burn, private payout</b></td><td>The redemption (amount and u1 address) is a public transaction on Robinhood Chain; the Zcash payment itself is shielded.</td></tr>
            <tr><td><b>Registered address</b></td><td>If you registered a Zcash address on the old flow it is prefilled for you. Registration is no longer required for anything.</td></tr>
            <tr><td><b>Never a seed phrase</b></td><td>Nothing ever asks for a seed phrase or viewing key.</td></tr>
          </tbody></table>

          <h2 id="dashboard">Follow your rewards</h2>
          <p>The dashboard is personal to the connected wallet: your zkZEC balance, pending (what the next round would give at your current eligibility), earned not yet paid, ZEC received, your holdings per token, every payment with its transaction, and your redemptions with their Zcash transaction. Each token page shows its fees, conversions, funded ZEC and who the next round pays.</p>

          <h2 id="verify">Check a payment yourself</h2>
          <p>Payments are zkZEC mints: public transactions on Robinhood Chain you can open on the explorer, one per payout window, listing every wallet and amount. Redemptions list the Zcash transaction id; shielded transactions reveal nothing on a block explorer beyond their existence, so the receipt is the wallet: the ZEC lands at the u1 address you gave. The memo on each payout names the redemption id.</p>

          <h2 id="trust">What you are trusting</h2>
          <p>The launchpad and zkZEC are contracts with narrow operator powers: the launchpad&apos;s operator can only move vault ETH out for conversion, and zkZEC&apos;s operator can only mint. Everything else is operated: the pool is a shielded Zcash wallet the operator holds, and the rounds engine is a scheduled job that reads Robinhood Chain and publishes its state. zkZEC is a claim on that pool, so you are trusting the operator to keep it fully backed, keep the job running, and pay redemptions. The published pool balance against the zkZEC supply is the number to watch.</p>
        </div>
      </main>
      <Foot />
    </>
  );
}
