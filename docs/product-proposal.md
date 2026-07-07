# VERDICT — Level 3 Product Proposal

## Selected Idea: **Private Allowlist Access**

Prove membership in an authorized set **without revealing identity**.

## Mapping to VERDICT

VERDICT generalizes allowlist-style proofs into a universal integrity layer:

| Allowlist concept | VERDICT equivalent |
|-------------------|-------------------|
| Prove you're on the list | Prove your state transition satisfies enabled Guardians |
| Hide who you are | Player position, actions, enemy data stay as private witnesses |
| Public gate result | On-chain `CLEAN` / `FLAGGED` verdict + counters |
| Configurable rules | Per-ruleset Guardian bitmask + parameters via VCL |

**Concrete demo:** A game client submits a move (private coordinates + hidden enemy positions). The circuit verifies the transition is valid — velocity, bounds, commit-reveal — and publishes only whether rules were followed. Observers learn *that* the player was allowed to make the move, not *where* they were or *what* they saw.

## Why this fits Midnight

- Witnesses enter the circuit privately; only the verdict is disclosed via `disclose()`
- Lace wallet handles proving and fee payment — user keys never leave the extension
- Dual ledger: public integrity counters + private participant state

## Status

**Approved for implementation** — see `verdict/src/lib/verdict-client.ts` for the live Lace circuit call demonstrating private witness → public verdict.
