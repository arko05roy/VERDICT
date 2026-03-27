# VERDICT

### Universal Zero-Knowledge Rule Integrity Protocol

**Built on Midnight**

---

> *VERDICT doesn't ask systems to be honest. It makes dishonesty mathematically impossible.*

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [What VERDICT Does](#2-what-verdict-does)
3. [Architecture](#3-architecture)
4. [The 10-Check Framework](#4-the-10-check-framework)
   - [Category 1: Cryptographic Integrity](#category-1-cryptographic-integrity-checks-1-2)
   - [Category 2: Rate-of-Change Violations](#category-2-rate-of-change-violations-checks-3-4)
   - [Category 3: Boundary Enforcement](#category-3-boundary-enforcement-check-5)
   - [Category 4: Action Legitimacy](#category-4-action-legitimacy-checks-6-7)
   - [Category 5: Statistical & Information-Theoretic](#category-5-statistical--information-theoretic-checks-8-10)
5. [Why These 10?](#5-why-these-10)
6. [Why Midnight?](#6-why-midnight)
7. [On-Chain State](#7-on-chain-state)
8. [Integration](#8-integration)
9. [Test Results](#9-test-results)
10. [Design Decisions](#10-design-decisions)

---

## 1. The Problem

Every day, you interact with systems that enforce rules you cannot verify.

Your insurance claim — processed by an algorithm you can't inspect. Your trade on an exchange — executed at a price you have to trust. Your loan application — scored by a model that won't show its math. Your game — adjudicated by a server that could be lying about every outcome.

These aren't edge cases. This is the default. Every platform, every service, every institution that processes your data runs the same architecture: a black box that takes your inputs, applies rules internally, and tells you what happened. You have no proof the rules were followed. None.

And here's the structural problem: **the entity enforcing the rules is often the same entity that profits from breaking them.**

There is zero cryptographic proof that any rule was ever applied correctly. You're trusting a `console.log` on someone else's server.

That's not integrity. That's faith.

---

## 2. What VERDICT Does

VERDICT is a **universal ZK integrity protocol** built on Midnight. It doesn't replace existing systems. It doesn't touch business logic. It sits underneath and asks one question:

> **Was this state transition valid?**

Any system that processes state transitions — games, exchanges, insurance, lending, compliance — can plug into VERDICT. The system defines its rules as parameters. VERDICT runs **10 mathematical checks** inside a ZK circuit per transition. The proof settles on Midnight. The data stays private. The verdict is public.

`CLEAN` or `FLAGGED`. That's it.

VERDICT is infrastructure. Like Chainlink doesn't build your oracle — it provides the oracle network. Like The Graph doesn't build your subgraph — it provides the indexing protocol. VERDICT doesn't build your system. It provides the integrity layer.

Every system gets its own **ruleset** — a deployed Compact contract on Midnight with its own parameters. Different rules, same verification engine. Insurance claim processing, exchange trade execution, game anti-cheat, lending compliance — each is a deployed ruleset. You don't build a new system per use case. You deploy a ruleset.

---

## 3. Architecture

```
SYSTEM RUNTIME (zero latency impact)       ASYNC ZK SETTLEMENT (background)
──────────────────────────────────────      ──────────────────────────────────
Tick 1-N: System operates normally          Batch collects transitions locally
  state transitions captured as they        → Witness assembles private data
  happen — no pauses, no interrupts         → ZK proof generates (~2-5s)
                                            → 10 checks run inside circuit
                                            → Proof submits to Midnight
                                            → CLEAN or FLAGGED returned
                                            → Violation flagged retroactively
```

The system under verification never pauses. VERDICT operates asynchronously. If a violation is detected, it's flagged retroactively — with mathematical certainty, not heuristic confidence.

### The Circuit: `verifyTransition`

The circuit accepts two kinds of inputs:

**Public parameters** — the ruleset, defining what "valid" means:

```
maxVelocity, maxAcceleration, boundX, boundY,
validActionCount, maxActionsPerWindow, windowSize,
minDiversity, snapThreshold, maxSnaps, maxCorrelation,
enemyPosHashPublic
```

**Private witnesses** — the actual data, never revealed on-chain:

```
prevPrevPos, prevPos, currPos, action, isFirstMove,
prevHash, nonce, aimHistory, actionHistory, tickHistory,
currentTick, enemyPositions
```

All 10 checks execute in a single circuit call. The circuit aggregates failures and returns a verdict:

```compact
const anyFailed = check3Fail + check4Fail + check5Fail + check6Fail +
                  check7Fail + check8Fail + check9Fail + check10Fail;

const isFlagged = disclose(anyFailed > 0);
```

Checks 1 and 2 use `assert` — hard failures where no valid proof can be generated at all. Checks 3-10 use soft flags that aggregate into the final verdict. This distinction is intentional: tampered data (1-2) should be *unprovable*; rule violations (3-10) should be *provable and recordable*.

---

## 4. The 10-Check Framework

Every rule-based system follows the same pattern: take an input state, apply rules, produce an output state. Instead of building bespoke verification for every domain, VERDICT consolidates the entire problem space into 10 mathematical checks that cover the fundamental taxonomy of state transition violations.

### Category 1: Cryptographic Integrity (Checks 1-2)

These checks ensure the data itself hasn't been tampered with. They use `assert` — if they fail, no valid proof can be generated.

#### CHECK 1 — Hash-Chain Integrity

> **Catches:** State fabrication, replay attacks, injected data

Every state transition is chained to the previous one via cryptographic hash. The circuit recomputes the hash and verifies it matches the on-chain record:

```compact
const recomputedHash = persistentHash<Vector<6, Uint<64>>>(
  [p[0], p[1], c[0], c[1], action, now]
);
assert(prevHash == lastChainHash, "Hash chain broken: prevHash mismatch");
lastChainHash = disclose(recomputedHash);
```

The hash binds positions, action, and tick into a single chain. You can't inject a fake state because it breaks the hash. You can't replay an old state because the tick advances.

#### CHECK 2 — Commit-Reveal Integrity

> **Catches:** Retroactive editing, after-the-fact manipulation, front-running

Before a transition is verified, the actor must have already committed to it (via the `commitMove` circuit). The verifier checks that the revealed data matches the commitment:

```compact
const recomputedCommit = persistentCommit<Vector<5, Uint<64>>>(
  [p[0], p[1], c[0], c[1], action], nonce
);
assert(recomputedCommit == commitment, "Commit-reveal mismatch: move was altered");
```

This prevents the classic "I saw the outcome, let me change my input" attack. In finance: front-running. In games: screen-peeking. In insurance: adjusting a claim after seeing the payout. The commitment is cryptographic — you can't find a different input that produces the same hash.

---

### Category 2: Rate-of-Change Violations (Checks 3-4)

These checks enforce that state doesn't change faster than the rules allow — applicable to any system with rate constraints.

#### CHECK 3 — Velocity (First-Order Rate)

> **Catches:** Teleportation, impossibly fast state changes

Computes Manhattan distance between consecutive states:

```compact
const dx = absDiff(c[0], p[0]);
const dy = absDiff(c[1], p[1]);
const velocity = dx + dy;
const check3Fail = velocity > maxVelocity ? 1 : 0;
```

Manhattan distance avoids square roots (expensive in ZK). The `absDiff` helper handles unsigned subtraction safely — `a >= b ? a - b : b - a` — because Compact's `Uint` panics on underflow.

#### CHECK 4 — Acceleration (Second-Order Rate)

> **Catches:** Gradual ramp exploits, rate-limit evasion

Computes the change in velocity between two consecutive transitions. Catches actors who stay just under the velocity limit per tick but accelerate impossibly fast:

```compact
const prevVelocity = absDiff(p[0], pp[0]) + absDiff(p[1], pp[1]);
const accel = absDiff(velocity as Uint<64>, prevVelocity as Uint<64>);
const check4Fail = isFirst == 0 ? (accel > maxAcceleration ? 1 : 0) : 0;
```

Skipped on the first move (`isFirst == 0` guard) — no previous velocity to compare against. The `as Uint<64>` cast is required because Compact widens arithmetic results.

---

### Category 3: Boundary Enforcement (Check 5)

#### CHECK 5 — Bounds Validation

> **Catches:** Out-of-bounds states, constraint violations

```compact
const check5Fail = (c[0] > boundX ? 1 : 0) + (c[1] > boundY ? 1 : 0);
```

Simple but fundamental. In games: map boundaries. In finance: position limits. In any system: valid state ranges. If the state is outside the defined space, it's invalid.

---

### Category 4: Action Legitimacy (Checks 6-7)

#### CHECK 6 — Action Validity

> **Catches:** Invalid commands, impossible actions, injected operations

```compact
const check6Fail = action >= validActionCount ? 1 : 0;
```

Actions are numeric IDs (0 to N-1). Anything outside that range doesn't exist in the system's rule set. Prevents packet injection, fabricated operations, or actions the actor shouldn't have access to.

#### CHECK 7 — Action Frequency (Rate Limiting)

> **Catches:** Superhuman speed, automated spam, macro execution

Counts actions within a sliding time window. First asserts tick history is monotonically increasing (timestamps can't go backwards), then counts:

```compact
assert(tickHist[0] <= tickHist[1], "Tick history not monotonic");
// ... (7 monotonicity assertions across all 8 ticks)

const windowStart = now - windowSize;
const actionsInWindow: Uint<64> =
  (tickHist[0] >= windowStart ? 1 : 0) +
  (tickHist[1] >= windowStart ? 1 : 0) +
  // ... all 8 ticks
  (tickHist[7] >= windowStart ? 1 : 0);

const check7Fail = actionsInWindow > maxActionsPerWindow ? 1 : 0;
```

The monotonicity assertions are critical — without them, an actor could fake timestamps to spread actions across a wider window.

---

### Category 5: Statistical & Information-Theoretic (Checks 8-10)

The most sophisticated checks. They detect violations that don't break any single rule but exhibit statistically impossible patterns.

#### CHECK 8 — Behavioral Entropy (Gini-Simpson Diversity)

> **Catches:** Scripted loops, automated patterns, bot behavior

Measures action diversity using the **Gini-Simpson index**: D = N² - Σfⱼ², where fⱼ is the frequency of each action type. Low diversity = likely automated:

```compact
const freq0: Uint<64> = fold(
  (acc: Uint<64>, a) => (acc + (a == 0 ? 1 : 0)) as Uint<64>,
  0 as Uint<64>, actHist
);
// freq1, freq2, freq3 computed similarly via fold()

const sumSq = freq0 * freq0 + freq1 * freq1 + freq2 * freq2 + freq3 * freq3;
const diversity = 64 - sumSq;  // N²=64 (8 actions), max sumSq=64 (all same)
const check8Fail = diversity < minDiversity ? 1 : 0;
```

Uses `fold` — Compact's functional aggregation primitive — over the action history vector. Counts frequencies for 4 action categories, then computes sum of squared frequencies. If all 8 actions are identical, `sumSq = 64`, `diversity = 0`. A legitimate actor produces varied actions; a scripted loop doesn't.

#### CHECK 9 — Precision Anomaly (Cross-Product Curvature)

> **Catches:** Algorithmic precision, inhuman accuracy, automated targeting

Analyzes trajectory for superhuman smoothness. For each triplet of consecutive data points, computes the **cross-product magnitude** of the two displacement vectors — measuring trajectory curvature:

```compact
const threshSq = snapThreshold * snapThreshold;

// For each triplet (point[i] → point[i+1] → point[i+2]):
const d0x = absDiff(aimFlat[2], aimFlat[0]);
const d0y = absDiff(aimFlat[3], aimFlat[1]);
const d1x = absDiff(aimFlat[4], aimFlat[2]);
const d1y = absDiff(aimFlat[5], aimFlat[3]);
const cross = absDiff((d0x * d1y) as Uint<64>, (d0y * d1x) as Uint<64>);
const snap = cross * cross > threshSq ? 1 : 0;
```

6 triplets from 8 data points. Cross product near zero = perfectly straight trajectory (algorithmic). Human input has natural jitter and overshoot. Too many "snaps" (straight-line segments) triggers the flag.

#### CHECK 10 — Information Leakage (Directional Correlation)

> **Catches:** Acting on hidden information, data exfiltration side-effects

The most novel check. Detects whether an actor's behavior correlates with information they shouldn't have access to.

First, verifies the hidden data hasn't been tampered with:

```compact
const recomputedEnemyHash = persistentHash<Vector<16, Uint<64>>>(enemyFlat);
assert(recomputedEnemyHash == enemyPosHashPublic, "Enemy position hash mismatch");
```

Then computes directional correlation — is the actor consistently moving toward hidden entities?

```compact
const movingRight = c[0] > p[0] ? 1 : 0;
const movingUp    = c[1] > p[1] ? 1 : 0;

// For each hidden entity: does movement direction match entity direction?
const towardX0 = movingRight == (enemyFlat[0] > c[0] ? 1 : 0) ? 1 : 0;
const towardY0 = movingUp    == (enemyFlat[1] > c[1] ? 1 : 0) ? 1 : 0;
// ... all 8 entities, 16 directional correlation checks

const totalCorrelation = towardX0 + towardY0 + towardX1 + towardY1 +
  towardX2 + towardY2 + towardX3 + towardY3 +
  towardX4 + towardY4 + towardX5 + towardY5 +
  towardX6 + towardY6 + towardX7 + towardY7;

const check10Fail = totalCorrelation > maxCorrelation ? 1 : 0;
```

Information leakage has a behavioral signature: the actor moves toward things they shouldn't know about more often than chance allows. The `maxCorrelation` threshold defines what "more than chance" means. The entity positions are private witnesses — the circuit sees them, the chain doesn't.

---

## 5. Why These 10?

The 10 checks map to a complete taxonomy of state transition violations:

| Layer | Checks | Question |
|-------|--------|----------|
| **Data integrity** | 1, 2 | Is the data real? Was it committed in advance? |
| **Rate constraints** | 3, 4 | Does state change at a legal rate? |
| **Boundary constraints** | 5 | Is the state within valid ranges? |
| **Action constraints** | 6, 7 | Are the operations legitimate and not too frequent? |
| **Behavioral analysis** | 8, 9, 10 | Does the pattern look legitimate? |

Any violation in any rule-based system falls into one of these layers. You can't fabricate history (1-2). You can't violate rate constraints (3-4). You can't exceed boundaries (5). You can't inject invalid operations (6-7). You can't automate without detection (8-9). You can't act on hidden information (10).

Different domains customize the parameters. A game sets `maxVelocity = 5`; a trading system sets it to maximum price movement per tick. The math is the same. The rules are different. That's what makes VERDICT a protocol, not a product.

### Design Principles

**Completeness over specificity.** Each check targets a *category* of violations, not a specific exploit. New attack vectors still fall into one of these 10 categories.

**Layered defense.** Checks are independent — a violation must bypass ALL 10 to go undetected. Checks 1-2 ensure data integrity. Checks 3-7 enforce rules. Checks 8-10 catch statistical anomalies.

**Game-agnostic parameters.** The checks are universal. Systems customize behavior through parameters: `maxVelocity`, `boundX`, `validActionCount`, `snapThreshold`, etc.

**Privacy-preserving.** All data enters as private witnesses. Only the verdict (`CLEAN`/`FLAGGED`) is public. The proof proves the checks passed without revealing what was checked.

---

## 6. Why Midnight?

Midnight's Compact language compiles directly to ZK circuits. Privacy isn't bolted on — it's the execution model.

- **Private by default.** All actor data enters as witnesses. The circuit verifies it. Nothing is revealed on-chain.
- **Verifiable by anyone.** The proof is publicly verifiable without seeing the inputs.
- **Lightweight.** ~940 R1CS constraints total across all 10 checks. ~2-5 second proof time on commodity hardware. Async settlement with zero runtime impact.
- **Dual ledger.** Public state (verdicts, counters) and private state (witnesses) coexist natively. No bolted-on privacy layer.

The Compact compiler generates prover keys, verifier keys, and TypeScript bindings from a single `.compact` source file. The ZK circuit, the on-chain state, and the SDK are all derived from one artifact.

Remove Midnight from VERDICT, and you're back to trusting the system's `console.log`.

---

## 7. On-Chain State

Each deployed ruleset maintains public ledger state, readable by anyone:

```compact
export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;        // clean or flagged
export ledger commitment: Bytes<32>;       // latest committed transition hash
export ledger lastChainHash: Bytes<32>;    // current hash chain head
export ledger sessionActive: Boolean;
```

This is what accountability looks like. Every ruleset has a public integrity profile. Total verifications. Flagged rate. All on-chain. All auditable.

No more trusting platforms when they say "we follow the rules." Show me the proof. Literally.

---

## 8. Integration

### Three Circuits, One Flow

VERDICT uses three circuits in sequence per session:

**`startSession(genesisHash)`** — Initializes a new session. Sets up the hash chain with a genesis hash. Called once when an actor begins.

```typescript
await contract.startSession(genesisHash);
// On-chain: sessionActive = true, lastChainHash = genesisHash
```

**`commitMove(commitment)`** — Commits to a state transition before it's revealed. The commitment is a cryptographic hash of the state + action + nonce. Called before each transition.

```typescript
const commitment = persistentCommit([...currPos, action], nonce);
await contract.commitMove(commitment);
// On-chain: commitment stored
```

**`verifyTransition(...rulesetParams, entityHash)`** — The main circuit. Runs all 10 checks. Returns the verdict.

```typescript
const verdict = await contract.verifyTransition(
  5n,    // maxVelocity
  3n,    // maxAcceleration
  1000n, // boundX
  1000n, // boundY
  8n,    // validActionCount
  6n,    // maxActionsPerWindow
  10n,   // windowSize
  2n,    // minDiversity
  2n,    // snapThreshold
  5n,    // maxSnaps
  50n,   // maxCorrelation
  entityPosHash  // Uint8Array(32)
);
// verdict = 0 (CLEAN) or 1 (FLAGGED)
```

### Witness Data

Each verification requires private witness data — the actual state that gets checked inside the ZK circuit but never revealed on-chain:

```typescript
const witnessData: VerdictPrivateState = {
  prevPrevPos: [100n, 200n],     // three frames for acceleration
  prevPos:     [102n, 201n],
  currPos:     [104n, 203n],
  action: 1n,                    // action ID (0 = idle)
  isFirstMove: 0n,               // 1 on first move, 0 after
  prevHash: new Uint8Array(32),  // hash chain continuity
  nonce: new Uint8Array(32),     // commitment randomness
  aimHistory: [...],             // 8 data points, [x,y] flattened to 16 values
  actionHistory: [...],          // last 8 actions
  tickHistory: [...],            // last 8 timestamps
  currentTick: 100n,
  enemyPositions: [...],         // 8 entities, [x,y] flattened to 16 values
};
```

### Ruleset Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `maxVelocity` | Max state change per tick (Manhattan distance) | `5n` |
| `maxAcceleration` | Max velocity change per tick | `3n` |
| `boundX` / `boundY` | State space boundaries | `1000n` |
| `validActionCount` | Number of valid action IDs (0 to N-1) | `8n` |
| `maxActionsPerWindow` | Max actions in time window | `6n` |
| `windowSize` | Sliding window size in ticks | `10n` |
| `minDiversity` | Min behavioral entropy (Gini-Simpson) | `2n` |
| `snapThreshold` | Curvature threshold for precision detection | `2n` |
| `maxSnaps` | Max straight-line segments allowed | `5n` |
| `maxCorrelation` | Directional correlation threshold | `50n` |
| `enemyPosHashPublic` | Hash of hidden entity positions (32 bytes) | — |

---

## 9. Test Results

All 10 checks verified locally via simulator (no devnet required):

```
CLEAN move       → verdict = 0 (clean),   totalFlagged = 0    CHECK 1-10 pass
TELEPORT         → verdict = 1 (flagged), totalFlagged = 1    CHECK 3 triggered
OUT OF BOUNDS    → verdict = 1 (flagged), totalFlagged = 1    CHECK 5 triggered
INVALID ACTION   → verdict = 1 (flagged), totalFlagged = 1    CHECK 6 triggered
BOT (no entropy) → verdict = 1 (flagged), totalFlagged = 1    CHECK 8 triggered
SPEED RAMP       → verdict = 1 (flagged), totalFlagged = 1    CHECK 4 triggered
```

Run locally:

```bash
cd contract && npx vitest run src/test/verdict.test.ts
```

---

## 10. Design Decisions

**Why async settlement?**
ZK proof generation takes 2-5 seconds. Blocking the system to wait for a proof would be unusable. VERDICT settles asynchronously — the system operates at full speed, violations are flagged retroactively with mathematical certainty.

**Why 10 checks in one circuit?**
A single circuit call is cheaper than 10 separate ones. One proof covers everything — one submission, one verification, one on-chain write. ~940 R1CS constraints total.

**Why soft flags + hard asserts?**
Checks 1-2 (data integrity) use `assert` because tampered data should make the proof itself invalid — you can't even generate a proof with fabricated history. Checks 3-10 use soft flags because we want to *record* violations on-chain, not silently reject them. A flagged transition is evidence. An unprovable one is just missing.

**Why Midnight over other ZK chains?**
Compact compiles to ZK circuits natively. The dual-ledger model means private witnesses and public verdicts coexist without bolted-on privacy layers. `disclose()` is a language primitive, not a library call. This is exactly what Midnight was built for.

**Why not kernel-level verification?**
Kernel-level approaches (Vanguard, EasyAntiCheat) require OS-level access, work on specific platforms, invade privacy, and get bypassed regularly. VERDICT is mathematical — it doesn't care what OS you run or what software you have installed. It verifies the *output*, not the *process*.

---

*VERDICT. Universal rule integrity. Private by default. Built on Midnight because this is exactly what Midnight was made for.*
