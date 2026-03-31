# VERDICT — Universal ZK Integrity Protocol on Midnight

## Project Structure

```
ratri/
  contract/         Compact contracts (Midnight ZK circuits)
    src/
      verdict.compact          Reference 10-check contract (DO NOT MODIFY)
      verdict-dao.compact      DAO governance contract for check registry
      witnesses.ts             TypeScript witness types
      test/                    Vitest test suites + simulators
  verdict/          Next.js frontend + API + SDK
    src/
      app/
        (dashboard)/
          overview/   Protocol dashboard — live feed, stats
          deploy/     5-step deploy flow: Describe → Choose Guardians → Configure → Review → Deploy
          explore/    Browse deployed rulesets (freeform search, no hardcoded categories)
          dao/        Governance page — Guardian registry, VIP proposals, council info
          integrate/  SDK integration guide (multi-language snippets)
        api/
          checks/     GET — returns Guardian library metadata
          suggest/    POST — AI suggests which Guardians to enable (JSON only, never code)
          compile/    POST — accepts VCL, deterministic compile to Compact
          deploy/     POST — deploy ruleset to Midnight
          verify/     POST — query verification results (mythological names)
          feed/       GET — live verification feed (dynamic check counts)
          rulesets/   GET — all deployed rulesets
          dao/        GET — governance state
          status/     GET — network health
          wallet/     GET — wallet info
      lib/
        checks/
          registry.ts   10 Guardian definitions (id, mythName, params, witnesses, templates)
          templates.ts  Pre-audited Compact code snippets per Guardian
        vcl/
          parser.ts     VCL line-by-line parser
          compiler.ts   Deterministic VCL → Compact compiler (zero AI)
          types.ts      VCL types
        midnight.ts     Midnight network integration (deploy, query, wallet)
        gemini.ts       Single SUGGEST_PROMPT — AI only suggests Guardians, never writes code
        compact-validator.ts  Compact syntax validator
    sdk/              TypeScript SDK for external integration
  docs/
    whitepaper.md     Full whitepaper (Guardians, VCL, DAO, architecture)
    overview.md       Protocol overview
    the-10-checks.md  Detailed check breakdown with circuit code
    integration-guide.md  System integration guide
```

## Architecture Decisions

### The 10 Guardians (Mythological Names)
Each ZK check is a "Guardian" named from Greek/Roman mythology:
I Mnemosyne, II Styx, III Hermes, IV Phaethon, V Terminus,
VI Themis, VII Chronos, VIII Moirai, IX Daedalus, X Prometheus

### VCL (Verdict Compile Language)
- Declarative config: `use GuardianName { param: value }`
- Deterministically compiles to Compact — NO AI in the code path
- AI only suggests which Guardians to enable (via /api/suggest)
- Parser: `src/lib/vcl/parser.ts`, Compiler: `src/lib/vcl/compiler.ts`

### Modular Check Selection
- Each ruleset deploys a NEW independent contract with only selected Guardians
- Fewer Guardians = smaller circuit = faster proving
- No bitmask — VCL generates custom Compact per ruleset

### No Hardcoded Domains
- VERDICT is a universal truth layer — it does NOT presume what domains exist
- Rulesets have freeform tags (user types anything), not category selectors
- Explore page uses text search, not category filters

### DAO Governance
- `verdict-dao.compact` manages the Guardian registry on-chain
- Council-based: proposeCheck → vote → finalizeProposal
- 10 genesis Guardians pre-registered at deployment
- Frontend reads from /api/dao

## Key Commands

```bash
# Run existing contract tests (must all pass)
cd contract && npx vitest run src/test/verdict.test.ts

# Run DAO tests (requires compact:dao compilation first)
cd contract && npx vitest run src/test/verdict-dao.test.ts

# Test VCL compiler
cd verdict && npx tsx -e 'import { parseVCL, compileVCL } from "./src/lib/vcl"; ...'

# Start frontend dev server
cd verdict && npm run dev
```

### Lace Wallet Integration (DApp Connector)
- Client-side via `@midnight-ntwrk/dapp-connector-api@4.0.1`
- Wallet context: `src/lib/wallet-context.tsx` — `WalletProvider` + `useWallet()` hook
- Lace injects `window.midnight.mnLace` (or other keys) asynchronously
- Connect flow: `wallet.connect('preprod')` → `getShieldedAddresses()` → `getUnshieldedBalances()`
- Detection polls for up to 10s; falls back to first available `window.midnight` key
- Sidebar shows 3 states: connected, install Lace, connect button

### Preprod Network Endpoints
- Node: `https://rpc.preprod.midnight.network`
- Indexer: `https://indexer.preprod.midnight.network/api/v3/graphql`
- Indexer WS: `wss://indexer.preprod.midnight.network/api/v3/graphql/ws`
- Proof Server: `https://lace-proof-pub.preprod.midnight.network`
- Faucet: `https://faucet.preprod.midnight.network/`
- Explorer: `https://explorer.preprod.midnight.network`

## Rules

- verdict.compact is the REFERENCE implementation — do NOT modify it
- AI must NEVER generate Compact code — only suggest Guardians via JSON
- All check templates in `checks/templates.ts` are extracted from the proven contract
- The VCL compiler is a pure function with zero side effects
- Store schema v2 has: tags, enabledChecks, checkCount, vcl (v1 entries auto-migrate)
- Pre-existing type error in midnight.ts:354 (wallet SDK config) — not from our changes
