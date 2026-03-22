"use client";

import { useState, useEffect } from "react";

const STATS = [
  { label: "RULESETS DEPLOYED", value: "2,847", delta: "+12 24h" },
  { label: "TOTAL VERIFICATIONS", value: "1.2M", delta: "+8,431 24h" },
  { label: "ACTIVE GAMES", value: "384", delta: "+7 24h" },
  { label: "FLAGGED RATE", value: "0.03%", delta: "avg" },
];

const CHECKS = [
  { n: 1, name: "Hash-chain integrity", type: "Cryptographic" },
  { n: 2, name: "Commit-reveal", type: "Cryptographic" },
  { n: 3, name: "Velocity bounds", type: "Physics" },
  { n: 4, name: "Acceleration bounds", type: "Physics" },
  { n: 5, name: "Spatial bounds", type: "Spatial" },
  { n: 6, name: "Action validity", type: "Rule" },
  { n: 7, name: "Action frequency", type: "Temporal" },
  { n: 8, name: "Behavioral entropy", type: "Statistical" },
  { n: 9, name: "Aim precision anomaly", type: "Statistical" },
  { n: 10, name: "Information leakage", type: "Info-theoretic" },
];

type FeedEntry = {
  ruleset: string;
  player: string;
  verdict: string;
  checks: string;
  time: string;
  block: number;
};

export default function OverviewPage() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const res = await fetch("/api/feed");
        const data = await res.json();
        setFeed(data.entries);
      } catch {}
    }
    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header with decorative line */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-3 opacity-40">
          <div className="w-6 h-px bg-white" />
          <span className="text-white text-[10px]">◈</span>
          <div className="w-16 h-px bg-white" />
        </div>
        <h1 className="text-lg text-white font-bold tracking-wide">
          Protocol Overview
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Universal ZK game integrity verification on Midnight. 10 mathematical
          checks. Zero surveillance.
        </p>
      </div>

      {/* Stats grid with corner frames */}
      <div className="grid grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="panel corner-frame px-4 py-3"
          >
            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
              {s.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl text-white font-bold">
                {s.value}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {s.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* 10 Checks */}
        <div className="panel corner-frame">
          <div className="px-4 py-2.5 border-b border-[var(--border)]">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              The 10 Checks
            </span>
          </div>
          <div className="mx-4"><div className="dither-sep" /></div>
          <div>
            {CHECKS.map((c) => (
              <div
                key={c.n}
                className="flex items-center px-4 py-2 border-b border-[var(--border)] last:border-b-0"
              >
                <span className="text-[10px] text-[var(--accent)] font-bold w-6">
                  {String(c.n).padStart(2, "0")}
                </span>
                <span className="text-xs text-[var(--text-primary)] flex-1">
                  {c.name}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                  {c.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Feed */}
        <div className="panel corner-frame">
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[var(--accent)] live-dot" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Live Verification Feed
            </span>
            <span className="text-[9px] text-[var(--text-muted)] ml-auto">
              polling 5s
            </span>
          </div>
          <div>
            {feed.map((r, i) => (
              <div
                key={i}
                className={`flex items-center px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 ${
                  r.verdict === "FLAGGED" ? "row-flagged" : ""
                }`}
              >
                <span className="text-xs text-[var(--text-primary)] flex-1">
                  {r.ruleset}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold mr-4 ${
                    r.verdict === "CLEAN"
                      ? "text-[var(--accent)]"
                      : "text-[var(--danger)]"
                  }`}
                >
                  {r.verdict}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] w-16 text-right mr-4">
                  {r.checks}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] w-16 text-right">
                  {r.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture */}
      <div className="panel corner-frame">
        <div className="px-4 py-2.5 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Architecture
          </span>
        </div>
        <div className="mx-4"><div className="dither-sep" /></div>
        <div className="p-4 font-mono text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre">{`Game Client ──→ State Transition ──→ ZK Witness (private) ──→ 10 Checks ──→ Midnight Proof ──→ CLEAN / FLAGGED
                    │                                          │                        │
                    │  position, action, timing                │  ~940 R1CS constraints │  async settlement
                    │  captured locally                        │  2-5s proof time       │  game never pauses
                    └──────────────────────────────────────────┘────────────────────────┘`}</div>
      </div>
    </div>
  );
}
