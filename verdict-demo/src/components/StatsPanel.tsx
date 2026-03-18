"use client";

interface StatsPanelProps {
  totalChecks: number;
  totalFlagged: number;
  velocity: number;
  acceleration: number;
  diversity: number;
  maxVelocity: number;
  maxAcceleration: number;
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const over = value > max;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-400">{label}</span>
        <span className={over ? "text-red-400 font-bold" : "text-gray-300"}>
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${over ? "bg-red-500" : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function StatsPanel({
  totalChecks,
  totalFlagged,
  velocity,
  acceleration,
  diversity,
  maxVelocity,
  maxAcceleration,
}: StatsPanelProps) {
  const cleanRate = totalChecks > 0 ? ((totalChecks - totalFlagged) / totalChecks * 100).toFixed(1) : "—";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-lg font-bold text-gray-200">{totalChecks}</div>
          <div className="text-[10px] text-gray-500">Checks</div>
        </div>
        <div className="bg-gray-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-lg font-bold text-red-400">{totalFlagged}</div>
          <div className="text-[10px] text-gray-500">Flagged</div>
        </div>
        <div className="bg-gray-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-lg font-bold text-emerald-400">{cleanRate}%</div>
          <div className="text-[10px] text-gray-500">Clean</div>
        </div>
      </div>

      <div className="space-y-2">
        <Bar label="Velocity" value={velocity} max={maxVelocity} color="bg-cyan-500" />
        <Bar label="Acceleration" value={acceleration} max={maxAcceleration} color="bg-blue-500" />
        <Bar label="Entropy" value={diversity} max={64} color="bg-emerald-500" />
      </div>
    </div>
  );
}
