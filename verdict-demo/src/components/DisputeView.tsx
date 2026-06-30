"use client";

import type { VerifyResult } from "@/game/engine";

interface PlayerData {
  label: string;
  results: VerifyResult[];
}

interface DisputeViewProps {
  playerA: PlayerData;
  playerB: PlayerData;
}

function PlayerColumn({ player, isCleaner }: { player: PlayerData; isCleaner: boolean | null }) {
  const total = player.results.length;
  const clean = player.results.filter((r) => r.verdict === "clean").length;
  const flagged = total - clean;
  const flaggedResults = player.results
    .map((r, i) => ({ ...r, moveIndex: i }))
    .filter((r) => r.verdict === "flagged");

  const headerColor = isCleaner === null ? "border-gray-700" : isCleaner ? "border-emerald-500/50" : "border-red-500/50";
  const headerBg = isCleaner === null ? "" : isCleaner ? "bg-emerald-500/5" : "bg-red-500/5";

  return (
    <div className={`flex-1 rounded-lg border ${headerColor} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${headerColor} ${headerBg}`}>
        <div className="text-sm font-bold text-gray-200">{player.label}</div>
        <div className="flex gap-3 mt-1">
          <span className="text-xs text-gray-400">{total} moves</span>
          <span className="text-xs text-emerald-400">{clean} clean</span>
          <span className="text-xs text-red-400">{flagged} flagged</span>
        </div>
      </div>
      <div className="divide-y divide-gray-800/30 max-h-[320px] overflow-y-auto">
        {flaggedResults.length === 0 ? (
          <div className="px-4 py-6 text-center text-emerald-400 text-xs">No flagged moves</div>
        ) : (
          flaggedResults.map((r) => (
            <div key={r.moveIndex} className="px-4 py-2 bg-red-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-300">Move #{r.moveIndex + 1}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">FLAGGED</span>
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {r.checks
                  .filter((c) => !c.passed)
                  .map((c) => (
                    <span key={c.id} className="text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-400">
                      #{c.id} {c.name}
                    </span>
                  ))}
              </div>
              <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                <span>v:{r.velocity}</span>
                <span>a:{r.acceleration}</span>
                <span>div:{r.diversity}</span>
                <span>cor:{r.correlation}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function DisputeView({ playerA, playerB }: DisputeViewProps) {
  const flagsA = playerA.results.filter((r) => r.verdict === "flagged").length;
  const flagsB = playerB.results.filter((r) => r.verdict === "flagged").length;
  const aIsCleaner = flagsA === flagsB ? null : flagsA < flagsB;

  const proofHashA = `0x${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}...`;
  const proofHashB = `0x${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}...`;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-stretch">
        <PlayerColumn player={playerA} isCleaner={aIsCleaner} />
        <div className="flex items-center shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
            VS
          </div>
        </div>
        <PlayerColumn player={playerB} isCleaner={aIsCleaner === null ? null : !aIsCleaner} />
      </div>

      <div className="rounded-lg border border-gray-700/50 px-4 py-3">
        <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Ruling</div>
        {aIsCleaner === null ? (
          <div className="text-sm text-yellow-400">Draw — both players have equal flag counts ({flagsA})</div>
        ) : (
          <div className={`text-sm ${aIsCleaner ? "text-emerald-400" : "text-red-400"}`}>
            <span className="font-bold">{aIsCleaner ? playerA.label : playerB.label}</span> is cleaner.{" "}
            <span className="font-bold">{aIsCleaner ? playerB.label : playerA.label}</span> has{" "}
            {Math.max(flagsA, flagsB)} flags vs {Math.min(flagsA, flagsB)}.
          </div>
        )}
        <div className="flex gap-6 mt-2 text-[10px] text-gray-500 font-mono">
          <span>{playerA.label} proof: {proofHashA}</span>
          <span>{playerB.label} proof: {proofHashB}</span>
        </div>
      </div>
    </div>
  );
}
