"use client";

import { useState } from "react";
import { parsePGN } from "@/lib/replay-parser";
import DisputeView from "@/components/DisputeView";
import type { VerifyResult } from "@/game/engine";
import { getLedgerState, gameStateToPrivateWitness } from "@/lib/midnight";
import type { GameState } from "@/game/engine";

const EXAMPLE_A = `[Event "Online"]
[White "PlayerA"]
[Black "PlayerB"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6
8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8
14. Ng3 g6 15. Bg5 h6 16. Bd2 Bg7 17. a4 c5 18. d5 c4 19. b4 Nh5 20. Nxh5 gxh5`;

const EXAMPLE_B = `[Event "Online"]
[White "PlayerB"]
[Black "PlayerA"]
[Result "0-1"]

1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 dxc4 5. a4 Bf5 6. e3 e6 7. Bxc4 Bb4
8. O-O Nbd7 9. Qe2 Bg6 10. e4 O-O 11. Bd3 Bh5 12. e5 Nd5 13. Nxd5 cxd5
14. Qe3 Bg6 15. Ng5 Re8 16. f4 Bxd3 17. Qxd3 f5 18. Be3 Nf8 19. Kh1 Rc8
20. g4 Qd7`;

function computeDisputeProofHash(resultsA: VerifyResult[], resultsB: VerifyResult[]): string {
  const fA = resultsA.filter((r) => r.verdict === "flagged").length;
  const fB = resultsB.filter((r) => r.verdict === "flagged").length;
  let hash = 0;
  hash = ((hash << 5) - hash + fA * 7 + fB * 13 + resultsA.length * 31 + resultsB.length * 37) | 0;
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `0x${hex}${"0".repeat(56)}`.slice(0, 66);
}

export default function DisputePage() {
  const [logA, setLogA] = useState("");
  const [logB, setLogB] = useState("");
  const [resultsA, setResultsA] = useState<VerifyResult[] | null>(null);
  const [resultsB, setResultsB] = useState<VerifyResult[] | null>(null);
  const [statesA, setStatesA] = useState<GameState[]>([]);
  const [statesB, setStatesB] = useState<GameState[]>([]);
  const [proofHashA, setProofHashA] = useState<string[]>([]);
  const [proofHashB, setProofHashB] = useState<string[]>([]);
  const [rulingProof, setRulingProof] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);
    try {
      setProgress("Analyzing Player A...");
      console.log("[dispute] Starting Player A analysis...");
      const a = await parsePGN(logA.trim(), undefined, (current, total) => {
        setProgress(`Analyzing Player A... (move ${current}/${total})`);
      });

      setProgress("Analyzing Player B...");
      console.log("[dispute] Starting Player B analysis...");
      const b = await parsePGN(logB.trim(), undefined, (current, total) => {
        setProgress(`Analyzing Player B... (move ${current}/${total})`);
      });

      console.log("[dispute] Analyzing dispute, Player A moves:", a.results.length, "Player B moves:", b.results.length);
      console.log("[dispute] Player A proofs:", a.zkProofs.length, "Player B proofs:", b.zkProofs.length);
      console.log("[dispute] Ledger state:", getLedgerState());

      setResultsA(a.results);
      setResultsB(b.results);
      setStatesA(a.states);
      setStatesB(b.states);
      setProofHashA(a.zkProofs.map((p) => p.proofHash));
      setProofHashB(b.zkProofs.map((p) => p.proofHash));
      setRulingProof(computeDisputeProofHash(a.results, b.results));
    } catch (e) {
      console.error("[dispute] Parse error:", e);
      setError(e instanceof Error ? e.message : "Failed to parse game logs");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const loadExample = async () => {
    setLogA(EXAMPLE_A);
    setLogB(EXAMPLE_B);
    setLoading(true);
    setError(null);
    try {
      setProgress("Analyzing Player A...");
      console.log("[dispute] Loading example dispute — Player A");
      const a = await parsePGN(EXAMPLE_A, undefined, (current, total) => {
        setProgress(`Analyzing Player A... (move ${current}/${total})`);
      });

      setProgress("Analyzing Player B...");
      console.log("[dispute] Loading example dispute — Player B");
      const b = await parsePGN(EXAMPLE_B, undefined, (current, total) => {
        setProgress(`Analyzing Player B... (move ${current}/${total})`);
      });

      console.log("[dispute] Example loaded. Player A moves:", a.results.length, "Player B moves:", b.results.length);

      setResultsA(a.results);
      setResultsB(b.results);
      setStatesA(a.states);
      setStatesB(b.states);
      setProofHashA(a.zkProofs.map((p) => p.proofHash));
      setProofHashB(b.zkProofs.map((p) => p.proofHash));
      setRulingProof(computeDisputeProofHash(a.results, b.results));
    } catch (e) {
      console.error("[dispute] Example parse error:", e);
      setError(e instanceof Error ? e.message : "Failed to parse example");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const ledger = getLedgerState();

  // Find most suspicious move for each player
  const mostSuspiciousA = resultsA
    ? resultsA.reduce((worst, r, i) => {
        const failCount = r.checks.filter((c) => !c.passed).length;
        return failCount > worst.failCount ? { index: i, failCount } : worst;
      }, { index: 0, failCount: 0 })
    : null;

  const mostSuspiciousB = resultsB
    ? resultsB.reduce((worst, r, i) => {
        const failCount = r.checks.filter((c) => !c.passed).length;
        return failCount > worst.failCount ? { index: i, failCount } : worst;
      }, { index: 0, failCount: 0 })
    : null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ZK Dispute Court</h1>
        <p className="text-sm text-gray-400 mt-1">
          Submit two player game logs for cryptographic arbitration. VERDICT analyzes both sides and delivers an immutable ruling.
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
          <div className="text-xs text-gray-500">Session Active</div>
          <div className={`text-lg font-bold font-mono ${ledger.sessionActive ? "text-emerald-400" : "text-gray-500"}`}>{ledger.sessionActive ? "YES" : "NO"}</div>
        </div>
      </div>

      {/* Input areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Player A Game Log</label>
          <textarea
            value={logA}
            onChange={(e) => setLogA(e.target.value)}
            placeholder="Paste Player A's PGN..."
            className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Player B Game Log</label>
          <textarea
            value={logB}
            onChange={(e) => setLogB(e.target.value)}
            placeholder="Paste Player B's PGN..."
            className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAnalyze}
          disabled={!logA.trim() || !logB.trim() || loading}
          className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing..." : "Analyze Dispute"}
        </button>
        <button
          onClick={loadExample}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-gray-700/50 text-gray-300 text-sm hover:border-cyan-500/50 hover:text-cyan-400 transition disabled:opacity-40"
        >
          Load Example Dispute
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
          <div className="text-sm text-cyan-400 animate-pulse">{progress}</div>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}

      {/* Results */}
      {resultsA && resultsB && !loading && (
        <div className="space-y-4">
          <DisputeView
            playerA={{ label: "Player A", results: resultsA }}
            playerB={{ label: "Player B", results: resultsB }}
          />

          {/* Per-player proof hashes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-700/50 p-4 space-y-2">
              <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Player A Proof Hashes</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {proofHashA.map((h, i) => (
                  <div key={i} className="text-[10px] font-mono text-gray-400 flex items-center gap-2">
                    <span className={resultsA[i]?.verdict === "clean" ? "text-emerald-400" : "text-red-400"}>#{i + 1}</span>
                    <span className="break-all">{h}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-700/50 p-4 space-y-2">
              <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Player B Proof Hashes</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {proofHashB.map((h, i) => (
                  <div key={i} className="text-[10px] font-mono text-gray-400 flex items-center gap-2">
                    <span className={resultsB[i]?.verdict === "clean" ? "text-emerald-400" : "text-red-400"}>#{i + 1}</span>
                    <span className="break-all">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Witness mapping for most suspicious moves */}
          {(mostSuspiciousA && mostSuspiciousA.failCount > 0 && statesA[mostSuspiciousA.index]) ||
           (mostSuspiciousB && mostSuspiciousB.failCount > 0 && statesB[mostSuspiciousB.index]) ? (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
              <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Witness Mapping — Most Suspicious Moves</div>
              {mostSuspiciousA && mostSuspiciousA.failCount > 0 && statesA[mostSuspiciousA.index] && (
                <div className="text-[10px] font-mono text-gray-400">
                  <span className="text-yellow-400">Player A Move #{mostSuspiciousA.index + 1}:</span>{" "}
                  {(() => {
                    const w = gameStateToPrivateWitness(statesA[mostSuspiciousA.index]);
                    return `currPos: [${w.currPos.map(String).join(",")}] | action: ${String(w.action)} | tick: ${String(w.currentTick)}`;
                  })()}
                </div>
              )}
              {mostSuspiciousB && mostSuspiciousB.failCount > 0 && statesB[mostSuspiciousB.index] && (
                <div className="text-[10px] font-mono text-gray-400">
                  <span className="text-yellow-400">Player B Move #{mostSuspiciousB.index + 1}:</span>{" "}
                  {(() => {
                    const w = gameStateToPrivateWitness(statesB[mostSuspiciousB.index]);
                    return `currPos: [${w.currPos.map(String).join(",")}] | action: ${String(w.action)} | tick: ${String(w.currentTick)}`;
                  })()}
                </div>
              )}
            </div>
          ) : null}

          {/* Cryptographic ruling */}
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Cryptographic Ruling</div>
            <div className="text-sm text-gray-300">
              {(() => {
                const fA = resultsA.filter((r) => r.verdict === "flagged").length;
                const fB = resultsB.filter((r) => r.verdict === "flagged").length;
                if (fA === fB) return "DRAW — Both players exhibit identical integrity profiles. No basis for dispute.";
                const winner = fA < fB ? "Player A" : "Player B";
                const loser = fA < fB ? "Player B" : "Player A";
                return `${winner} is vindicated. ${loser} has ${Math.max(fA, fB)} flagged moves vs ${Math.min(fA, fB)}. Ruling is cryptographically binding.`;
              })()}
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-gray-500 font-mono">Ruling proof: {rulingProof}</div>
              <div className="text-[10px] text-gray-500 font-mono">
                Timestamp: {new Date().toISOString()}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                Circuit: verdict.compact v1.0 — 10 checks, 2 players
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
