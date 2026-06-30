"use client";

import type { GameRules } from "@/game/rules";

interface RuleEditorProps {
  rules: GameRules;
  onChange: (rules: GameRules) => void;
  readonly?: boolean;
}

const RULE_GROUPS = [
  {
    label: "Physics",
    color: "text-blue-400",
    fields: [
      { key: "maxVelocity" as const, label: "Max Velocity", desc: "Max Manhattan distance per tick" },
      { key: "maxAcceleration" as const, label: "Max Acceleration", desc: "Max velocity change between ticks" },
    ],
  },
  {
    label: "Spatial",
    color: "text-emerald-400",
    fields: [
      { key: "boundX" as const, label: "Bound X", desc: "Horizontal boundary" },
      { key: "boundY" as const, label: "Bound Y", desc: "Vertical boundary" },
    ],
  },
  {
    label: "Rule",
    color: "text-yellow-400",
    fields: [
      { key: "validActionCount" as const, label: "Valid Action Count", desc: "Number of valid actions" },
    ],
  },
  {
    label: "Temporal",
    color: "text-orange-400",
    fields: [
      { key: "maxActionsPerWindow" as const, label: "Max Actions / Window", desc: "Rate limit per window" },
      { key: "windowSize" as const, label: "Window Size", desc: "Temporal window in ticks" },
    ],
  },
  {
    label: "Statistical",
    color: "text-pink-400",
    fields: [
      { key: "minDiversity" as const, label: "Min Diversity", desc: "Gini-Simpson diversity floor" },
      { key: "snapThreshold" as const, label: "Snap Threshold", desc: "Cross-product threshold for aim snaps" },
      { key: "maxSnaps" as const, label: "Max Snaps", desc: "Maximum allowed aim snaps" },
      { key: "maxCorrelation" as const, label: "Max Correlation", desc: "Max enemy-movement correlation" },
    ],
  },
];

export default function RuleEditor({ rules, onChange, readonly }: RuleEditorProps) {
  const handleChange = (key: keyof GameRules, value: string) => {
    const num = Number(value);
    if (!isNaN(num)) {
      onChange({ ...rules, [key]: num });
    }
  };

  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700/50">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Rule Configuration</span>
      </div>
      <div className="divide-y divide-gray-800/30">
        {RULE_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1.5 bg-gray-800/30">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${group.color}`}>{group.label}</span>
            </div>
            {group.fields.map((field) => (
              <div key={field.key} className="flex items-center justify-between px-3 py-2 gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-gray-300">{field.label}</div>
                  <div className="text-[10px] text-gray-500">{field.desc}</div>
                </div>
                <input
                  type="number"
                  value={rules[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  disabled={readonly}
                  className={`w-24 shrink-0 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-cyan-400 font-mono text-sm text-right focus:outline-none focus:border-cyan-400/50 ${
                    readonly ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
