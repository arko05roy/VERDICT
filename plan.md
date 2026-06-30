# VERDICT — Full Battle Plan

**Stack:** Compact (ZK circuits) · `@midnight-ntwrk/dapp-connector-api` · Next.js 14 (App Router) · TypeScript · Tailwind CSS
**Wallet:** Midnight Lace connector (`window.midnight.mnLace.enable()`)
**Product thesis:** Generic privacy-native anti-cheat SDK. Any game defines its rules. VERDICT proves state transitions are valid via 10 layered mathematical checks — covering speed hacks, aimbot, wallhack, bots, and state fabrication. No surveillance. No kernel access. No trust.
**Core loop:** Game client captures state transitions → witness provides states, actions, aim data, enemy positions privately → ZK circuit runs 10 checks → proof submits to Midnight → VERDICT returns: CLEAN or FLAGGED → game never pauses (async settlement).

---

## ARCHITECTURE — The Anti-Cheat Rollup

```
REAL-TIME GAMEPLAY (no lag)          ASYNC ZK SETTLEMENT (background)
─────────────────────────────        ─────────────────────────────────
Tick 1-N: Player plays normally       Batch collects transitions locally
  moves, aims, shoots, all captured   → Witness assembles private data
  game never pauses or waits          → ZK proof generates (Web Worker)
                                      → 10 checks run inside circuit
                                      → Proof submits to Midnight (~6s)
                                      → CLEAN or FLAGGED returned
                                      → Cheater flagged retroactively
```

**The 10 Checks:**

| # | Check | Catches | Type |
|---|---|---|---|
| 1 | Hash-chain integrity | State fabrication, replay attacks | Cryptographic |
| 2 | Commit-reveal | Retroactive move editing | Cryptographic |
| 3 | Velocity | Teleport, speed hack | Physics |
| 4 | Acceleration | Speed ramp hack | Physics (2nd order) |
| 5 | Bounds | Noclip, out of bounds | Spatial |
| 6 | Action validity | Invalid commands | Rule |
| 7 | Action frequency | Autoclicker, macro bot | Temporal |
| 8 | Behavioral entropy | Scripted bot loops | Statistical |
| 9 | Aim precision anomaly | Aimbot | Statistical |
| 10 | Information leakage | Wallhack, ESP, radar | Information-theoretic |

**Total circuit cost:** ~940 R1CS constraints. Lightweight. ~2-5s proof time.

---

## ⚠️ COMPACT LANGUAGE FINDINGS (FROM DOCS — VERIFIED)

### CONFIRMED — What Works:
- ✅ `assert(condition, "message")` — function-like expression, parentheses required (v0.16.24+)
- ✅ `Bytes<32>` — exists as fixed-size byte array type
- ✅ `Uint<64>` — exists, supports `+`, `-`, `*`, `<`, `>`, `<=`, `>=`, `==`, `!=`
- ✅ `Counter` — ledger type with `.increment(n)`, `+= n`, `-= n`, read via bare name
- ✅ `Field` — ZK field type, wraps on overflow/underflow
- ✅ `Boolean` — with `&&`, `||`, `!` (short-circuit)
- ✅ `enum` — works as expected: `enum Verdict { clean, flagged }`
- ✅ `struct` — `struct Thing { field: Type }`, accessed via `e.field`
- ✅ `Vector<N, T>` — fixed-size arrays, `[item0, item1, ...]`
- ✅ `witness name(): Type` — declares private input, implemented in TypeScript
- ✅ `export circuit name(params): ReturnType { ... }` — circuit declaration
- ✅ `export ledger name: Type` — public on-chain state
- ✅ `if (cond) stmt` and `if (cond) stmt else stmt` — statement-level
- ✅ `cond ? expr1 : expr2` — ternary expression
- ✅ `for (const i of vec) stmt` and `for (const i of lower..upper) stmt`
- ✅ `disclose(value)` — makes private value public (required for ledger writes!)
- ✅ `constructor() { ... }` — initializes ledger state at deployment
- ✅ Hash functions: `persistentHash<T>(value): Bytes<32>` and `transientHash<T>(value): Field`
- ✅ Commitment: `persistentCommit<T>(value, rand): Bytes<32>`
- ✅ `pad(n, str)` — pad string to n bytes
- ✅ `map(f, vec)` and `fold(f, init, vec)` — higher-order operations on vectors
- ✅ `pragma language_version 0.21` — current version

### ⚠️ CRITICAL CHANGES TO OUR CIRCUIT:

1. **`Uint` subtraction PANICS on underflow.** `a - b` where `b > a` is a RUNTIME ERROR, not wrap-around. Our absolute-value pattern `if (cX > pX) { cX - pX } else { pX - cX }` is CORRECT and REQUIRED. Every subtraction must guard against underflow.

2. **Hash function is `persistentHash<T>(value)`, NOT `hash()`.** Takes a single typed argument. To hash multiple values, wrap in a `Vector`: `persistentHash<Vector<5, Uint<64>>>([a, b, c, d, e])`. Return type is `Bytes<32>`.

3. **Ledger writes REQUIRE `disclose()`.** Cannot directly assign private values to ledger. Must wrap: `lastVerdict = disclose(Verdict.clean)`. This is a compile error otherwise.

4. **Circuits CAN read ledger state.** Confirmed from the lock example — `assert(state == State.SET, ...)` reads ledger `state`. Our commit-reveal CHECK 2 reading `commitment` from ledger is valid.

5. **`for` loops exist.** `for (const i of 0..8) stmt` — we can use these instead of manual unrolling for CHECKs 7, 8, 9, 10. Makes code much cleaner.

6. **Vectors are tuples.** `Vector<8, Uint<64>>` = 8-element array. Can pass witness data as vectors instead of 8 individual witnesses.

7. **`map()` and `fold()` exist.** Can map a function over a vector. This simplifies CHECK 8 (entropy) and CHECK 10 (correlation) enormously.

8. **Project scaffolding:** Use `npx create-mn-app verdict` to create project. Needs Docker for proof server. Compilation via `npm run compile`.

9. **Pragma required:** Must start with `pragma language_version 0.21;`

### REMAINING BLOCKERS (your action):

**BLOCKER 1: Environment Setup**
- [ ] Install Docker Desktop (needed for proof server)
- [ ] Install Node.js 22+
- [ ] Run `npx create-mn-app verdict` — does it work?
- [ ] Fund wallet with tNIGHT from faucet (auto-converts to tDUST for gas)
- [ ] Install Lace wallet extension

**BLOCKER 2: Enemy Position Hash (for CHECK 10)**
- In our demo, WE are the game server — we generate enemy positions and their hash client-side. This is honest (we control the game).
- No action needed from you. Just confirming the approach.

---

## EPIC 0 — Compact Contract (The 10-Check Circuit)

### 0.0 — Compact Language Spike (DO THIS FIRST)

#### 0.0.1 — Minimal compile test
Write the absolute simplest Compact contract and compile it:
```compact
import CompactStandardLibrary;
export ledger counter: Counter;
export circuit increment(): Void {
  counter += 1;
}
```
**STOP IF THIS FAILS.** Fix compiler setup before anything else.

#### 0.0.2 — Hash function test
```compact
witness getX(): Uint<64>;
export circuit testHash(): Void {
  const x = getX();
  // TRY: hash(x) — what's the return type? Does this compile?
}
```
**STOP IF THIS FAILS.** We need to know the hash API before writing CHECK 1 and CHECK 2.

#### 0.0.3 — Ledger read test
```compact
export ledger stored: Uint<64>;
export circuit writeAndRead(val: Uint<64>): Uint<64> {
  stored = val;
  // Can we read `stored` in the same circuit? Or only after next tx?
  return stored;
}
```
**STOP IF THIS FAILS.** CHECK 2 (commit-reveal) reads `commitment` from ledger. If circuits can't read ledger, we need a different approach.

---

### 1.0 — Ledger state definition

#### 1.0.1 — Ledger

```compact
pragma language_version 0.21;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;
export ledger commitment: Bytes<32>;
export ledger lastChainHash: Bytes<32>;
export ledger sessionActive: Boolean;
```

**Test 1.0.1.t** — Run `npm run compile`. Compiles without errors. All ledger fields appear in generated TypeScript types. `Counter` → `bigint`, `Verdict` → enum, `Bytes<32>` → `Uint8Array`, `Boolean` → `boolean`.

---

#### 1.0.2 — Witness functions (using Vectors for clean grouping)

```compact
// === STATE (3 frames: prevPrev, prev, current — for acceleration) ===
witness getPrevPrevPos(): Vector<2, Uint<64>>;  // [x, y]
witness getPrevPos(): Vector<2, Uint<64>>;       // [x, y]
witness getCurrPos(): Vector<2, Uint<64>>;       // [x, y]
witness getAction(): Uint<64>;
witness getIsFirstMove(): Uint<64>;              // 1 on first move, 0 otherwise

// === HASH CHAIN ===
witness getPrevHash(): Bytes<32>;

// === COMMIT-REVEAL ===
witness getNonce(): Bytes<32>;

// === AIM DATA (8 aim events as vector of [x,y] pairs) ===
witness getAimHistory(): Vector<8, Vector<2, Uint<64>>>;

// === ACTION HISTORY (last 8 actions for entropy) ===
witness getActionHistory(): Vector<8, Uint<64>>;

// === TICK HISTORY (last 8 tick timestamps for frequency) ===
witness getTickHistory(): Vector<8, Uint<64>>;
witness getCurrentTick(): Uint<64>;

// === ENEMY POSITIONS (8 positions for wallhack correlation) ===
witness getEnemyPositions(): Vector<8, Vector<2, Uint<64>>>;
```

**Test 1.0.2.t** — All witness stubs generated in TypeScript. Vector types map to arrays. `Vector<2, Uint<64>>` → `[bigint, bigint]`. `Vector<8, Uint<64>>` → `bigint[]` of length 8.

**Note on Vectors:** If Compact compiler rejects nested `Vector<8, Vector<2, Uint<64>>>`, flatten to `Vector<16, Uint<64>>` and access by index pairs `[i*2]` and `[i*2+1]`. Test during spike 0.0.2.

---

#### 1.0.3 — The 10-check circuit

```compact
// ═══════════════════════════════════════════════════════════════
// HELPER: safe absolute difference (avoids Uint underflow panic)
// ═══════════════════════════════════════════════════════════════
circuit absDiff(a: Uint<64>, b: Uint<64>): Uint<64> {
  return a >= b ? a - b : b - a;
}

// ═══════════════════════════════════════════════════════════════
// COMMIT PHASE — must be called BEFORE verifyTransition
// SDK handles this automatically. One tx per batch.
// Ledger writes require disclose().
// ═══════════════════════════════════════════════════════════════
export circuit commitMove(c: Bytes<32>): [] {
  commitment = disclose(c);
}

// ═══════════════════════════════════════════════════════════════
// SESSION START — commits genesis hash. Called once per session.
// Without this, the hash chain has no anchor and can be fabricated.
// ═══════════════════════════════════════════════════════════════
export circuit startSession(genesisHash: Bytes<32>): [] {
  lastChainHash = disclose(genesisHash);
  sessionActive = disclose(true);
}

// ═══════════════════════════════════════════════════════════════
// THE MAIN CIRCUIT — 10 checks
// Written in REAL Compact syntax verified against Midnight docs.
// Key syntax: persistentHash, disclose(), ternary (?:), assert(),
//             Vector, for loops, Uint subtraction guards.
// ═══════════════════════════════════════════════════════════════

export circuit verifyTransition(
  maxVelocity: Uint<64>,
  maxAcceleration: Uint<64>,
  boundX: Uint<64>,
  boundY: Uint<64>,
  validActionCount: Uint<64>,
  maxActionsPerWindow: Uint<64>,
  windowSize: Uint<64>,
  minDiversity: Uint<64>,
  snapThreshold: Uint<64>,
  maxSnaps: Uint<64>,
  maxCorrelation: Uint<64>,
  enemyPosHashPublic: Bytes<32>
): Verdict {

  // Load private witnesses
  const pp = getPrevPrevPos();     // [ppX, ppY]
  const p  = getPrevPos();          // [pX, pY]
  const c  = getCurrPos();          // [cX, cY]
  const action = getAction();
  const isFirst = getIsFirstMove();
  const prevHash = getPrevHash();
  const nonce = getNonce();
  const aimHist = getAimHistory();       // 8 × [x,y]
  const actHist = getActionHistory();    // 8 × action
  const tickHist = getTickHistory();     // 8 × tick
  const now = getCurrentTick();
  const enemies = getEnemyPositions();   // 8 × [x,y]

  totalChecks += 1;

  // ═══════════════════════════════════════════
  // CHECK 1: HASH-CHAIN INTEGRITY
  // persistentHash returns Bytes<32>
  // ═══════════════════════════════════════════
  const recomputedHash = persistentHash<Vector<6, Uint<64>>>(
    [p[0], p[1], c[0], c[1], action, now]
  );
  // Verify witness prevHash matches on-chain lastChainHash
  assert(prevHash == lastChainHash, "Hash chain broken: prevHash mismatch");
  lastChainHash = disclose(recomputedHash);

  // ═══════════════════════════════════════════
  // CHECK 2: COMMIT-REVEAL INTEGRITY
  // ═══════════════════════════════════════════
  const recomputedCommit = persistentCommit<Vector<5, Uint<64>>>(
    [p[0], p[1], c[0], c[1], action], nonce
  );
  assert(recomputedCommit == commitment, "Commit-reveal mismatch: move was altered");

  // ═══════════════════════════════════════════
  // CHECK 3: VELOCITY (Manhattan distance)
  // absDiff guards against Uint underflow
  // ═══════════════════════════════════════════
  const dx = absDiff(c[0], p[0]);
  const dy = absDiff(c[1], p[1]);
  const velocity = dx + dy;

  if (velocity > maxVelocity) {
    totalFlagged += 1;
    lastVerdict = disclose(Verdict.flagged);
    return Verdict.flagged;
  }

  // ═══════════════════════════════════════════
  // CHECK 4: ACCELERATION (skip on first move)
  // ═══════════════════════════════════════════
  if (isFirst == 0) {
    const pdx = absDiff(p[0], pp[0]);
    const pdy = absDiff(p[1], pp[1]);
    const prevVelocity = pdx + pdy;
    const accel = absDiff(velocity, prevVelocity);

    if (accel > maxAcceleration) {
      totalFlagged += 1;
      lastVerdict = disclose(Verdict.flagged);
      return Verdict.flagged;
    }
  }

  // ═══════════════════════════════════════════
  // CHECK 5: BOUNDS
  // ═══════════════════════════════════════════
  if (c[0] > boundX || c[1] > boundY) {
    totalFlagged += 1;
    lastVerdict = disclose(Verdict.flagged);
    return Verdict.flagged;
  }

  // ═══════════════════════════════════════════
  // CHECK 6: ACTION VALIDITY
  // ═══════════════════════════════════════════
  if (action >= validActionCount) {
    totalFlagged += 1;
    lastVerdict = disclose(Verdict.flagged);
    return Verdict.flagged;
  }

  // ═══════════════════════════════════════════
  // CHECK 7: ACTION FREQUENCY
  // Uses for loop over tickHist vector
  // SDK pads unused slots with (now - windowSize - 1)
  // ═══════════════════════════════════════════
  // Verify monotonicity
  for (const i of 0..7) {
    assert(tickHist[i] <= tickHist[i + 1], "Tick history not monotonic");
  }

  // Count actions within window
  const windowStart = now - windowSize;
  const actionsInWindow = fold(
    (acc, t) => acc + (t >= windowStart ? 1 : 0),
    0,
    tickHist
  );

  if (actionsInWindow > maxActionsPerWindow) {
    totalFlagged += 1;
    lastVerdict = disclose(Verdict.flagged);
    return Verdict.flagged;
  }

  // ═══════════════════════════════════════════
  // CHECK 8: BEHAVIORAL ENTROPY
  // Gini-Simpson: D = N² - Σ fⱼ²
  // Count frequency of each action type (K=4) using fold
  // ═══════════════════════════════════════════
  const freq0 = fold((acc, a) => acc + (a == 0 ? 1 : 0), 0, actHist);
  const freq1 = fold((acc, a) => acc + (a == 1 ? 1 : 0), 0, actHist);
  const freq2 = fold((acc, a) => acc + (a == 2 ? 1 : 0), 0, actHist);
  const freq3 = fold((acc, a) => acc + (a == 3 ? 1 : 0), 0, actHist);

  const diversity = 64 - (freq0*freq0 + freq1*freq1 + freq2*freq2 + freq3*freq3);

  if (diversity < minDiversity) {
    totalFlagged += 1;
    lastVerdict = disclose(Verdict.flagged);
    return Verdict.flagged;
  }

  // ═══════════════════════════════════════════
  // CHECK 9: AIM PRECISION ANOMALY
  // Cross product between consecutive aim direction vectors
  // 6 triplets from 8 aim events → count snaps
  // ═══════════════════════════════════════════
  // NOTE: aim subtraction (ax1 - ax0) can underflow if aim positions
  // are not ordered. Use Field arithmetic for signed cross product.
  // Cast to Field: wraps on underflow instead of panicking.
  const totalSnaps = fold(
    (acc, i) => {
      const d0x = aimHist[i + 1][0] as Field - aimHist[i][0] as Field;
      const d0y = aimHist[i + 1][1] as Field - aimHist[i][1] as Field;
      const d1x = aimHist[i + 2][0] as Field - aimHist[i + 1][0] as Field;
      const d1y = aimHist[i + 2][1] as Field - aimHist[i + 1][1] as Field;
      const cross = d0x * d1y - d0y * d1x;
      // Field abs: cross * cross gives magnitude squared (always positive)
      const crossSq = cross * cross;
      const threshSq = snapThreshold as Field * snapThreshold as Field;
      acc + (crossSq > threshSq ? 1 : 0)
    },
    0,
    0..6
  );

  if (totalSnaps > maxSnaps) {
    totalFlagged += 1;
    lastVerdict = disclose(Verdict.flagged);
    return Verdict.flagged;
  }

  // ═══════════════════════════════════════════
  // CHECK 10: INFORMATION LEAKAGE (WALLHACK)
  // Per tick: is player moving toward hidden enemy?
  // Direction match on each axis: +1 per matching axis, 0..2 per tick
  // Sum over 8 ticks: max=16, random≈8, wallhacker>12
  // ═══════════════════════════════════════════

  // Verify enemy position integrity
  const recomputedEnemyHash = persistentHash<Vector<8, Vector<2, Uint<64>>>>(enemies);
  assert(recomputedEnemyHash == enemyPosHashPublic, "Enemy position hash mismatch");

  // Correlation: for each enemy position, check if player moved toward it
  const totalCorrelation = fold(
    (acc, i) => {
      const movingRight = c[0] > p[0] ? 1 : 0;
      const enemyRight  = enemies[i][0] > c[0] ? 1 : 0;
      const movingUp    = c[1] > p[1] ? 1 : 0;
      const enemyUp     = enemies[i][1] > c[1] ? 1 : 0;
      const towardX = movingRight == enemyRight ? 1 : 0;
      const towardY = movingUp == enemyUp ? 1 : 0;
      acc + towardX + towardY
    },
    0,
    0..8
  );

  if (totalCorrelation > maxCorrelation) {
    totalFlagged += 1;
    lastVerdict = disclose(Verdict.flagged);
    return Verdict.flagged;
  }

  // ═══════════════════════════════════════════
  // ALL 10 CHECKS PASSED
  // ═══════════════════════════════════════════
  lastVerdict = disclose(Verdict.clean);
  return Verdict.clean;
}
```

**Test 1.0.3.t** — Compiles. All 10 checks present. `verifyTransition` exported. All public params accepted.

---

### 1.1 — Circuit validation (every check, every edge)

#### CHECK 3 tests (velocity):
- 1.1.1 — Legal move: distance = maxVelocity exactly → `clean`
- 1.1.2 — Illegal: distance = maxVelocity + 1 → `flagged`
- 1.1.3 — Teleport: distance >> max → `flagged`

#### CHECK 4 tests (acceleration):
- 1.1.4 — Legal: accel = maxAccel exactly → `clean`
- 1.1.5 — Speed ramp: v goes 1→2→4→8, maxAccel=2 → `flagged` at tick 4
- 1.1.6 — Deceleration: sudden stop from max speed → `flagged` if |Δv| > maxAccel

#### CHECK 5 tests (bounds):
- 1.1.7 — At boundary exactly → `clean`
- 1.1.8 — One past boundary → `flagged`

#### CHECK 7 tests (frequency):
- 1.1.9 — 8 actions in 100 ticks, max=8 → `clean`
- 1.1.10 — 8 actions in 4 ticks, max=4 → `flagged`
- 1.1.11 — Non-monotonic ticks → assert fails (fabrication)

#### CHECK 8 tests (entropy):
- 1.1.12 — All same action (RRRRRRRR): D=0 → `flagged`
- 1.1.13 — Perfect loop (UDLRUDLR): D=48 → depends on threshold
- 1.1.14 — Random-ish (UULDRRDL): D>0 → `clean`

#### CHECK 9 tests (aimbot):
- 1.1.15 — Smooth aim (low cross products) → `clean`
- 1.1.16 — Snappy aim (high cross products, 5+ snaps) → `flagged`

#### CHECK 10 tests (wallhack):
- 1.1.17 — Movement uncorrelated with enemy pos → `clean`
- 1.1.18 — Movement consistently toward hidden enemy → `flagged`
- 1.1.19 — Enemy hash mismatch → assert fails (integrity)

#### Cross-check tests:
- 1.1.20 — Different game rules, same circuit → both work
- 1.1.21 — Counter integrity: 10 sequential proofs → totalChecks = 10

---

## EPIC 1 — TypeScript SDK

### 2.0 — Wallet connection layer

#### 2.0.1 — Scaffold project
```bash
npx create-next-app@latest verdict --ts --tailwind --app
npm install @midnight-ntwrk/dapp-connector-api
```

#### 2.0.2 — ConnectWalletButton
#### 2.0.3 — Wallet state context
#### 2.0.4 — Auto-reconnect via isEnabled()

(Same as previous plan — no changes needed here)

---

### 2.1 — Proof generation layer

#### 2.1.1 — Witness provider (expanded for 10 checks)

```typescript
const witnesses = {
  // State (3 frames for acceleration)
  getPrevPrevX: () => BigInt(stateBuffer[i-2].x),
  getPrevPrevY: () => BigInt(stateBuffer[i-2].y),
  getPrevX: () => BigInt(stateBuffer[i-1].x),
  getPrevY: () => BigInt(stateBuffer[i-1].y),
  getCurrX: () => BigInt(stateBuffer[i].x),
  getCurrY: () => BigInt(stateBuffer[i].y),
  getAction: () => BigInt(stateBuffer[i].action),

  // Hash chain
  getPrevHash: () => chainHashes[i-1],

  // Commit-reveal nonce
  getNonce: () => sessionNonce,

  // Aim data (last 8 aim events)
  getAimX0: () => BigInt(aimBuffer[0].x),
  getAimY0: () => BigInt(aimBuffer[0].y),
  // ... all 8

  // Action history (last 8)
  getActionHist0: () => BigInt(actionHistory[0]),
  // ... all 8

  // Tick history (last 8)
  getTickHist0: () => BigInt(tickHistory[0]),
  // ... all 8
  getCurrentTick: () => BigInt(currentTick),

  // Enemy positions (from game server, encrypted channel)
  getEnemyX0: () => BigInt(enemyPositions[0].x),
  getEnemyY0: () => BigInt(enemyPositions[0].y),
  // ... all 8
  getEnemyPosHash: () => serverProvidedHash,
};
```

#### 2.1.2 — Proof round-trip (same flow, more params)
#### 2.1.3 — Ledger read-back
#### 2.1.4 — Timeout wrapper (90s cap)

---

### 2.2 — Public SDK interface

#### 2.2.1 — `createVerdictSDK(config)` factory

```typescript
const verdict = await createVerdictSDK({ network: 'devnet' });

const result = await verdict.verify({
  stateHistory: [stateT2, stateT1, stateCurr],  // 3 frames
  action: 0,
  aimHistory: [...last8AimEvents],
  actionHistory: [...last8Actions],
  tickHistory: [...last8Ticks],
  enemyPositions: [...last8EnemyPos],
  rules: {
    maxVelocity: 1,
    maxAcceleration: 1,
    boundX: 10, boundY: 10,
    validActionCount: 4,
    maxActionsPerWindow: 8,
    windowSize: 60,
    minDiversity: 20,
    maxSnaps: 3,
    maxCorrelation: 500
  }
});
// result === 'clean'
```

#### 2.2.2 — GameRules interface

```typescript
interface GameRules {
  maxVelocity: number;       // max Manhattan distance per tick
  maxAcceleration: number;   // max |Δvelocity| between ticks
  boundX: number;            // map width
  boundY: number;            // map height
  validActionCount: number;  // number of valid action types
  maxActionsPerWindow: number; // max actions in time window
  windowSize: number;        // time window in ticks
  minDiversity: number;      // min Gini-Simpson score (0-64 for N=8)
  snapThreshold: number;     // cross-product magnitude for aim snap detection
  maxSnaps: number;          // max aim snaps in 8 events
  maxCorrelation: number;    // max directional correlation with hidden enemies (0-16 for 8 ticks)
}
```

#### 2.2.3 — Commit phase API

```typescript
// Before verify, commit moves
await verdict.commit(stateData);  // publishes hash on-chain
// Then verify (circuit checks commitment matches)
await verdict.verify(stateData);
```

#### 2.2.4 — Three integration modes

```typescript
// MODE 1: Built-in modules (fastest — what hackathon demo uses)
const verdict = createVerdictSDK({
  network: 'devnet',
  modules: ['spatial', 'behavioral', 'aim', 'information'],
  rules: { maxVelocity: 10, maxAcceleration: 5, ... }
});

// MODE 2: Custom constraints (any game — the vision)
const verdict = createVerdictSDK({
  network: 'devnet',
  constraints: `
    state { board: uint[64], turn: uint }
    constraint legal_move: is_valid_chess_move(board.old, move)
    constraint no_engine: move_time_variance >= 50
  `
});

// MODE 3: Mix built-in + custom (most flexible)
const verdict = createVerdictSDK({
  network: 'devnet',
  modules: ['spatial'],
  constraints: `
    constraint cooldown_q: if action == Q: cd_q.old == 0
    constraint gold_cap: gold.new <= gold.old + 50
  `
});
```

**For hackathon:** Build Mode 1. Show Mode 2 and 3 as slides/code in video.

#### 2.2.5 — Missing Lace wallet guard
#### 2.2.6 — Mock mode

---

### 2.3 — Async Batch Engine

#### 2.3.1 — Transition buffer
#### 2.3.2 — Background proof pipeline (Web Worker)
#### 2.3.3 — Batch submission

(Same architecture as previous plan)

---

## EPIC 2 — Demo Game (The Grid Arena)

### 3.0 — Game design

#### 3.0.1 — Grid renderer (10x10 canvas)
Dark grid. Player token. Arrow key movement. Smooth. Judges understand in 2 seconds.

#### 3.0.2 — Game rules display
Visible on screen: all 10 parameters. "These ARE the public inputs to the ZK circuit."

#### 3.0.3 — Move history log with check annotations
```
Move 1: (2,3)→(2,4) v=1 a=0 ✓ [vel ✓ accel ✓ bounds ✓ freq ✓ entropy ✓]
Move 2: (2,4)→(8,4) v=6 a=5 ✗ [vel ✗ TELEPORT DETECTED]
```

#### 3.0.4 — Enemy tokens (hidden)
Red dots on grid that player shouldn't be able to see. For CHECK 10 demo: show enemies are hidden, then show correlation analysis.

---

### 3.1 — Cheat Simulators (5 buttons, 5 different checks)

#### 3.1.1 — "Simulate Teleport" → triggers CHECK 3 (velocity)
Jumps from current to (9,9). Distance >> maxVelocity. Flagged.

#### 3.1.2 — "Simulate Speed Ramp" → triggers CHECK 4 (acceleration)
Moves 1, 2, 4, 8 units in consecutive ticks. Velocity within max each tick, but acceleration spikes. Flagged.

#### 3.1.3 — "Simulate Bot Loop" → triggers CHECK 8 (entropy)
Executes perfect RRRRRRR pattern. Diversity score = 0. Flagged.

#### 3.1.4 — "Simulate Aimbot" → triggers CHECK 9 (aim)
Aim events show instant angular snaps. Cross product magnitudes spike. Flagged.

#### 3.1.5 — "Simulate Wallhack" → triggers CHECK 10 (info leakage)
Movement consistently toward hidden enemies. Correlation exceeds threshold. Flagged.

**Demo impact:** Each button triggers a DIFFERENT check. Judges see 5 different cheat types caught by 5 different mathematical methods. This is the depth that wins.

---

### 3.2 — Proof UI

#### 3.2.1 — 10-check status grid
Instead of a simple stepper, show a grid of all 10 checks with pass/fail status:

```
┌─────────────────────────────────────────────┐
│ CHECK RESULTS                               │
├──────────────────┬──────────┬───────────────┤
│ 1. Hash Chain    │ ✓ PASS   │ Cryptographic │
│ 2. Commit-Reveal │ ✓ PASS   │ Cryptographic │
│ 3. Velocity      │ ✗ FAIL   │ Physics       │
│ 4. Acceleration  │ ✓ PASS   │ Physics       │
│ 5. Bounds        │ ✓ PASS   │ Spatial       │
│ 6. Action Valid  │ ✓ PASS   │ Rule          │
│ 7. Frequency     │ ✓ PASS   │ Temporal      │
│ 8. Entropy       │ ✓ PASS   │ Statistical   │
│ 9. Aim Analysis  │ ✓ PASS   │ Statistical   │
│ 10. Info Leakage │ ✓ PASS   │ Info-Theory   │
├──────────────────┴──────────┴───────────────┤
│ VERDICT: FLAGGED ✗  (Check 3 failed)        │
└─────────────────────────────────────────────┘
```

#### 3.2.2 — Physics dashboard
Real-time velocity and acceleration bars. Speedhack → acceleration bar spikes red.

#### 3.2.3 — Entropy meter
Gauge showing behavioral diversity of last 8 actions. Bot loop → drops to red.

#### 3.2.4 — Correlation heatmap (for CHECK 10)
Visual: player path overlaid with hidden enemy positions. High correlation = red path segments.

#### 3.2.5 — Live stats
```
Total Verifications: 52 | Flagged: 4 | Clean Rate: 92.3% | Network: Midnight Devnet
```

#### 3.2.6 — Transaction hash link

---

### 3.3 — Product Panels

#### 3.3.1 — VERDICT vs Vanguard comparison

| | VERDICT | Vanguard |
|---|---|---|
| Speed hacks | ✓ Velocity + acceleration | ✓ Memory scan |
| Aimbot | ✓ Statistical aim analysis | ✓ DLL injection scan |
| Wallhack | ✓ Information leakage detection | ✓ Render buffer scan |
| Bots | ✓ Entropy + frequency analysis | ✓ Input hook detection |
| **Method** | **Math (10 ZK checks)** | **Surveillance** |
| Data collected | Zero | Everything |
| Kernel access | No | Yes, from boot |
| OS support | Any | Windows only |
| Integration | 5 lines | Months |
| Verification | Trustless (on-chain) | Trust Riot |

#### 3.3.2 — SDK code snippet (5-line integration)

#### 3.3.3 — "Any Game, Write Constraints" (THE product vision)

Show three game types, each with their constraints:

```
┌──────────────────────────────────────────────────────────────────────┐
│  VERDICT works for ANY game. Write your rules. Get anti-cheat.      │
├──────────────────┬───────────────────────────────────────────────────┤
│  FPS / Shooter   │  constraint max_speed: movement <= 10            │
│                  │  constraint no_aimbot: aim_snaps <= 3             │
│                  │  constraint no_wallhack: correlation <= 500       │
├──────────────────┼───────────────────────────────────────────────────┤
│  Chess           │  constraint legal_move: is_valid(board, move)    │
│                  │  constraint no_engine: move_time_variance >= 50   │
├──────────────────┼───────────────────────────────────────────────────┤
│  Online Casino   │  constraint fair_rng: hash(seed) == commitment   │
│                  │  constraint correct_payout: payout == odds * bet  │
│                  │  (Casino proves to PLAYERS it's fair)             │
├──────────────────┼───────────────────────────────────────────────────┤
│  MOBA            │  constraint speed: movement <= base + items      │
│                  │  constraint cooldown: if Q: cd_q == 0             │
│                  │  constraint gold: gold.new <= gold.old + 50       │
│                  │  constraint no_fog: correlation <= 400            │
└──────────────────┴───────────────────────────────────────────────────┘

Same engine. Same chain. Same privacy. Write rules → get anti-cheat.
New game tomorrow? Write constraints. Done.
```

This is the slide that turns VERDICT from a project into a protocol.

---

### 3.4 — Error states
#### 3.4.1 — No Lace extension
#### 3.4.2 — Devnet failure
#### 3.4.3 — Proof timeout

---

## EPIC 3 — Video Pitch Production

### 4.0 — Pre-recording prep
- Seed devnet with ~50 verifications
- Clean browser, dark mode, 1080p
- OBS screen recording + mic

### 4.1 — Video script (3 minutes)

#### [0:00–0:20] THE HOOK
Vanguard permissions screen. "Root access from boot. Two billion gamers. No alternative. Until now." Cut to VERDICT logo.

#### [0:20–0:55] THE DEMO — Human Play
Grid Arena. Player moves. Move log fills. Click "Verify." 10-check grid animates: all PASS. VERDICT: CLEAN ✓. "10 mathematical checks. Zero data left my machine."

#### [0:55–1:30] THE CHEATS — 5 Types, 5 Catches
Quick fire:
1. "Teleport" → CHECK 3 fails → FLAGGED
2. "Speed ramp" → CHECK 4 fails → "Same speed check passed, acceleration caught it. Second-order physics."
3. "Bot loop" → CHECK 8 fails → "Perfect pattern. Zero entropy. The circuit measures behavioral randomness."
4. "Aimbot" → CHECK 9 fails → "Inhuman angular snaps. Cross-product analysis."
5. "Wallhack" → CHECK 10 fails → "Movement correlated with hidden enemies. Information-theoretic detection. **This has no precedent in anti-cheat.**"

#### [1:30–2:00] THE COMPARISON
Split screen: VERDICT vs Vanguard table. "Same coverage. Zero surveillance."

#### [2:00–2:30] THE ARCHITECTURE
Async model diagram. "Anti-cheat rollup. Optimistic gameplay, ZK settlement. Game never pauses. ~940 constraints, ~3 second proof, 6 second on-chain settlement."

Show 10-check breakdown with constraint costs. "We're doing hash chains, second-order physics, Gini-Simpson diversity, cross-product aim analysis, and information-theoretic correlation — all inside one ZK circuit."

#### [2:20–2:45] THE VISION — Any Game, Write Constraints
Show the "Any Game" panel with 4 game types.

Voice: "But here's what makes VERDICT a protocol, not a project. This is a constraint language. An FPS developer writes: max speed, no aimbot, no wallhack. A chess developer writes: legal moves, no engine. A casino writes: fair RNG, correct payout — and now the CASINO proves to PLAYERS it's not cheating. A MOBA developer writes: speed limits, cooldown enforcement, no fog hack."

Pause. Let it land.

"New game comes out tomorrow? Write your rules. VERDICT compiles them to a ZK circuit. Deploy on Midnight. Done. No modules. No code updates. No VERDICT changes. Ever. The compiler is the product."

#### [2:45–3:00] THE CLOSE
"Vanguard is software that watches you play. VERDICT is math that proves you played fair. Two billion gamers. Every game genre. Zero surveillance. The anti-cheat protocol layer for all of gaming."

Screen: "Built on Midnight. github.com/arko05roy/verdict"

---

## FILE STRUCTURE

```
verdict/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ConnectWalletButton.tsx
│   ├── GridArena.tsx            # 10x10 game + hidden enemies
│   ├── MoveLog.tsx              # Annotated with check results
│   ├── CheatSimulator.tsx       # 5 buttons, 5 cheat types
│   ├── CheckGrid.tsx            # 10-check pass/fail display
│   ├── PhysicsDashboard.tsx     # Velocity + acceleration bars
│   ├── EntropyMeter.tsx         # Behavioral diversity gauge
│   ├── CorrelationHeatmap.tsx   # Wallhack detection visual
│   ├── ProofStepper.tsx         # Proof generation animation
│   ├── StatsPanel.tsx           # Live counters
│   ├── VerdictDisplay.tsx       # CLEAN / FLAGGED (large)
│   ├── ComparisonPanel.tsx      # VERDICT vs Vanguard
│   ├── CodeSnippet.tsx          # SDK code
│   └── RulesDemo.tsx            # Two game configs
├── game/
│   ├── engine.ts                # Game loop, tick system, state buffer
│   ├── rules.ts                 # GameRules + presets (chess, FPS, etc.)
│   ├── input.ts                 # Keyboard → action mapping
│   ├── enemies.ts               # Hidden enemy positions + hash
│   ├── aim-tracker.ts           # Aim event capture
│   └── cheats.ts                # Cheat simulation logic (5 types)
├── contexts/
│   └── WalletContext.tsx
├── lib/
│   ├── verdict-sdk.ts           # Public SDK: createVerdictSDK()
│   ├── batch-engine.ts          # Async buffer + background proving
│   ├── witness-provider.ts      # Full 10-check witness assembly
│   ├── hash-chain.ts            # Hash chain state management
│   ├── commit-reveal.ts         # Commit phase logic
│   ├── ledger-reader.ts
│   ├── worker.ts                # Web Worker for proof generation
│   └── errors.ts
└── contracts/
    └── verdict.compact           # The 10-check circuit
```

---

## BUILD ORDER

```
0.  ⚠️  RESOLVE BLOCKERS 1-3 (Compact syntax, devnet access, Lace wallet)
    → DO NOT proceed past this step until ALL blockers are resolved.
    → Run spikes 0.0.1, 0.0.2, 0.0.3. Report results.
    → If hash() API is different → rewrite CHECK 1, 2, 10.
    → If assert() doesn't exist → rewrite all checks to use if/return.
    → If Bytes<32> doesn't exist → find the actual hash output type.
    → If ledger can't be read in circuits → redesign commit-reveal flow.

1.  verdict.compact — 10-check circuit adapted to REAL Compact syntax    ← blocks everything
    → Compile. Fix errors. DO NOT use dummy values for anything.
    → Every constant must trace to a GameRules parameter or be mathematically justified.

2.  Witness provider (full 10-check) + proof round-trip on devnet       ← proves chain works
    → If devnet is unreachable → STOP. Build mock mode first (step 6).
    → Do NOT hardcode witness values. Use real game state from step 3.

3.  Grid Arena game + hidden enemies                                     ← parallel with SDK
    → Enemy positions generated randomly per session.
    → Enemy position hash computed client-side (we ARE the game server for demo).
    → State buffer tracks last 3 positions (for acceleration check).
    → Aim buffer tracks last 8 aim events.
    → Action history and tick history buffers.
    → ALL buffers real — no dummy data.

4.  SDK: createVerdictSDK + verify + commit                             ← wires game to chain
    → commit() must execute BEFORE verify() — enforce ordering in SDK.
    → If commit tx fails → STOP, surface error to user. Don't proceed to verify.
    → startSession() must be called at game start — enforce in SDK.
    → First move: set isFirstMove=1, ppX=pX, ppY=pY.
    → Pad tick history with (now - windowSize - 1) if <8 actions exist.

5.  Batch engine + Web Worker                                           ← async pipeline
6.  5 cheat simulators (teleport, speed ramp, bot, aimbot, wallhack)   ← demo drama
    → Each simulator produces REAL state transitions that trigger specific checks.
    → No fake "always return flagged" — the circuit must ACTUALLY catch them.

8.  10-check status grid + physics dashboard + entropy meter            ← visual spectacle
9.  Correlation heatmap (CHECK 10 visualization)                        ← the "holy shit" moment
10. Product panels: comparison, code snippet, "any game" constraints    ← pitch ammunition
11. Error states                                                        ← edge cases
12. Seed devnet with 50+ REAL verifications                             ← pre-pitch prep
    → Run demo game 50+ times with real gameplay. Not scripted dummy data.

13. Record video pitch                                                  ← final deliverable
14. Watch 3x, fix dead air/timing                                       ← polish
15. Mock mode — ABSOLUTE LAST RESORT only if devnet is completely dead  ← emergency only
    → Do NOT build this proactively. Build real integration first.
    → If devnet works even intermittently, record video during uptime.
```
```

---

## KEY ARCHITECTURAL DECISIONS

| Decision | Choice | Reason |
|---|---|---|
| Circuit checks | 10 layered checks | Covers all cheat classes: state, physics, input, statistical, information-theoretic |
| Cheat coverage | Speed, aimbot, wallhack, bots, fabrication | Matches Vanguard's coverage without surveillance |
| Physics depth | 2nd order (acceleration) | Catches ramp hacks that 1st order misses |
| Entropy method | Gini-Simpson (quadratic) | ZK-friendly — no log function needed |
| Aimbot detection | Cross-product angular snap | ZK-friendly — no trigonometry needed |
| Wallhack detection | Movement-enemy correlation | NOVEL — no precedent in anti-cheat literature |
| Proof timing | Async (anti-cheat rollup) | 6s block time irrelevant. Game never pauses. |
| Window size | N=8 (fixed, unrolled) | Fits Compact's no-loop constraint. ~940 total constraints. |
| Demo cheats | 5 types, 5 buttons | Each triggers different check — shows depth is real |
| Game theory | NONE — stripped | SDK doesn't require tokens, wallets, or web3 UX for players |
| Genericity | Constraint DSL (VCL) | Any game writes rules → VERDICT compiles to ZK circuit. No modules to maintain. |
| Hackathon scope | Built-in modules + VCL vision slides | Build Mode 1, pitch Mode 2/3. Full compiler is post-hack product. |
| Bidirectional | Players AND platforms prove fairness | Casino proves to players it's fair — same engine, reversed prover |

---

## NEVER CUT

1. **10-check circuit** compiled and working
2. **Proof round-trip** on devnet
3. **5 cheat simulators** (each triggering different check)
4. **10-check status grid** (judges SEE all 10 pass/fail)
5. **VERDICT vs Vanguard panel**
6. **"Any Game, Write Constraints" panel** (the protocol proof)
7. **Grid Arena** with hidden enemies (for CHECK 10 demo)
8. **Video pitch** within 3 minutes

## CUT LIST (sacrifice in this order if needed)

1. Correlation heatmap visualization (describe verbally)
2. Web Worker (prove on main thread)
3. Batch engine (verify one at a time)
4. Physics dashboard (show numbers in log instead)
5. Entropy meter (show in check grid instead)
6. Auto-reconnect
7. Mobile viewport
8. **NEVER CUT items above**
