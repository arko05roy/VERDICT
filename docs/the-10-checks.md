# The 10 Checks — How VERDICT Proves Rule Integrity

## The Core Idea

Every rule-based system — a game, a financial exchange, an insurance processor, a lending platform — follows the same pattern: take an input state, apply rules, produce an output state. The question VERDICT answers is: **was this state transition valid?**

Instead of building bespoke verification for every domain, VERDICT consolidates the entire problem space into **10 mathematical checks** that run inside a single ZK circuit. These 10 checks aren't arbitrary — they map to the fundamental categories of rule violation that exist across any system processing state transitions.

The circuit is written in [Compact](https://docs.midnight.network), Midnight's native ZK language. All 10 checks execute in a single `verifyTransition` call. The private data (positions, actions, history) enters as **witnesses** — the circuit verifies them and they're never revealed. Only the verdict is public: `CLEAN` or `FLAGGED`.

---

## The Circuit: `verifyTransition`

The circuit accepts two kinds of inputs:

**Public parameters** (the ruleset — defines what "valid" means):
```
maxVelocity, maxAcceleration, boundX, boundY,
validActionCount, maxActionsPerWindow, windowSize,
minDiversity, snapThreshold, maxSnaps, maxCorrelation,
enemyPosHashPublic
```

**Private witnesses** (the actual data — never revealed):
```
prevPrevPos, prevPos, currPos, action, isFirstMove,
prevHash, nonce, aimHistory, actionHistory, tickHistory,
currentTick, enemyPositions
```

The circuit runs all 10 checks, aggregates failures, and returns:

```compact
const anyFailed = check3Fail + check4Fail + check5Fail + check6Fail +
                  check7Fail + check8Fail + check9Fail + check10Fail;

const isFlagged = disclose(anyFailed > 0);
```

Checks 1 and 2 use `assert` (hard failure — the proof itself is invalid if broken). Checks 3-10 use soft flags that aggregate into the final verdict. This distinction is intentional: tampered data (checks 1-2) should be unprovable, while rule violations (checks 3-10) should be provable and recordable.

---

## Category 1: Cryptographic Integrity

These two checks ensure the data itself hasn't been tampered with. They use `assert` — if they fail, no valid proof can be generated at all.

### CHECK 1 — Hash-Chain Integrity
**Catches:** State fabrication, replay attacks, injected data

Every state transition is chained to the previous one. The circuit recomputes the hash of the current transition and verifies the previous hash matches what's stored on-chain:

```compact
const recomputedHash = persistentHash<Vector<6, Uint<64>>>(
  [p[0], p[1], c[0], c[1], action, now]
);
assert(prevHash == lastChainHash, "Hash chain broken: prevHash mismatch");
lastChainHash = disclose(recomputedHash);
```

The hash includes positions, action, and the current tick — binding every field to the chain. You can't inject a fake state because it would break the hash. You can't replay an old state because the tick advances.

### CHECK 2 — Commit-Reveal Integrity
**Catches:** Retroactive editing, after-the-fact manipulation

Before a transition is verified, the actor must have already committed to it (via the `commitMove` circuit). The verifier checks that the revealed data matches the commitment:

```compact
const recomputedCommit = persistentCommit<Vector<5, Uint<64>>>(
  [p[0], p[1], c[0], c[1], action], nonce
);
assert(recomputedCommit == commitment, "Commit-reveal mismatch: move was altered");
```

This prevents the classic "I saw the outcome, let me change my input" attack. In finance: front-running. In games: screen-peeking. In insurance: adjusting a claim after seeing the payout. The commitment is cryptographic — you can't find a different input that produces the same hash.

---

## Category 2: Physics / Rate-of-Change Violations

These checks enforce that state doesn't change faster than the rules allow — applicable to any system with rate constraints.

### CHECK 3 — Velocity (First-Order Rate)
**Catches:** Teleportation, impossibly fast state changes

Computes Manhattan distance between consecutive states and checks it doesn't exceed the maximum:

```compact
const dx = absDiff(c[0], p[0]);
const dy = absDiff(c[1], p[1]);
const velocity = dx + dy;
const check3Fail = velocity > maxVelocity ? 1 : 0;
```

Manhattan distance avoids square roots (expensive in ZK). The `absDiff` helper handles unsigned subtraction safely — `a >= b ? a - b : b - a` — because Compact's `Uint` panics on underflow.

### CHECK 4 — Acceleration (Second-Order Rate)
**Catches:** Gradual ramp exploits, rate-limit evasion

Computes the change in velocity between two consecutive transitions. Catches actors who stay just under the velocity limit per tick but accelerate impossibly fast:

```compact
const prevVelocity = absDiff(p[0], pp[0]) + absDiff(p[1], pp[1]);
const accel = absDiff(velocity as Uint<64>, prevVelocity as Uint<64>);
const check4Fail = isFirst == 0 ? (accel > maxAcceleration ? 1 : 0) : 0;
```

Skipped on the first move (`isFirst == 0` guard) because there's no previous velocity to compare against. The `as Uint<64>` cast is required because Compact widens arithmetic results.

---

## Category 3: Boundary Enforcement

### CHECK 5 — Bounds Validation
**Catches:** Out-of-bounds states, constraint violations

Verifies the current state falls within defined boundaries:

```compact
const check5Fail = (c[0] > boundX ? 1 : 0) + (c[1] > boundY ? 1 : 0);
```

Simple but fundamental. In games: map boundaries. In finance: position limits. In any system: valid state ranges. If the state is outside the defined space, it's invalid.

---

## Category 4: Action Legitimacy

### CHECK 6 — Action Validity
**Catches:** Invalid commands, impossible actions, injected operations

Verifies the action ID falls within the set of actions the ruleset defines as valid:

```compact
const check6Fail = action >= validActionCount ? 1 : 0;
```

Actions are represented as numeric IDs (0 to N-1). Any action outside that range is invalid — it doesn't exist in the system's rule set. Prevents packet injection, fabricated operations, or actions the actor shouldn't have access to.

### CHECK 7 — Action Frequency (Rate Limiting)
**Catches:** Superhuman speed, automated spam, macro execution

Counts how many actions occurred within a sliding time window. First asserts tick history is monotonically increasing (timestamps can't go backwards), then counts actions in-window:

```compact
assert(tickHist[0] <= tickHist[1], "Tick history not monotonic");
// ... (7 monotonicity assertions)

const windowStart = now - windowSize;
const actionsInWindow: Uint<64> =
  (tickHist[0] >= windowStart ? 1 : 0) +
  (tickHist[1] >= windowStart ? 1 : 0) +
  // ... all 8 ticks
  (tickHist[7] >= windowStart ? 1 : 0);

const check7Fail = actionsInWindow > maxActionsPerWindow ? 1 : 0;
```

The monotonicity assertions are critical — without them, an actor could fake timestamps to spread actions across a wider window. The sliding window approach means recent bursts are caught regardless of long-term averages.

---

## Category 5: Statistical & Information-Theoretic

These are the most sophisticated checks. They detect violations that don't break any single rule but exhibit statistically impossible patterns.

### CHECK 8 — Behavioral Entropy (Gini-Simpson Diversity)
**Catches:** Scripted loops, automated patterns, bot behavior

Measures action diversity using the **Gini-Simpson index**: `D = N² - Σfⱼ²`, where `fⱼ` is the frequency of each action type. Low diversity = likely automated:

```compact
const freq0: Uint<64> = fold(
  (acc: Uint<64>, a) => (acc + (a == 0 ? 1 : 0)) as Uint<64>,
  0 as Uint<64>, actHist
);
// freq1, freq2, freq3 similarly...

const sumSq = freq0 * freq0 + freq1 * freq1 + freq2 * freq2 + freq3 * freq3;
const diversity = 64 - sumSq;  // N²=64 (8 actions), max sumSq=64 (all same)
const check8Fail = diversity < minDiversity ? 1 : 0;
```

Uses `fold` over the action history vector — Compact's functional primitive for aggregation. Counts frequencies for 4 action categories, then computes the sum of squared frequencies. If all 8 actions are the same, `sumSq = 64`, `diversity = 0`. A human produces varied actions; a bot running a loop doesn't.

### CHECK 9 — Precision Anomaly (Cross-Product Curvature)
**Catches:** Algorithmic precision, inhuman accuracy, automated targeting

Analyzes aim trajectory for superhuman smoothness. For each triplet of consecutive aim points, computes the **cross-product magnitude** of the two displacement vectors — this measures how much the trajectory curves:

```compact
const threshSq = snapThreshold * snapThreshold;

// For each triplet (aim[i] → aim[i+1] → aim[i+2]):
const d0x = absDiff(aimFlat[2], aimFlat[0]);  // displacement vector 1
const d0y = absDiff(aimFlat[3], aimFlat[1]);
const d1x = absDiff(aimFlat[4], aimFlat[2]);  // displacement vector 2
const d1y = absDiff(aimFlat[5], aimFlat[3]);
const cross = absDiff((d0x * d1y) as Uint<64>, (d0y * d1x) as Uint<64>);
const snap = cross * cross > threshSq ? 1 : 0;
```

6 triplets from 8 aim events. Cross product near zero = perfectly straight trajectory (algorithmic). Human input has natural jitter and overshoot. Too many "snaps" (straight-line segments) triggers the flag.

### CHECK 10 — Information Leakage (Directional Correlation)
**Catches:** Acting on hidden information, data exfiltration side-effects

The most novel check. Detects whether an actor's behavior correlates with information they shouldn't have access to. First verifies the hidden data hasn't been tampered with:

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
// ... all 8 entities (16 correlation checks)

const totalCorrelation = towardX0 + towardY0 + towardX1 + towardY1 + ... ;
const check10Fail = totalCorrelation > maxCorrelation ? 1 : 0;
```

This works because information leakage has a behavioral signature: the actor moves toward things they shouldn't know about more often than chance allows. The `maxCorrelation` threshold defines what "more than chance" means. The entity positions are private witnesses — the circuit sees them, the chain doesn't.

---

## Why These 10?

The 10 checks map to a complete taxonomy of state transition violations:

| Layer | Checks | What it covers |
|-------|--------|----------------|
| **Data integrity** | 1, 2 | Is the data real? Was it committed in advance? |
| **Rate constraints** | 3, 4 | Does the state change at a legal rate? |
| **Boundary constraints** | 5 | Is the state within valid ranges? |
| **Action constraints** | 6, 7 | Are the operations legitimate and not too frequent? |
| **Behavioral analysis** | 8, 9, 10 | Does the pattern look human/legitimate? |

Any violation in any rule-based system falls into one of these layers. You can't cheat physics (3-4), you can't fabricate history (1-2), you can't act on hidden information (10), you can't automate without detection (8-9), you can't exceed boundaries (5), and you can't inject invalid operations (6-7).

Different domains customize the parameters — a game sets `maxVelocity = 5`, a trading system sets it to a max price movement per tick. The math is the same. The rules are different. That's what makes VERDICT a protocol, not a product.
