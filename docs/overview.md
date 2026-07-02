# VERDICT Protocol — Overview

## The Problem

Every day, you interact with systems that enforce rules you cannot verify.

Your insurance claim — processed by an algorithm you can't inspect. Your trade on an exchange — executed at a price you have to trust. Your loan application — scored by a model that won't show its math. Your game — adjudicated by a server that could be lying about every outcome.

The structural problem: **the entity enforcing the rules is often the same entity that profits from breaking them.**

There is zero cryptographic proof that any rule was ever applied correctly. You're trusting a `console.log` on someone else's server.

## What VERDICT Does

VERDICT is a **universal ZK integrity protocol** built on [Midnight](https://midnight.network). It sits underneath any rule-based system and asks one question: **was this state transition valid?**

Any system that processes state transitions — games, exchanges, insurance, lending, compliance — can plug into VERDICT. The system selects which checks apply, configures their parameters, and registers a **ruleset**. The proof settles on Midnight. The data stays private. The verdict is public.

`CLEAN` or `FLAGGED`. That's it.

## Architecture

VERDICT uses a **Registry + Versioned Verifier** model:

```
VERDICT DAO (on-chain governance)
    |
    +-- Guardian Registry (10 genesis checks, extensible via proposals)
    |
    +-- Verifier Versions (immutable, compiled once per Guardian set)
    |     +-- v1.0 — Guardians I-X (genesis)
    |     +-- v1.1 — Guardians I-XI (after DAO approves Guardian XI)
    |     +-- ...
    |
    +-- Rulesets (lightweight entries, no compilation needed)
          +-- Ruleset A -> Verifier v1.0, mask=0b1111100011, params={...}
          +-- Ruleset B -> Verifier v1.0, mask=0b1111111111, params={...}
          +-- Ruleset C -> Verifier v1.1, mask=0b11111111111, params={...}
```

**Verifier contracts** are compiled once and immutable. They contain a fixed set of Guardians. New Guardians require a new verifier version — old ones are never modified.

**Rulesets** are lightweight on-chain entries. They reference a verifier version, specify which Guardians to enable (bitmask), and set parameters. No contract compilation needed — registering a ruleset is instant.

**Migration** is opt-in. When the DAO approves a new Guardian and a new verifier version is compiled, existing rulesets keep working on their current verifier. Owners can migrate to the new version if they want the new Guardian.

## The Guardians

VERDICT's verification primitives are called **Guardians** — each named after a figure from Greek or Roman mythology.

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

Guardians I-II use hard assertions — if broken, no valid proof exists. Guardians III-X are soft flags that aggregate into the final verdict.

Rulesets are configured using **VCL (Verdict Compile Language)** — a declaration format that maps Guardian selections and parameters to a verifier version + bitmask. The Guardian library is governed by an on-chain DAO.

## Governance

The VERDICT DAO manages:

- **Guardian Registry** — propose, vote, and register new Guardians
- **Verifier Versions** — council members register new versions when Guardians are added
- **Rulesets** — anyone can register a ruleset against an active verifier version

Council-based voting with on-chain double-vote prevention. The 10 genesis Guardians are pre-registered at deployment.

## On-Chain State

Each verifier contract maintains public ledger state per session:

| Field | Type | Meaning |
|-------|------|---------|
| `totalChecks` | Counter | Total verifications run |
| `totalFlagged` | Counter | Total flagged transitions |
| `lastVerdict` | Verdict | CLEAN or FLAGGED |
| `commitment` | Bytes<32> | Latest committed transition hash |
| `lastChainHash` | Bytes<32> | Current hash chain head |
| `sessionActive` | Boolean | Whether a session is active |

The DAO contract tracks:

| Field | Type | Meaning |
|-------|------|---------|
| `verifierVersions` | Map | All registered verifier versions |
| `rulesets` | Map | All registered rulesets (id, verifier, mask, params) |
| `checkRegistry` | Map | All registered Guardians |
| `proposals` | Map | Active governance proposals |

## Why Midnight?

Midnight's Compact language compiles directly to ZK circuits. Privacy isn't bolted on — it's the execution model.

- **Private by default:** All actor data enters as witnesses. Nothing is revealed on-chain.
- **Verifiable by anyone:** The proof is publicly verifiable without seeing the inputs.
- **Lightweight:** ~940 R1CS constraints. ~2-5s proof time. Async settlement.
- **Dual ledger:** Public state (verdicts) and private state (witnesses) coexist natively.

## Next Steps

- [The 10 Checks](./the-10-checks.md) — full breakdown with circuit code
- [Integration Guide](./integration-guide.md) — how to integrate VERDICT into your system
- [Whitepaper](./whitepaper.md) — complete protocol specification
