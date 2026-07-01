# VERDICT

### *Verdict doesn't ask systems to be honest. It makes dishonesty mathematically impossible.*

**Universal Zero-Knowledge Integrity Protocol on Midnight**

---

## The Problem

Every day, you interact with systems that enforce rules you cannot verify.

Your insurance claim — processed by an algorithm you can't inspect. Your trade on an exchange — executed at a price you have to trust. Your loan application — scored by a model that won't show its math. Your game — adjudicated by a server that could be lying about every outcome.

These aren't edge cases. This is the default. Every platform, every service, every institution that processes your data runs the same architecture: a black box that takes your inputs, applies rules internally, and tells you what happened. You have no proof the rules were followed. None.

**The entity enforcing the rules is often the same entity that profits from breaking them.**

There is zero cryptographic proof that any rule was ever applied correctly. You're trusting a `console.log` on someone else's server.

That's not integrity. That's faith.

---

## What Is VERDICT?

VERDICT is a universal ZK integrity protocol built on Midnight. It doesn't replace existing systems. It doesn't touch business logic. It sits underneath and asks one question: **was this state transition valid?**

Every state transition is checked by a ZK circuit. 10 mathematical checks per transition. Bounds validation, action legitimacy, behavioral entropy, commit-reveal verification — the works. The result is either **CLEAN** or **FLAGGED**. Not an accusation — a **proof**. Immutable, on-chain, verifiable by anyone.

What makes this a protocol and not a product: every system gets its own ruleset. Insurance claim processing, exchange trade execution, game anti-cheat, lending compliance — each one is a deployed Compact contract on Midnight. Different rules, same verification engine. You don't build a new system per use case. You deploy a ruleset.

### Where This Applies

VERDICT is domain-agnostic. Any system where participants must follow rules but shouldn't have to expose their data:

| Domain | What Gets Verified | What Stays Private |
|--------|-------------------|-------------------|
| **Gaming** | State transitions follow physics and game rules | Player positions, strategies, inputs |
| **Financial compliance** | Transactions stay within regulatory bounds | Account balances, counterparties, amounts |
| **Supply chain** | Goods moved through valid checkpoints in order | Supplier identities, pricing, routes |
| **Voting & governance** | Votes cast within eligibility rules | Who voted for what |
| **Marketplace integrity** | Bids and listings follow platform rules | Bidder identity, amounts, strategy |
| **IoT & sensor networks** | Readings fall within valid ranges and sequences | Raw sensor data, device locations |

---

## The 10 Checks

Every state transition runs through 10 layered integrity checks inside a single zero-knowledge proof. ~940 constraints. Lightweight enough for real-time settlement.

| # | Check | What It Catches |
|---|-------|-----------------|
| 1 | **Sequence Integrity** | Fabricated states, replayed data, skipped transitions |
| 2 | **Pre-Commitment Binding** | Retroactive data editing, after-the-fact manipulation |
| 3 | **Rate-of-Change Bounds** | Impossible state jumps — values that change too fast |
| 4 | **Second-Order Rate Bounds** | Gradual ramps that individually look fine but collectively are impossible |
| 5 | **Range Enforcement** | Values outside permitted boundaries |
| 6 | **Action Whitelist** | Operations that don't exist in the ruleset |
| 7 | **Frequency Limiting** | Automated flooding, bot-speed operations |
| 8 | **Behavioral Entropy** | Bot-like repetition, scripted automation loops |
| 9 | **Precision Anomaly** | Mechanically perfect inputs no human could produce |
| 10 | **Information Leakage** | Acting on data the participant shouldn't have access to |

Four violation classes:

- **Fabrication** (1-2) — *Was this state transition real, or was it injected?*
- **Constraint Violations** (3-5) — *Does this transition stay within defined bounds?*
- **Automation** (6-8) — *Is this a legitimate participant or a bot?*
- **Information Asymmetry** (9-10) — *Is the participant acting on hidden information?*

---

## Deploy — The Developer Story

Write rules in plain English. Hit compile. Verdict translates them into a Compact ZK circuit — Midnight's native language — validates the syntax, and gives you a deployable contract.

```
"Claim payouts must match the policy tier."
"Trade execution price cannot deviate more than 0.1% from quoted price."
"Player health cannot go below zero."
```

That compiles to real Compact. Pragma 0.22. Runs inside Midnight's ZK prover. The system under verification never sees the private data. The circuit sees **witnesses** — private inputs that get verified and discarded. That's the Midnight primitive doing what it was built for.

From writing English rules to a live ZK verification endpoint. One workflow.

---

## Integrate — Three Lines of Code

```typescript
import { Verdict } from '@verdict/sdk'
const verdict = new Verdict('midnight1_abc123...')
const result = await verdict.verify({ prevState, currState, action })
```

Your system captures a state transition. The SDK submits it as a ZK witness — **private by default**. The circuit runs 10 checks. The proof settles on Midnight. You get back CLEAN or FLAGGED.

The user's data, the internal state, the business logic — none of it is ever revealed. Not to you, not to anyone.

TypeScript, Python, Rust, Go. Pick your stack. Plug in the address. You're done.

---

## The Dashboard

VERDICT ships with a protocol dashboard — not a demo.

| Page | What It Does |
|------|-------------|
| **Overview** | Real-time protocol health — rulesets deployed, verifications flowing, proofs settling |
| **Deploy** | Write enforcement rules in plain English, compile to Compact, deploy on-chain |
| **Explore** | Browse every deployed ruleset on the network — live feeds, flagged rates, integrity scores |
| **Explore/[id]** | Public integrity profile per ruleset — total verifications, flagged rate, all on-chain, all auditable |
| **Integrate** | Pick a ruleset, pick a language, copy the snippet |

No more trusting platforms when they say "we follow the rules." Show me the proof. Literally.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| **ZK Circuit** | Compact (Midnight), @midnight-ntwrk/compact-runtime |
| **Blockchain** | Midnight (ledger v7) |
| **Proof Generation** | Midnight proof-server |
| **Wallet** | @midnight-ntwrk/wallet-sdk |
| **AI Compilation** | Google Gemini (English to Compact) |
| **Infrastructure** | Docker Compose (node + indexer + proof-server) |
| **Testing** | Vitest |

---

## Project Structure

```
ratri/
├── verdict/                  # Next.js protocol dashboard
│   ├── src/app/              # Pages + API routes
│   ├── src/lib/              # Midnight simulator, Compact validator, Gemini integration
│   └── sdk/                  # Verdict SDK (TypeScript)
├── contract/                 # ZK circuit + Midnight JS wrapper
│   ├── src/verdict.compact   # THE circuit — 10 checks, ~940 constraints
│   └── src/managed/          # Compiled ZK IR, prover/verifier keys
├── counter-cli/              # Midnight CLI + Docker orchestration
│   ├── standalone.yml        # Docker Compose: node + indexer + proof-server
│   └── src/standalone.ts     # Boot local Midnight stack
├── start.sh                  # One-command startup
└── README.md
```

---

## Running Locally

```bash
git clone <repo-url> && cd ratri
npm install
bash start.sh
```

This starts the local Midnight stack (node, indexer, proof server) and the dashboard on `localhost:3000`.

For development without Docker (simulator mode):

```bash
cd verdict
npm run dev
```

The simulator runs the full ZK circuit in-memory with pre-seeded example rulesets — no external infrastructure required.

---

## Why Midnight?

VERDICT needs a chain where privacy is native, not bolted on.

Midnight's dual-ledger model keeps aggregate verdicts public (anyone can audit) while all participant data stays private (only the prover ever sees it). The ZK circuit bridges the two: takes private inputs, produces public outputs, proves the relationship without revealing anything.

Remove Midnight and you're back to trusting a centralized verifier — which is the problem VERDICT exists to solve.

---

## The Hard Problems We Solved

**The Privacy Paradox** — Rule enforcement traditionally works by *seeing everything*. VERDICT works by *seeing nothing*. You hash hidden state, verify the hash on-chain, and check for statistical correlation *inside* the zero-knowledge circuit. The verifier never learns what the data was. They only learn whether the rules were followed.

**ZK Circuit Design Under Constraints** — Zero-knowledge circuits can't do everything a normal program can. No square roots. No floating point. No dynamic loops. Every check had to be redesigned for finite field arithmetic — Manhattan distance instead of Euclidean, cross products instead of angles, squared comparisons instead of roots. The result: 10 checks in ~940 constraints.

**Building on a Bleeding-Edge Chain** — Midnight's Compact language is powerful but barely documented. The tooling is young. We built a complete local simulator so the entire proof flow works end-to-end without depending on external infrastructure.

---

## Built For

**Midnight Assemble** — a builder program by the Midnight team.

VERDICT is infrastructure for a future where rule enforcement doesn't require surveillance.

---

*Built on Midnight. Proven in zero knowledge.*
