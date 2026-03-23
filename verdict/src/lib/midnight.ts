/**
 * Server-side Midnight provider — LOCAL SIMULATOR MODE.
 *
 * Bypasses proof server, node, and indexer entirely. Runs the real ZK circuit
 * logic locally via VerdictSimulator (same circuit, same 10 checks, instant).
 *
 * All API routes import from this file — no changes needed downstream.
 */

import {
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import {
  Verdict,
  type VerdictPrivateState,
  witnesses,
} from "@midnight-ntwrk/verdict-contract";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import crypto from "node:crypto";

// ─── Init ───────────────────────────────────────────────────────────────────

setNetworkId("undeployed");

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeployedRuleset {
  address: string;
  name: string;
  category: string;
  description: string;
  deployedAt: string;
  txHash: string;
  compact: string;
}

interface SimulatorEntry {
  ruleset: DeployedRuleset;
  contract: Verdict.Contract<VerdictPrivateState>;
  circuitContext: ReturnType<typeof createCircuitContext>;
  totalChecks: number;
  totalFlagged: number;
  lastVerdict: number; // 0 = clean, 1 = flagged
}

// ─── In-memory state ────────────────────────────────────────────────────────

const deployedRulesets: Map<string, SimulatorEntry> = new Map();
let blockHeight = 1;

// Increment block height over time to simulate chain progression
setInterval(() => {
  blockHeight++;
}, 12_000); // ~12s block time like Midnight

// ─── Default game rules (matches contract tests) ───────────────────────────

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

const defaultPrivateState: VerdictPrivateState = {
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
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomAddress(): string {
  return randomHex(32);
}

// ─── Contract deployment (local simulator) ──────────────────────────────────

export async function deployVerdictContract(meta: {
  name: string;
  category: string;
  description: string;
  compact: string;
}): Promise<DeployedRuleset> {
  const contract = new Verdict.Contract<VerdictPrivateState>(witnesses);
  const state = { ...defaultPrivateState };

  // Initialize contract (constructor)
  const { currentPrivateState, currentContractState, currentZswapLocalState } =
    contract.initialState(
      createConstructorContext(state, "0".repeat(64))
    );

  let circuitContext = createCircuitContext(
    sampleContractAddress(),
    currentZswapLocalState,
    currentContractState,
    currentPrivateState
  );

  // Run startSession
  const sessionResult = contract.impureCircuits.startSession(
    circuitContext,
    new Uint8Array(32)
  );
  circuitContext = sessionResult.context;

  // Compute commitment using contract internals
  const contractHelper = new Verdict.Contract(witnesses);
  let commitment: Uint8Array;
  try {
    commitment = (contractHelper as any)._persistentCommit_0(
      [state.prevPos[0], state.prevPos[1], state.currPos[0], state.currPos[1], state.action],
      state.nonce
    );
  } catch {
    commitment = new Uint8Array(32);
  }

  // Run commitMove
  const commitResult = contract.impureCircuits.commitMove(circuitContext, commitment);
  circuitContext = commitResult.context;

  // Compute enemy hash
  let enemyHash: Uint8Array;
  try {
    enemyHash = (contractHelper as any)._persistentHash_1(state.enemyPositions);
  } catch {
    enemyHash = new Uint8Array(32);
  }

  // Run verifyTransition (the real 10-check circuit!)
  const verifyResult = contract.impureCircuits.verifyTransition(
    circuitContext,
    RULES.maxVelocity, RULES.maxAcceleration, RULES.boundX, RULES.boundY,
    RULES.validActionCount, RULES.maxActionsPerWindow, RULES.windowSize,
    RULES.minDiversity, RULES.snapThreshold, RULES.maxSnaps, RULES.maxCorrelation,
    enemyHash,
  );
  circuitContext = verifyResult.context;

  const address = randomAddress();
  const txHash = randomHex(32);

  const ruleset: DeployedRuleset = {
    address,
    name: meta.name,
    category: meta.category,
    description: meta.description,
    deployedAt: new Date().toISOString(),
    txHash,
    compact: meta.compact,
  };

  // Read ledger state from circuit context
  const ledgerState = Verdict.ledger(circuitContext.currentQueryContext.state);
  const totalChecks = Number(ledgerState.totalChecks ?? 0n);
  const totalFlagged = Number(ledgerState.totalFlagged ?? 0n);
  const lastVerdict = verifyResult.result ?? 0;

  deployedRulesets.set(address, {
    ruleset,
    contract,
    circuitContext,
    totalChecks,
    totalFlagged,
    lastVerdict: typeof lastVerdict === "number" ? lastVerdict : 0,
  });

  console.log(
    `[simulator] Deployed "${meta.name}" at ${address.slice(0, 16)}... — verdict=${lastVerdict}, checks=${totalChecks}, flagged=${totalFlagged}`
  );

  return ruleset;
}

// ─── Ledger queries ─────────────────────────────────────────────────────────

export async function getContractState(contractAddress: string) {
  const entry = deployedRulesets.get(contractAddress);
  if (!entry) return null;
  return {
    totalChecks: BigInt(entry.totalChecks),
    totalFlagged: BigInt(entry.totalFlagged),
    lastVerdict: BigInt(entry.lastVerdict),
  };
}

export function getDeployedRulesets(): DeployedRuleset[] {
  return Array.from(deployedRulesets.values()).map((e) => e.ruleset);
}

export function getRuleset(address: string): DeployedRuleset | undefined {
  return deployedRulesets.get(address)?.ruleset;
}

// ─── Network status (simulated — all healthy) ──────────────────────────────

export async function getNetworkStatus(): Promise<{
  nodeHealthy: boolean;
  indexerHealthy: boolean;
  proofServerHealthy: boolean;
  blockHeight: number | null;
}> {
  return {
    nodeHealthy: true,
    indexerHealthy: true,
    proofServerHealthy: true,
    blockHeight,
  };
}

// ─── Wallet info (simulated) ────────────────────────────────────────────────

export async function getWalletInfo() {
  return {
    address: "midnight1_sim_" + randomHex(16),
    balance: "1000000000000000",
    isSynced: true,
  };
}

// ─── No initialization needed ───────────────────────────────────────────────

export async function ensureInitialized() {
  // No-op in simulator mode — everything is local
  return { providers: null as any, walletCtx: null as any };
}
