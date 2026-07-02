"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const NAV = [
  { href: "/overview", label: "Overview", icon: "\u25C6" },
  { href: "/deploy", label: "Deploy", icon: "\u25B6" },
  { href: "/explore", label: "Explore", icon: "\u25CE" },
  { href: "/dao", label: "Governance", icon: "\u2696" },
  { href: "/integrate", label: "Integrate", icon: "\u27D0" },
];

interface NetworkStatus {
  nodeHealthy: boolean;
  indexerHealthy: boolean;
  proofServerHealthy: boolean;
  blockHeight: number | null;
}

interface WalletInfo {
  address: string | null;
  balance: string;
  isSynced: boolean;
}

interface FeedData {
  rulesetCount: number;
  entries: { totalChecks: number; totalFlagged: number }[];
}

export function Sidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Poll network status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        setStatus(data);
      } catch {
        setStatus(null);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  // Poll feed for stats
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/feed");
        const data = await res.json();
        setFeedData(data);
      } catch {
        // ignore
      }
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  const connectWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await fetch("/api/wallet");
      const data = await res.json();
      setWallet(data);
    } catch {
      setWallet(null);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const isLive =
    status?.nodeHealthy && status?.indexerHealthy && status?.proofServerHealthy;
  const blockHeight = status?.blockHeight;

  // Compute live stats from feed data
  const totalChecks =
    feedData?.entries?.reduce((sum, e) => sum + (e.totalChecks || 0), 0) ?? 0;
  const totalFlagged =
    feedData?.entries?.reduce((sum, e) => sum + (e.totalFlagged || 0), 0) ?? 0;
  const flaggedRate =
    totalChecks > 0 ? ((totalFlagged / totalChecks) * 100).toFixed(2) : "0.00";

  const STATS = [
    { label: "RULESETS", value: String(feedData?.rulesetCount ?? 0) },
    { label: "PROOFS", value: String(totalChecks) },
    { label: "FLAGGED", value: `${flaggedRate}%` },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col z-50">
      {/* Dither strip on right edge */}
      <div className="absolute right-0 top-0 bottom-0 w-[3px] dither-pattern text-[var(--border)] opacity-40 z-10" />

      {/* Brand */}
      <div className="px-5 py-5 border-b border-[var(--border)]">
        <Link href="/" className="block">
          <span className="text-white text-base font-bold tracking-widest italic inline-block -skew-x-12">
            VERDICT
          </span>
        </Link>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[9px] text-[var(--text-muted)] tracking-wider">
            ◈
          </span>
          <span className="text-[9px] text-[var(--text-muted)] tracking-wider uppercase">
            v0.1.0 · midnight local
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] transition-all duration-100 border-l-2 ${
                active
                  ? "text-white bg-[var(--bg-hover)] border-l-white"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] border-l-transparent hover:border-l-[var(--border-bright)]"
              }`}
            >
              <span className="text-[10px] w-4 text-center opacity-60">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Stats — with dither separator */}
      <div className="mx-5">
        <div className="dither-sep" />
      </div>
      <div className="px-5 py-3 space-y-2">
        {STATS.map((s) => (
          <div key={s.label} className="flex justify-between">
            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
              {s.label}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="px-5 py-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5 mb-3">
          <span
            className={`w-1.5 h-1.5 ${isLive ? "bg-[var(--accent)] live-dot" : "bg-red-500"}`}
          />
          <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
            {isLive ? "Network Live" : status === null ? "Checking..." : "Offline"}
          </span>
          <span className="text-[9px] text-[var(--text-muted)] ml-auto font-mono">
            {blockHeight !== null && blockHeight !== undefined
              ? `#${blockHeight.toLocaleString()}`
              : "—"}
          </span>
        </div>

        {wallet?.address ? (
          <div className="space-y-1">
            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
              Connected
            </div>
            <div
              className="text-[9px] text-[var(--text-secondary)] font-mono truncate"
              title={wallet.address}
            >
              {wallet.address.slice(0, 12)}...{wallet.address.slice(-6)}
            </div>
            <div className="text-[9px] text-[var(--text-muted)]">
              {BigInt(wallet.balance).toLocaleString()} tNight
            </div>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={walletLoading}
            className="btn-brutal w-full text-[10px] uppercase tracking-wider py-1.5 border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-white hover:border-white transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {walletLoading ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </aside>
  );
}
