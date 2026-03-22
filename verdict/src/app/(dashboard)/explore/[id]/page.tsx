"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type Ruleset = {
  address: string;
  name: string;
  category: string;
  description: string;
  deployedAt: string;
  compact: string;
  totalChecks: number;
  totalFlagged: number;
  flaggedRate: string;
};

export default function RulesetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRuleset() {
      try {
        const res = await fetch("/api/rulesets");
        const data = await res.json();
        const found = (data.rulesets || []).find(
          (r: Ruleset) => r.address === decodeURIComponent(id) || r.name === decodeURIComponent(id)
        );
        setRuleset(found || null);
      } catch {}
      setLoading(false);
    }
    fetchRuleset();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-[var(--text-muted)] text-sm">Loading...</p>
      </div>
    );
  }

  if (!ruleset) {
    return (
      <div className="p-6">
        <p className="text-[var(--text-muted)] text-sm">Ruleset not found.</p>
        <Link
          href="/explore"
          className="text-white text-xs mt-2 inline-block hover:underline"
        >
          ← Back to Explore
        </Link>
      </div>
    );
  }

  const snippet = `import { Verdict } from "@verdict/sdk";
const v = new Verdict("${ruleset.address}");
const proof = await v.verify(stateTransition);`;

  const flaggedRate =
    ruleset.totalChecks > 0
      ? ((ruleset.totalFlagged / ruleset.totalChecks) * 100).toFixed(2)
      : "0.00";

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
        <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
          {ruleset.address} · Deployed{" "}
          {new Date(ruleset.deployedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "VERIFICATIONS", value: String(ruleset.totalChecks) },
          { label: "FLAGGED", value: `${flaggedRate}%` },
          {
            label: "FLAGGED COUNT",
            value: String(ruleset.totalFlagged),
          },
        ].map((s) => (
          <div key={s.label} className="panel corner-frame px-3 py-2.5">
            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
              {s.label}
            </div>
            <span className="text-sm text-white font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {/* SDK snippet */}
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

      {/* Compact source */}
      {ruleset.compact && (
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
                  <span className="w-8 text-right pr-3 text-[var(--text-muted)] select-none shrink-0">
                    {i + 1}
                  </span>
                  <span
                    className={
                      line.trimStart().startsWith("//")
                        ? "text-[var(--text-muted)]"
                        : line.includes("export") ||
                            line.includes("pragma") ||
                            line.includes("import")
                          ? "text-[var(--accent-dim)]"
                          : "text-[var(--text-primary)]"
                    }
                  >
                    {line || "\u00A0"}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
