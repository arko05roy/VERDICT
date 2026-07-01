import Link from "next/link";

const RULESETS = [
  { name: "fps-anticheat-v2", author: "0x7a2f...e9c1", category: "FPS", verifications: "482K", flagged: "0.02%", apps: 12, status: "active" },
  { name: "poker-fairness", author: "0x3b1c...a4d8", category: "CARD", verifications: "291K", flagged: "0.01%", apps: 8, status: "active" },
  { name: "moba-integrity", author: "0x9e4d...f2b7", category: "MOBA", verifications: "178K", flagged: "0.05%", apps: 5, status: "active" },
  { name: "casino-rng-proof", author: "0x1f8a...c3e6", category: "CASINO", verifications: "89K", flagged: "0.00%", apps: 3, status: "active" },
  { name: "chess-move-valid", author: "0x5c2e...d1f4", category: "BOARD", verifications: "67K", flagged: "0.04%", apps: 19, status: "active" },
];

export default function ExplorePage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg text-[var(--text-primary)] font-bold tracking-wide">
            Explore Rulesets
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Browse deployed rule enforcement circuits on the network.
          </p>
        </div>
        <div className="border border-[var(--border)] bg-[var(--bg-secondary)]">
          <input
            className="bg-transparent px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-mono w-64"
            placeholder="Search rulesets..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] noise">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
          {["RULESET", "CATEGORY", "VERIFICATIONS", "FLAGGED", "APPS", "STATUS"].map((h) => (
            <span key={h} className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              {h}
            </span>
          ))}
        </div>
        {RULESETS.map((r) => (
          <Link
            href={`/explore/${r.name}`}
            key={r.name}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
          >
            <div>
              <span className="text-xs text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                {r.name}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] ml-2">
                {r.author}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              {r.category}
            </span>
            <span className="text-xs text-[var(--text-primary)]">
              {r.verifications}
            </span>
            <span className="text-xs text-[var(--accent-dim)]">{r.flagged}</span>
            <span className="text-xs text-[var(--text-secondary)]">{r.apps}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] live-dot" />
              <span className="text-[10px] text-[var(--text-secondary)] uppercase">
                {r.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
