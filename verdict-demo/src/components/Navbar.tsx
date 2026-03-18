"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/rules", label: "Rules" },
  { href: "/replay", label: "Replay" },
  { href: "/dispute", label: "Dispute" },
  { href: "/collusion", label: "Collusion" },
  { href: "/passport", label: "Passport" },
  { href: "/staking", label: "Staking" },
  { href: "/compliance", label: "Compliance" },
  { href: "/audit", label: "Audit" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/betting", label: "Betting" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full bg-gray-900/80 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-12 gap-6">
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <span className="text-cyan-400 font-bold text-lg tracking-tight">VERDICT</span>
          <span className="text-gray-500 text-xs">Protocol</span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
