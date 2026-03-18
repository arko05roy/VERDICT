"use client";

import type { ComplianceReport } from "@/lib/compliance-report";

interface AuditReportProps {
  report: ComplianceReport;
}

const statusColors = {
  pass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  fail: "text-red-400 bg-red-500/10 border-red-500/30",
  warning: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
};

const overallColors = {
  "compliant": "text-emerald-400 bg-emerald-500/10 border-emerald-500/50",
  "non-compliant": "text-red-400 bg-red-500/10 border-red-500/50",
  "needs-review": "text-yellow-400 bg-yellow-500/10 border-yellow-500/50",
};

export default function AuditReport({ report }: AuditReportProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-lg border-2 p-4 ${overallColors[report.overallStatus]}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-60">Compliance Status</div>
            <div className="text-xl font-bold uppercase mt-1">{report.overallStatus.replace("-", " ")}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-60">Regulation</div>
            <div className="text-sm font-medium">{report.template.name}</div>
          </div>
        </div>
        <div className="flex gap-6 mt-3 text-xs opacity-70">
          <span>{report.totalMoves} total moves</span>
          <span>{report.flaggedMoves} flagged</span>
          <span>{(report.flagRate * 100).toFixed(2)}% flag rate</span>
          <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Sections */}
      <div className="rounded-lg border border-gray-700/50 overflow-hidden">
        <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700/50">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Check Results</span>
        </div>
        <div className="divide-y divide-gray-800/30">
          {report.sections.map((section, i) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3">
              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium shrink-0 mt-0.5 ${statusColors[section.status]}`}>
                {section.status.toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-gray-200 font-medium">{section.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{section.details}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proof */}
      <div className="rounded-lg border border-gray-700/50 p-4">
        <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Proof Hash</div>
        <div className="font-mono text-xs text-cyan-400 break-all">{report.proofHash}</div>
      </div>
    </div>
  );
}
