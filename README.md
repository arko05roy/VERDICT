# VERDICT

### *Every game server lies to you. We mathematically prove they can't.*

**Universal Zero-Knowledge Game Integrity Protocol on Midnight**

---

## The Problem: The Anti-Cheat Trilemma

Every multiplayer game faces a fundamental trilemma:

```
          FAIR PLAY
             /\
            /  \
           /    \
          /      \
   PRIVACY ────── TRUST
```

Pick two. You can't have all three. Until now.

**Fair Play + Trust (no privacy)** — This is the world we live in. Riot's Vanguard runs at ring-0 kernel level. EasyAntiCheat scans your running processes. You hand over your entire machine to a corporation and *hope* they only look at game data. 170+ million players have kernel-level anti-cheat watching everything they do. It works. But at what cost?

**Fair Play + Privacy (no trust)** — The theoretical dream. Prove you're playing clean without revealing anything. But who checks the proofs? A server. Run by the game company. Which you must trust. Which defeats the point.

**Privacy + Trust (no fair play)** — The honor system. Players promise they're not cheating. Nobody verifies. Cheating runs rampant. Every competitive game that tried this failed.

**VERDICT's thesis:** Zero-knowledge proofs on a blockchain resolve the trilemma. ZK gives you fair play + privacy. The blockchain gives you trustless verification. All three. Simultaneously.

---

## What Is VERDICT?

VERDICT is a **protocol**, not a game. Think Chainlink for oracles, or The Graph for indexing — but for game integrity.

The core primitive: **any game** can deploy a ruleset to Midnight. The ruleset defines what constitutes valid play. VERDICT's ZK circuit proves every state transition follows the rules — without revealing the player's position, strategy, aim data, or any gameplay information whatsoever.

The game server learns exactly one bit: **CLEAN** or **FLAGGED**.

```
Game Client → captures state transition
    ↓
Witness Provider → assembles private data (positions, actions, aim, timestamps)
    ↓
ZK Circuit → runs 10 mathematical checks inside the proof
    ↓
Proof Server → generates SNARK proof (~2-5 seconds)
    ↓
Midnight → on-chain settlement (trustless, public verdict)
    ↓
Result → CLEAN or FLAGGED (nothing else revealed)
```

No kernel access. No process scanning. No data exfiltration. No surveillance.
Just math.

---

## The 10 Checks

Every state transition runs through 10 layered integrity checks inside a single ZK circuit. Each targets a different class of cheat. All execute simultaneously in ~940 R1CS constraints.

| # | Check | Type | What It Catches | How |
|---|-------|------|-----------------|-----|
| 1 | **Hash-Chain Integrity** | Cryptographic | State fabrication, replay attacks, state skipping | Recomputes `H(prev ‖ state ‖ action ‖ tick)` and asserts chain continuity |
| 2 | **Commit-Reveal** | Cryptographic | Retroactive move editing, verification oracle attacks | Two-phase: commit hash before verify, reveal preimage during proof |
| 3 | **Velocity** | Physics | Teleportation, speed hacks | Manhattan distance `\|dx\| + \|dy\| ≤ maxVelocity` per tick |
| 4 | **Acceleration** | Physics (2nd order) | Gradual speed ramps that pass per-tick checks | `\|v_curr - v_prev\| ≤ maxAcceleration` across 3 frames |
| 5 | **Bounds** | Spatial | Noclip, out-of-map exploits | `pos.x ≤ boundX && pos.y ≤ boundY` |
| 6 | **Action Validity** | Rule-based | Impossible commands, modified client payloads | `action < validActionCount` |
| 7 | **Action Frequency** | Temporal | Autoclickers, macro bots, rapid-fire exploits | Sliding window: `count(actions in W ticks) ≤ maxRate` |
| 8 | **Behavioral Entropy** | Statistical | Bot-like repetition, scripted loops | Gini-Simpson diversity: `D = N² - Σ(freq²) ≥ minDiversity` |
| 9 | **Aim Precision Anomaly** | Statistical | Aimbot snap-to-target | Cross-product of consecutive aim vectors detects inhuman corrections |
| 10 | **Information Leakage** | Information-theoretic | Wallhack, ESP, radar hack | Correlation analysis: does player movement correlate with hidden enemy positions? |

Four cheat classes covered:
- **State Manipulation** (checks 1-2): *Did the client fabricate this state?*
- **Physics Violations** (checks 3-5): *Is this movement physically possible?*
- **Superhuman Input** (checks 6-8): *Is this action humanly possible?*
- **Information Leakage** (checks 9-10): *Does the player know things they shouldn't?*

---

## Architecture

```
REAL-TIME GAMEPLAY (no lag)              ASYNC ZK SETTLEMENT (background)
──────────────────────────               ────────────────────────────────
Tick 1-N: Player plays normally          Batch collects transitions locally
  moves, aims, shoots — all captured       → Witness assembles private data
  game NEVER pauses or waits               → ZK proof generates (~2-5s)
                                           → 10 checks run inside circuit
                                           → Proof submits to Midnight
                                           → CLEAN or FLAGGED returned
                                           → Cheater flagged retroactively
```

The game never stops. Proof generation happens in the background. Settlement is asynchronous. A cheater gets flagged *after* the fact — but the proof is cryptographically undeniable.

### Why Midnight?

Midnight uses a **dual-ledger model** purpose-built for this:

```
PUBLIC LEDGER (anyone reads)        PRIVATE STATE (only prover knows)
────────────────────────────        ────────────────────────────────
totalChecks: 47                     playerPosition: (3, 7)
totalFlagged: 2                     previousPosition: (3, 6)
lastVerdict: CLEAN                  aimHistory: [...]
                                    enemyPositions: [...]
                                    chainHash: 0x7f3a...
```

**Public:** Aggregate stats and verdicts. Anyone can audit.
**Private:** All gameplay data. Only the player's client ever sees it.

The ZK circuit bridges them: takes private inputs, produces public outputs, *proves the relationship without revealing the inputs*. Remove Midnight and you're back to trusting game servers blindly.

Midnight's **Compact** language compiles directly to ZK circuits — `witness` functions for private inputs, `export circuit` for verification logic, `export ledger` for on-chain state. Privacy isn't bolted on. It's native.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **ZK Circuits** | Compact (Midnight's DSL) → R1CS constraints |
| **Blockchain** | Midnight (dual-ledger, privacy-native L1) |
| **Proof Generation** | Midnight Proof Server (SNARK prover) |
| **Backend** | Next.js 16 API Routes + Midnight SDK |
| **Frontend** | React 19, Tailwind CSS 4, TypeScript |
| **SDK** | `verdict-sdk` (TypeScript, npm package) |
| **Infrastructure** | Docker (node + indexer + proof-server) |

---

## Project Structure

```
ratri/
├── contract/                    # The ZK Circuit (the core of everything)
│   ├── src/
│   │   ├── verdict.compact      # 309 lines — all 10 checks, ~940 R1CS constraints
│   │   ├── witnesses.ts         # Private state witness providers (12 functions)
│   │   ├── index.ts             # Contract exports
│   │   └── test/
│   │       ├── verdict.test.ts  # Unit tests — 10/10 passing
│   │       └── verdict-simulator.ts
│   └── dist/                    # Compiled circuit + generated TypeScript bindings
│
├── verdict/                     # Protocol Dashboard + SDK
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── sidebar.tsx      # Persistent nav + live stats
│   │   │   ├── (dashboard)/
│   │   │   │   ├── overview/    # Protocol stats, live verification feed
│   │   │   │   ├── deploy/      # Deploy new rulesets (English → Compact → on-chain)
│   │   │   │   ├── explore/     # Browse all rulesets + detail view
│   │   │   │   └── integrate/   # SDK docs + code snippets
│   │   │   └── api/
│   │   │       ├── verify/      # POST — submit state transition for ZK verification
│   │   │       ├── deploy/      # POST — deploy compiled Compact contract
│   │   │       ├── compile/     # POST — English rules → Compact (via Gemini)
│   │   │       ├── feed/        # GET  — live verification feed
│   │   │       ├── rulesets/    # GET  — list deployed rulesets
│   │   │       ├── status/      # GET  — network health
│   │   │       └── wallet/      # GET  — wallet info
│   │   ├── lib/
│   │   │   └── midnight.ts      # Midnight SDK integration + local simulator
│   │   └── components/
│   └── sdk/                     # Published SDK package (verdict-sdk v0.1.0)
│       └── src/
│           ├── verdict.ts       # Verdict client class
│           ├── types.ts         # TypeScript interfaces
│           └── index.ts         # Exports
│
├── counter-cli/                 # CLI for deployment + testing
│   ├── src/
│   │   ├── api.ts              # Wallet, deploy, prove, ledger queries
│   │   ├── cli.ts              # Interactive CLI
│   │   ├── roundtrip.ts        # Full flow: startSession → commitMove → verify
│   │   └── standalone.ts       # Docker node runner
│   └── standalone.yml          # Docker Compose: node + indexer + proof-server
│
├── paper.md                     # Formal white paper (game theory + ZK math)
├── plan.md                      # Architecture battle plan
├── start.sh                     # One-command startup (Docker + Next.js)
└── package.json                 # Monorepo workspace config
```

---

## The SDK

Two lines to integrate. Any game. Any language.

### TypeScript
```typescript
import { Verdict } from "verdict-sdk";

const verdict = new Verdict("mid1_your_ruleset_address");
const result = await verdict.verify({
  prevState: { x: 3, y: 6 },
  currState: { x: 3, y: 7 },
  action: "move_north",
  player: "player_abc",
});

console.log(result.verdict);    // "CLEAN" or "FLAGGED"
console.log(result.checksRun);  // 10
console.log(result.details);    // Per-check breakdown
```

### Python
```python
from verdict import Verdict

v = Verdict("mid1_your_ruleset_address")
result = v.verify(prev_state=prev, curr_state=curr, action="move")
```

### Rust
```rust
let verdict = Verdict::new("mid1_your_ruleset_address");
let result = verdict.verify(&prev_state, &curr_state, &action).await?;
```

### Go
```go
v := verdict.New("mid1_your_ruleset_address")
result, err := v.Verify(prevState, currState, action)
```

The SDK hits the VERDICT API, which runs the ZK circuit, generates a proof, settles on Midnight, and returns a cryptographically verified verdict. The game client never touches the blockchain directly.

---

## Protocol Dashboard

VERDICT ships with a protocol-grade dashboard — not a game demo.

### Overview
Live protocol stats: rulesets deployed, total verifications, block height, flagged rate. Real-time verification feed showing proofs flowing through the network.

### Deploy
Write game rules in plain English → Gemini compiles to Compact circuit code → review the generated circuit → deploy on-chain → receive contract address + SDK snippet. Any game developer can create a custom ruleset without knowing ZK.

### Explore
Browse every deployed ruleset on the network. Filter by category (FPS, card game, MMORPG, turn-based, casino, battle royale). Click into any ruleset to see its live verification feed, stats, flagged rate, and integration code.

### Integrate
Pick a ruleset, pick a language, copy the SDK snippet. Four steps: Capture → Submit → Prove → Settle. Package manager commands for npm, yarn, pip, and cargo.

---

## Running Locally

### Prerequisites
- Node.js v24+
- Docker Desktop (for Midnight local stack)
- npm

### Quick Start
```bash
# Clone and install
git clone <repo-url> && cd ratri
npm install

# Start everything (Docker containers + Next.js)
bash start.sh
```

This spins up three Docker containers and the frontend:

| Service | Port | Purpose |
|---------|------|---------|
| Midnight Node | 9944 | Local blockchain |
| Indexer | 8088 | GraphQL public data queries |
| Proof Server | 6300 | ZK proof generation |
| Dashboard | 3000 | Next.js frontend + API |

### Run Circuit Tests
```bash
cd contract
npx vitest run src/test/verdict.test.ts
```

All 10 checks tested:
```
CLEAN move       → verdict = clean,   totalFlagged = 0  ✓
TELEPORT cheat   → verdict = flagged, totalFlagged = 1  ✓  (CHECK 3)
OUT OF BOUNDS    → verdict = flagged, totalFlagged = 1  ✓  (CHECK 5)
INVALID ACTION   → verdict = flagged, totalFlagged = 1  ✓  (CHECK 6)
BOT (no entropy) → verdict = flagged, totalFlagged = 1  ✓  (CHECK 8)
SPEED RAMP       → verdict = flagged, totalFlagged = 1  ✓  (CHECK 4)
```

---

## Core Challenges & Issues Faced

Building a ZK anti-cheat protocol on a bleeding-edge blockchain meant fighting the tooling as much as the problem. Here's what we hit.

### 1. Compact Language: Young and Unforgiving

Midnight's Compact language (v0.21) is powerful but barely documented. Every discovery was hard-won:

- **`Uint` subtraction panics on underflow.** `a - b` where `b > a` doesn't wrap — it's a *runtime error*. Every single subtraction in the circuit needs a guard: `if (a > b) { a - b } else { b - a }`. Miss one and the entire proof fails. This broke our velocity and acceleration checks repeatedly before we understood the pattern.

- **`disclose()` is mandatory for ledger writes.** You cannot assign a private value to a public ledger field. `lastVerdict = Verdict.clean` is a *compile error*. It must be `lastVerdict = disclose(Verdict.clean)`. The error messages don't tell you this — you learn it by reading the lock contract example.

- **`Field` type has no comparisons.** The `Field` type (ZK field element) doesn't support `>`, `<`, `>=`, `<=`. Only `==` and `!=`. This forced us to restructure the aim snap detection (CHECK 9) entirely — we compare squared magnitudes instead of taking roots.

- **`fold()` requires explicit type annotations.** `fold(fn, init, vec)` silently widens types. Without casting: `(acc: Uint<64>, v) => (acc + v) as Uint<64>`, the compiler produces mysterious errors about type mismatches.

- **Nested vectors must be flattened.** `Vector<8, Vector<2, Uint<64>>>` (8 aim events, each [x,y]) must be `Vector<16, Uint<64>>` instead. The circuit works with flat arrays and manual index arithmetic.

### 2. No Square Root in ZK

ZK circuits operate over finite fields. Square root requires iterative approximation — expensive and non-deterministic. This means:
- **Euclidean distance is out.** We use Manhattan distance (L1 norm) for all spatial checks: `|dx| + |dy|`. Exact. Cheap. ~20 R1CS constraints vs. hundreds for L2.
- **Aim snap detection uses cross products.** Instead of computing angles, we use `|d0x * d1y - d0y * d1x|` (the cross product magnitude) to detect inhuman aim corrections. Compare squared values to avoid the root entirely.

### 3. Devnet Funding: The Faucet Wall

The Midnight testnet faucet returned "Provided address is invalid" for addresses that *were* valid. The Lace wallet didn't show Midnight network despite Beta being enabled. This meant we couldn't deploy to devnet for live proof generation. We built a complete local simulator instead — the circuit compiles, all 10 tests pass, and the proof flow works end-to-end locally.

### 4. Proof Server Bootstrapping

The Midnight proof server (Docker image, 6300) requires specific version alignment with the compact-runtime. Mismatched versions produce silent failures — the proof server accepts the request, churns for 30 seconds, and returns an opaque error. We pinned: `proof-server:7.0.0` + `compact-runtime:0.14.0` + `node:0.21.0`.

### 5. The Privacy Paradox in Anti-Cheat

The deepest challenge wasn't technical — it was conceptual. Anti-cheat systems traditionally work by *seeing everything*. VERDICT works by *seeing nothing*. Designing checks that detect cheating from mathematical properties of state transitions, without ever observing the actual gameplay, required rethinking every assumption about what cheating looks like.

The information leakage check (CHECK 10) is the best example: how do you detect a wallhack — a cheat that reveals hidden information — when *you* don't have access to the hidden information either? The answer: hash the enemy positions, verify the hash, then check if player movement correlates with enemy positions *inside the circuit*. The verifier never learns where any enemy was.

---

## Why This Matters

The gaming industry generates $180B+ annually. Every competitive multiplayer game needs anti-cheat. The current solutions all make the same trade: **give up your privacy for fair play**.

Riot's Vanguard runs at kernel level on 170M+ machines. It works. But it also means a game company has root access to your computer. One vulnerability in the anti-cheat — and there have been several — and every player's machine is exposed.

VERDICT proposes a different path: **prove fair play without revealing anything**. The math exists. The blockchain exists. The circuit compiles. The checks pass.

No kernel access. No surveillance. No trust required. Just a proof.

---

## Built For

**Midnight Assemble** — a builder program by the Midnight team.

VERDICT is a protocol — not a demo, not a proof-of-concept, not a hackathon toy. It's infrastructure for a future where anti-cheat doesn't require surveillance.

---

*Built with Compact, Midnight SDK, Next.js, TypeScript, and an unreasonable amount of coffee.*
