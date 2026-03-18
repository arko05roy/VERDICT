"use client";

import Link from "next/link";
import CheckPipeline from "@/components/CheckPipeline";

const features = [
  { href: "/rules", title: "English → ZK Rules", desc: "Convert natural language game rules into ZK circuit parameters", icon: "📝" },
  { href: "/replay", title: "Game Replay Verifier", desc: "Analyze chess PGN or any game log move-by-move through 10 checks", icon: "🔍" },
  { href: "/dispute", title: "ZK Dispute Court", desc: "Side-by-side comparison with cryptographic ruling", icon: "⚖️" },
  { href: "/collusion", title: "Collusion Detector", desc: "Cross-correlate multiple players to detect coordinated cheating", icon: "🔗" },
  { href: "/passport", title: "Integrity Passport", desc: "Portable on-chain credential proving clean play history", icon: "🛡️" },
  { href: "/staking", title: "Clean Play Staking", desc: "Stake tokens on your integrity — earn yield or get slashed", icon: "💎" },
  { href: "/compliance", title: "Regulatory Compliance", desc: "Generate audit reports for gambling regulations", icon: "📋" },
  { href: "/audit", title: "Casino/RNG Auditor", desc: "Verify randomness quality with entropy and distribution analysis", icon: "🎰" },
  { href: "/marketplace", title: "Rule Marketplace", desc: "Browse and share community-created verification rulesets", icon: "🏪" },
  { href: "/betting", title: "Betting Market Layer", desc: "Verify game integrity before settling bets", icon: "🎯" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-6">
          Built on Midnight
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Universal ZK Game
          <br />
          <span className="text-cyan-400">Integrity Protocol</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Prove any game state transition is valid — without revealing player data, strategy, or game state.
          10 mathematical checks in a single ZK circuit.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/replay"
            className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold transition"
          >
            Try Replay Verifier
          </Link>
          <Link
            href="/rules"
            className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition border border-gray-700"
          >
            Create Rules
          </Link>
        </div>
      </section>

      {/* Pipeline */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-xl font-bold text-center mb-8">10-Check Verification Pipeline</h2>
        <CheckPipeline />
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-xl font-bold text-center mb-8">Protocol Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-lg border border-gray-800 bg-gray-900/50 p-5 hover:border-cyan-500/30 hover:bg-gray-900 transition"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition mb-1">
                {f.title}
              </h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* SDK Snippet */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="text-lg font-bold mb-4">5-Line SDK Integration</h2>
          <pre className="text-sm text-cyan-400/80 font-mono leading-relaxed overflow-x-auto">
{`const verdict = createVerdictSDK({ network: 'midnight-devnet' });

const result = await verdict.verify({
  stateHistory, aimHistory, actionHistory,
  rules: { maxVelocity: 10, maxSnaps: 3, ...gameRules }
});

// result.verdict → 'clean' | 'flagged'
// result.checks → per-check breakdown
// result.proofHash → on-chain proof reference`}
          </pre>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-800/50 text-center text-xs text-gray-600">
        VERDICT Protocol · Built on Midnight · 10 ZK checks · ~940 R1CS constraints · Zero data leaves your machine
      </footer>
    </div>
  );
}
