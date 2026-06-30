"use client";

import { useState } from "react";
import { auditRNGSequence, generateSampleRNG, type RNGAuditResult } from "@/lib/rng-auditor";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function AuditPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RNGAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = () => {
    setError(null);
    try {
      const values = input
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));
      if (values.length < 10) {
        setError("Need at least 10 numbers");
        return;
      }
      console.log("[audit] Auditing", values.length, "values");
      const auditResult = auditRNGSequence(values);
      console.log("[audit] Result:", auditResult.verdict, "entropy:", auditResult.entropy);
      setResult(auditResult);
    } catch (e) {
      console.error("[audit] Audit error:", e);
      setError(e instanceof Error ? e.message : "Failed to audit sequence");
    }
  };

  const loadSample = (type: "fair" | "rigged") => {
    console.log("[audit] Loading sample:", type);
    const values = generateSampleRNG(type);
    console.log("[audit] Generated", values.length, "values for", type, "sample");
    setInput(values.join(", "));
    const auditResult = auditRNGSequence(values);
    console.log("[audit] Result:", auditResult.verdict, "entropy:", auditResult.entropy);
    setResult(auditResult);
    setError(null);
  };

  const verdictColors = {
    fair: "text-emerald-400 bg-emerald-500/10 border-emerald-500/50",
    suspicious: "text-yellow-400 bg-yellow-500/10 border-yellow-500/50",
    rigged: "text-red-400 bg-red-500/10 border-red-500/50",
  };

  const severityColors = {
    low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Casino / RNG Auditor</h1>
        <p className="text-sm text-gray-400 mt-1">
          Audit random number generator sequences for fairness. Detects bias, patterns, and statistical anomalies using entropy analysis and chi-squared tests.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste RNG sequence (comma-separated numbers)... e.g. 42, 17, 83, 56, 91, 24, 68, 35, 79, 12"
          className="w-full h-28 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAudit}
            disabled={!input.trim()}
            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Audit
          </button>
          <button
            onClick={() => loadSample("fair")}
            className="px-4 py-2 rounded-lg border border-emerald-500/50 text-emerald-400 text-sm hover:bg-emerald-500/10 transition"
          >
            Generate Fair Sample
          </button>
          <button
            onClick={() => loadSample("rigged")}
            className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-500/10 transition"
          >
            Generate Rigged Sample
          </button>
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Verdict + stats */}
          <div className={`rounded-lg border-2 p-4 ${verdictColors[result.verdict]}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60">RNG Verdict</div>
                <div className="text-2xl font-bold uppercase mt-1">{result.verdict}</div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <div className="text-lg font-bold font-mono">{result.entropy.toFixed(3)}</div>
                  <div className="text-[10px] opacity-60">Entropy (bits)</div>
                </div>
                <div>
                  <div className="text-lg font-bold font-mono">{result.chiSquared.toFixed(2)}</div>
                  <div className="text-[10px] opacity-60">Chi-Squared</div>
                </div>
                <div>
                  <div className="text-lg font-bold font-mono">{result.pValue.toFixed(4)}</div>
                  <div className="text-[10px] opacity-60">p-Value</div>
                </div>
                <div>
                  <div className="text-lg font-bold font-mono">{result.sequenceLength}</div>
                  <div className="text-[10px] opacity-60">Samples</div>
                </div>
              </div>
            </div>
          </div>

          {/* Distribution chart */}
          <div className="rounded-lg border border-gray-700/50 p-4">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Bucket Distribution</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.buckets}>
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <ReferenceLine y={result.buckets[0]?.expected ?? 0} stroke="#22d3ee" strokeDasharray="3 3" label={{ value: "Expected", fill: "#22d3ee", fontSize: 10 }} />
                  <Bar dataKey="observed" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anomalies */}
          {result.anomalies.length > 0 && (
            <div className="rounded-lg border border-gray-700/50 overflow-hidden">
              <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700/50">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Anomalies ({result.anomalies.length})
                </span>
              </div>
              <div className="divide-y divide-gray-800/30">
                {result.anomalies.map((anomaly, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium shrink-0 mt-0.5 ${severityColors[anomaly.severity]}`}>
                      {anomaly.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-300">{anomaly.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.anomalies.length === 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-400">
              No anomalies detected. RNG sequence appears statistically fair.
            </div>
          )}

          {/* On-chain proof registration note */}
          <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3">
            <div className="text-xs text-gray-500">
              Note: RNG auditing is an off-chain statistical analysis. To register the audit result on-chain,
              use the Compliance module to generate a verifiable report with ZK proof attestation on the Midnight network.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
