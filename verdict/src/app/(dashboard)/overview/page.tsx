"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";

type FeedEntry = {
  ruleset: string;
  player: string;
  verdict: string;
  checks: string;
  time: string;
  block: number;
  totalChecks: number;
  totalFlagged: number;
};

type FeedResponse = {
  entries: FeedEntry[];
  blockHeight: number;
  rulesetCount: number;
};

type NetworkStatus = {
  nodeHealthy: boolean;
  indexerHealthy: boolean;
  proofServerHealthy: boolean;
  blockHeight: number | null;
};

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
  category?: string;
};

export default function OverviewPage() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [blockHeight, setBlockHeight] = useState(0);
  const [rulesetCount, setRulesetCount] = useState(0);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [mounted, setMounted] = useState(false);
  const wallet = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const res = await fetch("/api/feed");
        const data: FeedResponse = await res.json();
        setFeed(data.entries || []);
        setBlockHeight(data.blockHeight || 0);
        setRulesetCount(data.rulesetCount || 0);
      } catch {}
    }
    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/status");
        const data: NetworkStatus = await res.json();
        setNetwork(data);
      } catch {}
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

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

  const totalChecks = feed.reduce((sum, e) => sum + (e.totalChecks || 0), 0);
  const totalFlagged = feed.reduce((sum, e) => sum + (e.totalFlagged || 0), 0);
  const flaggedRate =
    totalChecks > 0 ? ((totalFlagged / totalChecks) * 100).toFixed(2) : "0.00";

  const allHealthy =
    network !== null &&
    network.nodeHealthy &&
    network.indexerHealthy &&
    network.proofServerHealthy;

  const STATS = [
    { label: "Rulesets Deployed", value: String(rulesetCount), delta: "on-chain", numeral: "I", symbol: "♜" },
    { label: "Total Verifications", value: String(totalChecks), delta: "proofs", numeral: "II", symbol: "⊕" },
    { label: "Block Height", value: blockHeight.toLocaleString(), delta: "live", numeral: "III", symbol: "◈" },
    { label: "Flagged Rate", value: `${flaggedRate}%`, delta: "avg", numeral: "IV", symbol: "⚑" },
  ];

  const services = [
    { name: "Node", healthy: network?.nodeHealthy },
    { name: "Indexer", healthy: network?.indexerHealthy },
    { name: "Proof Server", healthy: network?.proofServerHealthy },
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
          Protocol Overview
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 tracking-wide">
          The all-seeing eye. Real-time protocol activity on Midnight.
        </p>
      </div>

      {/* ═══ Wallet Card ═══ */}
      {wallet.isConnected && wallet.address && (
        <div
          className="relative mb-6"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease 0.3s",
          }}
        >
          <div className="absolute inset-0 border border-[var(--accent)]" style={{ background: "var(--bg-secondary)" }} />
          <div className="absolute inset-[3px] border border-[var(--border)]" />
          <div className="absolute top-[5px] left-[5px] text-[5px] text-[var(--accent-dim)]">◆</div>
          <div className="absolute top-[5px] right-[5px] text-[5px] text-[var(--accent-dim)]">◆</div>
          <div className="absolute bottom-[5px] left-[5px] text-[5px] text-[var(--accent-dim)] rotate-180">◆</div>
          <div className="absolute bottom-[5px] right-[5px] text-[5px] text-[var(--accent-dim)] rotate-180">◆</div>

          <div className="relative flex items-center px-6 py-3 gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[var(--accent)] live-dot" />
              <span className="text-[9px] text-[var(--accent)] uppercase tracking-[0.2em] font-bold">
                Wallet Connected
              </span>
            </div>
            <div className="w-px h-4 bg-[var(--border)]" />
            <span className="text-[10px] text-[var(--text-secondary)] font-mono" title={wallet.address}>
              {wallet.address.slice(0, 16)}...{wallet.address.slice(-8)}
            </span>
            <div className="w-px h-4 bg-[var(--border)]" />
            <span className="text-[10px] text-[var(--text-secondary)]">
              {BigInt(wallet.balance).toLocaleString()} tNight
            </span>
            <div className="w-px h-4 bg-[var(--border)]" />
            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
              Preprod
            </span>
            <div className="ml-auto">
              <a
                href="https://faucet.preprod.midnight.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors border border-[var(--border)] hover:border-[var(--accent-dim)] px-2 py-1"
              >
                Get tNight from Faucet →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Stats — Tarot-style cards ═══ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATS.map((s, idx) => (
          <div
            key={s.label}
            className="group relative transition-all duration-500 hover:-translate-y-1"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 0.4s ease ${idx * 80}ms, transform 0.4s ease ${idx * 80}ms`,
            }}
          >
            {/* Outer border */}
            <div className="absolute inset-0 border border-[var(--border-bright)] group-hover:border-[var(--accent)] transition-colors duration-500" style={{ background: "var(--bg-secondary)" }} />
            {/* Inner border */}
            <div className="absolute inset-[4px] border border-[var(--border)] group-hover:border-[var(--border-bright)] transition-colors duration-500" />

            {/* Corner ornaments */}
            <div className="absolute top-[6px] left-[6px] text-[6px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors">◆</div>
            <div className="absolute top-[6px] right-[6px] text-[6px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors">◆</div>
            <div className="absolute bottom-[6px] left-[6px] text-[6px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors rotate-180">◆</div>
            <div className="absolute bottom-[6px] right-[6px] text-[6px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors rotate-180">◆</div>

            <div className="relative px-5 py-5">
              {/* Numeral + Symbol row */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[8px] tracking-[0.3em] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">{s.numeral}</span>
                <span className="text-lg text-[var(--border-bright)] group-hover:text-[var(--accent)] transition-colors duration-500">{s.symbol}</span>
              </div>

              {/* Decorative line */}
              <div className="flex items-center gap-1.5 mb-3 opacity-25">
                <div className="flex-1 h-px bg-[var(--border-bright)]" />
                <span className="text-[5px] text-[var(--border-bright)]">✦</span>
                <div className="flex-1 h-px bg-[var(--border-bright)]" />
              </div>

              <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">
                {s.label}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-white font-bold tracking-wide">{s.value}</span>
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">{s.delta}</span>
              </div>
            </div>

            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(0,255,65,0.04) 0%, transparent 70%)" }}
            />
          </div>
        ))}
      </div>

      {/* ═══ Network Status — Ornate bar ═══ */}
      <div
        className="relative mb-6"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease 0.4s",
        }}
      >
        <div className="absolute inset-0 border border-[var(--border-bright)]" style={{ background: "var(--bg-secondary)" }} />
        <div className="absolute inset-[3px] border border-[var(--border)]" />

        {/* Corner ornaments */}
        <div className="absolute top-[5px] left-[5px] text-[5px] text-[var(--text-muted)]">◆</div>
        <div className="absolute top-[5px] right-[5px] text-[5px] text-[var(--text-muted)]">◆</div>
        <div className="absolute bottom-[5px] left-[5px] text-[5px] text-[var(--text-muted)] rotate-180">◆</div>
        <div className="absolute bottom-[5px] right-[5px] text-[5px] text-[var(--text-muted)] rotate-180">◆</div>

        <div className="relative flex items-center px-6 py-3 gap-8">
          <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
            Network
          </span>

          <div className="w-px h-4 bg-[var(--border)]" />

          {services.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span
                className={`w-2 h-2 ${
                  network === null
                    ? "bg-[var(--text-muted)]"
                    : s.healthy
                      ? "bg-[var(--accent)] live-dot"
                      : "bg-[var(--danger)]"
                }`}
              />
              <span className="text-[10px] text-[var(--text-secondary)] tracking-wide">
                {s.name}
              </span>
            </div>
          ))}

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 opacity-30">
              <div className="w-6 h-px bg-white" />
              <span className="text-[5px] text-white">✦</span>
              <div className="w-6 h-px bg-white" />
            </div>
            <span className={`text-[9px] uppercase tracking-[0.15em] ${
              network === null
                ? "text-[var(--text-muted)]"
                : allHealthy
                  ? "text-[var(--accent)]"
                  : "text-[var(--danger)]"
            }`}>
              {network === null
                ? "checking..."
                : allHealthy
                  ? "✦ all systems operational ✦"
                  : "⚠ degraded"}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Main content: Feed + Recent Deployments ═══ */}
      <div className="grid grid-cols-[3fr_2fr] gap-5">
        {/* Live Feed */}
        <div
          className="relative"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease 0.5s",
          }}
        >
          <div className="absolute inset-0 border border-[var(--border-bright)]" style={{ background: "var(--bg-secondary)" }} />
          <div className="absolute inset-[4px] border border-[var(--border)]" />

          {/* Corner ornaments */}
          <div className="absolute top-[6px] left-[6px] text-[6px] text-[var(--text-muted)]">◆</div>
          <div className="absolute top-[6px] right-[6px] text-[6px] text-[var(--text-muted)]">◆</div>
          <div className="absolute bottom-[6px] left-[6px] text-[6px] text-[var(--text-muted)] rotate-180">◆</div>
          <div className="absolute bottom-[6px] right-[6px] text-[6px] text-[var(--text-muted)] rotate-180">◆</div>

          <div className="relative">
            {/* Header */}
            <div className="px-6 py-3 border-b border-[var(--border)] flex items-center gap-3">
              <span className="w-2 h-2 bg-[var(--accent)] live-dot" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Live Verification Feed
              </span>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 opacity-25">
                <div className="flex-1 h-px bg-[var(--border-bright)]" />
                <span className="text-[5px] text-[var(--border-bright)]">✦</span>
                <div className="flex-1 h-px bg-[var(--border-bright)]" />
              </div>
              <span className="text-[8px] text-[var(--text-muted)] tracking-wider uppercase">
                polling 5s
              </span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2fr_80px_80px_80px] px-6 py-2 border-b border-[var(--border)]">
              {["Ruleset", "Verdict", "Checks", "Time"].map((h) => (
                <span key={h} className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div className="max-h-[400px] overflow-y-auto">
              {feed.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <span className="text-2xl text-[var(--border-bright)] block mb-3">◈</span>
                  <p className="text-[11px] text-[var(--text-muted)] tracking-wide">
                    No verifications yet. Deploy a ruleset to begin.
                  </p>
                </div>
              ) : (
                feed.map((r, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[2fr_80px_80px_80px] items-center px-6 py-2.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors ${
                      r.verdict === "FLAGGED" ? "border-l-2 border-l-[var(--danger)]" : "border-l-2 border-l-transparent"
                    }`}
                    style={{
                      animation: `feed-in 0.3s ease-out ${i * 30}ms both`,
                    }}
                  >
                    <span className="text-xs text-[var(--text-primary)] truncate pr-2">
                      {r.ruleset}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold ${
                        r.verdict === "CLEAN"
                          ? "text-[var(--accent)]"
                          : "text-[var(--danger)]"
                      }`}
                    >
                      {r.verdict === "CLEAN" ? "✦ CLEAN" : "⚠ FLAGGED"}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {r.checks}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {r.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Deployments — Mini tarot cards */}
        <div
          className="relative"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease 0.6s",
          }}
        >
          <div className="absolute inset-0 border border-[var(--border-bright)]" style={{ background: "var(--bg-secondary)" }} />
          <div className="absolute inset-[4px] border border-[var(--border)]" />

          {/* Corner ornaments */}
          <div className="absolute top-[6px] left-[6px] text-[6px] text-[var(--text-muted)]">◆</div>
          <div className="absolute top-[6px] right-[6px] text-[6px] text-[var(--text-muted)]">◆</div>
          <div className="absolute bottom-[6px] left-[6px] text-[6px] text-[var(--text-muted)] rotate-180">◆</div>
          <div className="absolute bottom-[6px] right-[6px] text-[6px] text-[var(--text-muted)] rotate-180">◆</div>

          <div className="relative">
            {/* Header */}
            <div className="px-6 py-3 border-b border-[var(--border)] flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Recent Deployments
              </span>
              <div className="flex-1" />
              <Link
                href="/explore"
                className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                View All →
              </Link>
            </div>

            <div>
              {rulesets.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <span className="text-2xl text-[var(--border-bright)] block mb-3">♜</span>
                  <p className="text-[11px] text-[var(--text-muted)] tracking-wide">
                    No rulesets deployed yet.
                  </p>
                </div>
              ) : (
                rulesets.slice(0, 5).map((rs, idx) => {
                  const numerals = ["V", "VI", "VII", "VIII", "IX"];

                  return (
                    <Link
                      href={`/explore/${encodeURIComponent(rs.address)}`}
                      key={rs.address}
                      className="group block px-6 py-4 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-all border-l-2 border-l-transparent hover:border-l-[var(--accent)]"
                    >
                      <div className="flex items-start gap-3">
                        {/* Mini card symbol */}
                        <div className="w-10 h-14 relative shrink-0 mt-0.5">
                          <div className="absolute inset-0 border border-[var(--border)] group-hover:border-[var(--accent-dim)] transition-colors" style={{ background: "var(--bg-tertiary)" }} />
                          <div className="absolute inset-[2px] border border-[var(--border)] group-hover:border-[var(--border-bright)] transition-colors" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[5px] tracking-[0.2em] text-[var(--text-muted)] mb-0.5">{numerals[idx]}</span>
                            <span className="text-sm text-[var(--border-bright)] group-hover:text-[var(--accent)] transition-colors">{"\u25C7"}</span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-[var(--text-primary)] font-bold uppercase tracking-wide group-hover:text-white transition-colors truncate">
                              {rs.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[8px] uppercase tracking-[0.15em] text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 group-hover:border-[var(--border-bright)] transition-colors">
                              {rs.checkCount || 10} guardians
                            </span>
                            <span className="text-[8px] text-[var(--text-muted)] font-mono">
                              {rs.address.slice(0, 8)}...{rs.address.slice(-4)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] text-[var(--text-secondary)]">
                              {rs.totalChecks} proofs
                            </span>
                            <span className="text-[5px] text-[var(--border-bright)]">✦</span>
                            <span className="text-[9px] text-[var(--text-muted)]">
                              {rs.flaggedRate} flagged
                            </span>
                            <span className="text-[5px] text-[var(--border-bright)]">✦</span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-[var(--accent)] live-dot" />
                              <span className="text-[8px] text-[var(--text-muted)] uppercase">{rs.status}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Bottom Ornament ═══ */}
      <div className="mt-14 flex items-center justify-center gap-3 opacity-20">
        <div className="w-12 h-px bg-white" />
        <span className="text-[8px] text-white tracking-[0.3em]">◈ VERDICT ◈</span>
        <div className="w-12 h-px bg-white" />
      </div>
    </div>
  );
}
