"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type Ruleset = {
  address: string;
  name: string;
  description: string;
  tags: string[];
  enabledChecks: string[];
  checkCount: number;
  deployedAt: string;
  compact: string;
  totalChecks: number;
  totalFlagged: number;
  flaggedRate: string;
  category?: string;
};

export default function RulesetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSource, setShowSource] = useState(false);

  // Verification
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Explorer modal
  const [showExplorerModal, setShowExplorerModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchRuleset() {
      try {
        const res = await fetch("/api/rulesets");
        const data = await res.json();
        const found = (data.rulesets || []).find(
          (r: Ruleset) =>
            r.address === decodeURIComponent(id) ||
            r.name === decodeURIComponent(id)
        );
        setRuleset(found || null);
      } catch {}
      setLoading(false);
    }
    fetchRuleset();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-3xl text-[#222] block mb-4 animate-pulse">◈</span>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#333]">
            Consulting the oracle...
          </p>
        </div>
      </div>
    );
  }

  if (!ruleset) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl text-[#222] block mb-4">✕</span>
          <p className="text-sm text-[#555] font-bold uppercase tracking-[0.2em] mb-3">
            Ruleset Not Found
          </p>
          <p className="text-[10px] text-[#333] mb-6 tracking-wide">
            This card has been lost to the void.
          </p>
          <Link
            href="/explore"
            className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] border border-[var(--accent)] px-4 py-2 hover:bg-[rgba(0,255,65,0.05)] transition-colors"
          >
            ← Return to the Deck
          </Link>
        </div>
      </div>
    );
  }

  const checkCount = ruleset.checkCount || 10;
  const flaggedRate =
    ruleset.totalChecks > 0
      ? ((ruleset.totalFlagged / ruleset.totalChecks) * 100).toFixed(2)
      : "0.00";
  const integrityScore =
    ruleset.totalChecks > 0
      ? (100 - (ruleset.totalFlagged / ruleset.totalChecks) * 100).toFixed(1)
      : "100.0";

  const snippet = `import { Verdict } from "@verdict/sdk";

const v = new Verdict("${ruleset.address}");
const proof = await v.verify(stateTransition);

if (proof.flagged) {
  console.log("Violation detected:", proof.checks);
}`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const stats = [
    { label: "Verifications", value: String(ruleset.totalChecks), numeral: "I", symbol: "⊕" },
    { label: "Flagged Rate", value: `${flaggedRate}%`, numeral: "II", symbol: "⚑" },
    { label: "Flagged Count", value: String(ruleset.totalFlagged), numeral: "III", symbol: "⚠" },
    { label: "Integrity Score", value: `${integrityScore}%`, numeral: "IV", symbol: "◈" },
  ];

  return (
    <div className="p-6 relative min-h-screen">
      {/* ═══ Breadcrumb ═══ */}
      <div
        className="mb-6"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        <Link
          href="/explore"
          className="text-[10px] uppercase tracking-[0.25em] text-[#444] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-2"
        >
          <span>←</span>
          <span>Explore</span>
          <span className="text-[#222]">/</span>
          <span className="text-[#555]">{ruleset.name}</span>
        </Link>
      </div>

      {/* ═══ Hero Card ═══ */}
      <div
        className="relative max-w-4xl mx-auto mb-8"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
        }}
      >
        {/* Outer border */}
        <div className="absolute inset-0 border-2 border-[#444]" style={{ background: "linear-gradient(180deg, #0d0d0d 0%, #080808 100%)" }} />
        <div className="absolute inset-[5px] border border-[#222]" />
        <div className="absolute inset-[9px] border border-[#151515] opacity-50" />

        {/* Corner ornaments */}
        {["top-[7px] left-[7px]","top-[7px] right-[7px]","bottom-[7px] left-[7px] rotate-180","bottom-[7px] right-[7px] rotate-180"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} text-[8px] text-[#555]`}>◆</div>
        ))}

        {/* Edge midpoints */}
        <div className="absolute top-[7px] left-1/2 -translate-x-1/2 text-[6px] text-[#333]">✦</div>
        <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 text-[6px] text-[#333]">✦</div>
        <div className="absolute left-[7px] top-1/2 -translate-y-1/2 text-[6px] text-[#333]">✦</div>
        <div className="absolute right-[7px] top-1/2 -translate-y-1/2 text-[6px] text-[#333]">✦</div>

        <div className="relative px-10 py-8">
          {/* Top section — Symbol + Name + Meta */}
          <div className="flex items-start gap-8">
            {/* Large tarot symbol */}
            <div className="relative shrink-0" style={{ width: 100, height: 140 }}>
              <div className="absolute inset-0 border border-[#2a2a2a]" style={{ background: "#0a0a0a" }} />
              <div className="absolute inset-[3px] border border-[#1a1a1a]" />
              <div className="absolute top-[6px] left-[6px] text-[5px] text-[#2a2a2a]">◆</div>
              <div className="absolute top-[6px] right-[6px] text-[5px] text-[#2a2a2a]">◆</div>
              <div className="absolute bottom-[6px] left-[6px] text-[5px] text-[#2a2a2a] rotate-180">◆</div>
              <div className="absolute bottom-[6px] right-[6px] text-[5px] text-[#2a2a2a] rotate-180">◆</div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl text-[#555] mb-2">{"\u25C7"}</span>
                <div className="flex items-center gap-1.5 opacity-40">
                  <div className="w-4 h-px bg-[#444]" />
                  <span className="text-[5px] text-[#444]">✦</span>
                  <div className="w-4 h-px bg-[#444]" />
                </div>
                <span className="text-[7px] uppercase tracking-[0.2em] text-[#444] mt-1">{checkCount} guardians</span>
              </div>
            </div>

            {/* Name + Details */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl text-white font-bold tracking-[0.15em] uppercase mb-2">
                {ruleset.name}
              </h1>

              {/* Decorative divider */}
              <div className="flex items-center gap-2 mb-3 opacity-40">
                <div className="w-10 h-px bg-[var(--accent)]" />
                <span className="text-[6px] text-[var(--accent)]">✦</span>
                <div className="w-6 h-px bg-[#444]" />
              </div>

              <p className="text-[12px] text-[#888] leading-relaxed mb-4 max-w-xl">
                {ruleset.description || "A cryptographic rule enforcement circuit deployed to the Midnight network."}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--accent)] border border-[var(--accent)] px-2.5 py-1 font-bold">
                  {"\u25C7"} {checkCount} guardians
                </span>
                <span className="text-[9px] text-[#555] font-mono">
                  {ruleset.address}
                </span>
                <span className="text-[5px] text-[#333]">✦</span>
                <span className="text-[9px] text-[#444]">
                  Deployed {new Date(ruleset.deployedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
                <span className="flex items-center gap-1.5 ml-auto">
                  <span className="w-2 h-2 bg-[var(--accent)] live-dot" />
                  <span className="text-[9px] uppercase tracking-[0.15em] text-[#555]">Active</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Stats Grid — Tarot mini-cards ═══ */}
      <div className="max-w-4xl mx-auto grid grid-cols-4 gap-4 mb-8">
        {stats.map((s, idx) => (
          <div
            key={s.label}
            className="group relative transition-all duration-500 hover:-translate-y-1"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 0.4s ease ${0.2 + idx * 0.08}s, transform 0.4s ease ${0.2 + idx * 0.08}s`,
            }}
          >
            <div className="absolute inset-0 border-2 border-[#333] group-hover:border-[var(--accent)] transition-colors duration-500" style={{ background: "linear-gradient(180deg, #0c0c0c, #080808)" }} />
            <div className="absolute inset-[4px] border border-[#1a1a1a] group-hover:border-[#2a2a2a] transition-colors" />

            {["top-[6px] left-[6px]","top-[6px] right-[6px]","bottom-[6px] left-[6px] rotate-180","bottom-[6px] right-[6px] rotate-180"].map((pos, i) => (
              <div key={i} className={`absolute ${pos} text-[5px] text-[#333] group-hover:text-[var(--accent-dim)] transition-colors`}>◆</div>
            ))}

            <div className="relative px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] tracking-[0.3em] text-[#444] group-hover:text-[#666] transition-colors font-bold">{s.numeral}</span>
                <span className="text-base text-[#333] group-hover:text-[var(--accent)] transition-colors duration-500">{s.symbol}</span>
              </div>

              <div className="flex items-center gap-1.5 mb-2 opacity-30">
                <div className="flex-1 h-px bg-[#333]" />
                <span className="text-[4px] text-[#333]">✦</span>
                <div className="flex-1 h-px bg-[#333]" />
              </div>

              <div className="text-[8px] text-[#555] uppercase tracking-[0.2em] mb-1.5">{s.label}</div>
              <span className="text-2xl text-white font-bold tracking-wide block">{s.value}</span>
            </div>

            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(0,255,65,0.04) 0%, transparent 70%)" }} />
          </div>
        ))}
      </div>

      {/* ═══ SDK Integration ═══ */}
      <div
        className="max-w-4xl mx-auto mb-8 relative"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease 0.6s",
        }}
      >
        <div className="absolute inset-0 border-2 border-[#333]" style={{ background: "linear-gradient(180deg, #0c0c0c, #080808)" }} />
        <div className="absolute inset-[5px] border border-[#1a1a1a]" />

        {["top-[7px] left-[7px]","top-[7px] right-[7px]","bottom-[7px] left-[7px] rotate-180","bottom-[7px] right-[7px] rotate-180"].map((pos, i) => (
          <div key={i} className={`absolute ${pos} text-[6px] text-[#333]`}>◆</div>
        ))}

        <div className="relative">
          <div className="px-6 py-3 flex items-center gap-3 border-b border-[#1a1a1a]">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#555] font-bold">SDK Integration</span>
            <div className="flex-1" />
            <button
              onClick={handleCopy}
              className={`text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 border cursor-pointer transition-all duration-300 ${
                copied
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[rgba(0,255,65,0.05)]"
                  : "border-[#2a2a2a] text-[#444] hover:border-[#555] hover:text-[#888]"
              }`}
            >
              {copied ? "✦ Copied" : "Copy"}
            </button>
          </div>

          <pre className="px-6 py-5 text-[13px] text-[#bbb] leading-[1.8] font-mono overflow-x-auto">
            {snippet.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="w-6 text-right pr-4 text-[#2a2a2a] select-none shrink-0 text-[11px]">{i + 1}</span>
                <span className={
                  line.startsWith("import") || line.startsWith("const")
                    ? "text-[var(--accent-dim)]"
                    : line.startsWith("//") || line.startsWith("if")
                      ? "text-[#666]"
                      : line.includes('"')
                        ? "text-[#c8a87a]"
                        : "text-[#bbb]"
                }>{line || "\u00A0"}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* ═══ Compact Source — Collapsible ═══ */}
      {ruleset.compact && (
        <div
          className="max-w-4xl mx-auto mb-8 relative"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease 0.7s",
          }}
        >
          <div className="absolute inset-0 border-2 border-[#2a2a2a]" style={{ background: "linear-gradient(180deg, #0b0b0b, #070707)" }} />
          <div className="absolute inset-[5px] border border-[#161616]" />

          {["top-[7px] left-[7px]","top-[7px] right-[7px]","bottom-[7px] left-[7px] rotate-180","bottom-[7px] right-[7px] rotate-180"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} text-[6px] text-[#2a2a2a]`}>◆</div>
          ))}

          <div className="relative">
            <button
              onClick={() => setShowSource(!showSource)}
              className="w-full px-6 py-3 flex items-center gap-3 border-b border-[#161616] cursor-pointer hover:bg-[rgba(255,255,255,0.01)] transition-colors text-left"
            >
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#555] font-bold">Compact Source</span>
              <span className="text-[8px] text-[#333] font-mono">{ruleset.compact.split("\n").length} lines</span>
              <div className="flex-1" />
              <span className={`text-[10px] text-[#444] transition-transform duration-300 ${showSource ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            <div
              className="overflow-hidden transition-all duration-500"
              style={{
                maxHeight: showSource ? 400 : 0,
                opacity: showSource ? 1 : 0,
              }}
            >
              <pre className="px-6 py-4 text-[12px] leading-[1.8] font-mono overflow-x-auto max-h-[380px] overflow-y-auto">
                <code>
                  {ruleset.compact.split("\n").map((line: string, i: number) => (
                    <div key={i} className="flex">
                      <span className="w-8 text-right pr-4 text-[#222] select-none shrink-0 text-[10px]">
                        {i + 1}
                      </span>
                      <span
                        className={
                          line.trimStart().startsWith("//")
                            ? "text-[#444]"
                            : line.includes("export") || line.includes("pragma") || line.includes("import")
                              ? "text-[var(--accent-dim)]"
                              : line.includes("function") || line.includes("circuit")
                                ? "text-[#c8a87a]"
                                : "text-[#999]"
                        }
                      >
                        {line || "\u00A0"}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Quick Actions ═══ */}
      <div
        className="max-w-4xl mx-auto mb-8"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease 0.8s",
        }}
      >
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, #222 0 2px, transparent 2px 6px)" }} />
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#333]">✦ Actions ✦</span>
          <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, #222 0 2px, transparent 2px 6px)" }} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Run Verification */}
          <button
            onClick={async () => {
              setVerifying(true);
              setVerifyResult(null);
              setShowVerifyModal(true);
              try {
                const res = await fetch("/api/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ address: ruleset.address }),
                });
                const data = await res.json();
                setVerifyResult(data);
              } catch (e: any) {
                setVerifyResult({ error: e.message || "Verification failed" });
              } finally {
                setVerifying(false);
              }
            }}
            className="group relative cursor-pointer text-left transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 border border-[#222] group-hover:border-[var(--accent)] transition-colors duration-300" style={{ background: "#0a0a0a" }} />
            <div className="absolute inset-[3px] border border-[#151515] group-hover:border-[#222] transition-colors" />
            <div className="relative px-5 py-4 flex items-center gap-4">
              <span className="text-xl text-[#333] group-hover:text-[var(--accent)] transition-colors duration-300">⊕</span>
              <div>
                <span className="text-[11px] text-[#aaa] font-bold uppercase tracking-[0.1em] block group-hover:text-white transition-colors">Run Verification</span>
                <span className="text-[9px] text-[#333] tracking-wide group-hover:text-[#555] transition-colors">Submit a state transition for proof</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-[15%] right-[15%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.35), transparent)" }} />
          </button>

          {/* View on Explorer */}
          <button
            onClick={() => setShowExplorerModal(true)}
            className="group relative cursor-pointer text-left transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 border border-[#222] group-hover:border-[var(--accent)] transition-colors duration-300" style={{ background: "#0a0a0a" }} />
            <div className="absolute inset-[3px] border border-[#151515] group-hover:border-[#222] transition-colors" />
            <div className="relative px-5 py-4 flex items-center gap-4">
              <span className="text-xl text-[#333] group-hover:text-[var(--accent)] transition-colors duration-300">◈</span>
              <div>
                <span className="text-[11px] text-[#aaa] font-bold uppercase tracking-[0.1em] block group-hover:text-white transition-colors">View on Explorer</span>
                <span className="text-[9px] text-[#333] tracking-wide group-hover:text-[#555] transition-colors">Inspect on-chain contract state</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-[15%] right-[15%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.35), transparent)" }} />
          </button>

          {/* Export Config */}
          <button
            onClick={() => {
              const config = {
                name: ruleset.name,
                address: ruleset.address,
                tags: ruleset.tags,
                description: ruleset.description,
                deployedAt: ruleset.deployedAt,
                compact: ruleset.compact,
                sdk: {
                  package: "@verdict/sdk",
                  import: `import { Verdict } from "@verdict/sdk";`,
                  init: `const v = new Verdict("${ruleset.address}");`,
                },
                stats: {
                  totalChecks: ruleset.totalChecks,
                  totalFlagged: ruleset.totalFlagged,
                  flaggedRate,
                  integrityScore,
                },
              };
              const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${ruleset.name}-verdict-config.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="group relative cursor-pointer text-left transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 border border-[#222] group-hover:border-[var(--accent)] transition-colors duration-300" style={{ background: "#0a0a0a" }} />
            <div className="absolute inset-[3px] border border-[#151515] group-hover:border-[#222] transition-colors" />
            <div className="relative px-5 py-4 flex items-center gap-4">
              <span className="text-xl text-[#333] group-hover:text-[var(--accent)] transition-colors duration-300">⧉</span>
              <div>
                <span className="text-[11px] text-[#aaa] font-bold uppercase tracking-[0.1em] block group-hover:text-white transition-colors">Export Config</span>
                <span className="text-[9px] text-[#333] tracking-wide group-hover:text-[#555] transition-colors">Download circuit configuration</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-[15%] right-[15%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.35), transparent)" }} />
          </button>
        </div>
      </div>

      {/* ═══ Bottom Ornament ═══ */}
      <div className="mt-14 flex items-center justify-center gap-3 opacity-20">
        <div className="w-12 h-px bg-white" />
        <span className="text-[8px] text-white tracking-[0.3em]">◈ VERDICT ◈</span>
        <div className="w-12 h-px bg-white" />
      </div>

      {/* ═══ Verification Modal ═══ */}
      {showVerifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          style={{ backdropFilter: "blur(20px) saturate(0.6)", WebkitBackdropFilter: "blur(20px) saturate(0.6)", background: "rgba(0,0,0,0.18)" }}
          onClick={() => setShowVerifyModal(false)}
        >
          <div
            className="relative w-full max-w-lg mx-6"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "search-modal-in 0.22s cubic-bezier(0.16,1,0.3,1)" }}
          >
            <div className="absolute -inset-[1px] pointer-events-none"
              style={{ boxShadow: verifyResult?.verdict === "FLAGGED" ? "0 0 0 1px rgba(255,51,51,0.5), 0 0 60px rgba(255,51,51,0.1)" : "0 0 0 1px rgba(0,255,65,0.5), 0 0 60px rgba(0,255,65,0.1)" }} />

            <div className={`absolute inset-0 border-2 ${verifyResult?.verdict === "FLAGGED" ? "border-[var(--danger)]" : "border-[var(--accent)]"}`}
              style={{ background: "rgba(6,6,6,0.96)" }} />
            <div className="absolute inset-[5px] border border-[#1e1e1e]" />

            {["top-[8px] left-[8px]","top-[8px] right-[8px]","bottom-[8px] left-[8px] rotate-180","bottom-[8px] right-[8px] rotate-180"].map((pos, i) => (
              <div key={i} className={`absolute ${pos} text-[8px] ${verifyResult?.verdict === "FLAGGED" ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>◆</div>
            ))}

            <div className="relative">
              {/* Header */}
              <div className="px-6 py-4 flex items-center gap-3 border-b border-[#1a1a1a]">
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#555] font-bold">Verification Result</span>
                <div className="flex-1" />
                <button onClick={() => setShowVerifyModal(false)} className="text-[8px] uppercase tracking-[0.25em] text-[#333] hover:text-[#888] transition-colors cursor-pointer border border-[#1e1e1e] hover:border-[#333] px-2 py-1">ESC</button>
              </div>

              {verifying ? (
                <div className="px-6 py-12 text-center">
                  <span className="text-3xl text-[#222] block mb-4 animate-pulse">⊕</span>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#333]">Running ZK verification circuit...</p>
                  <p className="text-[8px] text-[#222] mt-2">Checking 10 integrity constraints</p>
                </div>
              ) : verifyResult?.error ? (
                <div className="px-6 py-8 text-center">
                  <span className="text-2xl text-[var(--danger)] block mb-3">✕</span>
                  <p className="text-[11px] text-[var(--danger)] font-bold uppercase tracking-[0.15em]">{verifyResult.error}</p>
                </div>
              ) : verifyResult ? (
                <div className="px-6 py-5">
                  {/* Verdict badge */}
                  <div className="text-center mb-5">
                    <span className={`text-3xl block mb-2 ${verifyResult.verdict === "CLEAN" ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                      {verifyResult.verdict === "CLEAN" ? "✦" : "⚠"}
                    </span>
                    <span className={`text-[14px] font-bold uppercase tracking-[0.25em] ${verifyResult.verdict === "CLEAN" ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                      {verifyResult.verdict}
                    </span>
                    <p className="text-[9px] text-[#444] mt-1">
                      {verifyResult.checksPassed}/{verifyResult.checksRun} checks passed
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2 mb-4 opacity-30">
                    <div className="flex-1 h-px bg-[#333]" />
                    <span className="text-[5px] text-[#333]">◈</span>
                    <div className="flex-1 h-px bg-[#333]" />
                  </div>

                  {/* Check details */}
                  <div className="space-y-1 mb-4">
                    {verifyResult.details?.map((check: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 px-2 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                        <span className={`w-2 h-2 shrink-0 ${check.passed ? "bg-[var(--accent)]" : "bg-[var(--danger)]"}`} />
                        <span className="text-[10px] text-[#777] font-mono flex-1">{check.name}</span>
                        <span className={`text-[9px] uppercase tracking-wider font-bold ${check.passed ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                          {check.passed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Proof hash */}
                  <div className="flex items-center gap-2 opacity-30 mb-3">
                    <div className="flex-1 h-px bg-[#333]" />
                    <span className="text-[5px] text-[#333]">✦</span>
                    <div className="flex-1 h-px bg-[#333]" />
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] uppercase tracking-[0.2em] text-[#333]">Proof Hash</span>
                    <p className="text-[9px] font-mono text-[#444] mt-1 break-all">{verifyResult.proofHash}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Explorer Modal ═══ */}
      {showExplorerModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          style={{ backdropFilter: "blur(20px) saturate(0.6)", WebkitBackdropFilter: "blur(20px) saturate(0.6)", background: "rgba(0,0,0,0.18)" }}
          onClick={() => setShowExplorerModal(false)}
        >
          <div
            className="relative w-full max-w-lg mx-6"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "search-modal-in 0.22s cubic-bezier(0.16,1,0.3,1)" }}
          >
            <div className="absolute -inset-[1px] pointer-events-none"
              style={{ boxShadow: "0 0 0 1px rgba(0,255,65,0.5), 0 0 60px rgba(0,255,65,0.1)" }} />
            <div className="absolute inset-0 border-2 border-[var(--accent)]" style={{ background: "rgba(6,6,6,0.96)" }} />
            <div className="absolute inset-[5px] border border-[#1e1e1e]" />

            {["top-[8px] left-[8px]","top-[8px] right-[8px]","bottom-[8px] left-[8px] rotate-180","bottom-[8px] right-[8px] rotate-180"].map((pos, i) => (
              <div key={i} className={`absolute ${pos} text-[8px] text-[var(--accent)]`}>◆</div>
            ))}

            <div className="relative">
              <div className="px-6 py-4 flex items-center gap-3 border-b border-[#1a1a1a]">
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#555] font-bold">On-Chain State</span>
                <div className="flex-1" />
                <button onClick={() => setShowExplorerModal(false)} className="text-[8px] uppercase tracking-[0.25em] text-[#333] hover:text-[#888] transition-colors cursor-pointer border border-[#1e1e1e] hover:border-[#333] px-2 py-1">ESC</button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Contract info */}
                {[
                  { label: "Contract Address", value: ruleset.address },
                  { label: "Network", value: "midnight-local (simulator)" },
                  { label: "Deployed At", value: new Date(ruleset.deployedAt).toLocaleString() },
                  { label: "Guardians", value: `${checkCount}` },
                  { label: "Total Checks", value: String(ruleset.totalChecks) },
                  { label: "Total Flagged", value: String(ruleset.totalFlagged) },
                  { label: "Flagged Rate", value: `${flaggedRate}%` },
                  { label: "Integrity Score", value: `${integrityScore}%` },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-[#111] last:border-b-0">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#444] shrink-0">{row.label}</span>
                    <span className="text-[10px] text-[#aaa] font-mono text-right break-all">{row.value}</span>
                  </div>
                ))}

                {/* Divider */}
                <div className="flex items-center gap-2 opacity-30">
                  <div className="flex-1 h-px bg-[#333]" />
                  <span className="text-[5px] text-[#333]">✦</span>
                  <div className="flex-1 h-px bg-[#333]" />
                </div>

                {/* Ledger state */}
                <div>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#333] block mb-2">Ledger State</span>
                  <pre className="text-[10px] font-mono text-[#666] leading-relaxed bg-[#080808] border border-[#151515] p-3 overflow-x-auto">
{`totalChecks:    ${ruleset.totalChecks}
totalFlagged:   ${ruleset.totalFlagged}
lastVerdict:    ${ruleset.totalFlagged > 0 ? "1 (FLAGGED)" : "0 (CLEAN)"}
sessionActive:  true
commitment:     0x${ruleset.address.slice(0, 16)}...
lastChainHash:  0x${ruleset.address.slice(16, 32)}...`}
                  </pre>
                </div>

                <p className="text-[8px] text-[#2a2a2a] text-center tracking-wide">
                  Running on local simulator — deploy to preview/preprod for on-chain state
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
