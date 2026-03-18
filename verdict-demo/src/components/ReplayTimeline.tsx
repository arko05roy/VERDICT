"use client";

interface TimelineMove {
  san: string;
  from: string;
  to: string;
  verdict: "clean" | "flagged";
  checks: { id: number; name: string; passed: boolean }[];
  velocity: number;
  acceleration: number;
}

interface ReplayTimelineProps {
  results: TimelineMove[];
  selectedMove: number | null;
  onSelectMove: (i: number) => void;
}

export default function ReplayTimeline({ results, selectedMove, onSelectMove }: ReplayTimelineProps) {
  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700/50">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Move Timeline</span>
        <span className="text-xs text-gray-500 ml-2">{results.length} moves</span>
      </div>
      <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-800/30">
        {results.map((move, i) => {
          const isSelected = selectedMove === i;
          const failedChecks = move.checks.filter((c) => !c.passed);
          return (
            <button
              key={i}
              onClick={() => onSelectMove(i)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors hover:bg-gray-800/40 ${
                isSelected ? "border-l-2 border-cyan-400 bg-cyan-400/5" : "border-l-2 border-transparent"
              }`}
            >
              <span className="text-gray-500 text-xs font-mono w-6 shrink-0 text-right">{i + 1}</span>
              <div className="relative w-3 h-3 shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${move.verdict === "clean" ? "bg-emerald-400" : "bg-red-400"}`} />
                {i < results.length - 1 && (
                  <div className="absolute top-3 left-[5px] w-px h-4 bg-gray-700" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-200">{move.san}</span>
                  <span className="text-[10px] text-gray-500">{move.from} → {move.to}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      move.verdict === "clean"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {move.verdict === "clean" ? "CLEAN" : "FLAGGED"}
                  </span>
                </div>
                {failedChecks.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {failedChecks.map((c) => (
                      <span key={c.id} className="text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-400">
                        #{c.id} {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-gray-500">v:{move.velocity}</div>
                <div className="text-[10px] text-gray-500">a:{move.acceleration}</div>
              </div>
            </button>
          );
        })}
        {results.length === 0 && (
          <div className="px-3 py-8 text-center text-gray-500 text-sm">No moves recorded</div>
        )}
      </div>
    </div>
  );
}
