# VERDICT Protocol — Overview

## The Problem

Every day, you interact with systems that enforce rules you cannot verify.

Your insurance claim — processed by an algorithm you can't inspect. Your trade on an exchange — executed at a price you have to trust. Your loan application — scored by a model that won't show its math. Your game — adjudicated by a server that could be lying about every outcome.

These aren't edge cases. This is the default. Every platform, every service, every institution that processes your data runs the same architecture: a black box that takes your inputs, applies rules internally, and tells you what happened. You have no proof the rules were followed.

The structural problem: **the entity enforcing the rules is often the same entity that profits from breaking them.**

There is zero cryptographic proof that any rule was ever applied correctly. You're trusting a `console.log` on someone else's server.

That's not integrity. That's faith.

## What VERDICT Does

VERDICT is a **universal ZK integrity protocol** built on [Midnight](https://midnight.network). It doesn't replace existing systems. It doesn't touch business logic. It sits underneath and asks one question: **was this state transition valid?**

Any system that processes state transitions — games, exchanges, insurance, lending, compliance — can plug into VERDICT. The system defines its rules as parameters. VERDICT runs **10 mathematical checks** inside a ZK circuit per transition. The proof settles on Midnight. The data stays private. The verdict is public.

`CLEAN` or `FLAGGED`. That's it.

## How It Works

```
Your System (games, finance, insurance — anything rule-based)
    │
    ├─ Captures state transitions (prev state → current state + action)
    │
    └─ Submits as ZK witness (private — never revealed)
            │
            ├─ ZK circuit runs 10 checks (~2-5s proof time)
            │
            └─ Proof settles on Midnight
                    │
                    └─ Returns: CLEAN (0) or FLAGGED (1)
                       On-chain: totalChecks, totalFlagged, lastVerdict
```

The system under verification never pauses. VERDICT operates asynchronously in the background. If a violation is detected, it's flagged retroactively — with mathematical certainty.

## The Guardians

VERDICT's verification primitives are called **Guardians** — each named after a figure from Greek or Roman mythology. They are modular: you select which Guardians your system needs, configure their parameters, and deploy a custom circuit containing only those checks.

| # | Guardian | Category | What It Proves |
|---|----------|----------|----------------|
| I | **Mnemosyne** | Integrity | History chain — no state can be fabricated or replayed |
| II | **Styx** | Integrity | Oath binding — actions committed before outcomes revealed |
| III | **Hermes** | Rate Limit | First-order rate — state cannot change faster than allowed |
| IV | **Phaethon** | Rate Limit | Second-order rate — acceleration cannot exceed limits |
| V | **Terminus** | Boundary | Boundary enforcement — state must stay within valid ranges |
| VI | **Themis** | Validity | Action legitimacy — only defined operations are permitted |
| VII | **Chronos** | Validity | Time-window frequency — actions cannot exceed rate per window |
| VIII | **Moirai** | Behavioral | Pattern entropy — behavior must show natural diversity |
| IX | **Daedalus** | Behavioral | Precision anomaly — detects inhuman accuracy patterns |
| X | **Prometheus** | Information | Knowledge leakage — detects correlation with hidden data |

Guardians I-II use hard assertions — if broken, no valid proof exists. Guardians III-X are soft flags that aggregate into the final verdict. Tampered data is unprovable; rule violations are provable and recorded on-chain.

Rulesets are defined using **VCL (Verdict Compile Language)** — a declaration format that deterministically compiles to Compact ZK circuits. No AI generates code. The Guardian library is governed by an on-chain DAO where anyone can propose new Guardians for community vote.

See [The 10 Checks](./the-10-checks.md) for the full breakdown with actual circuit code.

## Why Midnight?

Midnight's Compact language compiles directly to ZK circuits. Privacy isn't bolted on — it's the execution model.

- **Private by default:** All actor data enters as witnesses. The circuit verifies it. Nothing is revealed on-chain.
- **Verifiable by anyone:** The proof is publicly verifiable without seeing the inputs.
- **Lightweight:** ~940 R1CS constraints. ~2-5s proof time. Async settlement.
- **Dual ledger:** Public state (verdicts, counters) and private state (witnesses) coexist natively.

Remove Midnight from VERDICT, and you're back to trusting the system's `console.log`.

## It's a Protocol, Not a Product

VERDICT is infrastructure. Like Chainlink doesn't build your oracle — it provides the oracle network. Like The Graph doesn't build your subgraph — it provides the indexing protocol.

VERDICT doesn't build your system. It provides the integrity layer.

Every system gets its own **ruleset** — a deployed Compact contract on Midnight with its own parameters. Different rules, same verification engine. Insurance claim processing, exchange trade execution, game anti-cheat, lending compliance — each is a deployed ruleset. You don't build a new system per use case. You deploy a ruleset.

## On-Chain State

Each deployed ruleset maintains public ledger state:

| Field | Type | Meaning |
|-------|------|---------|
| `totalChecks` | Counter | Total verifications run |
| `totalFlagged` | Counter | Total flagged transitions |
| `lastVerdict` | Verdict | CLEAN or FLAGGED |
| `commitment` | Bytes<32> | Latest committed transition hash |
| `lastChainHash` | Bytes<32> | Current hash chain head |
| `sessionActive` | Boolean | Whether a session is active |

This is what accountability looks like. Every ruleset has a public integrity profile. Total verifications. Flagged rate. All on-chain. All auditable.

No more trusting platforms when they say "we follow the rules." Show me the proof. Literally.

## Next Steps

- [The 10 Checks](./the-10-checks.md) — full breakdown with circuit code from `verdict.compact`
- [Integration Guide](./integration-guide.md) — how to integrate VERDICT into your system
