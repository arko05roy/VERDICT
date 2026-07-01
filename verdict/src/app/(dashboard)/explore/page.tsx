"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type Ruleset = {
  address: string;
  name: string;
  category: string;
  description: string;
  deployedAt: string;
  totalChecks: number;
  totalFlagged: number;
  flaggedRate: string;
  status: string;
};

export default function ExplorePage() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchRulesets() {
      try {
        const res = await fetch("/api/rulesets");
        const data = await res.json();
        setRulesets(data.rulesets || []);
      } catch {}
    }
    fetchRulesets();
    const interval = setInterval(fetchRulesets, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = rulesets.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-3 opacity-40">
            <div className="w-6 h-px bg-white" />
            <span className="text-white text-[10px]">◈</span>
            <div className="w-16 h-px bg-white" />
          </div>
          <h1 className="text-lg text-white font-bold tracking-wide">
            Explore Rulesets
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Browse deployed rule enforcement circuits on the network.
          </p>
        </div>
        <div className="panel corner-frame">
          <input
            className="bg-transparent px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-mono w-64"
            placeholder="Search rulesets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel corner-frame">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
          {["RULESET", "CATEGORY", "VERIFICATIONS", "FLAGGED", "STATUS"].map(
            (h) => (
              <span
                key={h}
                className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
              >
                {h}
              </span>
            )
          )}
        </div>
        <div className="mx-4">
          <div className="dither-sep" />
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              {rulesets.length === 0
                ? "No rulesets deployed yet. Go to Deploy to create one."
                : "No rulesets match your search."}
            </p>
          </div>
        ) : (
          filtered.map((r) => (
            <Link
              href={`/explore/${encodeURIComponent(r.address)}`}
              key={r.address}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group border-l-2 border-l-transparent hover:border-l-white"
            >
              <div>
                <span className="text-xs text-[var(--text-primary)] group-hover:text-white transition-colors">
                  {r.name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-2 font-mono">
                  {r.address.slice(0, 8)}...{r.address.slice(-4)}
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] border border-[var(--border)] px-1.5 py-0.5 w-fit h-fit">
                {r.category}
              </span>
              <span className="text-xs text-[var(--text-primary)]">
                {r.totalChecks}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {r.flaggedRate}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[var(--accent)] live-dot" />
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">
                  {r.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
