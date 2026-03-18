"use client";

import { useState } from "react";
import { parsePGN } from "@/lib/replay-parser";
import { REGULATION_TEMPLATES, generateComplianceReport, type ComplianceReport } from "@/lib/compliance-report";
import { FAMOUS_GAMES } from "@/lib/famous-games";
import AuditReport from "@/components/AuditReport";
import { getLedgerState, gameStateToPrivateWitness } from "@/lib/midnight";

export default function CompliancePage() {
  const [gameLog, setGameLog] = useState("");
  const [templateId, setTemplateId] = useState(REGULATION_TEMPLATES[0].id);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [zkProofHashes, setZkProofHashes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    setProgress("Initializing ZK verification...");
    try {
      const template = REGULATION_TEMPLATES.find((t) => t.id === templateId)!;
      const replay = await parsePGN(gameLog.trim(), undefined, (current, total) => {
        setProgress(`Verifying move ${current}/${total} through ZK circuit...`);
      });
      console.log("[compliance] Generating report, template:", templateId, "moves:", replay.results.length);
      console.log("[compliance] ZK proofs available:", replay.zkProofs.length);
      console.log("[compliance] Ledger state:", getLedgerState());

      const complianceReport = generateComplianceReport(replay.results, template);
      setReport(complianceReport);
      setZkProofHashes(replay.zkProofs.map((p) => p.proofHash));

      // Log witness for first state
      if (replay.states.length > 0) {
        console.log("[compliance] First state witness:", gameStateToPrivateWitness(replay.states[0]));
      }
    } catch (e) {
      console.error("[compliance] Report generation error:", e);
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const loadSample = () => {
    const game = FAMOUS_GAMES[0];
    console.log("[compliance] Loading sample:", game.name);
    setGameLog(game.pgn);
  };

  const ledger = getLedgerState();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Regulatory Compliance</h1>
        <p className="text-sm text-gray-400 mt-1">
          Generate compliance reports against gaming regulations. Verify your platform meets MGA, UKGC, ESIC, and FIDE standards.
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
      <div className="space-y-3">
        <textarea
          value={gameLog}
          onChange={(e) => setGameLog(e.target.value)}
          placeholder="Paste game log (PGN format)..."
          className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
        />

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500/50"
          >
            {REGULATION_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={!gameLog.trim() || loading}
            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Generate Report"}
          </button>

          <button
            onClick={loadSample}
            className="px-4 py-2 rounded-lg border border-gray-700/50 text-gray-300 text-sm hover:border-cyan-500/50 hover:text-cyan-400 transition"
          >
            Load Sample Data
          </button>

          {report && (
            <button
              onClick={() => alert("PDF export simulated. In production, this generates a signed compliance PDF.")}
              className="px-4 py-2 rounded-lg border border-gray-700/50 text-gray-300 text-sm hover:border-cyan-500/50 hover:text-cyan-400 transition"
            >
              Export PDF
            </button>
          )}
        </div>

        {/* Template description */}
        <div className="text-xs text-gray-500">
          {REGULATION_TEMPLATES.find((t) => t.id === templateId)?.description}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
          <div className="text-sm text-cyan-400 animate-pulse">{progress}</div>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}

      {/* Report */}
      {report && !loading && <AuditReport report={report} />}

      {/* ZK Proof Hashes from replay */}
      {zkProofHashes.length > 0 && !loading && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
          <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">ZK Proof Hashes ({zkProofHashes.length} proofs)</div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {zkProofHashes.map((h, i) => (
              <div key={i} className="text-[10px] font-mono text-gray-400">
                <span className="text-gray-500">#{i + 1}</span> {h}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
