"use client";

interface StakingDashboardProps {
  stakedAmount: number;
  gamesVerified: number;
  gamesRequired: number;
  earnedYield: number;
  status: "idle" | "staked" | "verifying" | "complete" | "slashed";
  onVerifyGame: () => void;
  onClaim: () => void;
}

export default function StakingDashboard({
  stakedAmount,
  gamesVerified,
  gamesRequired,
  earnedYield,
  status,
  onVerifyGame,
  onClaim,
}: StakingDashboardProps) {
  const progress = gamesRequired > 0 ? (gamesVerified / gamesRequired) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
          <div className="text-2xl font-bold text-cyan-400">{stakedAmount}</div>
          <div className="text-xs text-gray-500">tDUST Staked</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
          <div className="text-2xl font-bold text-gray-200">{gamesVerified}/{gamesRequired}</div>
          <div className="text-xs text-gray-500">Games Verified</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
          <div className="text-2xl font-bold text-emerald-400">+{earnedYield.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Earned Yield</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-700/50">
          <div className={`text-2xl font-bold capitalize ${
            status === "complete" ? "text-emerald-400" :
            status === "slashed" ? "text-red-400" :
            status === "verifying" ? "text-yellow-400" :
            "text-gray-400"
          }`}>{status}</div>
          <div className="text-xs text-gray-500">Status</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg border border-gray-700/50 p-4">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Verification Progress</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              status === "slashed" ? "bg-red-500" :
              progress >= 100 ? "bg-emerald-500" :
              "bg-cyan-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onVerifyGame}
          disabled={status !== "verifying" && status !== "staked"}
          className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Verify Next Game
        </button>
        <button
          onClick={onClaim}
          disabled={status !== "complete"}
          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Claim Yield ({earnedYield.toFixed(2)} tDUST)
        </button>
      </div>

      {/* Verification log */}
      {gamesVerified > 0 && (
        <div className="rounded-lg border border-gray-700/50 overflow-hidden">
          <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700/50">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Verification Log</span>
          </div>
          <div className="divide-y divide-gray-800/30 max-h-48 overflow-y-auto">
            {Array.from({ length: gamesVerified }, (_, i) => {
              const isClean = Math.random() > 0.05;
              return (
                <div key={i} className="px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-mono">Game #{i + 1}</span>
                  <span className={isClean ? "text-emerald-400" : "text-red-400"}>
                    {isClean ? "CLEAN" : "FLAGGED"}
                  </span>
                  <span className="text-gray-500">+{(stakedAmount * 0.005).toFixed(3)} tDUST</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
