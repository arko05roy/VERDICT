# VERDICT

**Universal Zero-Knowledge Rule Integrity Protocol — Built on Midnight**

VERDICT proves any state transition follows rules — without revealing the data. 10 modular Guardians. Governed on-chain. Private by default.

## Quick Start

```bash
# Install dependencies
npm install

# Run contract tests (no network needed)
cd contract && npx vitest run

# Start the frontend
cd verdict && npm run dev
```

## Architecture

```
verdict-dao.compact          DAO governance (Guardians, Verifier versions, Rulesets)
verdict.compact              Reference 10-check verifier circuit (immutable)

verdict/                     Next.js frontend + API
  src/app/(dashboard)/
    overview/                Protocol dashboard
    deploy/                  Register rulesets (5-step wizard)
    explore/                 Browse deployed rulesets
    dao/                     Governance (Guardian registry, proposals, verifier versions)
    integrate/               SDK integration guide

  src/lib/
    vcl/                     VCL parser + compiler (config output, no code generation)
    checks/                  Guardian registry + Compact templates
    midnight.ts              Midnight network integration (wallet, deploy, query)

counter-cli/                 CLI tools for preprod testing
  src/test-anticheat.ts      Live test against deployed contracts
  src/roundtrip.ts           Full deploy + verify round-trip
```

## The 10 Guardians

| # | Name | What It Proves |
|---|------|----------------|
| I | Mnemosyne | Hash-chain integrity — no fabricated history |
| II | Styx | Commit-reveal — no retroactive edits |
| III | Hermes | Velocity — no teleportation |
| IV | Phaethon | Acceleration — no speed ramps |
| V | Terminus | Boundaries — state within valid range |
| VI | Themis | Action validity — no injected operations |
| VII | Chronos | Rate limiting — no superhuman speed |
| VIII | Moirai | Entropy — no bot patterns |
| IX | Daedalus | Precision — no aimbot signatures |
| X | Prometheus | Information leakage — no wallhacks |

## Versioned Verifier Model

Verifier contracts are compiled once per Guardian set and are immutable. Rulesets are lightweight on-chain entries (bitmask + params) pointing to a verifier version.

```
DAO Contract
  +-- Verifier v1.0 (Guardians I-X, compiled once)
  +-- Verifier v1.1 (Guardians I-XI, when DAO approves XI)
  +-- Rulesets (verifier ref + enable mask + params)
```

New Guardians = new verifier version. Old rulesets unaffected. Migration is opt-in.

## Key Commands

```bash
# Compile contracts
cd contract && npm run compact:all

# Run all tests (38 total: 10 verdict + 28 DAO)
npx vitest run

# Test on preprod
cd counter-cli && SEED=<hex> npx tsx src/test-anticheat.ts

# Frontend dev
cd verdict && npm run dev
```

## Preprod

| Service | URL |
|---------|-----|
| Node | `https://rpc.preprod.midnight.network` |
| Indexer | `https://indexer.preprod.midnight.network/api/v3/graphql` |
| Proof Server | `https://lace-proof-pub.preprod.midnight.network` |
| Faucet | `https://faucet.preprod.midnight.network/` |

## Docs

- [Overview](docs/overview.md)
- [The 10 Checks](docs/the-10-checks.md)
- [Integration Guide](docs/integration-guide.md)
- [Whitepaper](docs/whitepaper.md)
