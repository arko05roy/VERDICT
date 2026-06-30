"use client";

export interface PassportData {
  address: string;
  gamesVerified: number;
  cleanRate: number;
  badges: { id: string; name: string; description: string; earned: boolean; icon: string }[];
  history: { date: string; gameType: string; verdict: "clean" | "flagged"; moveCount: number }[];
  memberSince: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
}

const tierColors: Record<string, string> = {
  bronze: "from-orange-700 to-orange-900 border-orange-600",
  silver: "from-gray-400 to-gray-600 border-gray-300",
  gold: "from-yellow-500 to-yellow-700 border-yellow-400",
  diamond: "from-cyan-400 to-blue-600 border-cyan-300",
};

export default function IntegrityBadge({ passport }: { passport: PassportData }) {
  return (
    <div className="space-y-4">
      {/* Main passport card */}
      <div className={`rounded-lg border-2 ${tierColors[passport.tier]} bg-gradient-to-br p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">VERDICT Integrity Passport</div>
            <div className="text-lg font-bold text-white font-mono mt-1">{passport.address}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{passport.cleanRate}%</div>
            <div className="text-xs text-white/60">Clean Rate</div>
          </div>
        </div>
        <div className="flex gap-6 mt-4">
          <div>
            <div className="text-xl font-bold text-white">{passport.gamesVerified}</div>
            <div className="text-xs text-white/60">Games Verified</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white capitalize">{passport.tier}</div>
            <div className="text-xs text-white/60">Tier</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">{passport.memberSince}</div>
            <div className="text-xs text-white/60">Member Since</div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-lg border border-gray-700/50 overflow-hidden">
        <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700/50">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Badges</span>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {passport.badges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-lg border p-3 text-center ${
                badge.earned
                  ? "border-cyan-500/50 bg-cyan-500/5"
                  : "border-gray-700/30 bg-gray-800/20 opacity-40"
              }`}
            >
              <div className={`text-2xl font-bold ${badge.earned ? "text-cyan-400" : "text-gray-600"}`}>
                {badge.icon}
              </div>
              <div className="text-xs font-medium text-gray-300 mt-1">{badge.name}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{badge.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
