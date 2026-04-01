# Integration Guide — Adding VERDICT to Your System

## Prerequisites

- Node.js v24+
- A Midnight wallet with tDUST tokens (for on-chain settlement)
- Access to Midnight preprod endpoints

## Architecture

```
Your System (any rule-based application)
    |
    +-- Captures state transitions (prev state -> current state + action)
    |
    +-- VERDICT SDK (TypeScript)
    |     +-- Assembles witness data (private, never leaves your system)
    |     +-- Calls verifier contract on Midnight
    |     +-- ZK proof generated via proof server (~2-5s)
    |     +-- Proof settles on-chain
    |
    +-- Result: CLEAN (0) or FLAGGED (1)
         On-chain: totalChecks++, totalFlagged++ if flagged
```

Your system runs normally. VERDICT operates asynchronously — no latency, no pausing.

## Step 1: Register a Ruleset

Rulesets are lightweight on-chain entries. No contract compilation needed.

### Using VCL (Verdict Compile Language)

```vcl
version 1.0

use Mnemosyne {}
use Styx {}
use Hermes {
  maxVelocity: 5
}
use Terminus {
  boundX: 1000
  boundY: 1000
}
use Moirai {
  minDiversity: 10
}
```

VCL compiles to a configuration object:

```typescript
{
  verifierVersion: "1",       // which verifier contract to use
  enableMask: 0b0010010111n,  // which Guardians are active (bitmask)
  params: {                   // Guardian parameters
    maxVelocity: "5",
    boundX: "1000",
    boundY: "1000",
    minDiversity: "10"
  }
}
```

This config is registered on-chain via the DAO contract's `registerRuleset` circuit. No Compact code is generated per ruleset.

### Ruleset Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `maxVelocity` | `bigint` | Max distance per tick (Manhattan) | `5n` |
| `maxAcceleration` | `bigint` | Max velocity change per tick | `3n` |
| `boundX` / `boundY` | `bigint` | State space boundaries | `1000n` |
| `validActionCount` | `bigint` | Number of valid action IDs (0 to N-1) | `8n` |
| `maxActionsPerWindow` | `bigint` | Max actions in time window | `6n` |
| `windowSize` | `bigint` | Sliding window size in ticks | `10n` |
| `minDiversity` | `bigint` | Min behavioral entropy (Gini-Simpson) | `2n` |
| `snapThreshold` | `bigint` | Curvature threshold for precision detection | `2n` |
| `maxSnaps` | `bigint` | Max straight-line segments allowed | `5n` |
| `maxCorrelation` | `bigint` | Directional correlation threshold | `50n` |
| `enemyPosHashPublic` | `Uint8Array` | Hash of hidden entity positions (32 bytes) | -- |

## Step 2: Prepare Witness Data

Each verification call requires private witness data — the actual state checked inside the ZK circuit but never revealed on-chain.

```typescript
import type { VerdictPrivateState } from "@verdict/contract";

const witnessData: VerdictPrivateState = {
  // Three frames of position: prev-prev, prev, current
  prevPrevPos: [100n, 200n],
  prevPos:     [102n, 201n],
  currPos:     [104n, 203n],

  // Action taken this tick (numeric ID, 0 = idle)
  action: 1n,

  // First move in session? (1 = yes, 0 = no)
  isFirstMove: 0n,

  // Hash chain continuity
  prevHash: new Uint8Array(32),

  // Commitment randomness
  nonce: new Uint8Array(32),

  // Aim history: 8 points as [x, y] flattened to 16 values
  aimHistory: [100n, 200n, 101n, 201n, 102n, 202n, 103n, 203n,
               104n, 204n, 105n, 205n, 106n, 206n, 107n, 207n],

  // Last 8 actions
  actionHistory: [1n, 2n, 3n, 1n, 0n, 2n, 1n, 3n],

  // Timestamps of last 8 actions
  tickHistory: [90n, 91n, 92n, 93n, 94n, 95n, 96n, 97n],

  // Current tick
  currentTick: 100n,

  // Hidden entity positions: 8 entities as [x, y] flattened to 16 values
  enemyPositions: [500n, 500n, 600n, 300n, 200n, 700n, 800n, 100n,
                   400n, 400n, 300n, 600n, 700n, 200n, 100n, 800n],
};
```

## Step 3: Run Verification

Three circuits in sequence per session:

### 1. `startSession(genesisHash)`

Initializes a session. Sets up the hash chain. Call once per actor session.

```typescript
await contract.callTx.startSession(genesisHash);
// On-chain: sessionActive = true, lastChainHash = genesisHash
```

### 2. `commitMove(commitment)`

Commits to a state transition before revealing it. Call before each verification.

```typescript
const commitment = persistentCommit([...currPos, action], nonce);
await contract.callTx.commitMove(commitment);
```

### 3. `verifyTransition(...params, enemyPosHash)`

Runs all enabled Guardians. Returns the verdict.

```typescript
const tx = await contract.callTx.verifyTransition(
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
  enemyPosHash
);
// tx settles on-chain. Ledger updated with verdict.
```

## Step 4: Read On-Chain State

```typescript
const state = await queryContractState(contractAddress);
// {
//   totalChecks:   12n,    // verifications run
//   totalFlagged:  1n,     // flagged transitions
//   lastVerdict:   0,      // 0 = CLEAN, 1 = FLAGGED
//   sessionActive: true
// }
```

## Running Locally

### Run the test suite (no network needed)

```bash
cd contract
npx vitest run src/test/verdict.test.ts
```

Output:
```
CLEAN move       -> verdict = 0, totalFlagged = 0  PASS
TELEPORT cheat   -> verdict = 1, totalFlagged = 1  PASS (CHECK 3)
OUT OF BOUNDS    -> verdict = 1, totalFlagged = 1  PASS (CHECK 5)
INVALID ACTION   -> verdict = 1, totalFlagged = 1  PASS (CHECK 6)
BOT (no entropy) -> verdict = 1, totalFlagged = 1  PASS (CHECK 8)
SPEED RAMP       -> verdict = 1, totalFlagged = 1  PASS (CHECK 4)
```

### Run DAO contract tests

```bash
cd contract
npx vitest run src/test/verdict-dao.test.ts
```

Tests cover: council registration, guardian registry, proposals, voting, verifier version management, ruleset registration, migration, deactivation, and full governance flow.

### Test against preprod

```bash
cd counter-cli
SEED=<your-wallet-seed> npx tsx src/test-anticheat.ts
```

Joins the deployed contract and runs real ZK proofs on Midnight preprod.

## Network Endpoints (Preprod)

| Service | URL |
|---------|-----|
| Node | `https://rpc.preprod.midnight.network` |
| Indexer | `https://indexer.preprod.midnight.network/api/v3/graphql` |
| Indexer WS | `wss://indexer.preprod.midnight.network/api/v3/graphql/ws` |
| Proof Server | `https://lace-proof-pub.preprod.midnight.network` |
| Faucet | `https://faucet.preprod.midnight.network/` |
| Explorer | `https://explorer.preprod.midnight.network` |
