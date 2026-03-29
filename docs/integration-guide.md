# Integration Guide — Adding VERDICT to Your System

## Prerequisites

- Node.js v24+
- Docker Desktop (for the proof server)
- A Midnight wallet with tNIGHT tokens (for on-chain settlement)

## Architecture Overview

```
Your System (any rule-based application)
    │
    ├─ Captures state transitions (state, action, timing)
    │
    ├─ Locally batches transitions
    │
    └─ Sends witness data to VERDICT SDK
            │
            ├─ ZK proof generated locally (Web Worker, 2-5s)
            │
            └─ Proof submitted to Midnight
                    │
                    └─ Returns: CLEAN (0) or FLAGGED (1)
```

Your system runs normally. VERDICT operates in the background — no latency, no pausing, no kernel access.

## Step 1: Define Your Ruleset

A ruleset is the set of Guardians and parameters that define "valid" for your system. You compose this using VCL (Verdict Compile Language), which deterministically compiles to a Compact ZK circuit. The public parameters are passed to the `verifyTransition` circuit.

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `maxVelocity` | `bigint` | Max distance per tick (Manhattan) | `5n` |
| `maxAcceleration` | `bigint` | Max velocity change per tick | `3n` |
| `boundX` | `bigint` | Map width (max X coordinate) | `1000n` |
| `boundY` | `bigint` | Map height (max Y coordinate) | `1000n` |
| `validActionCount` | `bigint` | Number of valid action IDs (0 to N-1) | `8n` |
| `maxActionsPerWindow` | `bigint` | Max non-idle actions in time window | `6n` |
| `windowSize` | `bigint` | Time window in ticks for rate limiting | `10n` |
| `minDiversity` | `bigint` | Min unique actions required (entropy) | `2n` |
| `snapThreshold` | `bigint` | Aim movement below this = "snap" | `2n` |
| `maxSnaps` | `bigint` | Max consecutive aim snaps allowed | `5n` |
| `maxCorrelation` | `bigint` | Cross-product threshold for wallhack detection | `50n` |
| `enemyPosHashPublic` | `Uint8Array` | Hash of enemy positions (32 bytes) | — |

## Step 2: Prepare Witness Data

Each verification call requires private witness data — the actual game state that will be checked inside the ZK circuit but never revealed on-chain.

```typescript
import type { VerdictPrivateState } from "@verdict/contract";

const witnessData: VerdictPrivateState = {
  // Positions: [x, y] for previous-previous, previous, and current tick
  prevPrevPos: [100n, 200n],
  prevPos:     [102n, 201n],
  currPos:     [104n, 203n],

  // Action taken this tick (numeric ID, 0 = idle)
  action: 1n,

  // Is this the first move in the session? (1 = yes, 0 = no)
  isFirstMove: 0n,

  // Hash chain: hash of the previous state transition
  prevHash: new Uint8Array(32), // 32-byte hash

  // Random nonce for commitment scheme
  nonce: new Uint8Array(32),

  // Aim history: 8 aim positions as [x, y] flattened to 16 values
  aimHistory: [100n, 200n, 101n, 201n, 102n, 202n, 103n, 203n,
               104n, 204n, 105n, 205n, 106n, 206n, 107n, 207n],

  // Action history: last 8 actions
  actionHistory: [1n, 2n, 3n, 1n, 0n, 2n, 1n, 3n],

  // Tick history: timestamps of last 8 actions
  tickHistory: [90n, 91n, 92n, 93n, 94n, 95n, 96n, 97n],

  // Current game tick
  currentTick: 100n,

  // Enemy positions: 8 enemies as [x, y] flattened to 16 values
  enemyPositions: [500n, 500n, 600n, 300n, 200n, 700n, 800n, 100n,
                   400n, 400n, 300n, 600n, 700n, 200n, 100n, 800n],
};
```

## Step 3: Run the Three Circuits

VERDICT uses three circuits in sequence per session:

### 1. `startSession(genesisHash)`

Initializes a new session on-chain. Sets up the hash chain with a genesis hash. Call once when a player joins a match.

```typescript
await contract.startSession(genesisHash);
// On-chain: sessionActive = true, lastChainHash = genesisHash
```

### 2. `commitMove(commitment)`

Commits to a move before it's revealed. The commitment is a cryptographic hash of the position + action + nonce. Call before each state transition.

```typescript
const commitment = persistentCommit([...currPos, action], nonce);
await contract.commitMove(commitment);
// On-chain: commitment stored
```

### 3. `verifyTransition(...rulesetParams, enemyPosHash)`

The main circuit. Runs all 10 checks against the witness data and ruleset parameters. Returns the verdict.

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
  enemyPosHash  // Uint8Array(32)
);

// verdict = 0 (CLEAN) or 1 (FLAGGED)
```

## Step 4: Read On-Chain State

After verification, the ledger is updated with the results:

```typescript
// Ledger state (public, readable by anyone)
{
  totalChecks: bigint,     // total verifications run
  totalFlagged: bigint,    // total flagged transitions
  lastVerdict: number,     // 0 = CLEAN, 1 = FLAGGED
  commitment: Uint8Array,  // latest committed move hash
  lastChainHash: Uint8Array, // current hash chain head
  sessionActive: boolean   // whether a session is active
}
```

Systems can read this ledger state to decide what to do with flagged actors — restrict access, escalate for review, adjust trust scores, or trigger automated responses.

## Running Locally

### Start the proof server

```bash
docker run -d -p 6300:6300 midnightntwrk/proof-server:7.0.0
```

### Run the test suite

```bash
cd contract
npx vitest run src/test/verdict.test.ts
```

This runs all 10 checks locally using the simulator — no devnet or wallet needed. You'll see output like:

```
CLEAN move       → verdict = 0, totalFlagged = 0  ✅
TELEPORT cheat   → verdict = 1, totalFlagged = 1  ✅ CHECK 3
OUT OF BOUNDS    → verdict = 1, totalFlagged = 1  ✅ CHECK 5
INVALID ACTION   → verdict = 1, totalFlagged = 1  ✅ CHECK 6
BOT (no entropy) → verdict = 1, totalFlagged = 1  ✅ CHECK 8
SPEED RAMP       → verdict = 1, totalFlagged = 1  ✅ CHECK 4
```

## Key Design Decisions

**Why async?** ZK proof generation takes 2-5 seconds. Pausing the game to wait for a proof would be unplayable. VERDICT settles asynchronously — the game runs at full speed, and cheaters are flagged retroactively.

**Why 10 checks in one circuit?** A single circuit call is cheaper than 10 separate ones. Batching all checks means one proof covers everything — one submission, one verification, one on-chain write.

**Why Midnight?** Midnight's Compact language compiles to ZK circuits natively. The dual-ledger model (public + private state) means player data stays private while verdicts are publicly verifiable. No other chain offers this as a first-class primitive.

**Why not kernel-level?** Kernel anti-cheat (Vanguard, EAC) requires OS-level access, only works on specific platforms, is privacy-invasive, and gets bypassed regularly. VERDICT is mathematical — it doesn't care what OS you run or what software you have installed. It verifies the *output*, not the *process*.
