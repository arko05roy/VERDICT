/**
 * Midnight ZK Integration Layer for VERDICT Protocol
 *
 * Calls /api/midnight server-side routes for REAL ZK proof generation via Midnight SDK.
 * No local fallback — all verification goes through the API.
 */

import type { GameState } from "@/game/engine";
import type { GameRules } from "@/game/rules";

// --- Types ---

export interface VerdictPrivateState {
  prevPrevPos: [bigint, bigint];
  prevPos: [bigint, bigint];
  currPos: [bigint, bigint];
  action: bigint;
  isFirstMove: bigint;
  prevHash: Uint8Array;
  nonce: Uint8Array;
  aimHistory: bigint[];
  actionHistory: bigint[];
  tickHistory: bigint[];
  currentTick: bigint;
  enemyPositions: bigint[];
}

export interface LedgerState {
  totalChecks: number;
  totalFlagged: number;
  lastVerdict: "clean" | "flagged";
  sessionActive: boolean;
  commitment: string;
  lastChainHash: string;
}

export interface MidnightConnection {
  connected: boolean;
  network: "standalone" | "offline";
  contractAddress: string | null;
  walletAddress: string | null;
  balance: bigint;
}

export interface ZKProofResult {
  verdict: "clean" | "flagged";
  proofHash: string;
  txHash: string | null;
  checks: { id: number; name: string; passed: boolean }[];
  onChain: boolean;
}

export interface StakeInfo {
  amount: bigint;
  gamesRequired: number;
  gamesVerified: number;
  earned: bigint;
  slashed: bigint;
  status: "active" | "completed" | "slashed";
}

// --- Client state ---

let connection: MidnightConnection = {
  connected: false,
  network: "offline",
  contractAddress: null,
  walletAddress: null,
  balance: BigInt(0),
};

let ledgerState: LedgerState = {
  totalChecks: 0,
  totalFlagged: 0,
  lastVerdict: "clean",
  sessionActive: false,
  commitment: "0x" + "0".repeat(64),
  lastChainHash: "0x" + "0".repeat(64),
};

let activeStake: StakeInfo | null = null;

// --- API caller ---

async function callAPI(action: string, body: Record<string, unknown> = {}): Promise<any> {
  console.log(`[midnight] API call: ${action}`, body);
  try {
    const resp = await fetch("/api/midnight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await resp.json();
    console.log(`[midnight] API response (${action}):`, data);
    if (!data.ok && data.error) {
      console.error(`[midnight] API error (${action}):`, data.error);
    }
    return data;
  } catch (err) {
    console.error(`[midnight] API call failed (${action}):`, err);
    return { ok: false, error: String(err) };
  }
}

// --- Convert GameState -> serializable witness for API ---

export function gameStateToPrivateWitness(state: GameState): VerdictPrivateState {
  const aimFlat: bigint[] = [];
  for (const pos of state.aimHistory) {
    aimFlat.push(BigInt(pos.x), BigInt(pos.y));
  }
  while (aimFlat.length < 16) aimFlat.push(BigInt(0));

  const enemyFlat: bigint[] = [];
  for (const e of state.enemies) {
    enemyFlat.push(BigInt(e.x), BigInt(e.y));
  }
  while (enemyFlat.length < 16) enemyFlat.push(BigInt(0));

  return {
    prevPrevPos: [BigInt(state.prevPrevPos.x), BigInt(state.prevPrevPos.y)],
    prevPos: [BigInt(state.prevPos.x), BigInt(state.prevPos.y)],
    currPos: [BigInt(state.player.x), BigInt(state.player.y)],
    action: BigInt(state.actionHistory[state.actionHistory.length - 1]),
    isFirstMove: state.isFirstMove ? BigInt(1) : BigInt(0),
    prevHash: new Uint8Array(32),
    nonce: new Uint8Array(32),
    aimHistory: aimFlat.slice(0, 16),
    actionHistory: state.actionHistory.map((a) => BigInt(a)),
    tickHistory: state.tickHistory.map((t) => BigInt(t)),
    currentTick: BigInt(state.tick),
    enemyPositions: enemyFlat.slice(0, 16),
  };
}

function witnessToSerializable(w: VerdictPrivateState) {
  return {
    prevPrevPos: w.prevPrevPos.map(String),
    prevPos: w.prevPos.map(String),
    currPos: w.currPos.map(String),
    action: String(w.action),
    isFirstMove: String(w.isFirstMove),
    prevHash: Array.from(w.prevHash),
    nonce: Array.from(w.nonce),
    aimHistory: w.aimHistory.map(String),
    actionHistory: w.actionHistory.map(String),
    tickHistory: w.tickHistory.map(String),
    currentTick: String(w.currentTick),
    enemyPositions: w.enemyPositions.map(String),
  };
}

export function rulesToCircuitInputs(rules: GameRules) {
  return {
    maxVelocity: BigInt(rules.maxVelocity),
    maxAcceleration: BigInt(rules.maxAcceleration),
    boundX: BigInt(rules.boundX),
    boundY: BigInt(rules.boundY),
    validActionCount: BigInt(rules.validActionCount),
    maxActionsPerWindow: BigInt(rules.maxActionsPerWindow),
    windowSize: BigInt(rules.windowSize),
    minDiversity: BigInt(rules.minDiversity),
    snapThreshold: BigInt(rules.snapThreshold),
    maxSnaps: BigInt(rules.maxSnaps),
    maxCorrelation: BigInt(rules.maxCorrelation),
  };
}

function rulesToAPIParams(rules: GameRules) {
  return {
    maxVelocity: String(rules.maxVelocity),
    maxAcceleration: String(rules.maxAcceleration),
    boundX: String(rules.boundX),
    boundY: String(rules.boundY),
    validActionCount: String(rules.validActionCount),
    maxActionsPerWindow: String(rules.maxActionsPerWindow),
    windowSize: String(rules.windowSize),
    minDiversity: String(rules.minDiversity),
    snapThreshold: String(rules.snapThreshold),
    maxSnaps: String(rules.maxSnaps),
    maxCorrelation: String(rules.maxCorrelation),
    enemyPosHash: Array.from(new Uint8Array(32)),
  };
}

// --- Core verification (API ONLY, no local fallback) ---

export async function verifyTransitionZK(
  state: GameState,
  rules: GameRules,
): Promise<ZKProofResult> {
  console.log("[midnight] ---- verifyTransitionZK ----");
  console.log("[midnight] pos:", `(${state.player.x},${state.player.y})`, "prev:", `(${state.prevPos.x},${state.prevPos.y})`, "tick:", state.tick);

  if (!connection.connected || !connection.contractAddress) {
    throw new Error("Not connected — connect wallet and deploy contract first");
  }

  const witness = gameStateToPrivateWitness(state);
  console.log("[midnight] Sending ZK proof request to /api/midnight...");

  const apiResult = await callAPI("fullVerify", {
    state: witnessToSerializable(witness),
    params: rulesToAPIParams(rules),
  });

  if (apiResult.ok) {
    const verdict = apiResult.verdict === 0 ? "clean" : "flagged";
    const onChain = !!apiResult.onChain;
    console.log(`[midnight] ZK proof result: ${verdict.toUpperCase()}, onChain: ${onChain}`);
    if (apiResult.verifyTxHash) console.log("[midnight] Verify TX:", apiResult.verifyTxHash);
    if (apiResult.commitTxHash) console.log("[midnight] Commit TX:", apiResult.commitTxHash);

    // Update local ledger mirror from chain response only
    if (apiResult.ledger) {
      ledgerState.totalChecks = Number(apiResult.ledger.totalChecks);
      ledgerState.totalFlagged = Number(apiResult.ledger.totalFlagged);
      ledgerState.lastVerdict = apiResult.ledger.lastVerdict === 0 ? "clean" : "flagged";
      ledgerState.sessionActive = apiResult.ledger.sessionActive;
      console.log("[midnight] Ledger synced from chain:", { ...ledgerState });
    }

    return {
      verdict,
      proofHash: apiResult.verifyTxHash || apiResult.proofHash || "0x" + "0".repeat(64),
      txHash: apiResult.verifyTxHash || null,
      checks: apiResult.checks || [],
      onChain,
    };
  }

  // API failed — return error result, do NOT fall back to local
  console.error("[midnight] ZK proof API failed:", apiResult.error);
  return {
    verdict: "flagged",
    proofHash: "0x" + "0".repeat(64),
    txHash: null,
    checks: [],
    onChain: false,
  };
}

export async function verifyReplayZK(states: GameState[], rules: GameRules): Promise<ZKProofResult[]> {
  console.log(`[midnight] verifyReplayZK: ${states.length} states`);
  const results: ZKProofResult[] = [];
  for (let i = 0; i < states.length; i++) {
    results.push(await verifyTransitionZK(states[i], rules));
  }
  return results;
}

// --- Connection (calls real Midnight SDK via API routes) ---

export async function connectWallet(network: "standalone" | "offline" = "standalone"): Promise<MidnightConnection> {
  console.log(`[midnight] ---- connectWallet(${network}) ----`);

  const result = await callAPI("connect", { network });

  if (result.ok) {
    connection = {
      connected: true,
      network,
      contractAddress: null,
      walletAddress: result.walletAddress,
      balance: BigInt(result.balance || "0"),
    };
    console.log("[midnight] Wallet connected:", connection.walletAddress);
    console.log("[midnight] Balance:", connection.balance.toString());
  } else {
    console.error("[midnight] Wallet connection failed:", result.error);
    connection = { connected: false, network: "offline", contractAddress: null, walletAddress: null, balance: BigInt(0) };
  }

  return { ...connection };
}

export async function deployContract(): Promise<string> {
  console.log("[midnight] ---- deployContract ----");

  if (!connection.connected) throw new Error("Wallet not connected");

  const result = await callAPI("deploy");

  if (result.ok) {
    connection.contractAddress = result.contractAddress;
    console.log("[midnight] Contract deployed:", result.contractAddress);

    // Start session
    const sessionResult = await callAPI("startSession");
    if (sessionResult.ok) {
      ledgerState.sessionActive = true;
      console.log("[midnight] Session started, tx:", sessionResult.txHash);
    }

    return result.contractAddress;
  }

  throw new Error(result.error || "Deploy failed");
}

export async function joinContract(address: string): Promise<void> {
  console.log(`[midnight] ---- joinContract(${address}) ----`);
  if (!connection.connected) throw new Error("Wallet not connected");

  const result = await callAPI("join", { contractAddress: address });
  if (result.ok) {
    connection.contractAddress = address;
    console.log("[midnight] Joined contract:", address);
  } else {
    throw new Error(result.error || "Join failed");
  }
}

export function disconnectWallet(): void {
  console.log("[midnight] Disconnecting wallet");
  callAPI("disconnect").catch(() => {});
  connection = { connected: false, network: "offline", contractAddress: null, walletAddress: null, balance: BigInt(0) };
  resetLedgerState();
}

export function getConnection(): MidnightConnection {
  return { ...connection };
}

// --- Session ---

export async function startSession(): Promise<{ success: boolean; txHash: string | null }> {
  console.log("[midnight] ---- startSession ----");

  if (connection.connected && connection.contractAddress) {
    const result = await callAPI("startSession");
    if (result.ok) {
      ledgerState.sessionActive = true;
      return { success: true, txHash: result.txHash };
    }
  }

  ledgerState.sessionActive = true;
  return { success: true, txHash: null };
}

export async function commitMove(state: GameState): Promise<{ commitment: string; txHash: string | null }> {
  const data = new Uint8Array(32);
  const view = new DataView(data.buffer);
  view.setInt32(0, state.prevPos.x);
  view.setInt32(4, state.prevPos.y);
  view.setInt32(8, state.player.x);
  view.setInt32(12, state.player.y);
  view.setInt32(16, state.actionHistory[state.actionHistory.length - 1]);
  const commitHex = "0x" + Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (connection.connected && connection.contractAddress) {
    const result = await callAPI("commitMove", { commitment: Array.from(data) });
    if (result.ok) {
      ledgerState.commitment = commitHex;
      return { commitment: commitHex, txHash: result.txHash };
    }
  }

  ledgerState.commitment = commitHex;
  return { commitment: commitHex, txHash: null };
}

// --- Ledger ---

export function getLedgerState(): LedgerState {
  return { ...ledgerState };
}

export function resetLedgerState(): void {
  ledgerState = {
    totalChecks: 0, totalFlagged: 0, lastVerdict: "clean",
    sessionActive: false,
    commitment: "0x" + "0".repeat(64),
    lastChainHash: "0x" + "0".repeat(64),
  };
}

export async function syncLedgerFromChain(): Promise<LedgerState> {
  if (!connection.contractAddress) return getLedgerState();

  const result = await callAPI("readLedger", { contractAddress: connection.contractAddress });
  if (result.ok && result.ledger) {
    ledgerState.totalChecks = Number(result.ledger.totalChecks);
    ledgerState.totalFlagged = Number(result.ledger.totalFlagged);
    ledgerState.lastVerdict = result.ledger.lastVerdict === 0 ? "clean" : "flagged";
    ledgerState.sessionActive = result.ledger.sessionActive;
    console.log("[midnight] Ledger synced from chain:", { ...ledgerState });
  }
  return getLedgerState();
}

// --- Passport ---

export function getIntegrityFromLedger() {
  const { totalChecks, totalFlagged } = ledgerState;
  const cleanRate = totalChecks > 0 ? ((totalChecks - totalFlagged) / totalChecks) * 100 : 100;
  const streak = totalChecks - totalFlagged;
  return { totalChecks, totalFlagged, cleanRate, streak };
}

// --- Full round-trip ---

export async function fullProofRoundTrip(state: GameState, rules: GameRules): Promise<ZKProofResult> {
  await commitMove(state);
  return verifyTransitionZK(state, rules);
}

// --- Staking ---

export async function stakeTokens(amount: bigint, gamesRequired = 10): Promise<StakeInfo> {
  if (!connection.connected) throw new Error("Wallet not connected");
  activeStake = {
    amount, gamesRequired, gamesVerified: 0,
    earned: BigInt(0), slashed: BigInt(0), status: "active",
  };
  console.log("[midnight] Staked:", String(amount), "for", gamesRequired, "games");
  return { ...activeStake };
}

export async function recordStakedGame(verdict: "clean" | "flagged"): Promise<StakeInfo> {
  if (!activeStake || activeStake.status !== "active") throw new Error("No active stake");
  activeStake.gamesVerified++;

  if (verdict === "flagged") {
    activeStake.slashed += activeStake.amount / BigInt(10);
    activeStake.status = "slashed";
  } else if (activeStake.gamesVerified >= activeStake.gamesRequired) {
    activeStake.earned = activeStake.amount / BigInt(20);
    activeStake.status = "completed";
  }

  return { ...activeStake };
}

export function getActiveStake(): StakeInfo | null {
  return activeStake ? { ...activeStake } : null;
}
