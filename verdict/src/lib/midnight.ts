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
import fs from "node:fs";
import path from "node:path";

// ─── Init ───────────────────────────────────────────────────────────────────

setNetworkId("undeployed");

// ─── Persistence ────────────────────────────────────────────────────────────

const STORE_PATH = path.resolve(process.cwd(), ".verdict-store.json");

interface PersistedEntry {
  ruleset: DeployedRuleset;
  totalChecks: number;
  totalFlagged: number;
  lastVerdict: number;
}

function loadStore(): PersistedEntry[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[simulator] Failed to load store:", err);
  }
  return [];
}

function saveStore() {
  const entries: PersistedEntry[] = Array.from(deployedRulesets.values()).map((e) => ({
    ruleset: e.ruleset,
    totalChecks: e.totalChecks,
    totalFlagged: e.totalFlagged,
    lastVerdict: e.lastVerdict,
  }));
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.error("[simulator] Failed to save store:", err);
  }
}

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

  saveStore();
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

// ─── Seed rulesets (auto-populate on startup) ───────────────────────────────

const SEED_RULESETS: Array<{
  name: string;
  category: string;
  description: string;
  compact: string;
  totalChecks: number;
  totalFlagged: number;
  lastVerdict: number;
  deployedAt: string;
}> = [
  {
    name: "Valorant Anti-Cheat Module",
    category: "fps",
    description:
      "Full 10-check integrity circuit for tactical FPS. Covers aimbot snap detection, wallhack correlation analysis, speed hacks, teleport exploits, and scripted bot loops. Tuned for 128-tick servers.",
    compact: `pragma language_version >= 0.20;

import CompactStandardLibrary;

enum Verdict { clean, flagged }

// === LEDGER STATE ===
export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;
export ledger commitment: Bytes<32>;
export ledger lastChainHash: Bytes<32>;
export ledger sessionActive: Boolean;

// === WITNESSES (private inputs) ===
witness getPrevPrevPos(): Vector<2, Uint<64>>;
witness getPrevPos(): Vector<2, Uint<64>>;
witness getCurrPos(): Vector<2, Uint<64>>;
witness getAction(): Uint<64>;
witness getIsFirstMove(): Uint<64>;
witness getPrevHash(): Bytes<32>;
witness getNonce(): Bytes<32>;
witness getAimHistory(): Vector<16, Uint<64>>;
witness getActionHistory(): Vector<8, Uint<64>>;
witness getTickHistory(): Vector<8, Uint<64>>;
witness getCurrentTick(): Uint<64>;
witness getEnemyPositions(): Vector<16, Uint<64>>;

// CHECK 1: Hash-chain integrity
// CHECK 2: Commit-reveal verification
// CHECK 3: Velocity bounds (speed hack)
// CHECK 4: Acceleration bounds (speed ramp)
// CHECK 5: Spatial bounds (noclip/OOB)
// CHECK 6: Action validity
// CHECK 7: Action frequency (autoclicker)
// CHECK 8: Behavioral entropy (bot detection)
// CHECK 9: Aim precision anomaly (aimbot)
// CHECK 10: Information leakage (wallhack/ESP)

export circuit verifyTransition(
  maxVelocity: Uint<64>, maxAcceleration: Uint<64>,
  boundX: Uint<64>, boundY: Uint<64>,
  validActionCount: Uint<64>, maxActionsPerWindow: Uint<64>,
  windowSize: Uint<64>, minDiversity: Uint<64>,
  snapThreshold: Uint<64>, maxSnaps: Uint<64>,
  maxCorrelation: Uint<64>, enemyPosHashPublic: Bytes<32>
): Verdict {
  // ... 10 checks execute in ZK ...
  // Returns: Verdict.clean or Verdict.flagged
}`,
    totalChecks: 14_832,
    totalFlagged: 247,
    lastVerdict: 0,
    deployedAt: "2026-03-15T09:12:00.000Z",
  },
  {
    name: "Texas Hold'em Fairness",
    category: "card-game",
    description:
      "Verifies poker hand integrity without revealing cards. Proves deck shuffle commitment, validates bet sequences against hand state, detects collusion patterns between seat positions.",
    compact: `pragma language_version >= 0.20;

import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;
export ledger deckCommitment: Bytes<32>;

witness getHandCards(): Vector<4, Uint<64>>;
witness getCommunityCards(): Vector<10, Uint<64>>;
witness getBetHistory(): Vector<8, Uint<64>>;
witness getShuffleNonce(): Bytes<32>;
witness getSeatPosition(): Uint<64>;

// CHECK 1: Deck commitment integrity (shuffle was pre-committed)
// CHECK 2: Card uniqueness (no duplicate cards in play)
// CHECK 3: Bet sequence validity (raises follow rules)
// CHECK 4: Hand-bet correlation (detect impossible bluffs)
// CHECK 5: Timing analysis (detect bot-speed decisions)
// CHECK 6: Collusion pattern detection (cross-seat correlation)

export circuit verifyHand(
  minBet: Uint<64>, maxRaise: Uint<64>,
  deckHashPublic: Bytes<32>, tableSize: Uint<64>
): Verdict {
  // ... checks execute in ZK ...
}`,
    totalChecks: 52_410,
    totalFlagged: 891,
    lastVerdict: 0,
    deployedAt: "2026-03-12T14:30:00.000Z",
  },
  {
    name: "MMO Economy Validator",
    category: "mmorpg",
    description:
      "Prevents item duplication, gold exploits, and trade fraud in persistent game worlds. Validates inventory state transitions, crafting recipes, and marketplace listings against committed world state.",
    compact: `pragma language_version >= 0.20;

import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;
export ledger inventoryRoot: Bytes<32>;

witness getItemsBefore(): Vector<16, Uint<64>>;
witness getItemsAfter(): Vector<16, Uint<64>>;
witness getGoldBefore(): Uint<64>;
witness getGoldAfter(): Uint<64>;
witness getTradePartner(): Uint<64>;
witness getCraftingRecipe(): Vector<8, Uint<64>>;

// CHECK 1: Conservation of value (items in = items out)
// CHECK 2: Inventory hash-chain (no item duplication)
// CHECK 3: Gold balance integrity (no generation exploits)
// CHECK 4: Crafting recipe validity (inputs match recipe DB)
// CHECK 5: Trade fairness (both sides committed before reveal)
// CHECK 6: Rate limiting (max trades per window)
// CHECK 7: Item rarity bounds (legendary drop rate enforcement)

export circuit verifyTransaction(
  maxTradesPerWindow: Uint<64>, windowSize: Uint<64>,
  worldStateHash: Bytes<32>
): Verdict {
  // ... checks execute in ZK ...
}`,
    totalChecks: 203_847,
    totalFlagged: 1_203,
    lastVerdict: 0,
    deployedAt: "2026-03-10T22:05:00.000Z",
  },
  {
    name: "Chess Move Integrity",
    category: "turn-based",
    description:
      "Proves legal move sequences without revealing strategy. Validates piece movement rules, check/checkmate detection, en passant timing, and castling eligibility against committed board state.",
    compact: `pragma language_version >= 0.20;

import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;
export ledger boardCommitment: Bytes<32>;

witness getBoardState(): Vector<64, Uint<64>>;
witness getMove(): Vector<4, Uint<64>>;
witness getMoveNumber(): Uint<64>;
witness getCastlingRights(): Vector<4, Uint<64>>;
witness getEnPassantSquare(): Uint<64>;

// CHECK 1: Board state hash-chain (position integrity)
// CHECK 2: Piece movement legality (per piece type rules)
// CHECK 3: King safety (not moving into check)
// CHECK 4: Turn order enforcement (alternating colors)
// CHECK 5: Castling eligibility (king/rook unmoved)
// CHECK 6: En passant timing (only on immediate response)
// CHECK 7: Time control compliance (move within clock)

export circuit verifyMove(
  boardHashPublic: Bytes<32>,
  timeLimit: Uint<64>
): Verdict {
  // ... checks execute in ZK ...
}`,
    totalChecks: 8_291,
    totalFlagged: 12,
    lastVerdict: 0,
    deployedAt: "2026-03-18T16:45:00.000Z",
  },
  {
    name: "Battle Royale Zone Enforcer",
    category: "fps",
    description:
      "Enforces zone boundaries, loot spawn fairness, and elimination validity in battle royale games. Prevents zone-phasing, loot table manipulation, and damage calculation exploits.",
    compact: `pragma language_version >= 0.20;

import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;
export ledger zoneCommitment: Bytes<32>;

witness getPlayerPos(): Vector<2, Uint<64>>;
witness getZoneCenter(): Vector<2, Uint<64>>;
witness getZoneRadius(): Uint<64>;
witness getHealthBefore(): Uint<64>;
witness getHealthAfter(): Uint<64>;
witness getDamageEvents(): Vector<8, Uint<64>>;
witness getLootPickups(): Vector<8, Uint<64>>;

// CHECK 1: Zone boundary compliance (player inside ring)
// CHECK 2: Zone damage application (correct tick damage outside)
// CHECK 3: Loot spawn validity (items from committed loot table)
// CHECK 4: Damage calculation integrity (weapon stats match)
// CHECK 5: Health conservation (no regeneration exploits)
// CHECK 6: Movement speed in zone transition
// CHECK 7: Elimination validity (kill confirmed by damage log)

export circuit verifyTick(
  zoneHashPublic: Bytes<32>,
  maxSpeed: Uint<64>, tickDamage: Uint<64>
): Verdict {
  // ... checks execute in ZK ...
}`,
    totalChecks: 31_205,
    totalFlagged: 524,
    lastVerdict: 0,
    deployedAt: "2026-03-14T11:20:00.000Z",
  },
  {
    name: "Slot Machine RNG Prover",
    category: "casino",
    description:
      "Proves slot machine outcomes derive from pre-committed RNG seeds. Players verify the house didn't manipulate results post-bet. Covers multi-line slots, bonus triggers, and progressive jackpots.",
    compact: `pragma language_version >= 0.20;

import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;
export ledger seedCommitment: Bytes<32>;

witness getSeed(): Bytes<32>;
witness getBetAmount(): Uint<64>;
witness getReelResults(): Vector<15, Uint<64>>;
witness getPayoutClaimed(): Uint<64>;
witness getBonusTriggered(): Uint<64>;

// CHECK 1: RNG seed was committed before bet placed
// CHECK 2: Reel results derive deterministically from seed
// CHECK 3: Payout matches paytable for given reel combination
// CHECK 4: Bonus trigger conditions verified against reels
// CHECK 5: Progressive jackpot contribution calculated correctly
// CHECK 6: Bet amount within table limits

export circuit verifySpin(
  seedHashPublic: Bytes<32>,
  minBet: Uint<64>, maxBet: Uint<64>,
  paytableHash: Bytes<32>
): Verdict {
  // ... checks execute in ZK ...
}`,
    totalChecks: 127_003,
    totalFlagged: 0,
    lastVerdict: 0,
    deployedAt: "2026-03-11T08:00:00.000Z",
  },
];

// ─── Startup: load persisted state, seed if empty ───────────────────────────

function initStore() {
  const persisted = loadStore();
  if (persisted.length > 0) {
    for (const entry of persisted) {
      deployedRulesets.set(entry.ruleset.address, {
        ruleset: entry.ruleset,
        contract: null as any,
        circuitContext: null as any,
        totalChecks: entry.totalChecks,
        totalFlagged: entry.totalFlagged,
        lastVerdict: entry.lastVerdict,
      });
    }
    console.log(`[simulator] Loaded ${persisted.length} rulesets from disk`);
    return;
  }

  // First run — seed defaults
  for (const seed of SEED_RULESETS) {
    const address = randomAddress();
    const entry: SimulatorEntry = {
      ruleset: {
        address,
        name: seed.name,
        category: seed.category,
        description: seed.description,
        deployedAt: seed.deployedAt,
        txHash: randomHex(32),
        compact: seed.compact,
      },
      contract: null as any,
      circuitContext: null as any,
      totalChecks: seed.totalChecks,
      totalFlagged: seed.totalFlagged,
      lastVerdict: seed.lastVerdict,
    };
    deployedRulesets.set(address, entry);
    console.log(`[simulator] Seeded "${seed.name}" (${seed.totalChecks} checks)`);
  }
  saveStore();
}

initStore();
