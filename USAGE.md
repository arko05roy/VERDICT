# VERDICT Preprod Usage Record

The live MVP is [verdict-jade.vercel.app](https://verdict-jade.vercel.app).
This is the repeatable onboarding flow used with the 50-address Preprod cohort.

## Participant flow

1. Open Lace and switch it to Midnight **Preprod**.
2. Use one address from [USERS.md](USERS.md), then open the live MVP.
3. Connect the wallet from the sidebar and confirm network and balance.
4. Open **Deploy**. Describe the rules, choose Guardians, configure parameters,
   review the VCL/circuit, and submit the ruleset.
5. Open **Explore**, select the ruleset, and run a verification. Confirm the
   public `CLEAN` or `FLAGGED` result without exposing private witness data.
6. Submit feedback using the fields in [FEEDBACK.md](FEEDBACK.md).

## Preprod endpoints

| Service | Endpoint |
|---|---|
| Node | https://rpc.preprod.midnight.network |
| Indexer | https://indexer.preprod.midnight.network/api/v4/graphql |
| Proof server | https://lace-proof-pub.preprod.midnight.network |
| Explorer | https://explorer.preprod.midnight.network |
| Faucet | https://faucet.preprod.midnight.network/ |

## Completion and evidence

A successful session connects on Preprod, selects or deploys a ruleset, completes
a verification, and displays a verdict plus proof/transaction status. Funding
proves cohort eligibility; the feedback register captures actual flow completion
and friction. Funding evidence is in
[`preprod-wallet-current/preprod-addresses-50.json`](preprod-wallet-current/preprod-addresses-50.json).
Never request or commit a seed, private key, or Lace private state.
