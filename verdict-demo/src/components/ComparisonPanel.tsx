"use client";

const rows = [
  { feature: "Speed hacks", verdict: "Velocity + acceleration", vanguard: "Memory scan" },
  { feature: "Aimbot", verdict: "Statistical aim analysis", vanguard: "DLL injection scan" },
  { feature: "Wallhack", verdict: "Information leakage detection", vanguard: "Render buffer scan" },
  { feature: "Bots", verdict: "Entropy + frequency analysis", vanguard: "Input hook detection" },
  { feature: "Method", verdict: "Math (10 ZK checks)", vanguard: "Surveillance", highlight: true },
  { feature: "Data collected", verdict: "Zero", vanguard: "Everything", highlight: true },
  { feature: "Kernel access", verdict: "No", vanguard: "Yes, from boot", highlight: true },
  { feature: "OS support", verdict: "Any", vanguard: "Windows only" },
  { feature: "Integration", verdict: "5 lines", vanguard: "Months" },
  { feature: "Verification", verdict: "Trustless (on-chain)", vanguard: "Trust Riot" },
];

export default function ComparisonPanel() {
  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700/50">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">VERDICT vs Vanguard</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700/50">
            <th className="text-left px-3 py-1.5 text-gray-500 font-medium"></th>
            <th className="text-left px-3 py-1.5 text-cyan-400 font-semibold">VERDICT</th>
            <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Vanguard</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-gray-800/30 ${row.highlight ? "bg-cyan-500/5" : ""}`}>
              <td className="px-3 py-1.5 text-gray-400">{row.feature}</td>
              <td className="px-3 py-1.5 text-emerald-400">{row.verdict}</td>
              <td className="px-3 py-1.5 text-gray-500">{row.vanguard}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
