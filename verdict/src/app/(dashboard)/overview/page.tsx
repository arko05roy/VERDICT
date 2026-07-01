"use client";

import { useState, useEffect } from "react";

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
  category: string;
  description: string;
  deployedAt: string;
  totalChecks: number;
  totalFlagged: number;
  flaggedRate: string;
  status: string;
};

export default function OverviewPage() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [blockHeight, setBlockHeight] = useState(0);
  const [rulesetCount, setRulesetCount] = useState(0);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);

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

  const STATS = [
    { label: "RULESETS DEPLOYED", value: String(rulesetCount), delta: "on-chain" },
    { label: "TOTAL VERIFICATIONS", value: String(totalChecks), delta: "proofs" },
    { label: "BLOCK HEIGHT", value: blockHeight.toLocaleString(), delta: "live" },
    { label: "FLAGGED RATE", value: `${flaggedRate}%`, delta: "avg" },
  ];

  const services = [
    { name: "Node", healthy: network?.nodeHealthy },
    { name: "Indexer", healthy: network?.indexerHealthy },
    { name: "Proof Server", healthy: network?.proofServerHealthy },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
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
          Real-time protocol activity on Midnight.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="panel corner-frame px-4 py-3">
            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
              {s.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl text-white font-bold">{s.value}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {s.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Network Status Bar */}
      <div className="panel flex items-center px-4 py-2.5 gap-6">
        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
          Network
        </span>
        {services.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                network === null
                  ? "bg-[var(--text-muted)]"
                  : s.healthy
                    ? "bg-[var(--accent)] live-dot"
                    : "bg-[var(--danger)]"
              }`}
            />
            <span className="text-[10px] text-[var(--text-secondary)]">
              {s.name}
            </span>
          </div>
        ))}
        <span className="text-[9px] text-[var(--text-muted)] ml-auto">
          {network === null
            ? "checking..."
            : network.nodeHealthy && network.indexerHealthy && network.proofServerHealthy
              ? "all systems operational"
              : "degraded"}
        </span>
      </div>

      {/* Main content: Feed + Recent Deployments */}
      <div className="grid grid-cols-[3fr_2fr] gap-4">
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
            {feed.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[11px] text-[var(--text-muted)]">
                  No verifications yet. Deploy a ruleset to begin.
                </p>
              </div>
            ) : (
              feed.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 ${
                    r.verdict === "FLAGGED" ? "row-flagged" : ""
                  }`}
                >
                  <span className="text-xs text-[var(--text-primary)] flex-1 truncate">
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
              ))
            )}
          </div>
        </div>

        {/* Recent Deployments */}
        <div className="panel corner-frame">
          <div className="px-4 py-2.5 border-b border-[var(--border)]">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Recent Deployments
            </span>
          </div>
          <div>
            {rulesets.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[11px] text-[var(--text-muted)]">
                  No rulesets deployed yet.
                </p>
              </div>
            ) : (
              rulesets.slice(0, 5).map((rs) => (
                <div
                  key={rs.address}
                  className="px-4 py-3 border-b border-[var(--border)] last:border-b-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-primary)] font-bold truncate max-w-[60%]">
                      {rs.name}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                      {rs.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[9px] text-[var(--text-muted)] font-mono"
                      title={rs.address}
                    >
                      {rs.address.slice(0, 10)}...{rs.address.slice(-6)}
                    </span>
                    <span className="text-[9px] text-[var(--text-secondary)]">
                      {rs.totalChecks} proofs
                    </span>
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-1">
                    {new Date(rs.deployedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
