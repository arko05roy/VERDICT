"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";

type Ruleset = {
  address: string;
  name: string;
  description: string;
  tags: string[];
  enabledChecks: string[];
  checkCount: number;
  deployedAt: string;
  totalChecks: number;
  totalFlagged: number;
  flaggedRate: string;
  status: string;
  // Legacy
  category?: string;
};

const STATUS_OPTIONS = ["active", "paused", "sealed"];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most-checks", label: "Most Verified" },
  { value: "most-flagged", label: "Most Flagged" },
  { value: "name-asc", label: "Name A→Z" },
];

export default function ExplorePage() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
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

  const toggleStatus = (s: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = rulesets.filter(
      (r) =>
        (r.name.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.tags || []).some((t: string) => t.toLowerCase().includes(q)) ||
          (r.category || "").toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)) &&
        (selectedStatuses.length === 0 || selectedStatuses.includes(r.status))
    );

    switch (sortBy) {
      case "oldest":
        result = [...result].reverse();
        break;
      case "most-checks":
        result = [...result].sort((a, b) => b.totalChecks - a.totalChecks);
        break;
      case "most-flagged":
        result = [...result].sort((a, b) => b.totalFlagged - a.totalFlagged);
        break;
      case "name-asc":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [rulesets, search, selectedStatuses, sortBy]);

  const activeFilterCount = selectedStatuses.length;

  const romanNumerals = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
  ];

  return (
    <div className="p-6 relative min-h-screen">
      {/* ═══ Header ═══ */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4 opacity-30">
          <div className="w-16 h-px bg-white" />
          <span className="text-white text-[10px]">◈</span>
          <div className="w-16 h-px bg-white" />
        </div>
        <h1 className="text-lg text-white font-bold tracking-[0.2em] uppercase">
          Explore Rulesets
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 tracking-wide">
          Browse the arcana of deployed rule enforcement circuits on the network.
        </p>
      </div>

      {/* ═══ Search Trigger ═══ */}
      <div className="max-w-2xl mx-auto mb-8">
        <button
          onClick={() => { setSearchOpen(true); setTimeout(() => modalInputRef.current?.focus(), 50); }}
          className="group relative w-full cursor-pointer text-left"
        >
          {/* Layered tarot borders */}
          <div className={`absolute inset-0 border-2 transition-all duration-400 ${search ? "border-[var(--accent)]" : "border-[#2e2e2e] group-hover:border-[#484848]"}`}
            style={{ background: "linear-gradient(135deg, #0c0c0c 0%, #080808 100%)" }} />
          <div className={`absolute inset-[5px] border transition-colors duration-400 ${search ? "border-[#2a2a2a]" : "border-[#181818] group-hover:border-[#252525]"}`} />

          {/* Corner ◆ ornaments */}
          {["top-[8px] left-[8px]","top-[8px] right-[8px]","bottom-[8px] left-[8px] rotate-180","bottom-[8px] right-[8px] rotate-180"].map((pos,i) => (
            <div key={i} className={`absolute ${pos} text-[7px] transition-colors duration-300 ${search ? "text-[var(--accent)]" : "text-[#3a3a3a] group-hover:text-[#666]"}`}>◆</div>
          ))}

          {/* Top edge ✦ */}
          <div className={`absolute top-[8px] left-1/2 -translate-x-1/2 text-[5px] transition-colors ${search ? "text-[var(--accent-dim)]" : "text-[#2a2a2a] group-hover:text-[#444]"}`}>✦</div>

          <div className="relative flex items-center px-6 py-[18px] gap-4">
            {/* Lens icon */}
            <svg className={`w-[18px] h-[18px] shrink-0 transition-colors duration-300 ${search ? "text-[var(--accent)]" : "text-[#444] group-hover:text-[#888]"}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5 L21 21" strokeLinecap="square" />
            </svg>

            <span className={`flex-1 text-[13px] font-mono tracking-[0.04em] transition-colors duration-300 ${search ? "text-[#e0e0e0]" : "text-[#3a3a3a] group-hover:text-[#666]"}`}>
              {search || "Seek a ruleset by name, tag, or address\u2026"}
            </span>

            {search ? (
              <button onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                className="text-[#555] hover:text-white transition-colors text-[10px] cursor-pointer border border-[#2a2a2a] px-1.5 py-0.5 hover:border-[#555]">
                ✕
              </button>
            ) : (
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#2a2a2a] group-hover:text-[#444] transition-colors font-mono border border-[#1e1e1e] group-hover:border-[#333] px-2 py-1">
                Click to Search
              </span>
            )}

            <div className="w-px h-5 bg-[#1e1e1e]" />

            <span
              onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
              className={`text-[9px] uppercase tracking-[0.25em] transition-colors cursor-pointer flex items-center gap-2 ${
                showFilters || activeFilterCount > 0 ? "text-[var(--accent)]" : "text-[#3a3a3a] group-hover:text-[#666]"
              }`}
            >
              ⊞ Filters
              {activeFilterCount > 0 && (
                <span className="bg-[var(--accent)] text-black text-[8px] px-1.5 py-0.5 font-bold">{activeFilterCount}</span>
              )}
            </span>
          </div>

          {/* Bottom glow strip on hover */}
          <div className="absolute bottom-0 left-[20%] right-[20%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.4), transparent)" }} />
        </button>
      </div>

      {/* ═══ Filters Panel ═══ */}
      <div
        className="max-w-2xl mx-auto overflow-hidden transition-all duration-500"
        style={{
          maxHeight: showFilters ? 300 : 0,
          opacity: showFilters ? 1 : 0,
          marginBottom: showFilters ? 32 : 0,
        }}
      >
        <div className="relative border border-[var(--border)] p-5" style={{ background: "var(--bg-secondary)" }}>
          {/* Noise overlay */}
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: "128px 128px",
            }}
          />

          <div className="relative">
            {/* Status */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">Status</span>
                <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, var(--border) 0 2px, transparent 2px 6px)" }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => {
                  const active = selectedStatuses.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`cursor-pointer transition-all duration-300 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border ${
                        active
                          ? "border-[var(--accent)] text-[var(--accent)] bg-[rgba(0,255,65,0.05)]"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-bright)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">Sort By</span>
                <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, var(--border) 0 2px, transparent 2px 6px)" }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`cursor-pointer transition-all duration-300 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border ${
                      sortBy === opt.value
                        ? "border-white text-white bg-[rgba(255,255,255,0.05)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-bright)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    setSelectedStatuses([]);
                  }}
                  className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                >
                  ✕ Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Results Count & Active Tags ═══ */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {filtered.length} ruleset{filtered.length !== 1 ? "s" : ""} found
            </span>
            {selectedStatuses.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className="text-[9px] uppercase tracking-wider text-[var(--accent)] border border-[var(--accent)] px-2 py-0.5 flex items-center gap-1.5 cursor-pointer hover:bg-[rgba(0,255,65,0.05)] transition-colors"
              >
                {s}
                <span className="text-[8px] opacity-60">✕</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 opacity-40">
            <div className="w-8 h-px bg-white" />
            <span className="text-[8px] text-white">✦</span>
            <div className="w-8 h-px bg-white" />
          </div>
        </div>
      </div>

      {/* ═══ Ruleset Cards — Tarot Grid ═══ */}
      {filtered.length === 0 ? (
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="relative inline-block" style={{ width: 180, height: 260 }}>
            <div className="absolute inset-0 border border-[var(--border)] border-dashed" style={{ background: "var(--bg-secondary)" }} />
            <div className="absolute inset-[5px] border border-[var(--border)] border-dashed" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-3xl text-[var(--border-bright)] block mb-3">◈</span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
                  {rulesets.length === 0 ? "No cards drawn" : "No matches"}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-6 tracking-wide">
            {rulesets.length === 0
              ? "The deck is empty. Visit Deploy to inscribe your first ruleset."
              : "No rulesets match your divination. Adjust your search or filters."}
          </p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6">
          {filtered.map((r, idx) => {
            const checkCount = r.checkCount || 10;
            const numeral = romanNumerals[idx % romanNumerals.length];

            return (
              <Link
                href={`/explore/${encodeURIComponent(r.address)}`}
                key={r.address}
                className="group relative cursor-pointer transition-all duration-500 hover:-translate-y-3 block"
                style={{
                  height: 340,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(8px)",
                  transition: `opacity 0.4s ease ${idx * 60}ms, transform 0.4s ease ${idx * 60}ms, box-shadow 0.5s`,
                  filter: "drop-shadow(0 0 0px transparent)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 4px 30px rgba(0,255,65,0.12))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "drop-shadow(0 0 0px transparent)";
                }}
              >
                {/* Outer border — brighter */}
                <div
                  className="absolute inset-0 border-2 border-[#444] group-hover:border-[var(--accent)] transition-colors duration-500"
                  style={{ background: "linear-gradient(180deg, #0d0d0d 0%, #080808 100%)" }}
                />
                {/* Inner border */}
                <div className="absolute inset-[5px] border border-[#2a2a2a] group-hover:border-[#555] transition-colors duration-500" />
                {/* Third inner border — extra ornate */}
                <div className="absolute inset-[9px] border border-[#1a1a1a] group-hover:border-[#333] transition-colors duration-500 opacity-60" />

                {/* Corner ornaments — brighter, larger */}
                <div className="absolute top-[7px] left-[7px] text-[8px] text-[#555] group-hover:text-[var(--accent)] transition-colors duration-300">◆</div>
                <div className="absolute top-[7px] right-[7px] text-[8px] text-[#555] group-hover:text-[var(--accent)] transition-colors duration-300">◆</div>
                <div className="absolute bottom-[7px] left-[7px] text-[8px] text-[#555] group-hover:text-[var(--accent)] transition-colors duration-300 rotate-180">◆</div>
                <div className="absolute bottom-[7px] right-[7px] text-[8px] text-[#555] group-hover:text-[var(--accent)] transition-colors duration-300 rotate-180">◆</div>

                {/* Edge midpoint ornaments */}
                <div className="absolute top-[7px] left-1/2 -translate-x-1/2 text-[5px] text-[#333] group-hover:text-[var(--accent-dim)] transition-colors">✦</div>
                <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 text-[5px] text-[#333] group-hover:text-[var(--accent-dim)] transition-colors">✦</div>
                <div className="absolute left-[7px] top-1/2 -translate-y-1/2 text-[5px] text-[#333] group-hover:text-[var(--accent-dim)] transition-colors">✦</div>
                <div className="absolute right-[7px] top-1/2 -translate-y-1/2 text-[5px] text-[#333] group-hover:text-[var(--accent-dim)] transition-colors">✦</div>

                {/* Numeral */}
                <div className="absolute top-[20px] left-0 right-0 text-center">
                  <span className="text-[10px] tracking-[0.3em] text-[#666] group-hover:text-[#aaa] transition-colors font-bold">
                    {numeral}
                  </span>
                </div>

                {/* Top decorative line — brighter */}
                <div className="absolute top-[35px] left-[18px] right-[18px] flex items-center gap-2 opacity-40 group-hover:opacity-70 transition-opacity">
                  <div className="flex-1 h-px bg-[#444]" />
                  <span className="text-[6px] text-[#555]">✦</span>
                  <div className="flex-1 h-px bg-[#444]" />
                </div>

                {/* Guardian count — large center */}
                <div className="absolute top-[48px] left-0 right-0 text-center text-[#555] group-hover:text-[var(--accent)] transition-colors duration-500">
                  <span className="text-5xl" style={{ textShadow: "0 0 0px transparent" }}>{"\u25C7"}</span>
                </div>

                {/* Guardian count tag */}
                <div className="absolute top-[108px] left-0 right-0 text-center">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-[#777] border border-[#333] px-2.5 py-0.5 group-hover:border-[var(--accent-dim)] group-hover:text-[var(--accent)] transition-colors">
                    {checkCount} guardian{checkCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Mid divider */}
                <div className="absolute bottom-[148px] left-[18px] right-[18px] flex items-center gap-2 opacity-30 group-hover:opacity-60 transition-opacity">
                  <div className="flex-1 h-px bg-[#444]" />
                  <span className="text-[5px] text-[#555]">◈</span>
                  <div className="flex-1 h-px bg-[#444]" />
                </div>

                {/* Name — brighter text */}
                <div className="absolute bottom-[118px] left-[16px] right-[16px] text-center">
                  <span className="text-[12px] uppercase tracking-[0.12em] text-[#ccc] font-bold group-hover:text-white transition-colors leading-tight block">
                    {r.name.length > 26 ? r.name.slice(0, 26) + "..." : r.name}
                  </span>
                </div>

                {/* Address */}
                <div className="absolute bottom-[100px] left-[16px] right-[16px] text-center">
                  <span className="text-[9px] font-mono text-[#555]">
                    {r.address.slice(0, 8)}...{r.address.slice(-4)}
                  </span>
                </div>

                {/* Stats divider */}
                <div className="absolute bottom-[88px] left-[18px] right-[18px] flex items-center gap-2 opacity-25 group-hover:opacity-50 transition-opacity">
                  <div className="flex-1 h-px bg-[#444]" />
                  <span className="text-[5px] text-[#555]">✦</span>
                  <div className="flex-1 h-px bg-[#444]" />
                </div>

                {/* Stats row — brighter values */}
                <div className="absolute bottom-[42px] left-[20px] right-[20px]">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <span className="text-[15px] text-[#ddd] font-bold block group-hover:text-white transition-colors">
                        {r.totalChecks}
                      </span>
                      <span className="text-[7px] uppercase tracking-[0.2em] text-[#555]">
                        Verified
                      </span>
                    </div>
                    <div className="w-px h-7 bg-[#2a2a2a]" />
                    <div className="text-center">
                      <span className="text-[15px] text-[#ddd] font-bold block">
                        {r.flaggedRate}
                      </span>
                      <span className="text-[7px] uppercase tracking-[0.2em] text-[#555]">
                        Flagged
                      </span>
                    </div>
                    <div className="w-px h-7 bg-[#2a2a2a]" />
                    <div className="text-center flex flex-col items-center">
                      <span className="w-2 h-2 bg-[var(--accent)] live-dot mb-1" />
                      <span className="text-[7px] uppercase tracking-[0.2em] text-[#555]">
                        {r.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom decorative line */}
                <div className="absolute bottom-[38px] left-[18px] right-[18px] flex items-center gap-1.5 opacity-25 group-hover:opacity-50 transition-opacity">
                  <div className="flex-1 h-px bg-[#444]" />
                  <span className="text-[5px] text-[#555]">✦</span>
                  <div className="flex-1 h-px bg-[#444]" />
                </div>

                {/* "Reveal" hint */}
                <div className="absolute bottom-[20px] left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[var(--accent)]">
                    ✦ Reveal ✦
                  </span>
                </div>

                {/* Glow effect on hover — stronger */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(0,255,65,0.06) 0%, transparent 60%)",
                  }}
                />
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══ Bottom Ornament ═══ */}
      <div className="mt-14 flex items-center justify-center gap-3 opacity-20">
        <div className="w-12 h-px bg-white" />
        <span className="text-[8px] text-white tracking-[0.3em]">◈ VERDICT ◈</span>
        <div className="w-12 h-px bg-white" />
      </div>

      {/* ═══ Search Modal ═══ */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
          style={{
            backdropFilter: "blur(20px) saturate(0.6)",
            WebkitBackdropFilter: "blur(20px) saturate(0.6)",
            background: "rgba(0,0,0,0.18)",
          }}
          onClick={() => setSearchOpen(false)}
        >
          {/* Modal container */}
          <div
            className="relative w-full max-w-xl mx-6"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "search-modal-in 0.22s cubic-bezier(0.16,1,0.3,1)" }}
          >
            {/* Outer glow ring */}
            <div className="absolute -inset-[1px] pointer-events-none"
              style={{ boxShadow: "0 0 0 1px rgba(0,255,65,0.5), 0 0 60px rgba(0,255,65,0.1), 0 30px 80px rgba(0,0,0,0.6)" }} />

            {/* Card body */}
            <div className="absolute inset-0 border-2 border-[var(--accent)]"
              style={{ background: "rgba(6,6,6,0.96)" }} />
            <div className="absolute inset-[5px] border border-[#1e1e1e]" />

            {/* Corner ◆ */}
            <div className="absolute top-[8px] left-[8px] text-[8px] text-[var(--accent)]">◆</div>
            <div className="absolute top-[8px] right-[8px] text-[8px] text-[var(--accent)]">◆</div>
            <div className="absolute bottom-[8px] left-[8px] text-[8px] text-[var(--accent)] rotate-180">◆</div>
            <div className="absolute bottom-[8px] right-[8px] text-[8px] text-[var(--accent)] rotate-180">◆</div>
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 text-[6px] text-[var(--accent-dim)]">✦</div>
            <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 text-[6px] text-[var(--accent-dim)]">✦</div>

            <div className="relative">
              {/* Input row */}
              <div className="flex items-center px-5 py-4 gap-3">
                <svg className="w-4 h-4 text-[var(--accent)] shrink-0"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16.5 16.5 L21 21" strokeLinecap="square" />
                </svg>

                <input
                  ref={modalInputRef}
                  className="flex-1 bg-transparent text-[15px] text-white placeholder-[#333] outline-none font-mono tracking-[0.03em] caret-[var(--accent)]"
                  placeholder="Seek a ruleset…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false); }}
                />

                {search && (
                  <button onClick={() => setSearch("")}
                    className="text-[#444] hover:text-white transition-colors text-[10px] cursor-pointer border border-[#222] hover:border-[#555] px-1.5 py-0.5">
                    ✕
                  </button>
                )}

                <button onClick={() => setSearchOpen(false)}
                  className="text-[8px] uppercase tracking-[0.25em] text-[#333] hover:text-[#888] transition-colors cursor-pointer border border-[#1e1e1e] hover:border-[#333] px-2 py-1 font-mono">
                  ESC
                </button>
              </div>

              {/* Accent divider */}
              <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.3), transparent)" }} />

              {/* Live results */}
              <div className="max-h-64 overflow-y-auto">
                {search === "" ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-[9px] text-[#2a2a2a] uppercase tracking-[0.3em]">
                      Begin typing to divine your results
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-[9px] text-[#2a2a2a] uppercase tracking-[0.3em]">No rulesets match</p>
                  </div>
                ) : (
                  filtered.slice(0, 6).map((r) => {
                    return (
                      <Link
                        href={`/explore/${encodeURIComponent(r.address)}`}
                        key={r.address}
                        onClick={() => setSearchOpen(false)}
                        className="group flex items-center gap-4 px-5 py-3 border-b border-[#111] last:border-b-0 hover:bg-[rgba(0,255,65,0.03)] transition-colors"
                        style={{ borderLeft: "2px solid transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = "var(--accent)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = "transparent")}
                      >
                        <span className="text-lg text-[#333] group-hover:text-[var(--accent)] transition-colors duration-300 w-5 text-center shrink-0">{"\u25C7"}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-[#aaa] font-bold uppercase tracking-[0.1em] group-hover:text-white transition-colors block truncate">{r.name}</span>
                          <span className="text-[8px] text-[#333] font-mono">{r.address.slice(0, 10)}…{r.address.slice(-4)}</span>
                        </div>
                        <span className="text-[7px] uppercase tracking-[0.2em] text-[#333] border border-[#1a1a1a] px-2 py-0.5 shrink-0 group-hover:border-[#333] group-hover:text-[#555] transition-colors">{r.checkCount || 10}g</span>
                        <span className="text-[8px] text-[#2a2a2a] group-hover:text-[#555] transition-colors shrink-0 font-mono">{r.totalChecks}p</span>
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.15), transparent)" }} />
              <div className="px-5 py-3 flex items-center gap-3">
                <span className="text-[7px] uppercase tracking-[0.25em] text-[#222]">
                  {search ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : `${rulesets.length} total`}
                </span>
                <div className="flex-1" />
                <span className="text-[7px] text-[#1e1e1e] uppercase tracking-[0.2em]">↵ visit · ESC close</span>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
