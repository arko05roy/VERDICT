interface CheckPipelineProps {
  activeChecks?: number[];
}

const CHECKS = [
  { id: 1, name: "Hash Chain", category: "Cryptographic" },
  { id: 2, name: "Commit-Reveal", category: "Cryptographic" },
  { id: 3, name: "Velocity", category: "Physics" },
  { id: 4, name: "Acceleration", category: "Physics" },
  { id: 5, name: "Bounds", category: "Spatial" },
  { id: 6, name: "Action Valid", category: "Rule" },
  { id: 7, name: "Frequency", category: "Temporal" },
  { id: 8, name: "Entropy", category: "Statistical" },
  { id: 9, name: "Aim Analysis", category: "Statistical" },
  { id: 10, name: "Info Leakage", category: "Info-Theory" },
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Cryptographic: { bg: "bg-purple-500/15", border: "border-purple-500/40", text: "text-purple-400" },
  Physics: { bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-400" },
  Spatial: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400" },
  Rule: { bg: "bg-yellow-500/15", border: "border-yellow-500/40", text: "text-yellow-400" },
  Temporal: { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-400" },
  Statistical: { bg: "bg-pink-500/15", border: "border-pink-500/40", text: "text-pink-400" },
  "Info-Theory": { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400" },
};

export default function CheckPipeline({ activeChecks }: CheckPipelineProps) {
  const hasFilter = activeChecks && activeChecks.length > 0;

  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700/50">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Verification Pipeline</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Input */}
          <div className="shrink-0 px-3 py-2 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold">
            INPUT
          </div>

          {/* Arrow */}
          <div className="w-6 h-px bg-gray-600 relative shrink-0">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-gray-600" />
          </div>

          {/* Check Grid */}
          <div className="flex-1 grid grid-cols-5 gap-2">
            {CHECKS.map((check) => {
              const colors = CATEGORY_COLORS[check.category];
              const isActive = !hasFilter || activeChecks.includes(check.id);
              return (
                <div
                  key={check.id}
                  className={`rounded border px-2 py-1.5 text-center transition-opacity ${colors.bg} ${colors.border} ${
                    isActive ? "opacity-100" : "opacity-25"
                  }`}
                >
                  <div className={`text-xs font-bold ${colors.text}`}>#{check.id}</div>
                  <div className="text-[9px] text-gray-300 leading-tight mt-0.5">{check.name}</div>
                  <div className={`text-[8px] mt-0.5 ${colors.text}`}>{check.category}</div>
                </div>
              );
            })}
          </div>

          {/* Arrow */}
          <div className="w-6 h-px bg-gray-600 relative shrink-0">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-gray-600" />
          </div>

          {/* Output */}
          <div className="shrink-0 px-3 py-2 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold">
            VERDICT
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-800/50">
          {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
            <div key={cat} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${colors.bg} ${colors.border} border`} />
              <span className={`text-[10px] ${colors.text}`}>{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
