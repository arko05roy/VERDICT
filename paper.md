# VERDICT: Zero-Knowledge State Validation for Anti-Cheat Systems

## A First-Principles Treatment

---

## 1. THE PROBLEM SPACE

### 1.1 The Anti-Cheat Trilemma

Every multiplayer game faces a fundamental trilemma:

```
        FAIR PLAY
           /\
          /  \
         /    \
        /      \
PRIVACY -------- TRUST
```

You can have any two:

1. **Fair Play + Trust (no privacy):** Current model. Vanguard/EAC run at kernel level, scan everything, trust the anti-cheat vendor. Players have zero privacy. Works, but at enormous cost to civil liberties.

2. **Fair Play + Privacy (no trust):** Theoretical ideal. Prove fair play without revealing anything. But who verifies the proofs? You need a trusted third party... which breaks trustlessness.

3. **Privacy + Trust (no fair play):** Honor system. Players promise they're clean. Nobody checks. Cheating runs rampant.

**VERDICT's thesis:** Zero-knowledge proofs on a blockchain resolve the trilemma. ZK gives you fair play + privacy. The blockchain gives you trustless verification. All three properties simultaneously.

### 1.2 What Is a Cheat, Formally?

Define a game as a state machine:

```
G = (S, A, T, s₀, R)

S = set of valid states
A = set of valid actions
T: S × A → S  (transition function — deterministic)
s₀ ∈ S  (initial state)
R: S → {valid, invalid}  (rule checker)
```

A **legitimate play sequence** is:

```
π = (s₀, a₁, s₁, a₂, s₂, ..., aₙ, sₙ)

where ∀i: sᵢ = T(sᵢ₋₁, aᵢ) and R(sᵢ) = valid
```

A **cheat** is any play sequence where:

```
∃i: sᵢ ≠ T(sᵢ₋₁, aᵢ)   (state manipulation — teleport, speed hack)
OR
∃i: R(sᵢ) = invalid       (rule violation — out of bounds, invalid action)
OR
∃i: aᵢ ∉ A                (impossible action — autoclicker beyond human rate)
OR
aᵢ = f(hidden_state)       (information leak — wallhack, ESP)
```

This gives us four cheat CLASSES:

| Class | Formal Definition | Examples |
|---|---|---|
| State Manipulation | sᵢ ≠ T(sᵢ₋₁, aᵢ) | Teleport, speed hack, noclip |
| Rule Violation | R(sᵢ) = invalid | Out of bounds, invalid commands |
| Superhuman Input | aᵢ violates human constraints | Aimbot, autoclicker, macro |
| Information Leakage | aᵢ correlates with hidden state | Wallhack, ESP, radar |

VERDICT must detect all four classes. Each requires a different mathematical approach.

---

## 2. THE VERIFICATION FRAMEWORK

### 2.1 Zero-Knowledge Proofs (from scratch)

A zero-knowledge proof system for a statement x consists of:

```
(P, V) where:
P = Prover (has witness w, wants to prove statement)
V = Verifier (checks proof without learning witness)
```

Three properties:

1. **Completeness:** If the statement is true and P is honest, V always accepts.
   ```
   Pr[V(x, P(x, w)) = accept | (x, w) ∈ R] = 1
   ```

2. **Soundness:** If the statement is false, no cheating P* can convince V (except with negligible probability).
   ```
   Pr[V(x, P*(x)) = accept | x ∉ L] ≤ negl(λ)
   ```

3. **Zero-Knowledge:** V learns nothing beyond the truth of the statement. There exists a simulator Sim that produces transcripts indistinguishable from real proofs.
   ```
   {V(x, P(x, w))} ≈ {Sim(x)}
   ```

**For VERDICT:**
- Statement x: "This sequence of game state transitions is valid under game rules R"
- Witness w: The actual states, positions, actions, aim data (PRIVATE — never revealed)
- Verifier V: Midnight blockchain (trustless, anyone can verify)
- What V learns: CLEAN or FLAGGED. Nothing else. Not positions, not actions, not strategies.

### 2.2 Why Blockchain for Verification?

Without blockchain, you need a trusted verifier server. The game company runs the verifier. But then:
- Game company can selectively verify (bias)
- Game company can leak proofs (privacy break)
- Players must trust the company (back to trilemma)

With blockchain:
- Verification is on-chain (trustless — code is law)
- Proofs are public (anyone can verify the verification)
- No single party controls the anti-cheat
- Game company, players, and third parties all see the same verdicts

### 2.3 Midnight's Architecture (Why This Chain)

Midnight uses a dual-ledger model:

```
PUBLIC LEDGER                    PRIVATE STATE
─────────────                    ─────────────
totalChecks: 47                  playerPosition: (3, 7)
totalFlagged: 2                  previousPosition: (3, 6)
lastVerdict: CLEAN               aimHistory: [...]
                                 movementHistory: [...]
                                 chainHash: 0x7f3a...
```

**Public:** Anyone can read. Contains only aggregate statistics and verdicts.
**Private:** Only the prover (player's client) knows. Contains all gameplay data.

The ZK circuit bridges them: takes private inputs, produces public outputs, proves the relationship without revealing the inputs.

Midnight uses **Compact** — a domain-specific language that compiles to ZK circuits. Compact has:
- `witness` functions: private inputs (gameplay data)
- `export circuit` functions: the verification logic
- `export ledger` state: on-chain public state
- Native hashing (circuit-friendly, likely Poseidon)
- Arithmetic on `Uint<64>` types

---

## 3. THE TEN CHECKS — MATHEMATICAL FOUNDATIONS

### CHECK 1: Hash-Chain State Integrity

**Problem:** A malicious client could submit arbitrary states that don't follow from actual gameplay. How do we prove the submitted states are sequential and unmodified?

**Solution:** Cryptographic hash chain.

Define:
```
H₀ = hash(genesis_state)
Hᵢ = hash(Hᵢ₋₁ ‖ sᵢ₋₁ ‖ aᵢ ‖ sᵢ)
```

Where `‖` is concatenation.

The circuit receives `Hᵢ₋₁` and the state/action data as private witnesses. It recomputes `Hᵢ' = hash(Hᵢ₋₁ ‖ prevState ‖ action ‖ currState)` and asserts `Hᵢ' == Hᵢ`.

**Security property:** To fabricate a state at position i in the chain, the attacker must either:
1. Find a hash collision (computationally infeasible for any circuit-friendly hash with ≥128-bit security)
2. Control the entire chain from genesis (but genesis is committed on-chain at session start)

**Formal claim:**
```
Given collision-resistant hash H:
Pr[∃ modified chain C' ≠ C : verify(C') = accept] ≤ negl(λ)
```

**What this catches:** State fabrication, replay of old states, out-of-order submission, state skipping.

**Constraint cost:** ~200-400 R1CS constraints per hash (Poseidon). One hash per transition. Dominant cost in the circuit.

---

### CHECK 2: Commit-Reveal Integrity

**Problem:** A malicious client could observe the verification result and retroactively change the submitted state to one that passes. This is a race condition attack.

**Solution:** Two-phase commit-reveal protocol.

**Phase 1 (Commit):** Before verification, client publishes:
```
c = hash(sᵢ₋₁ ‖ aᵢ ‖ sᵢ ‖ nonce)
```
On-chain as public ledger state. This is binding — once committed, the state can't change.

**Phase 2 (Reveal):** During verification, the circuit receives the preimage as private witness and checks:
```
hash(witness.prevState ‖ witness.action ‖ witness.currState ‖ witness.nonce) == ledger.commitment
```

**Security property:** Binding + hiding.
- **Binding:** Client can't change the committed state after seeing the verification (hash preimage resistance)
- **Hiding:** The commitment reveals nothing about the state (random nonce provides semantic security)

**What this catches:** Retroactive state modification, verification oracle attacks.

---

### CHECK 3: Velocity Constraint

**Problem:** Speed hacks allow players to move faster than the game rules permit.

**Formalization:** Define velocity as distance per tick:
```
v(sᵢ₋₁, sᵢ) = d(sᵢ₋₁.pos, sᵢ.pos) / Δt
```

For discrete ticks where Δt = 1:
```
v = d(sᵢ₋₁.pos, sᵢ.pos)
```

Using Manhattan distance (L1 norm) for grid games:
```
d_L1((x₁,y₁), (x₂,y₂)) = |x₂ - x₁| + |y₂ - y₁|
```

Or Euclidean distance squared (avoids square root in ZK):
```
d²_L2((x₁,y₁), (x₂,y₂)) = (x₂ - x₁)² + (y₂ - y₁)²
```

**Circuit assertion:**
```
d(prev.pos, curr.pos) ≤ maxVelocity
```

**Why L1 over L2:** Manhattan distance avoids multiplication and square root. In ZK circuits, multiplication is cheap but square root requires iterative approximation (expensive). L1 is exact and cheap. For games that need Euclidean, compare `d²` against `maxVelocity²` to avoid the root.

**What this catches:** Teleportation, basic speed hacks, position jumping.

**Constraint cost:** ~4 comparisons + 2 absolute values = ~20 R1CS constraints.

---

### CHECK 4: Acceleration Constraint (Second-Order Physics)

**Problem:** Sophisticated speed hacks gradually ramp velocity to avoid per-tick speed checks. Example: a player moves 1, 2, 4, 8, 16 units per tick. Each individual tick might pass a generous maxVelocity check, but the ACCELERATION is inhuman.

**Formalization:** Define acceleration:
```
vᵢ = d(sᵢ₋₁, sᵢ)
vᵢ₋₁ = d(sᵢ₋₂, sᵢ₋₁)
aᵢ = |vᵢ - vᵢ₋₁|
```

**Circuit assertion:**
```
|v_curr - v_prev| ≤ maxAcceleration
```

**Why this matters:** Real game physics have inertia. A character at rest can't instantly reach max speed. Acceleration bounds enforce physically plausible movement even when individual velocities are within range.

**Example:**
```
maxVelocity = 8, maxAcceleration = 2

Tick 1: v=1  ✓ (velocity ok)
Tick 2: v=2  ✓ (velocity ok, acceleration |2-1|=1 ≤ 2 ✓)
Tick 3: v=4  ✓ (velocity ok, acceleration |4-2|=2 ≤ 2 ✓)
Tick 4: v=8  ✓ (velocity ok, acceleration |8-4|=4 > 2 ✗ FLAGGED)
```

The speed hack passes CHECK 3 at every tick but fails CHECK 4 at tick 4.

**Requires:** `prevPrevState` as additional witness input (three states total: i-2, i-1, i).

**Constraint cost:** ~30 R1CS constraints (two distance computations + one comparison).

---

### CHECK 5: Bounds Enforcement

**Problem:** Noclip hacks allow players to move through walls or outside the map.

**Formalization:**
```
0 ≤ sᵢ.x ≤ boundX
0 ≤ sᵢ.y ≤ boundY
```

**Extension — obstacle collision:** For games with walls/obstacles, the game dev provides an obstacle map as a public input (hashed). The circuit checks the player's position is not inside any obstacle:

```
obstacle_map_hash = hash(obstacles)  // public parameter
For each obstacle o in witnesses:
  assert(curr.pos ∉ o.bounds)
Verify hash(witness.obstacles) == obstacle_map_hash
```

This is expensive (proportional to obstacle count) but feasible for small maps. For large maps, use a spatial hash / quadtree commitment.

**Basic constraint cost:** ~4 comparisons = ~8 R1CS constraints.

---

### CHECK 6: Action Validity

**Problem:** Modified clients can send actions that don't exist in the game (e.g., action_id=99 when only 4 actions exist).

**Formalization:**
```
aᵢ ∈ {0, 1, ..., validActionCount - 1}
```

**Circuit assertion:**
```
action < validActionCount
```

**Constraint cost:** ~2 R1CS constraints.

---

### CHECK 7: Action Frequency Analysis

**Problem:** Autoclickers and macro bots execute actions at superhuman rates (e.g., 50 clicks/second when humans cap at ~7).

**Formalization:** Given a window of W recent ticks, count actions:
```
freq(W) = |{aᵢ : i ∈ [current_tick - W, current_tick]}|
Assert: freq(W) ≤ maxActionsPerWindow
```

**ZK implementation challenge:** ZK circuits don't have loops. We must unroll.

For fixed W=8, the witness provides 8 tick timestamps:
```
t₀, t₁, ..., t₇  (tick numbers when actions occurred)
```

The circuit verifies:
1. **Monotonicity:** tᵢ < tᵢ₊₁ for all i (timestamps are ordered, no fabrication)
2. **Window bound:** t₀ ≥ currentTick - W (all timestamps within window)
3. **Count bound:** 8 ≤ maxActionsPerWindow (or: number of non-zero entries ≤ max)

**Subtlety:** The client provides the tick history. What prevents a malicious client from providing fake (spread out) timestamps?

**Answer:** The hash chain (CHECK 1). Each tick's hash includes the tick number. If the client claims action at tick 50 but the hash chain shows no action at tick 50, the hash won't match. CHECK 1 and CHECK 7 are coupled — the hash chain enforces that the tick history is authentic.

**Constraint cost:** ~40 R1CS constraints (8 comparisons for monotonicity, 8 for window, 1 for count).

---

### CHECK 8: Behavioral Entropy (Statistical Anomaly Detection)

**Problem:** Script bots execute perfect repeating patterns. Humans are inherently noisy. Can we mathematically distinguish them?

**Formalization:** Given last N actions {a₁, ..., aₙ} from action space of size K:

Frequency of each action type:
```
fⱼ = |{aᵢ : aᵢ = j}|  for j ∈ {0, ..., K-1}
```

Shannon entropy:
```
H = -Σⱼ (fⱼ/N) · log₂(fⱼ/N)
```

**Problem:** `log₂` is expensive in ZK circuits. No native logarithm.

**Solution:** Quadratic diversity index (Gini-Simpson index):
```
D = 1 - Σⱼ (fⱼ/N)²
```

Or equivalently, scaled to avoid fractions:
```
D_scaled = N² - Σⱼ fⱼ²
```

**Properties:**
- If all N actions are the same type: D_scaled = N² - N² = 0 (minimum diversity)
- If perfectly uniform (N/K each): D_scaled = N² - K·(N/K)² = N² - N²/K = N²·(1 - 1/K) (maximum diversity)

For N=8, K=4:
- All same: D = 0
- Perfect loop (2 each): D = 64 - 4·4 = 48
- Slightly biased (3,2,2,1): D = 64 - (9+4+4+1) = 46
- Heavily biased (5,1,1,1): D = 64 - (25+1+1+1) = 36

**Circuit assertion:**
```
D_scaled ≥ minDiversity
```

**Why this works against bots:** A bot executing UDLRUDLR has perfect 2-2-2-2 distribution (D=48, high). BUT that's only if the bot varies actions. A simpler bot that just moves right repeatedly has D=0. And importantly: the CHECK isn't just about diversity — it's combined with CHECK 7 (frequency) and CHECK 4 (acceleration). A bot that PERFECTLY distributes 4 actions while maintaining EXACTLY consistent timing is caught by the combination, because no human has both perfect action distribution AND perfect timing.

**The real power is in the conjunction of checks, not any single one.**

**ZK implementation:** Unroll for N=8, K=4:

```
count₀ = Σᵢ (aᵢ == 0 ? 1 : 0)  // 8 conditionals
count₁ = Σᵢ (aᵢ == 1 ? 1 : 0)  // 8 conditionals
count₂ = Σᵢ (aᵢ == 2 ? 1 : 0)  // 8 conditionals
count₃ = Σᵢ (aᵢ == 3 ? 1 : 0)  // 8 conditionals

D = 64 - (count₀² + count₁² + count₂² + count₃²)
assert D ≥ minDiversity
```

**Constraint cost:** 32 conditionals + 4 multiplications + 4 additions + 1 comparison ≈ ~80 R1CS constraints.

---

### CHECK 9: Aim Precision Anomaly (Aimbot Detection)

**Problem:** Aimbot software locks the player's crosshair to enemy hitboxes with inhuman precision and speed. The ACTIONS (shoot at coordinate) are valid. The AIM PATTERN is not.

**Formalization:** Given a sequence of N aim events (shots fired):
```
targets = [(x₁,y₁), (x₂,y₂), ..., (xₙ,yₙ)]  — where player aimed
```

**Metric 1: Angular Snap Frequency**

Define the angular change between consecutive aim targets:
```
θᵢ = atan2(yᵢ - yᵢ₋₁, xᵢ - xᵢ₋₁)
Δθᵢ = |θᵢ - θᵢ₋₁|
```

A "snap" is when Δθ exceeds a threshold (sudden direction change to lock onto target):
```
snap_count = |{i : Δθᵢ > snap_threshold}|
Assert: snap_count ≤ maxSnapsPerWindow
```

**ZK problem:** `atan2` requires trigonometry, which is extremely expensive in ZK.

**ZK-friendly alternative:** Skip angles entirely. Use **direction vector dot product** as a proxy for angular change:

```
d⃗ᵢ = (xᵢ - xᵢ₋₁, yᵢ - yᵢ₋₁)      — direction vector
d⃗ᵢ₊₁ = (xᵢ₊₁ - xᵢ, yᵢ₊₁ - yᵢ)

dot = d⃗ᵢ · d⃗ᵢ₊₁ = dx₁·dx₂ + dy₁·dy₂
cross = |d⃗ᵢ × d⃗ᵢ₊₁| = |dx₁·dy₂ - dy₁·dx₂|

snap_score = cross² / (|d⃗ᵢ|² · |d⃗ᵢ₊₁|²)  — proxy for sin²(Δθ)
```

When snap_score is high → large angular change → possible aimbot snap.

**Even simpler ZK-friendly version:** Just use the cross product magnitude:
```
snap_magnitude = |dx₁·dy₂ - dy₁·dx₂|
If snap_magnitude > threshold: snap_count += 1
```

This is 2 multiplications + 1 subtraction + 1 comparison per consecutive pair. Very cheap.

**Metric 2: Time-to-Target Variance**

Human aim has variable time between acquiring targets. Aimbot is consistent.

```
ttk = [t₁, t₂, ..., tₙ]  — time between consecutive kills/shots

mean = Σtᵢ / N
variance = Σ(tᵢ - mean)² / N
```

Assert: variance ≥ minVariance

**ZK-friendly:** Variance requires division (for mean). Alternative: use sum of squared differences between consecutive times:

```
jitter = Σ|ttk_i - ttk_{i-1}|²
Assert: jitter ≥ minJitter
```

No division needed. Measures how much the timing varies between consecutive events.

**What this catches:** Aimbot produces high snap frequency (instant target acquisition) and low timing jitter (machine-consistent intervals). Humans have low snap frequency and high jitter.

**Constraint cost:** ~60 R1CS constraints for N=8 aim events.

---

### CHECK 10: Information Leakage Detection (Wallhack/ESP)

**This is the novel contribution. This check has no precedent in existing anti-cheat literature.**

**Problem:** Wallhack/ESP reveals hidden information (enemy positions) to the player. The player's MOVES are legal, but their DECISIONS correlate with information they shouldn't have. How do you detect this mathematically?

**Formalization:**

Let:
- `P = (p₁, p₂, ..., pₙ)` — player's movement vectors (private witness)
- `E = (e₁, e₂, ..., eₙ)` — enemy positions at each tick (private witness, provided by game server)
- `V = {v : player cannot see v from current position}` — occluded regions

Define the "attraction vector" toward nearest hidden enemy at each tick:
```
a⃗ᵢ = normalize(nearest_hidden_enemy_pos - pᵢ.pos)
```

Define the correlation between player movement and attraction:
```
C = (1/N) · Σᵢ (p⃗ᵢ · a⃗ᵢ)
```

Where `p⃗ᵢ` is the player's movement direction at tick i.

- If player has NO wallhack: movement is uncorrelated with hidden enemies. E[C] ≈ 0.
- If player HAS wallhack: movement correlates with hidden enemies. E[C] > 0 significantly.

**Assert:** C ≤ maxCorrelation

**ZK-friendly simplification:**

Skip normalization (expensive). Use raw dot products:

```
For each tick i:
  // Direction player moved
  move_dx = curr_x - prev_x
  move_dy = curr_y - prev_y

  // Direction to hidden enemy
  enemy_dx = enemy_x - curr_x
  enemy_dy = enemy_y - curr_y

  // Correlation component (positive = moving toward enemy)
  correlation_i = move_dx * enemy_dx + move_dy * enemy_dy

Total_correlation = Σ correlation_i
Assert: Total_correlation ≤ maxCorrelation
```

**Critical design point:** The enemy positions are provided as PRIVATE WITNESS by the game server (via secure channel to client). The circuit verifies them against a public hash:

```
Public input: enemy_positions_hash = hash(all enemy positions for this batch)
Private witness: actual enemy positions
Circuit: verify hash(witness.enemy_positions) == public.enemy_positions_hash
```

The game server publishes `enemy_positions_hash` on-chain (or provides it as a public circuit parameter). The player's client receives the actual positions (encrypted, only decryptable by the circuit). Neither the player nor the public learns enemy positions — but the circuit can check correlation.

**Statistical rigor:**

For N independent ticks with random movement, the correlation sum follows approximately:
```
Total_correlation ~ Normal(0, σ²·N)
```

Set `maxCorrelation = z_α · σ · √N` for desired false positive rate α.

With z₀.₀₁ = 2.33 (1% false positive), N=50 ticks, and σ estimated from game physics:
- Clean player: correlation ≈ 0 ± noise
- Wallhacker: correlation >> 0 (consistently moving toward hidden enemies)

**What this catches:** Wallhack, ESP, radar hack, any cheat that leaks hidden game state into player decisions.

**Limitation:** Requires sufficient ticks (N≥30) for statistical significance. A wallhacker who only occasionally acts on leaked info may not be caught in small batches. Solution: accumulate correlation across multiple batches.

**Constraint cost:** ~100 R1CS constraints for N=8 ticks (8 dot products + hash verification).

---

## 4. THE CONJUNCTION ARGUMENT

No single check catches everything. The power is in their **conjunction:**

```
FLAGGED ← CHECK_1 ∨ CHECK_2 ∨ ... ∨ CHECK_10
```

A sophisticated cheater who:
- Modifies states → caught by CHECK 1 (hash chain)
- Fabricates after the fact → caught by CHECK 2 (commit-reveal)
- Moves too fast → caught by CHECK 3 (velocity)
- Ramps speed gradually → caught by CHECK 4 (acceleration)
- Goes through walls → caught by CHECK 5 (bounds)
- Sends invalid commands → caught by CHECK 6 (action validity)
- Clicks inhumanly fast → caught by CHECK 7 (frequency)
- Moves in perfect patterns → caught by CHECK 8 (entropy)
- Aims with machine precision → caught by CHECK 9 (aim analysis)
- Moves toward hidden enemies → caught by CHECK 10 (information leakage)

**To beat VERDICT, a cheater must simultaneously:**
1. Maintain a valid hash chain (can't fabricate states)
2. Commit to moves before verification (can't change retroactively)
3. Move within speed limits (can't teleport)
4. Accelerate within physics bounds (can't ramp speed)
5. Stay within map bounds (can't noclip)
6. Use only valid actions (can't inject commands)
7. Act at human rates (can't autoclick)
8. Show human-like randomness (can't bot-loop)
9. Aim with human-like imprecision (can't aimbot)
10. Move independently of hidden information (can't wallhack)

In other words: **to beat VERDICT, you must play legitimately.** QED.

---

## 5. TOTAL CONSTRAINT BUDGET

| Check | Constraints (est.) | Notes |
|---|---|---|
| CHECK 1: Hash chain | ~300 | Poseidon hash |
| CHECK 2: Commit-reveal | ~300 | Poseidon hash |
| CHECK 3: Velocity | ~20 | Arithmetic |
| CHECK 4: Acceleration | ~30 | Arithmetic |
| CHECK 5: Bounds | ~8 | Comparisons |
| CHECK 6: Action validity | ~2 | Comparison |
| CHECK 7: Frequency (W=8) | ~40 | Unrolled comparisons |
| CHECK 8: Entropy (N=8, K=4) | ~80 | Unrolled conditionals + arithmetic |
| CHECK 9: Aim (N=8) | ~60 | Dot products + comparisons |
| CHECK 10: Info leakage (N=8) | ~100 | Dot products + hash |
| **TOTAL** | **~940** | Well within ZK circuit budget |

For reference, Midnight's proving system handles circuits with tens of thousands of constraints. ~940 is lightweight. This means:
- Proof generation: ~2-5 seconds on modern hardware
- Verification: ~milliseconds on-chain
- Block space: minimal

---

## 6. THE ASYNC SETTLEMENT MODEL

### 6.1 Why Not Real-Time?

Midnight has ~6 second block times. A competitive game runs at 60 ticks/second. Real-time on-chain verification of every tick is impossible: 60 ticks × 5s proof time = 300 seconds of proof work per second of gameplay.

### 6.2 The Anti-Cheat Rollup

Borrow from L2 rollup architecture:

```
LAYER 1 (Game Client)              LAYER 2 (Midnight)
─────────────────────              ──────────────────
Tick 1: state transition
Tick 2: state transition
...
Tick N: state transition            Batch proof submitted
                                    → Verify all N transitions
Tick N+1: continues playing         → CLEAN or FLAGGED
Tick N+2: continues playing         → Settled on-chain
...
```

**Analogy:**
- Optimistic rollup: assume valid, prove fraud later
- VERDICT: assume clean, prove validity in background

**Key insight:** Games don't need INSTANT cheat detection. They need CERTAIN cheat detection. A 6-second delay in flagging a cheater is irrelevant — the flag is permanent and cryptographically undeniable.

### 6.3 Batch Composition

A batch of N transitions becomes one proof:
```
Proof(batch) = Proof(transition₁ ∧ transition₂ ∧ ... ∧ transitionₙ)
```

Circuit unrolls N transition checks. For N=10:
- Constraint count: ~940 × 10 = ~9,400 (still feasible)
- One on-chain transaction per batch
- Gas cost: proportional to proof size, NOT number of transitions
- This IS rollup compression

### 6.4 Pipeline Architecture

```
[Game Loop] → [Transition Buffer] → [Proof Worker] → [Submit Queue] → [Midnight]
    60 fps        collect N ticks      Web Worker         async           6s blocks
                  ~0.17s per tick      ~5s per proof      non-blocking
```

Multiple proofs can pipeline: while proof for batch K submits, batch K+1 is already proving.

---

## 7. UNIVERSAL CONSTRAINT VERIFICATION (WHY THIS IS A PROTOCOL)

### 7.1 The Limitation of Parameterized Circuits

The 10 checks above are powerful but specific. They encode spatial movement, aim analysis, and information leakage — concepts relevant to FPS and action games. But what about:

- **Chess?** No spatial movement. No aim. The cheat is using an engine to compute optimal moves.
- **Poker?** No movement at all. The cheat is knowing other players' cards.
- **Gambling?** No player-vs-player. The cheat is the HOUSE manipulating outcomes.
- **MOBAs?** Movement exists, but also abilities, cooldowns, items, gold, experience.

A parameterized circuit (change maxVelocity, change bounds) only varies the THRESHOLDS of fixed checks. It can't add NEW TYPES of checks for new game mechanics.

**The real question:** Can we build a system where the game developer describes their rules, and VERDICT automatically generates the right checks?

### 7.2 The Universal Constraint Language

**Insight:** Every game rule is a constraint on state transitions. "Max speed is 5" is really: `|position.new - position.old| <= 5`. "Cooldown is 8 seconds" is: `if action == Q: time_since_last_Q >= 8`. "Cards played must be in hand" is: `played_card ∈ hand_set`.

ALL game rules reduce to:

```
f(state_old, state_new, action, hidden_state) ∈ VALID
```

Where f is some function and VALID is the set of acceptable outputs.

If we define a small but expressive constraint language, then ANY game rule can be expressed in it, and VERDICT compiles it to a ZK circuit automatically.

### 7.3 The VERDICT Constraint DSL

```
VERDICT CONSTRAINT LANGUAGE (VCL)
══════════════════════════════════

TYPES:
  uint         — unsigned integer (maps to Uint<64> in Compact)
  bool         — boolean
  state        — composite state object with named fields
  hidden       — private game server data (enemy positions, hidden cards, etc.)

OPERATORS:
  Arithmetic:  +  -  *  /  %  abs()  max()  min()
  Comparison:  ==  !=  <  >  <=  >=
  Logical:     and  or  not
  Set:         in  not_in  count()  sum()
  Temporal:    since(event)  freq(action, window)
  Statistical: entropy(field, window)  variance(field, window)  correlation(field1, field2, window)
  Crypto:      hash()  committed()

STATE ACCESS:
  field.old    — field value in previous state
  field.new    — field value in current state
  field.delta  — shorthand for |field.new - field.old|

CONSTRAINT SYNTAX:
  constraint <name>: <expression that must be true>
```

### 7.4 Any Game in VCL

**Chess:**
```vcl
state { board: uint[64], turn: uint, moveFrom: uint, moveTo: uint }
hidden { engine_eval: uint }

constraint legal_move:
  is_valid_chess_move(board.old, moveFrom, moveTo)

constraint turn_order:
  turn.new == turn.old + 1

constraint no_engine:
  // Time per move has human-like variance (engines are consistent)
  variance(move_time, 10) >= min_variance

constraint state_integrity:
  board.new == apply_chess_move(board.old, moveFrom, moveTo)
```

**Valorant / FPS:**
```vcl
state { x: uint, y: uint, z: uint, hp: uint, ammo: uint, aim_x: uint, aim_y: uint }
hidden { enemy_positions: uint[] }

constraint max_speed:
  abs(x.delta) + abs(y.delta) + abs(z.delta) <= maxVelocity

constraint max_accel:
  abs(velocity.new - velocity.old) <= maxAcceleration

constraint bounds:
  x.new <= boundX and y.new <= boundY and z.new <= boundZ

constraint fire_rate:
  freq(SHOOT, 60) <= maxFireRate

constraint no_aimbot:
  aim_snap_count(aim_x, aim_y, 8) <= maxSnaps

constraint no_wallhack:
  correlation(movement_direction, enemy_direction, 30) <= maxCorrelation

constraint hp_valid:
  if action != HEAL: hp.new <= hp.old
  hp.new <= maxHP

constraint ammo_valid:
  if action == SHOOT: ammo.new == ammo.old - 1
  ammo.new >= 0
```

**Poker:**
```vcl
state { hand: uint[5], bet: uint, pot: uint, folded: bool }
hidden { other_hands: uint[][] }

constraint valid_play:
  played_card in hand.old

constraint bet_valid:
  bet.new >= min_bet and bet.new <= stack

constraint no_collusion:
  // Betting patterns shouldn't correlate with other players' hand strength
  correlation(bet_history, other_hand_strength, 20) <= maxCorrelation

constraint pot_conservation:
  pot.new == pot.old + sum(all_bets_this_round)
```

**Online Casino / Gambling:**
```vcl
state { bet: uint, outcome: uint, payout: uint, rng_commitment: uint }
hidden { rng_seed: uint }

// HERE THE CASINO IS THE PROVER — proving to players it's fair

constraint outcome_committed:
  // Casino committed to RNG seed BEFORE bet was placed
  hash(rng_seed) == rng_commitment

constraint outcome_valid:
  outcome == deterministic_rng(rng_seed, bet_id)

constraint payout_correct:
  payout == calculate_payout(outcome, bet, odds)

constraint no_manipulation:
  // RNG seed can't change between commitment and reveal
  committed(rng_seed) == true
```

**League of Legends / MOBA:**
```vcl
state { x: uint, y: uint, hp: uint, mana: uint, gold: uint, level: uint,
        cd_q: uint, cd_w: uint, cd_e: uint, cd_r: uint }
hidden { fog_of_war: uint[][] }

constraint movement:     abs(x.delta) + abs(y.delta) <= base_speed + items.speed_bonus
constraint ability_q:    if action == Q: cd_q.old == 0 and mana.old >= q_cost
constraint ability_r:    if action == R: cd_r.old == 0 and level.old >= 6
constraint gold_valid:   gold.new <= gold.old + max_gold_per_tick
constraint hp_bounds:    hp.new <= max_hp_at_level(level.old)
constraint no_fog_hack:  correlation(movement_direction, hidden_enemy_direction, 30) <= maxCorrelation
constraint no_scripting: entropy(action_sequence, 16) >= minEntropy
```

**Racing Game:**
```vcl
state { x: uint, y: uint, speed: uint, angle: uint }

constraint max_speed:    speed.new <= maxSpeed
constraint acceleration: abs(speed.delta) <= maxAccel
constraint on_track:     point_in_polygon(x.new, y.new, track_bounds)
constraint physics:      // Can't turn sharply at high speed
                         if speed.old > highSpeedThreshold: abs(angle.delta) <= maxTurnAtSpeed
```

### 7.5 The Compiler Architecture

```
┌─────────────────┐
│  Game Dev writes │
│  VCL constraints │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  VCL Parser     │  Parses constraint DSL into AST
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Type Checker    │  Validates field references, types, operator compatibility
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Constraint      │  Determines which witness functions are needed
│  Analyzer        │  Identifies temporal windows, hidden state dependencies
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Compact Code    │  Generates Compact circuit code:
│  Generator       │  - witness functions for each state field
│                  │  - constraint checks as circuit assertions
│                  │  - hash chain + commit-reveal (always included)
│                  │  - ledger state for verdicts + counters
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Compact         │  Midnight's compiler: Compact → ZK circuit
│  Compiler        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deployed        │  On-chain verifier, unique per game
│  Contract        │
└─────────────────┘
```

The game dev NEVER touches Compact, ZK, or blockchain. They write VCL. VERDICT handles everything else.

### 7.6 Why This Is Universal

**Claim:** Any game rule expressible as a deterministic relationship between old state, new state, action, and hidden state can be written in VCL.

**Proof sketch:** VCL supports:
- Arithmetic (any numerical relationship)
- Comparison (any threshold or bound)
- Conditionals (any action-dependent rule)
- Set operations (any membership check)
- Temporal operators (any timing constraint)
- Statistical operators (any behavioral analysis)
- Correlation (any information leakage check)

These primitives span the space of game rules. A game rule that cannot be expressed in VCL would require a fundamentally new type of mathematical relationship — possible in theory, but no known game mechanic falls outside this space.

**New game tomorrow?** Write VCL. Compile. Deploy. No VERDICT code changes. No new modules. No updates. The compiler is the product.

### 7.7 The 10 Built-In Checks as VCL

The hackathon's 10 checks are actually just pre-written VCL for common game types:

```vcl
// VERDICT STANDARD LIBRARY — ships with SDK

// CHECK 1-2: Always included (core integrity)
@builtin constraint hash_chain: chain_valid(state_history)
@builtin constraint commit_reveal: committed(state, action, nonce)

// CHECK 3-6: Spatial module (opt-in)
@spatial constraint velocity: movement_distance <= maxVelocity
@spatial constraint acceleration: abs(velocity.delta) <= maxAcceleration
@spatial constraint bounds: position_in_bounds(x.new, y.new, boundX, boundY)
@spatial constraint action_valid: action < validActionCount

// CHECK 7-8: Behavioral module (opt-in)
@behavioral constraint frequency: freq(action, windowSize) <= maxActionsPerWindow
@behavioral constraint entropy: diversity(action_history, 8) >= minDiversity

// CHECK 9: Aim module (opt-in)
@aim constraint snap_detection: aim_snaps(aim_history, 8) <= maxSnaps

// CHECK 10: Information module (opt-in)
@information constraint leakage: correlation(movement, hidden_enemies, 8) <= maxCorrelation
```

Game dev picks: `@use spatial, behavioral, aim, information` for an FPS. Or `@use transition, sequence` for chess. Or writes entirely custom constraints. Mix and match.

### 7.8 Integration Surface

```typescript
// OPTION 1: Use built-in modules (fastest)
const verdict = createVerdictSDK({
  network: 'devnet',
  modules: ['spatial', 'behavioral', 'aim', 'information'],
  rules: { maxVelocity: 10, maxAcceleration: 5, ... }
});

// OPTION 2: Write custom VCL (any game)
const verdict = createVerdictSDK({
  network: 'devnet',
  constraints: `
    state { board: uint[64], turn: uint }
    constraint legal_move: is_valid_chess_move(board.old, move)
    constraint turn_order: turn.new == turn.old + 1
  `
});

// OPTION 3: Mix built-in + custom
const verdict = createVerdictSDK({
  network: 'devnet',
  modules: ['spatial'],
  constraints: `
    constraint cooldown_q: if action == Q: cd_q.old == 0
    constraint gold_cap: gold.new <= gold.old + 50
  `,
  rules: { maxVelocity: 5, boundX: 1000, boundY: 1000 }
});

// Game loop — same for ALL options
onGameTick((prev, curr, action) => {
  verdict.buffer.push({ prev, curr, action });
});
```

**Players don't know Midnight exists.** No wallet. No tokens. No web3 UX. The chain is invisible infrastructure. The SDK handles everything.

---

## 8. THREAT MODEL AND LIMITATIONS

### 8.1 What VERDICT Assumes

1. **Game client is the prover.** The player's machine generates proofs. A malicious client could refuse to prove (detectable: no proofs = no verification = flagged by absence).

2. **Game rules are correct.** The game developer sets maxVelocity, bounds, etc. Wrong rules = wrong verdicts. This is the developer's responsibility, not the protocol's.

3. **Hash chain genesis is authentic.** The first hash in the chain must be committed on-chain at session start. If the genesis is fake, the whole chain is fabricated.

4. **Enemy positions (for CHECK 10) are provided honestly by the game server.** The server hashes enemy positions and publishes the hash. If the server lies about enemy positions, CHECK 10 is ineffective. But the server has no incentive to lie (it wants to catch cheaters).

### 8.2 What VERDICT Cannot Catch

1. **Social engineering cheats:** A friend on Discord tells you where enemies are. No state modification, no software, pure human communication. Undetectable by any anti-cheat.

2. **Peripheral hardware cheats:** A physical device that modifies mouse input at the hardware level (e.g., mouse with built-in recoil compensation). The ACTIONS appear legitimate because they come from "real" hardware. Partially caught by CHECK 9 (aim analysis) if the hardware produces statistically anomalous patterns.

3. **Stream sniping:** Watching an opponent's stream to gain information. Legal actions, external information source. Undetectable.

4. **Subtle wallhack with restraint:** A player who has wallhack but deliberately doesn't act on it most of the time. Low correlation → passes CHECK 10. Requires many ticks of data to reach statistical significance. Mitigation: accumulate correlation across sessions.

### 8.3 The Fundamental Theorem of VERDICT

**Claim:** For any cheat that modifies game state, actions, or input patterns, there exists a window of N ticks such that VERDICT detects it with probability ≥ 1 - δ, where δ → 0 as N → ∞.

**Informal proof:** State-modifying cheats (classes 1-2) are caught deterministically by hash chain + bounds + velocity + acceleration. Input-pattern cheats (class 3) are caught deterministically by frequency + validity checks. Behavioral cheats (class 4: aimbot, wallhack) are caught statistically — the detection power increases with sample size N. For any desired confidence level, there exists sufficient N.

**Implication:** Given enough gameplay data, VERDICT catches everything except purely external information sources (social engineering, stream sniping). This is the theoretical limit of ANY anti-cheat that doesn't surveil the player's environment.

---

## 9. COMPARISON WITH EXISTING SYSTEMS

| Property | Vanguard (Riot) | EasyAntiCheat | BattlEye | VERDICT |
|---|---|---|---|---|
| Detection method | Kernel memory scan | Userspace hooks + kernel driver | Kernel driver + cloud analysis | ZK state proofs |
| Kernel access | Yes (ring 0) | Yes | Yes | No |
| Data collected | Process list, hardware IDs, memory dumps, network traffic | Loaded modules, file hashes | Process list, screenshots | Zero |
| OS support | Windows | Windows, Linux, Mac | Windows, Linux | Any (runs in browser) |
| Privacy | None | Minimal | Minimal | Complete (ZK) |
| Integration effort | Months, deep engine integration | Weeks, SDK integration | Weeks, SDK integration | Hours, 5-line SDK |
| False positives | Yes (kernel heuristics are imperfect) | Yes | Yes | Configurable (statistical thresholds) |
| Tamper resistance | High (kernel level) | Medium | High | N/A (nothing to tamper — proofs are math) |
| Bypassable | Yes (kernel exploits, driver spoofing) | Yes (various techniques) | Yes (driver manipulation) | Only by playing legitimately |
| Verification | Trust Riot | Trust Epic | Trust BattlEye | Trustless (on-chain) |
| Player recourse | None (banned = banned) | None | None | On-chain proof history (player can prove clean streak) |

---

## 10. FUTURE DIRECTIONS (Not for hackathon, but for pitch)

1. **Full VCL compiler:** The hackathon ships pre-compiled checks. The product ships the full constraint compiler — game devs write VCL, VERDICT generates circuits. No Compact knowledge needed. No ZK knowledge needed. Just game rules → anti-cheat.

2. **Recursive proof composition:** Prove a batch of batches. One proof covers an entire gaming session (thousands of ticks). Constant-size on-chain footprint regardless of session length.

3. **Cross-game reputation:** A player's clean streak on Game A carries to Game B. Universal anti-cheat reputation, portable across games, private (no game data shared between games — only the ZK verdict).

4. **Tournament-grade verification:** For esports with prize money, VERDICT provides cryptographic proof that no player cheated. Tournament organizers can verify without trusting any anti-cheat vendor.

5. **Provably fair gambling:** Casinos use VERDICT to prove to players that outcomes weren't manipulated. RNG committed before bet, payout verified by circuit. The first trustless gambling infrastructure.

6. **Standard library expansion:** Community-contributed VCL constraint libraries for specific game genres. `@fps`, `@moba`, `@card`, `@racing`, `@casino` — install the genre, get anti-cheat.

7. **Hardware attestation integration:** Combine VERDICT's state proofs with lightweight hardware attestation (TPM-based) for defense-in-depth without full kernel access.

---

## REFERENCES AND PRIOR ART

- **Succinct Non-Interactive Arguments of Knowledge (SNARKs):** Groth16, PLONK — foundational ZK proof systems
- **Midnight Protocol:** Dual-ledger privacy blockchain with Compact ZK language
- **Poseidon Hash:** Circuit-friendly hash function optimized for ZK constraints
- **Gini-Simpson Diversity Index:** Statistical measure of diversity used in CHECK 8
- **Optimistic Rollups (Arbitrum, Optimism):** Architectural inspiration for async settlement model
- **Riot Vanguard Technical Documentation:** Kernel-level anti-cheat reference
- **"Cheating in Online Games" (Yan & Randell, 2005):** Taxonomy of online game cheats
- **Information-Theoretic Security:** Theoretical framework for CHECK 10's information leakage detection
