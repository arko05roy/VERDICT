# VERDICT Setup and Usage

## Prerequisites

- Node.js 20+
- npm 10+
- A modern browser with the Lace Midnight wallet extension for Preprod flows
- Docker Desktop only if you want the full local node/indexer/proof-server stack

## Install and test

```bash
git clone https://github.com/arko05roy/VERDICT.git
cd VERDICT
npm ci
npm test
```

The test command runs the root smoke test and the contract/DAO suites. The compiled
contract artifacts are committed so CI and the Vercel build do not require the
Compact CLI.

## Run the dashboard in simulator mode

```bash
cd verdict
npm run dev
```

Open http://localhost:3000. Simulator mode is suitable for exploring the dashboard,
VCL compiler, Guardian selection, and API routes without a wallet or Docker.

## Run the full local Midnight stack

From the repository root:

```bash
bash start.sh
```

This starts the local Midnight node, indexer, proof server, and dashboard. Stop it
with Ctrl-C.

## Preprod configuration

Copy the example environment file and fill in a funded deployment seed only on the
machine that performs deployment:

```bash
cp verdict/.env.example verdict/.env.local
```

Never commit `verdict/.env.local`, wallet seeds, or private keys. The public runtime
variables are documented in `verdict/.env.example`.

## Deploy the reference contract to Preprod

```bash
cd counter-cli
SEED=<funded-hex-seed> npm run deploy:preprod
```

The command prints the public contract address and explorer URL and writes a local
deployment record to `counter-cli/logs/preprod-deploy.json` (ignored by Git). Fund a
wallet at the [Midnight Preprod faucet](https://faucet.preprod.midnight.network/)
if required, then verify the result in the [Preprod explorer](https://explorer.preprod.midnight.network).

After deployment, set `NEXT_PUBLIC_VERDICT_PREPROD_CONTRACT_ADDRESS` and the server
wallet/network variables in Vercel, redeploy, and record the resulting address in
the [submission checklist](submission-checklist.md).

## Use the live demo

1. Open [verdict-jade.vercel.app](https://verdict-jade.vercel.app).
2. Install and connect Lace to Midnight Preprod.
3. Open Explore and select a ruleset.
4. Run a verification and inspect the public verdict/counters.

The live API health check is available at
[/api/status](https://verdict-jade.vercel.app/api/status).
