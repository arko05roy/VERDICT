"use client";

import { useState, useEffect } from "react";

type GuardianEntry = {
  id: string;
  mythName: string;
  numeral: string;
  category: string;
  description: string;
  isHardFail: boolean;
  active: boolean;
};

type VerifierVersionEntry = {
  versionId: number;
  guardianMask: string;
  guardianCount: number;
  active: boolean;
  createdAt: string;
};

type DAOState = {
  totalChecks: number;
  checks: GuardianEntry[];
  council: { size: number; threshold: number };
  proposals: any[];
  totalProposals: number;
  verifierVersions: VerifierVersionEntry[];
  totalVerifierVersions: number;
  latestVerifierVersion: number;
  totalRulesets: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  integrity: "INTEGRITY",
  "rate-limit": "RATE LIMITS",
  boundary: "BOUNDARIES",
  validity: "VALIDITY",
  behavioral: "BEHAVIORAL",
  information: "INFORMATION",
};

export default function DAOPage() {
  const [dao, setDao] = useState<DAOState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dao")
      .then((r) => r.json())
      .then((d) => setDao(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-xs tracking-[0.3em]">LOADING GOVERNANCE STATE...</p>
      </div>
    );
  }

  if (!dao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--danger)] text-xs">Failed to load DAO state</p>
      </div>
    );
  }

  // Group guardians by category
  const categoryOrder = ["integrity", "rate-limit", "boundary", "validity", "behavioral", "information"];
  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      checks: dao.checks.filter((c) => c.category === cat),
    }))
    .filter((g) => g.checks.length > 0);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4 opacity-30">
          <div className="w-16 h-px bg-white" />
          <span className="text-white text-[10px]">{"\u2696"}</span>
          <div className="w-16 h-px bg-white" />
        </div>
        <h1 className="text-lg text-white font-bold tracking-[0.2em] uppercase">Governance</h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 tracking-wide">
          The VERDICT DAO manages the Guardian registry. New checks are proposed, voted on, and registered on-chain.
        </p>
      </div>

      {/* Stats row */}
      <div className="max-w-5xl mx-auto grid grid-cols-6 gap-4 mb-12">
        {[
          { label: "GUARDIANS", value: dao.totalChecks, sub: "registered" },
          { label: "VERIFIERS", value: dao.totalVerifierVersions || 1, sub: "versions" },
          { label: "RULESETS", value: dao.totalRulesets || 0, sub: "deployed" },
          { label: "COUNCIL", value: dao.council.size, sub: "members" },
          { label: "THRESHOLD", value: dao.council.threshold, sub: "votes to pass" },
          { label: "PROPOSALS", value: dao.totalProposals, sub: "submitted" },
        ].map((stat) => (
          <div key={stat.label} className="border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-center">
            <p className="text-[9px] text-[var(--text-muted)] tracking-[0.3em] mb-2">{stat.label}</p>
            <p className="text-2xl text-[var(--text-primary)] font-bold">{stat.value}</p>
            <p className="text-[9px] text-[var(--text-muted)] mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Verifier Versions */}
      <div className="max-w-5xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-6">
          <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em]">VERIFIER VERSIONS</p>
          <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, var(--border) 0 2px, transparent 2px 6px)" }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(dao.verifierVersions || []).map((ver) => (
            <div key={ver.versionId} className={`border bg-[var(--bg-secondary)] p-4 ${ver.versionId === dao.latestVerifierVersion ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-primary)] font-medium">
                  v{ver.versionId}.0 {ver.versionId === 1 ? "— Genesis" : ""}
                </span>
                <div className="flex items-center gap-2">
                  {ver.versionId === dao.latestVerifierVersion && (
                    <span className="text-[8px] tracking-[0.15em] text-[var(--accent)] border border-[var(--accent)]/30 px-1 py-0.5 rounded-sm">LATEST</span>
                  )}
                  <span className={`w-2 h-2 rounded-full ${ver.active ? "bg-[var(--accent)]" : "bg-[var(--text-muted)]"}`} />
                </div>
              </div>
              <div className="flex items-center gap-4 text-[9px] text-[var(--text-muted)]">
                <span>{ver.guardianCount} guardians</span>
                <span>mask: 0b{BigInt(ver.guardianMask).toString(2).padStart(10, "0")}</span>
                <span>{ver.active ? "active" : "inactive"}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[9px] text-[var(--text-muted)]/60 mt-3">
          Each verifier is compiled once and immutable. New Guardians require a new version. Existing rulesets can migrate.
        </p>
      </div>

      {/* Guardian Registry */}
      <div className="max-w-5xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-6">
          <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em]">GUARDIAN REGISTRY</p>
          <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, var(--border) 0 2px, transparent 2px 6px)" }} />
        </div>

        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.category}>
              <p className="text-[9px] text-[var(--text-muted)] tracking-[0.3em] mb-3">
                {"\u2500\u2500\u2500"} {group.label} {"\u2500\u2500\u2500"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {group.checks.map((check) => (
                  <div
                    key={check.id}
                    className="relative border border-[var(--border)] bg-[var(--bg-secondary)] p-4 hover:border-[var(--border-bright)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-muted)]">{check.numeral}</span>
                        <span className="text-sm text-[var(--accent)] font-medium">{check.mythName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {check.isHardFail && (
                          <span className="text-[8px] tracking-[0.15em] text-[var(--danger)] border border-[var(--danger)]/30 px-1 py-0.5 rounded-sm">ASSERT</span>
                        )}
                        <span className={`w-2 h-2 rounded-full ${check.active ? "bg-[var(--accent)]" : "bg-[var(--text-muted)]"}`} />
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{check.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[8px] text-[var(--text-muted)] tracking-[0.15em] border border-[var(--border)] px-1.5 py-0.5">
                        {check.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <span className="text-[8px] text-[var(--text-muted)]">
                        {check.isHardFail ? "hard fail" : "soft flag"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proposals Section */}
      <div className="max-w-5xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-6">
          <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em]">VIP — VERDICT IMPROVEMENT PROPOSALS</p>
          <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, var(--border) 0 2px, transparent 2px 6px)" }} />
        </div>

        {dao.proposals.length === 0 ? (
          <div className="border border-[var(--border)] border-dashed bg-[var(--bg-secondary)] p-8 text-center">
            <p className="text-[var(--text-muted)] text-xs mb-2">No proposals yet</p>
            <p className="text-[9px] text-[var(--text-muted)]/60">
              When new Guardians are proposed, they will appear here for council vote.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dao.proposals.map((p: any, i: number) => (
              <div key={i} className="border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[var(--text-primary)]">VIP-{i + 1}</span>
                    <span className="text-[9px] text-[var(--text-muted)] ml-3">Check ID: {p.checkId}</span>
                  </div>
                  <span className={`text-[8px] tracking-[0.15em] px-2 py-0.5 border ${
                    p.status === "accepted" ? "text-[var(--accent)] border-[var(--accent)]/30" :
                    p.status === "rejected" ? "text-[var(--danger)] border-[var(--danger)]/30" :
                    "text-[var(--warning)] border-[var(--warning)]/30"
                  }`}>
                    {p.status?.toUpperCase() || "PENDING"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-[9px] text-[var(--text-muted)]">
                  <span>For: {p.votesFor || 0}</span>
                  <span>Against: {p.votesAgainst || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em]">HOW GOVERNANCE WORKS</p>
          <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, var(--border) 0 2px, transparent 2px 6px)" }} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { step: "I", title: "Propose", desc: "Anyone submits a VIP with the Guardian's template hash and check ID" },
            { step: "II", title: "Vote", desc: "Council members vote on-chain. Double-voting is cryptographically prevented" },
            { step: "III", title: "Finalize", desc: "If votes meet threshold, the Guardian is registered in the on-chain registry" },
            { step: "IV", title: "Available", desc: "New Guardian appears in the library. Any ruleset can now use it via VCL" },
          ].map((s) => (
            <div key={s.step} className="border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-center">
              <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-2">{s.step}</p>
              <p className="text-xs text-[var(--accent)] mb-2">{s.title}</p>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom ornament */}
      <div className="mt-14 flex items-center justify-center gap-3 opacity-20">
        <div className="w-12 h-px bg-white" />
        <span className="text-[8px] text-white tracking-[0.3em]">{"\u2696"} VERDICT DAO {"\u2696"}</span>
        <div className="w-12 h-px bg-white" />
      </div>
    </div>
  );
}
