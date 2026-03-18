"use client";

import { useState } from "react";
import { parsePGN } from "@/lib/replay-parser";
import { BET_TYPES, verifyGameForSettlement, type SettlementResult } from "@/lib/betting-verifier";
import { FAMOUS_GAMES } from "@/lib/famous-games";
import { getLedgerState, gameStateToPrivateWitness } from "@/lib/midnight";
import type { GameState } from "@/game/engine";

export default function BettingPage() {
  const [gameLog, setGameLog] = useState("");
  const [betAmount, setBetAmount] = useState("50");
  const [betType, setBetType] = useState(BET_TYPES[0].id);
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [zkProofHashes, setZkProofHashes] = useState<string[]>([]);
  const [flaggedStates, setFlaggedStates] = useState<GameState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleVerify = async () => {
    console.log("[betting] Verifying game for settlement, bet:", betAmount, betType);
    setError(null);
    setLoading(true);
    setProgress("Initializing ZK verification...");
    try {
      const replay = await parsePGN(gameLog.trim(), undefined, (current, total) => {
        setProgress(`Verifying move ${current}/${total} through ZK circuit...`);
      });
      console.log("[betting] Parsed:", replay.results.length, "moves,", replay.zkProofs.length, "proofs");
      console.log("[betting] Ledger state:", getLedgerState());

      const settlement = verifyGameForSettlement(replay.results, betType);
      setResult(settlement);
      setZkProofHashes(replay.zkProofs.map((p) => p.proofHash));

      // Collect flagged states for witness display
      const flagged: GameState[] = [];
      replay.results.forEach((r, i) => {
        if (r.verdict === "flagged" && replay.states[i]) {
          flagged.push(replay.states[i]);
        }
      });
      setFlaggedStates(flagged);

      if (flagged.length > 0) {
        console.log("[betting] First flagged move witness:", gameStateToPrivateWitness(flagged[0]));
      }
    } catch (e) {
      console.error("[betting] Verify error:", e);
      setError(e instanceof Error ? e.message : "Failed to verify game");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const loadExample = () => {
    console.log("[betting] Loading example game");
    setGameLog(FAMOUS_GAMES[0].pgn);
  };

  const verdictColors = {
    settleable: "text-emerald-400 bg-emerald-500/10 border-emerald-500/50",
    blocked: "text-red-400 bg-red-500/10 border-red-500/50",
    "review-required": "text-yellow-400 bg-yellow-500/10 border-yellow-500/50",
  };

  const riskColors = {
    low: "bg-emerald-500/15 text-emerald-400",
    medium: "bg-yellow-500/15 text-yellow-400",
    high: "bg-orange-500/15 text-orange-400",
    critical: "bg-red-500/15 text-red-400",
  };

  const ledger = getLedgerState();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Betting Market Layer</h1>
        <p className="text-sm text-gray-400 mt-1">
          Verify game integrity before settling bets. Ensures fair outcomes, detects manipulation, and provides cryptographic settlement proofs.
        </p>
      </div>

      {/* Ledger State */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="text-xs text-gray-500">On-Chain Total Checks</div>
          <div className="text-lg font-bold text-cyan-400 font-mono">{ledger.totalChecks}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="text-xs text-gray-500">On-Chain Flagged</div>
          <div className="text-lg font-bold text-red-400 font-mono">{ledger.totalFlagged}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="text-xs text-gray-500">Last Verdict</div>
          <div className={`text-lg font-bold font-mono ${ledger.lastVerdict === "clean" ? "text-emerald-400" : "text-red-400"}`}>{ledger.lastVerdict.toUpperCase()}</div>
        </div>
      </div>

      {/* Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <textarea
            value={gameLog}
            onChange={(e) => setGameLog(e.target.value)}
            placeholder="Paste game log (PGN format)..."
            className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
          />
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Bet Amount</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-cyan-400 font-mono focus:outline-none focus:border-cyan-500/50"
              />
              <span className="text-xs text-gray-500 shrink-0">tDUST</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Bet Type</label>
            <select
              value={betType}
              onChange={(e) => setBetType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500/50"
            >
              {BET_TYPES.map((bt) => (
                <option key={bt.id} value={bt.id}>
                  {bt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleVerify}
            disabled={!gameLog.trim() || loading}
            className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify & Assess"}
          </button>
          <button
            onClick={loadExample}
            className="w-full py-2 rounded-lg border border-gray-700/50 text-gray-300 text-sm hover:border-cyan-500/50 hover:text-cyan-400 transition"
          >
            Load Example
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
          <div className="text-sm text-cyan-400 animate-pulse">{progress}</div>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Verdict banner */}
          <div className={`rounded-lg border-2 p-4 ${verdictColors[result.verdict]}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60">Settlement Verdict</div>
                <div className="text-2xl font-bold uppercase mt-1">{result.verdict.replace("-", " ")}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold">{result.integrityScore}%</div>
                  <div className="text-[10px] opacity-60">Integrity</div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-lg font-medium ${riskColors[result.riskLevel]}`}>
                  {result.riskLevel.toUpperCase()} RISK
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
              <div className="text-2xl font-bold text-gray-200">{result.totalMoves}</div>
              <div className="text-xs text-gray-500">Total Moves</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
              <div className="text-2xl font-bold text-emerald-400">{result.cleanMoves}</div>
              <div className="text-xs text-gray-500">Clean</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
              <div className="text-2xl font-bold text-red-400">{result.flaggedMoves}</div>
              <div className="text-xs text-gray-500">Flagged</div>
            </div>
          </div>

          {/* Blocking checks */}
          {result.blockingChecks.length > 0 && (
            <div className="rounded-lg border border-red-500/30 overflow-hidden">
              <div className="bg-red-500/10 px-4 py-2 border-b border-red-500/30">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Blocking Checks ({result.blockingChecks.length})
                </span>
              </div>
              <div className="divide-y divide-gray-800/30">
                {result.blockingChecks.map((check, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-red-400">#{check.checkId} {check.checkName}</span>
                      <span className="text-[10px] text-gray-500">{check.failCount} failures</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{check.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="rounded-lg border border-gray-700/50 p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Recommendation</div>
            <div className="text-sm text-gray-300">{result.recommendation}</div>
          </div>

          {/* Settlement Proof + ZK Proof Hashes */}
          <div className="rounded-lg border border-gray-700/50 p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Settlement Proof</div>
            <div className="font-mono text-xs text-cyan-400 break-all">{result.proofHash}</div>

            {zkProofHashes.length > 0 && (
              <>
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mt-3">ZK Proof Hashes ({zkProofHashes.length})</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {zkProofHashes.map((h, i) => (
                    <div key={i} className="text-[10px] font-mono text-gray-400">
                      <span className="text-gray-500">#{i + 1}</span> {h}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Witness mapping for first flagged move */}
          {flaggedStates.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
              <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Witness Mapping — First Flagged Move</div>
              <div className="text-[10px] font-mono text-gray-400">
                {(() => {
                  const w = gameStateToPrivateWitness(flaggedStates[0]);
                  return `currPos: [${w.currPos.map(String).join(",")}] | prevPos: [${w.prevPos.map(String).join(",")}] | action: ${String(w.action)} | tick: ${String(w.currentTick)} | isFirstMove: ${String(w.isFirstMove)}`;
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
