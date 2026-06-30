"use client";

interface CheatSimulatorProps {
  onCheat: (type: string) => void;
  disabled: boolean;
}

const cheats = [
  { id: "teleport", label: "Teleport", check: "CHECK 3", desc: "Jump to (9,9)", color: "from-red-600 to-red-800" },
  { id: "speed-ramp", label: "Speed Ramp", check: "CHECK 4", desc: "Sudden acceleration", color: "from-orange-600 to-orange-800" },
  { id: "bot-loop", label: "Bot Loop", check: "CHECK 8", desc: "Repeat same action", color: "from-yellow-600 to-yellow-800" },
  { id: "aimbot", label: "Aimbot", check: "CHECK 9", desc: "Snap aim angles", color: "from-purple-600 to-purple-800" },
  { id: "wallhack", label: "Wallhack", check: "CHECK 10", desc: "Track hidden enemies", color: "from-pink-600 to-pink-800" },
];

export default function CheatSimulator({ onCheat, disabled }: CheatSimulatorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Simulate Cheats</h3>
      <div className="grid grid-cols-1 gap-1.5">
        {cheats.map((ch) => (
          <button
            key={ch.id}
            onClick={() => onCheat(ch.id)}
            disabled={disabled}
            className={`bg-gradient-to-r ${ch.color} px-3 py-2 rounded text-left text-xs font-medium text-white hover:brightness-125 transition disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <div className="flex justify-between items-center">
              <span>{ch.label}</span>
              <span className="text-white/60 text-[10px]">{ch.check}</span>
            </div>
            <div className="text-white/50 text-[10px]">{ch.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
