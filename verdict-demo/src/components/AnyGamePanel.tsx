"use client";

const games = [
  {
    type: "FPS / Shooter",
    constraints: [
      "constraint max_speed: movement <= 10",
      "constraint no_aimbot: aim_snaps <= 3",
      "constraint no_wallhack: correlation <= 500",
    ],
  },
  {
    type: "Chess",
    constraints: [
      "constraint legal_move: is_valid(board, move)",
      "constraint no_engine: move_time_variance >= 50",
    ],
  },
  {
    type: "Online Casino",
    constraints: [
      "constraint fair_rng: hash(seed) == commitment",
      "constraint correct_payout: payout == odds * bet",
      "// Casino proves to PLAYERS it's fair",
    ],
  },
  {
    type: "MOBA",
    constraints: [
      "constraint speed: movement <= base + items",
      "constraint cooldown: if Q: cd_q == 0",
      "constraint gold: gold.new <= gold.old + 50",
    ],
  },
];

export default function AnyGamePanel() {
  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 px-3 py-2 border-b border-gray-700/50">
        <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
          Any Game. Write Constraints. Get Anti-Cheat.
        </span>
      </div>
      <div className="divide-y divide-gray-800/50">
        {games.map((g, i) => (
          <div key={i} className="px-3 py-2">
            <div className="text-xs font-semibold text-gray-300 mb-1">{g.type}</div>
            <pre className="text-[10px] text-cyan-400/70 font-mono leading-relaxed">
              {g.constraints.join("\n")}
            </pre>
          </div>
        ))}
      </div>
      <div className="bg-gray-800/30 px-3 py-2 text-[10px] text-gray-400 text-center italic">
        Same engine. Same chain. Same privacy. Write rules → get anti-cheat.
      </div>
    </div>
  );
}
