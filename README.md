<h1 align="center">Zookr</h1>
<p align="center">Native ZEC rewards for token holders on Robinhood Chain.</p>

Hold a token in your own wallet, register a Zcash Unified Address once, and a funded pool pays you shielded ZEC every ten minutes. No staking, no claim.

| Path | What |
|---|---|
| `contracts/` | `ZecRegistry.sol` - wallet → u1 destination, once, no admin. Foundry tests. |
| `worker/` | The rounds engine. Reads holders from Robinhood Chain, allocates the pool's emission every 10 minutes, pays registered holders through `zingo-cli`, publishes `data/public.json`. |
| `web/` | Next.js site: dashboard, explore, pool pages, docs. |
| `.github/workflows/` | `zingo.yml` builds `zingo-cli` once; `rounds.yml` runs the engine on a 10-minute cron. |

## How rewards work

- A pool is one token, one emission per day, one shielded pool address funded by the operator.
- Every round (10 min) splits `emission × 600 / 86400` ZEC pro-rata across wallets whose tokens were held through the previous round. New buys skip one round; sells consume the newest lots first.
- Registered holders with ≥ 0.001 ZEC accrued are paid in batched shielded transactions. The memo names the holder wallet; the txid is the receipt.

## Run

```sh
cd contracts && forge test
cd worker && npm i && DRY_RUN=1 node index.mjs round   # ledger + rounds, no wallet
cd web && npm i && npm run dev
```

The worker needs `ZCASH_SEED` (the pool wallet) and a `zingo-cli` binary to pay; see `worker/.env.example`.
