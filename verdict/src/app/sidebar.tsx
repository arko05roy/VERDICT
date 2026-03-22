"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/overview", label: "Overview", icon: "◆" },
  { href: "/deploy", label: "Deploy", icon: "▶" },
  { href: "/explore", label: "Explore", icon: "◎" },
  { href: "/integrate", label: "Integrate", icon: "⟐" },
];

const STATS = [
  { label: "RULESETS", value: "2,847" },
  { label: "PROOFS", value: "1.2M" },
  { label: "FLAGGED", value: "0.03%" },
];

export function Sidebar() {
  const pathname = usePathname();

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
          <span className="text-[9px] text-[var(--text-muted)] tracking-wider">◈</span>
          <span className="text-[9px] text-[var(--text-muted)] tracking-wider uppercase">
            v0.1.0 · midnight testnet
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
              <span className="text-[10px] w-4 text-center opacity-60">{item.icon}</span>
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
          <span className="w-1.5 h-1.5 bg-[var(--accent)] live-dot" />
          <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider">
            Network Live
          </span>
          <span className="text-[9px] text-[var(--text-muted)] ml-auto font-mono">
            #4,209,117
          </span>
        </div>
        <button className="btn-brutal w-full text-[10px] uppercase tracking-wider py-1.5 border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-white hover:border-white transition-all duration-200 cursor-pointer">
          Connect Wallet
        </button>
      </div>
    </aside>
  );
}
