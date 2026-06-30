import { Chess } from "chess.js";
import { chessToVerdictState } from "../game/chess-adapter";
import type { GameState, VerifyResult } from "../game/engine";
import { type GameRules, DEFAULT_RULES } from "../game/rules";
import {
  gameStateToPrivateWitness,
  rulesToCircuitInputs,
  verifyTransitionZK,
  type ZKProofResult,
} from "./midnight";

export interface ReplayResult {
  states: GameState[];
  results: VerifyResult[];
  moves: { san: string; from: string; to: string }[];
  zkProofs: ZKProofResult[];
}

const CHESS_DEFAULTS: GameRules = {
  ...DEFAULT_RULES,
  boundX: 7,
  boundY: 7,
  validActionCount: 6,
  maxVelocity: 8,
  maxAcceleration: 8,
  maxCorrelation: 32,
  snapThreshold: 1000,
  maxSnaps: 6,
  minDiversity: 0,
};

export async function parsePGN(
  pgn: string,
  rules?: GameRules,
  onProgress?: (current: number, total: number) => void,
): Promise<ReplayResult> {
  const r = rules ?? CHESS_DEFAULTS;

  console.log("[replay-parser] Parsing PGN, rules:", r);

  const game = new Chess();
  try {
    game.loadPgn(pgn);
  } catch (err) {
    console.error("[replay-parser] Failed to load PGN:", err);
    throw new Error(`Invalid PGN: ${err instanceof Error ? err.message : String(err)}`);
  }

  const history = game.history({ verbose: true });
  console.log(`[replay-parser] Parsed ${history.length} moves from PGN`);

  const replay = new Chess();
  const states: GameState[] = [];
  const results: VerifyResult[] = [];
  const moves: { san: string; from: string; to: string }[] = [];
  const zkProofs: ZKProofResult[] = [];

  let prevState: GameState | null = null;

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    replay.move(move.san);
    const state = chessToVerdictState(replay, move, prevState);
    states.push(state);

    // Report progress
    if (onProgress) onProgress(i + 1, history.length);

    // Convert to witness
    const witness = gameStateToPrivateWitness(state);
    const circuitInputs = rulesToCircuitInputs(r);

    console.log(`[replay-parser] Move ${i + 1}/${history.length}: ${move.san} (${move.from}->${move.to}) — sending to ZK circuit...`);
    console.log(`[replay-parser] Witness: currPos=[${witness.currPos.map(String)}], prevPos=[${witness.prevPos.map(String)}], tick=${String(witness.currentTick)}`);

    // Call real ZK verification through API
    const zkResult = await verifyTransitionZK(state, r);

    console.log(`[replay-parser] Move ${i + 1} ZK result: ${zkResult.verdict}, onChain: ${zkResult.onChain}, proofHash: ${zkResult.proofHash}`);
    if (zkResult.txHash) console.log(`[replay-parser] Move ${i + 1} txHash: ${zkResult.txHash}`);

    // Build a VerifyResult-compatible object from ZK response
    const verifyResult: VerifyResult = {
      verdict: zkResult.verdict,
      checks: zkResult.checks.map((c) => ({ ...c, category: "zk", value: 0, threshold: 0 })),
      velocity: 0,
      acceleration: 0,
      diversity: 0,
      correlation: 0,
      totalSnaps: 0,
    };

    results.push(verifyResult);
    zkProofs.push(zkResult);
    moves.push({ san: move.san, from: move.from, to: move.to });
    prevState = state;
  }

  const flagged = results.filter((r) => r.verdict === "flagged").length;
  console.log(`[replay-parser] Analysis complete: ${history.length} moves, ${flagged} flagged, ${history.length - flagged} clean`);

  return { states, results, moves, zkProofs };
}

export async function parseJSONReplay(
  json: string,
  rules?: GameRules,
  onProgress?: (current: number, total: number) => void,
): Promise<{ states: GameState[]; results: VerifyResult[]; zkProofs: ZKProofResult[] }> {
  const r = rules ?? DEFAULT_RULES;
  console.log("[replay-parser] Parsing JSON replay");

  const parsed = JSON.parse(json) as GameState[];
  console.log(`[replay-parser] Parsed ${parsed.length} states from JSON`);

  const states: GameState[] = [];
  const results: VerifyResult[] = [];
  const zkProofs: ZKProofResult[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const state = parsed[i];
    states.push(state);

    if (onProgress) onProgress(i + 1, parsed.length);

    const witness = gameStateToPrivateWitness(state);
    console.log(`[replay-parser] JSON state ${i + 1}/${parsed.length}: sending to ZK circuit...`);

    const zkResult = await verifyTransitionZK(state, r);

    console.log(`[replay-parser] JSON state ${i + 1} ZK result: ${zkResult.verdict}, onChain: ${zkResult.onChain}`);

    const verifyResult: VerifyResult = {
      verdict: zkResult.verdict,
      checks: zkResult.checks.map((c) => ({ ...c, category: "zk", value: 0, threshold: 0 })),
      velocity: 0,
      acceleration: 0,
      diversity: 0,
      correlation: 0,
      totalSnaps: 0,
    };

    results.push(verifyResult);
    zkProofs.push(zkResult);
  }

  return { states, results, zkProofs };
}
