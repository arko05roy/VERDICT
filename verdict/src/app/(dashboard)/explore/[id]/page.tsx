import Link from "next/link";

const RULESETS: Record<string, any> = {
  "fps-anticheat-v2": {
    name: "fps-anticheat-v2",
    author: "0x7a2f...e9c1",
    category: "FPS",
    description: "Movement, aim, and action integrity checks for first-person shooters. Covers speed hacks, aimbot, wallhack, and bot detection.",
    deployDate: "2026-02-14",
    verifications: "482,391",
    flagged: "0.02%",
    flaggedCount: 96,
    apps: 12,
    uptime: "99.97%",
    avgProofTime: "3.2s",
    checks: [
      "Velocity cannot exceed 8 units per tick",
      "Acceleration delta capped at 3 units/tick\u00B2",
      "Position must stay within map bounds (0-2000)",
      "Max 12 actions per second",
      "Behavioral entropy must exceed threshold",
      "Aim snap angle cannot exceed 45\u00B0 per frame",
      "No information leakage from hidden positions",
    ],
    compact: `pragma language_version 0.21;
import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;

witness getState(): Vector<6, Uint<64>>;
witness getThresholds(): Vector<4, Uint<64>>;

export circuit verify(): Verdict {
  const state = getState();
  const thresholds = getThresholds();
  // ... 7 checks omitted for brevity
  totalChecks += 1;
  lastVerdict = disclose(Verdict.clean);
  return Verdict.clean;
}

constructor() {
  lastVerdict = Verdict.clean;
}`,
  },
  "poker-fairness": {
    name: "poker-fairness",
    author: "0x3b1c...a4d8",
    category: "CARD",
    description: "Card game fairness verification. Ensures RNG commitment, valid hand composition, and betting sequence integrity.",
    deployDate: "2026-01-28",
    verifications: "291,004",
    flagged: "0.01%",
    flaggedCount: 29,
    apps: 8,
    uptime: "99.99%",
    avgProofTime: "2.8s",
    checks: [
      "RNG must be committed before deal",
      "Cards must exist in deck before dealing",
      "No duplicate cards across hands",
      "Bet amount cannot exceed stack",
      "Action sequence must follow game phase",
    ],
    compact: `pragma language_version 0.21;
import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;
export ledger commitment: Bytes<32>;

witness getDeck(): Vector<52, Uint<64>>;
witness getHand(): Vector<5, Uint<64>>;

export circuit verify(): Verdict {
  const deck = getDeck();
  const hand = getHand();
  // ... checks omitted for brevity
  totalChecks += 1;
  lastVerdict = disclose(Verdict.clean);
  return Verdict.clean;
}

constructor() {
  lastVerdict = Verdict.clean;
}`,
  },
};

const FEED = [
  { verdict: "CLEAN", checks: "10/10", time: "2s ago", player: "0xa1b2...f3e4" },
  { verdict: "CLEAN", checks: "10/10", time: "4s ago", player: "0xc5d6...a7b8" },
  { verdict: "FLAGGED", checks: "7/10", time: "9s ago", player: "0xe9f0...1234" },
  { verdict: "CLEAN", checks: "10/10", time: "11s ago", player: "0x5678...9abc" },
  { verdict: "CLEAN", checks: "10/10", time: "15s ago", player: "0xdef0...5678" },
  { verdict: "CLEAN", checks: "10/10", time: "18s ago", player: "0x1122...3344" },
  { verdict: "FLAGGED", checks: "8/10", time: "23s ago", player: "0x5566...7788" },
  { verdict: "CLEAN", checks: "10/10", time: "27s ago", player: "0x99aa...bbcc" },
];

const DISPUTES = [
  { id: "#D-0041", player: "0xe9f0...1234", reason: "CHECK 9: Aim anomaly", status: "open", time: "9s ago" },
  { id: "#D-0039", player: "0x5566...7788", reason: "CHECK 8: Low entropy", status: "open", time: "23s ago" },
  { id: "#D-0034", player: "0xaa11...bb22", reason: "CHECK 3: Velocity exceeded", status: "resolved", time: "4h ago" },
];

export default async function RulesetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ruleset = RULESETS[id];

  if (!ruleset) {
    return (
      <div className="p-6">
        <p className="text-[var(--text-muted)] text-sm">Ruleset not found.</p>
        <Link href="/explore" className="text-white text-xs mt-2 inline-block hover:underline">
          ← Back to Explore
        </Link>
      </div>
    );
  }

  const snippet = `import { Verdict } from "@verdict/sdk";
const v = new Verdict("${id}");
const proof = await v.verify(stateTransition);`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/explore"
          className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider hover:text-white transition-colors"
        >
          ← Explore
        </Link>
        <div className="flex items-center gap-2 mt-3 mb-1 opacity-40">
          <div className="w-6 h-px bg-white" />
          <span className="text-white text-[10px]">◈</span>
          <div className="w-16 h-px bg-white" />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-lg text-white font-bold tracking-wide">
            {ruleset.name}
          </h1>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-white text-white">
            {ruleset.category}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-2xl">
          {ruleset.description}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Deployed by {ruleset.author} · {ruleset.deployDate}
        </p>
      </div>

      {/* Stats row with corner frames */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "VERIFICATIONS", value: ruleset.verifications },
          { label: "FLAGGED", value: ruleset.flagged },
          { label: "CONNECTED APPS", value: ruleset.apps },
          { label: "UPTIME", value: ruleset.uptime },
          { label: "AVG PROOF TIME", value: ruleset.avgProofTime },
        ].map((s) => (
          <div key={s.label} className="panel corner-frame px-3 py-2.5">
            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
              {s.label}
            </div>
            <span className="text-sm text-white font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Live feed */}
        <div className="panel corner-frame">
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[var(--accent)] live-dot" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Live Verification Feed
            </span>
          </div>
          {FEED.map((f, i) => (
            <div key={i} className={`flex items-center px-4 py-2 border-b border-[var(--border)] last:border-b-0 ${f.verdict === "FLAGGED" ? "row-flagged" : ""}`}>
              <span className="text-[10px] text-[var(--text-secondary)] flex-1 font-mono">{f.player}</span>
              <span className={`text-[10px] uppercase tracking-wider font-bold mr-4 ${f.verdict === "CLEAN" ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                {f.verdict}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] w-12 text-right mr-3">{f.checks}</span>
              <span className="text-[10px] text-[var(--text-muted)] w-14 text-right">{f.time}</span>
            </div>
          ))}
        </div>

        {/* Rules + SDK */}
        <div className="space-y-4">
          <div className="panel corner-frame">
            <div className="px-4 py-2.5 border-b border-[var(--border)]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Rules · Human Readable
              </span>
            </div>
            {ruleset.checks.map((c: string, i: number) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2 border-b border-[var(--border)] last:border-b-0">
                <span className="text-[10px] text-[var(--accent)] font-bold shrink-0 w-4 pt-px">
                  {i + 1}.
                </span>
                <span className="text-xs text-[var(--text-secondary)]">{c}</span>
              </div>
            ))}
          </div>

          <div className="panel corner-frame">
            <div className="px-4 py-2.5 border-b border-[var(--border)]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                SDK Integration
              </span>
            </div>
            <pre className="p-4 text-xs text-[var(--text-primary)] leading-relaxed">
              {snippet}
            </pre>
          </div>
        </div>
      </div>

      {/* Compact source */}
      <div className="panel corner-frame">
        <div className="px-4 py-2.5 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Compact Source
          </span>
        </div>
        <pre className="p-4 text-xs leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
          <code>
            {ruleset.compact.split("\n").map((line: string, i: number) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-3 text-[var(--text-muted)] select-none shrink-0">{i + 1}</span>
                <span className={
                  line.trimStart().startsWith("//") ? "text-[var(--text-muted)]"
                    : line.includes("export") || line.includes("pragma") || line.includes("import") ? "text-[var(--accent-dim)]"
                    : "text-[var(--text-primary)]"
                }>{line || "\u00A0"}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Disputes */}
      <div className="panel corner-frame">
        <div className="px-4 py-2.5 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Disputes / Flags
          </span>
        </div>
        <div className="mx-4"><div className="dither-sep" /></div>
        {DISPUTES.map((d) => (
          <div key={d.id} className={`flex items-center px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 ${d.status === "open" ? "row-flagged" : ""}`}>
            <span className="text-[10px] text-[var(--text-secondary)] font-bold w-16">{d.id}</span>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono w-28">{d.player}</span>
            <span className="text-xs text-[var(--text-primary)] flex-1">{d.reason}</span>
            <span className={`text-[10px] uppercase tracking-wider font-bold mr-4 ${d.status === "open" ? "text-[var(--warning)]" : "text-[var(--text-muted)]"}`}>
              {d.status}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] w-14 text-right">{d.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
