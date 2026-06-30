"use client";

import { type MoveLogEntry } from "@/game/engine";

interface MoveLogProps {
  entries: MoveLogEntry[];
}

const actionNames = ["UP", "DOWN", "LEFT", "RIGHT"];

export default function MoveLog({ entries }: MoveLogProps) {
  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700/50">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Move History</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-500 text-center">Use arrow keys to move</div>
        ) : (
          entries
            .slice()
            .reverse()
            .map((entry, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 text-[11px] font-mono border-b border-gray-800/30 ${
                  entry.verdict === "flagged" ? "bg-red-500/5 text-red-300" : "text-gray-400"
                }`}
              >
                <span className="text-gray-500">#{entries.length - i}</span>{" "}
                ({entry.from.x},{entry.from.y})→({entry.to.x},{entry.to.y}){" "}
                <span className="text-gray-500">{actionNames[entry.action] ?? "?"}</span>{" "}
                v={entry.velocity} a={entry.acceleration}{" "}
                <span className={entry.verdict === "clean" ? "text-emerald-400" : entry.verdict === "flagged" ? "text-red-400" : "text-gray-500"}>
                  {entry.verdict === "clean" ? "✓" : entry.verdict === "flagged" ? "✗" : "…"}
                </span>
                {entry.failedChecks.length > 0 && (
                  <span className="text-red-400/70 ml-1">
                    [CHK {entry.failedChecks.join(",")}]
                  </span>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
