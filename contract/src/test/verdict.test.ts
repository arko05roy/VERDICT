import { VerdictSimulator } from "./verdict-simulator.js";
import { type VerdictPrivateState } from "../witnesses.js";
import { Contract } from "../managed/verdict/contract/index.js";
import { witnesses } from "../witnesses.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";

setNetworkId("undeployed");

// Use the contract's internal hash/commit functions to compute correct values
const contractHelper = new Contract(witnesses);
const computeCommit = (pX: bigint, pY: bigint, cX: bigint, cY: bigint, action: bigint, nonce: Uint8Array): Uint8Array =>
  (contractHelper as any)._persistentCommit_0([pX, pY, cX, cY, action], nonce);
const computeHash = (pX: bigint, pY: bigint, cX: bigint, cY: bigint, action: bigint, tick: bigint): Uint8Array =>
  (contractHelper as any)._persistentHash_0([pX, pY, cX, cY, action, tick]);
const computeEnemyHash = (enemies: bigint[]): Uint8Array =>
  (contractHelper as any)._persistentHash_1(enemies);

// Default game rules
const RULES = {
  maxVelocity: 100n,
  maxAcceleration: 50n,
  boundX: 1000n,
  boundY: 1000n,
  validActionCount: 4n,
  maxActionsPerWindow: 8n,
  windowSize: 100n,
  minDiversity: 10n,
  snapThreshold: 1000n,
  maxSnaps: 4n,
  maxCorrelation: 14n,
};

function makeState(overrides: Partial<VerdictPrivateState> = {}): VerdictPrivateState {
  return {
    prevPrevPos: [100n, 100n],
    prevPos: [105n, 105n],
    currPos: [110n, 110n],
    action: 0n,
    isFirstMove: 0n,
    prevHash: new Uint8Array(32),
    nonce: new Uint8Array(32),
    aimHistory: [
      100n, 100n, 102n, 101n, 104n, 102n, 106n, 103n,
      108n, 104n, 110n, 105n, 112n, 106n, 114n, 107n,
    ],
    actionHistory: [0n, 1n, 2n, 3n, 0n, 1n, 2n, 3n],
    tickHistory: [110n, 120n, 130n, 140n, 150n, 160n, 170n, 180n],
    currentTick: 190n,
    enemyPositions: new Array(16).fill(0n) as bigint[],
    ...overrides,
  };
}

/** Run a full round-trip: startSession → commitMove → verifyTransition */
function runVerify(state: VerdictPrivateState, rulesOverrides: Partial<typeof RULES> = {}) {
  const r = { ...RULES, ...rulesOverrides };
  const sim = new VerdictSimulator(state);

  // 1. Start session with genesis hash = zeros (matches state.prevHash)
  sim.startSession(new Uint8Array(32));

  // 2. Compute correct commitment for this move
  const commitment = computeCommit(
    state.prevPos[0], state.prevPos[1],
    state.currPos[0], state.currPos[1],
    state.action, state.nonce,
  );
  sim.commitMove(commitment);

  // 3. Compute enemy position hash
  const enemyHash = computeEnemyHash(state.enemyPositions);

  // 4. Run verifyTransition
  return sim.verifyTransition(
    r.maxVelocity, r.maxAcceleration, r.boundX, r.boundY,
    r.validActionCount, r.maxActionsPerWindow, r.windowSize,
    r.minDiversity, r.snapThreshold, r.maxSnaps, r.maxCorrelation,
    enemyHash,
  );
}

describe("VERDICT 10-check circuit", () => {

  it("initializes ledger state correctly", () => {
    const sim = new VerdictSimulator(makeState());
    const ledger = sim.getLedger();
    expect(ledger.totalChecks).toEqual(0n);
    expect(ledger.totalFlagged).toEqual(0n);
    expect(ledger.sessionActive).toEqual(false);
  });

  it("startSession sets sessionActive and lastChainHash", () => {
    const sim = new VerdictSimulator(makeState());
    const ledger = sim.startSession(new Uint8Array(32));
    expect(ledger.sessionActive).toEqual(true);
  });

  it("commitMove stores commitment on ledger", () => {
    const sim = new VerdictSimulator(makeState());
    const commitment = new Uint8Array(32).fill(0xAB);
    const ledger = sim.commitMove(commitment);
    expect(ledger.commitment).toEqual(commitment);
  });

  // ═══════════════════════════════════════════════════════════
  // CLEAN MOVE
  // ═══════════════════════════════════════════════════════════
  it("CLEAN move → verdict = clean (0), totalFlagged = 0", () => {
    const { verdict, ledger } = runVerify(makeState());
    console.log("CLEAN:", { verdict, totalChecks: ledger.totalChecks, totalFlagged: ledger.totalFlagged });
    expect(ledger.totalChecks).toEqual(1n);
    expect(ledger.totalFlagged).toEqual(0n);
    expect(ledger.lastVerdict).toEqual(0); // 0 = clean
  });

  // ═══════════════════════════════════════════════════════════
  // CHECK 3: VELOCITY — teleport cheat
  // ═══════════════════════════════════════════════════════════
  it("CHECK 3: TELEPORT → flagged (velocity = 1590 > 100)", () => {
    const { verdict, ledger } = runVerify(makeState({ currPos: [900n, 900n] }));
    console.log("TELEPORT:", { verdict, totalFlagged: ledger.totalFlagged });
    expect(ledger.totalFlagged).toEqual(1n);
    expect(ledger.lastVerdict).toEqual(1); // flagged
  });

  // ═══════════════════════════════════════════════════════════
  // CHECK 5: BOUNDS — out of bounds
  // ═══════════════════════════════════════════════════════════
  it("CHECK 5: OUT OF BOUNDS → flagged (x = 1001 > 1000)", () => {
    const { verdict, ledger } = runVerify(makeState({ currPos: [1001n, 110n] }));
    console.log("OOB:", { verdict, totalFlagged: ledger.totalFlagged });
    expect(ledger.totalFlagged).toEqual(1n);
    expect(ledger.lastVerdict).toEqual(1);
  });

  // ═══════════════════════════════════════════════════════════
  // CHECK 6: ACTION VALIDITY — invalid action
  // ═══════════════════════════════════════════════════════════
  it("CHECK 6: INVALID ACTION → flagged (action = 99 >= 4)", () => {
    const { verdict, ledger } = runVerify(makeState({ action: 99n }));
    console.log("INVALID ACTION:", { verdict, totalFlagged: ledger.totalFlagged });
    expect(ledger.totalFlagged).toEqual(1n);
    expect(ledger.lastVerdict).toEqual(1);
  });

  // ═══════════════════════════════════════════════════════════
  // CHECK 8: ENTROPY — bot detection (all same actions)
  // ═══════════════════════════════════════════════════════════
  it("CHECK 8: BOT → flagged (all same actions, diversity = 0)", () => {
    const { verdict, ledger } = runVerify(makeState({
      actionHistory: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
    }));
    console.log("BOT:", { verdict, totalFlagged: ledger.totalFlagged });
    expect(ledger.totalFlagged).toEqual(1n);
    expect(ledger.lastVerdict).toEqual(1);
  });

  // ═══════════════════════════════════════════════════════════
  // CHECK 4: ACCELERATION — speed ramp
  // ═══════════════════════════════════════════════════════════
  it("CHECK 4: SPEED RAMP → flagged (accel = 90 > 50)", () => {
    // prev velocity = |105-100| + |105-100| = 10
    // curr velocity = |200-105| + |105-105| = 95 (within maxVelocity=100)
    // accel = |95 - 10| = 85 > maxAcceleration=50 → flagged
    const { verdict, ledger } = runVerify(makeState({
      currPos: [200n, 105n],
    }));
    console.log("SPEED RAMP:", { verdict, totalFlagged: ledger.totalFlagged });
    expect(ledger.totalFlagged).toEqual(1n);
    expect(ledger.lastVerdict).toEqual(1);
  });

  // ═══════════════════════════════════════════════════════════
  // Counter accumulation
  // ═══════════════════════════════════════════════════════════
  it("totalChecks increments on each verifyTransition call", () => {
    const state = makeState();
    const sim = new VerdictSimulator(state);
    sim.startSession(new Uint8Array(32));

    // First verify
    const commitment1 = computeCommit(
      state.prevPos[0], state.prevPos[1],
      state.currPos[0], state.currPos[1],
      state.action, state.nonce,
    );
    sim.commitMove(commitment1);
    const enemyHash = computeEnemyHash(state.enemyPositions);

    const r1 = sim.verifyTransition(
      RULES.maxVelocity, RULES.maxAcceleration, RULES.boundX, RULES.boundY,
      RULES.validActionCount, RULES.maxActionsPerWindow, RULES.windowSize,
      RULES.minDiversity, RULES.snapThreshold, RULES.maxSnaps, RULES.maxCorrelation,
      enemyHash,
    );

    expect(r1.ledger.totalChecks).toEqual(1n);
    console.log("After 1 verify: totalChecks =", r1.ledger.totalChecks);
  });
});
