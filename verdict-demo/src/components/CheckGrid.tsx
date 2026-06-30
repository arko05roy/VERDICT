"use client";

import { type CheckResult } from "@/game/engine";

interface CheckGridProps {
  checks: CheckResult[];
  verdict: "clean" | "flagged" | null;
}

export default function CheckGrid({ checks, verdict }: CheckGridProps) {
  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700/50">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Check Results</span>
      </div>
      <div className="divide-y divide-gray-800/50">
        {checks.length === 0
          ? Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="text-gray-500">
                  {i + 1}. {["Hash Chain", "Commit-Reveal", "Velocity", "Acceleration", "Bounds", "Action Valid", "Frequency", "Entropy", "Aim Analysis", "Info Leakage"][i]}
                </span>
                <span className="text-gray-600">—</span>
              </div>
            ))
          : checks.map((ch) => (
              <div
                key={ch.id}
                className={`flex items-center justify-between px-3 py-1.5 text-xs ${
                  !ch.passed ? "bg-red-500/10" : ""
                }`}
              >
                <span className={ch.passed ? "text-gray-300" : "text-red-400 font-semibold"}>
                  {ch.id}. {ch.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`${ch.passed ? "text-emerald-400" : "text-red-400"}`}>
                    {ch.passed ? "✓ PASS" : "✗ FAIL"}
                  </span>
                  <span className="text-gray-600 w-24 text-right">{ch.category}</span>
                </div>
              </div>
            ))}
      </div>
      {verdict && (
        <div
          className={`px-3 py-2 border-t text-sm font-bold ${
            verdict === "clean"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          VERDICT: {verdict === "clean" ? "CLEAN ✓" : "FLAGGED ✗"} {verdict === "flagged" && `(${checks.filter(c => !c.passed).map(c => `Check ${c.id}`).join(", ")} failed)`}
        </div>
      )}
    </div>
  );
}
