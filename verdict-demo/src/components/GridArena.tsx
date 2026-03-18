"use client";

import { type Position } from "@/game/engine";

interface GridArenaProps {
  gridSize: number;
  player: Position;
  enemies: Position[];
  showEnemies: boolean;
}

export default function GridArena({ gridSize, player, enemies, showEnemies }: GridArenaProps) {
  const cells = [];
  for (let y = 0; y <= gridSize; y++) {
    for (let x = 0; x <= gridSize; x++) {
      const isPlayer = player.x === x && player.y === y;
      const isEnemy = enemies.some((e) => e.x === x && e.y === y);

      let bg = "bg-gray-900/50";
      let content = "";
      let border = "border-gray-800/40";

      if (isPlayer) {
        bg = "bg-cyan-500";
        content = "▲";
        border = "border-cyan-400";
      } else if (isEnemy && showEnemies) {
        bg = "bg-red-500/30";
        content = "●";
        border = "border-red-500/30";
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`${bg} ${border} border aspect-square flex items-center justify-center text-xs font-bold transition-all duration-150 ${
            isPlayer ? "text-black shadow-lg shadow-cyan-500/50 scale-110 z-10" : isEnemy && showEnemies ? "text-red-400" : "text-gray-700"
          }`}
        >
          {content}
        </div>
      );
    }
  }

  return (
    <div className="relative">
      <div
        className="grid gap-0 rounded-lg overflow-hidden border border-gray-700/50"
        style={{ gridTemplateColumns: `repeat(${gridSize + 1}, 1fr)` }}
      >
        {cells}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>0,0</span>
        <span>{gridSize},{gridSize}</span>
      </div>
    </div>
  );
}
