"use client";

import { useState } from "react";
import { parsePGN, type ReplayResult } from "@/lib/replay-parser";
import { FAMOUS_GAMES } from "@/lib/famous-games";
import { DEFAULT_RULES, type GameRules } from "@/game/rules";
import ReplayTimeline from "@/components/ReplayTimeline";
import CheckGrid from "@/components/CheckGrid";
import { getLedgerState, gameStateToPrivateWitness, getConnection } from "@/lib/midnight";

const CHESS_RULES: GameRules = {
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

export default function ReplayPage() {
  const [input, setInput] = useState("");
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);
  const [selectedMove, setSelectedMove] = useState<number>(0);
  const [rules] = useState<GameRules>(CHESS_RULES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleAnalyze = async () => {
    console.log("[replay] Analyzing PGN, length:", input.length);
    const conn = getConnection();
    if (!conn.connected || !conn.contractAddress) {
      setError("Connect wallet and deploy contract first (use the Passport page)");
      return;
    }
    setError(null);
    setLoading(true);
    setProgress("Initializing ZK verification...");
    try {
      const result = await parsePGN(input.trim(), rules, (current, total) => {
        setProgress(`Verifying move ${current}/${total} through ZK circuit...`);
      });
      console.log("[replay] Parse complete:", result.results.length, "moves,", result.zkProofs.length, "proofs");
      console.log("[replay] Ledger state after analysis:", getLedgerState());
      setReplayResult(result);
      setSelectedMove(0);
    } catch (e) {
      console.error("[replay] Parse error:", e);
      setError(e instanceof Error ? e.message : "Failed to parse input");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const loadFamousGame = async (game: (typeof FAMOUS_GAMES)[number]) => {
    console.log("[replay] Loading famous game:", game.name);
    const conn = getConnection();
    if (!conn.connected || !conn.contractAddress) {
      setInput(game.pgn);
      setError("Connect wallet and deploy contract first (use the Passport page)");
      return;
    }
    setInput(game.pgn);
    setError(null);
    setLoading(true);
    setProgress("Initializing ZK verification...");
    try {
      const result = await parsePGN(game.pgn, rules, (current, total) => {
        setProgress(`Verifying move ${current}/${total} through ZK circuit...`);
      });
      console.log("[replay] Famous game loaded:", result.results.length, "moves");
      setReplayResult(result);
      setSelectedMove(0);
    } catch (e) {
      console.error("[replay] Famous game parse error:", e);
      setError(e instanceof Error ? e.message : "Failed to parse game");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const totalMoves = replayResult?.results.length ?? 0;
  const cleanCount = replayResult?.results.filter((r) => r.verdict === "clean").length ?? 0;
  const flaggedCount = totalMoves - cleanCount;
  const cleanRate = totalMoves > 0 ? ((cleanCount / totalMoves) * 100).toFixed(1) : "0";

  const selectedResult = replayResult?.results[selectedMove] ?? null;
  const selectedProof = replayResult?.zkProofs[selectedMove] ?? null;
  const ledger = getLedgerState();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Game Replay Verifier</h1>
        <p className="text-sm text-gray-400 mt-1">
          Paste a PGN game log to verify every move through VERDICT's 10-check ZK integrity circuit.
        </p>
      </div>

      {/* Ledger State Banner */}
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

      {/* Input section */}
      <div className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste PGN game log here..."
          className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={!input.trim() || loading}
            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Analyze"}
          </button>
          <span className="text-xs text-gray-500">or load a famous game:</span>
          {FAMOUS_GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => loadFamousGame(game)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-gray-700/50 bg-gray-800/50 text-xs text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400 transition disabled:opacity-40"
            >
              {game.name.split("\u2014")[0].trim()}
            </button>
          ))}
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
          <div className="text-sm text-cyan-400 animate-pulse">{progress}</div>
        </div>
      )}

      {/* Summary stats */}
      {replayResult && !loading && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
              <div className="text-2xl font-bold text-gray-200">{totalMoves}</div>
              <div className="text-xs text-gray-500">Total Moves</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
              <div className="text-2xl font-bold text-emerald-400">{cleanCount}</div>
              <div className="text-xs text-gray-500">Clean</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
              <div className="text-2xl font-bold text-red-400">{flaggedCount}</div>
              <div className="text-xs text-gray-500">Flagged</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
              <div className="text-2xl font-bold text-cyan-400">{cleanRate}%</div>
              <div className="text-xs text-gray-500">Clean Rate</div>
            </div>
          </div>

          {/* Timeline + Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReplayTimeline
              results={replayResult.results.map((r, i) => ({
                san: replayResult.moves[i].san,
                from: replayResult.moves[i].from,
                to: replayResult.moves[i].to,
                verdict: r.verdict,
                checks: r.checks,
                velocity: r.velocity,
                acceleration: r.acceleration,
              }))}
              selectedMove={selectedMove}
              onSelectMove={setSelectedMove}
            />
            <div className="space-y-4">
              {selectedResult && (
                <>
                  <div className="rounded-lg border border-gray-700/50 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Move {selectedMove + 1}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-mono font-bold text-white">{replayResult.moves[selectedMove].san}</span>
                      <span className="text-sm text-gray-500">{replayResult.moves[selectedMove].from} {"\u2192"} {replayResult.moves[selectedMove].to}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        selectedResult.verdict === "clean"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}>
                        {selectedResult.verdict.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Velocity: {selectedResult.velocity}</span>
                      <span>Acceleration: {selectedResult.acceleration}</span>
                      <span>Diversity: {selectedResult.diversity}</span>
                      <span>Correlation: {selectedResult.correlation}</span>
                      <span>Snaps: {selectedResult.totalSnaps}</span>
                    </div>
                    {/* Proof hash for this move */}
                    {selectedProof && (
                      <div className="mt-2 text-[10px] font-mono text-cyan-400/70 break-all">
                        Proof: {selectedProof.proofHash}
                        <span className={`ml-2 ${selectedProof.onChain ? "text-emerald-400" : "text-yellow-400"}`}>
                          [{selectedProof.onChain ? "on-chain" : "off-chain"}]
                        </span>
                        {selectedProof.txHash && (
                          <span className="ml-2 text-emerald-400/70">TX: {selectedProof.txHash}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <CheckGrid checks={selectedResult.checks} verdict={selectedResult.verdict} />
                </>
              )}
            </div>
          </div>

          {/* ZK Proof Details Section */}
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">ZK Proof Details</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {replayResult.zkProofs.map((proof, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500 font-mono w-12 shrink-0">#{i + 1}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    proof.verdict === "clean" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                  }`}>{proof.verdict}</span>
                  <span className="font-mono text-gray-400 break-all flex-1">{proof.proofHash}</span>
                  <span className={`text-[10px] shrink-0 ${proof.onChain ? "text-emerald-400" : "text-yellow-500"}`}>
                    {proof.onChain ? "on-chain" : "off-chain"}
                  </span>
                  {proof.txHash && (
                    <span className="text-[10px] text-emerald-400/70 shrink-0">TX</span>
                  )}
                </div>
              ))}
            </div>
            {/* Witness mapping for selected move */}
            {selectedResult && replayResult.states[selectedMove] && (
              <div className="border-t border-cyan-500/20 pt-3 mt-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Witness Mapping (Move {selectedMove + 1})</div>
                <div className="text-[10px] font-mono text-gray-400">
                  {(() => {
                    const w = gameStateToPrivateWitness(replayResult.states[selectedMove]);
                    return `currPos: [${w.currPos.map(String).join(",")}] | prevPos: [${w.prevPos.map(String).join(",")}] | action: ${String(w.action)} | tick: ${String(w.currentTick)}`;
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
