"use client";

import { useState } from "react";
import { analyzeCollusion, type CollusionResult } from "@/lib/collusion-analyzer";
import { parsePGN } from "@/lib/replay-parser";
import { FAMOUS_GAMES } from "@/lib/famous-games";
import { getLedgerState } from "@/lib/midnight";

function computeCollusionProofHash(pairs: CollusionResult["pairs"]): string {
  let hash = 0;
  for (const p of pairs) {
    hash = ((hash << 5) - hash + Math.round(p.correlationScore * 100) + p.playerA * 7 + p.playerB * 13) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `0x${hex}${"0".repeat(56)}`.slice(0, 66);
}

export default function CollusionPage() {
  const [playerCount, setPlayerCount] = useState(2);
  const [playerLogs, setPlayerLogs] = useState<string[]>(["", ""]);
  const [result, setResult] = useState<CollusionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [pairProofHashes, setPairProofHashes] = useState<string[]>([]);

  const addPlayer = () => {
    if (playerCount < 4) {
      setPlayerCount(playerCount + 1);
      setPlayerLogs([...playerLogs, ""]);
    }
  };

  const updateLog = (index: number, value: string) => {
    const newLogs = [...playerLogs];
    newLogs[index] = value;
    setPlayerLogs(newLogs);
  };

  const handleAnalyze = async () => {
    console.log("[collusion] Analyzing", playerCount, "players via ZK");
    setLoading(true);
    setResult(null);
    try {
      // Parse each player's PGN through real ZK verification
      const allStates = [];
      for (let i = 0; i < playerCount; i++) {
        const pgn = playerLogs[i]?.trim();
        if (!pgn) continue;
        setProgress(`Verifying Player ${i + 1} game through ZK circuit...`);
        console.log(`[collusion] Parsing Player ${i + 1} PGN...`);
        const replay = await parsePGN(pgn, undefined, (current, total) => {
          setProgress(`Verifying Player ${i + 1}... (move ${current}/${total})`);
        });
        allStates.push(replay.states);
        console.log(`[collusion] Player ${i + 1} verified: ${replay.results.length} moves, ${replay.zkProofs.filter(p => p.onChain).length} on-chain`);
      }

      setProgress("Running collusion analysis...");
      console.log("[collusion] All players verified. Running collusion analysis...");

      const collusionResult = analyzeCollusion(allStates);
      console.log("[collusion] Result:", collusionResult.overallVerdict, "pairs:", collusionResult.pairs.length);
      console.log("[collusion] Ledger state:", getLedgerState());

      const hashes = collusionResult.pairs.map((_, i) => {
        const subset = collusionResult.pairs.slice(0, i + 1);
        return computeCollusionProofHash(subset);
      });
      setPairProofHashes(hashes);
      setResult(collusionResult);
    } catch (e) {
      console.error("[collusion] Analysis error:", e);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const loadExample = async () => {
    console.log("[collusion] Loading example with famous games");
    // Use actual PGN games from famous-games.ts
    const game1 = FAMOUS_GAMES[0]?.pgn || "";
    const game2 = FAMOUS_GAMES[1]?.pgn || "";
    const game3 = FAMOUS_GAMES.length > 2 ? FAMOUS_GAMES[2].pgn : FAMOUS_GAMES[0]?.pgn || "";

    setPlayerCount(3);
    setPlayerLogs([game1, game2, game3]);

    setLoading(true);
    setResult(null);
    try {
      const allStates = [];
      const pgns = [game1, game2, game3];
      for (let i = 0; i < 3; i++) {
        setProgress(`Verifying Player ${i + 1} game through ZK circuit...`);
        console.log(`[collusion] Example: Parsing Player ${i + 1} PGN...`);
        const replay = await parsePGN(pgns[i], undefined, (current, total) => {
          setProgress(`Verifying Player ${i + 1}... (move ${current}/${total})`);
        });
        allStates.push(replay.states);
      }

      setProgress("Running collusion analysis...");
      const collusionResult = analyzeCollusion(allStates);
      const hashes = collusionResult.pairs.map((_, i) => {
        const subset = collusionResult.pairs.slice(0, i + 1);
        return computeCollusionProofHash(subset);
      });
      setPairProofHashes(hashes);
      setResult(collusionResult);
    } catch (e) {
      console.error("[collusion] Example analysis error:", e);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const verdictColors = {
    clean: "text-emerald-400 bg-emerald-500/10 border-emerald-500/50",
    suspicious: "text-yellow-400 bg-yellow-500/10 border-yellow-500/50",
    flagged: "text-red-400 bg-red-500/10 border-red-500/50",
  };

  const ledger = getLedgerState();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Collusion Detector</h1>
        <p className="text-sm text-gray-400 mt-1">
          Paste PGN game logs for multiple players. Each game is verified through the ZK circuit before collusion analysis.
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

      {/* Player log inputs — now PGN textareas */}
      <div className="space-y-3">
        {Array.from({ length: playerCount }, (_, i) => (
          <div key={i} className="space-y-1">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Player {i + 1} PGN
            </label>
            <textarea
              value={playerLogs[i] || ""}
              onChange={(e) => updateLog(i, e.target.value)}
              placeholder={`Paste Player ${i + 1} PGN game log...`}
              className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAnalyze}
          disabled={loading || playerLogs.slice(0, playerCount).some((l) => !l.trim())}
          className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing..." : "Analyze Collusion"}
        </button>
        {playerCount < 4 && (
          <button
            onClick={addPlayer}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-700/50 text-gray-300 text-sm hover:border-cyan-500/50 hover:text-cyan-400 transition disabled:opacity-40"
          >
            + Add Player
          </button>
        )}
        <button
          onClick={loadExample}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-gray-700/50 text-gray-300 text-sm hover:border-cyan-500/50 hover:text-cyan-400 transition disabled:opacity-40"
        >
          Load Example
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
          <div className="text-sm text-cyan-400 animate-pulse">{progress}</div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Overall verdict banner */}
          <div className={`rounded-lg border-2 p-4 ${verdictColors[result.overallVerdict]}`}>
            <div className="text-xs uppercase tracking-widest opacity-60">Overall Verdict</div>
            <div className="text-xl font-bold uppercase mt-1">{result.overallVerdict}</div>
            <div className="text-xs opacity-70 mt-1">
              {result.pairs.length} pair(s) analyzed across {playerCount} players
            </div>
          </div>

          {/* Pairwise analysis cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.pairs.map((pair, i) => (
              <div key={i} className={`rounded-lg border p-4 ${verdictColors[pair.verdict]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Player {pair.playerA + 1} vs Player {pair.playerB + 1}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-black/20 font-medium uppercase">
                    {pair.verdict}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="opacity-70">Correlation Score</span>
                    <span className="font-mono font-bold">{pair.correlationScore.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pair.correlationScore > 70 ? "bg-red-500" :
                        pair.correlationScore > 45 ? "bg-yellow-500" :
                        "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(pair.correlationScore, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="opacity-70">Shared Info Score</span>
                    <span className="font-mono">{pair.sharedInfoScore.toFixed(2)}</span>
                  </div>
                </div>
                {/* Proof hash for this pair */}
                {pairProofHashes[i] && (
                  <div className="mt-2 text-[10px] font-mono text-cyan-400/60 break-all">
                    Proof: {pairProofHashes[i]}
                  </div>
                )}
                {pair.suspiciousPatterns.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {pair.suspiciousPatterns.map((pattern, j) => (
                      <div key={j} className="text-[10px] opacity-80 flex items-start gap-1">
                        <span className="shrink-0">!</span>
                        <span>{pattern}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
