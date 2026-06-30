"use client";

import type { MarketplaceRuleset } from "@/lib/marketplace";

interface MarketplaceGridProps {
  rulesets: MarketplaceRuleset[];
  selectedId: string | null;
  onSelect: (ruleset: MarketplaceRuleset) => void;
}

export default function MarketplaceGrid({ rulesets, selectedId, onSelect }: MarketplaceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {rulesets.map((rs) => (
        <button
          key={rs.id}
          onClick={() => onSelect(rs)}
          className={`text-left rounded-lg border p-4 transition-all hover:border-cyan-500/50 ${
            selectedId === rs.id
              ? "border-cyan-400 bg-cyan-400/5"
              : "border-gray-700/50 bg-gray-800/30"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-200">{rs.name}</span>
                {rs.verified && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-medium">VERIFIED</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">by {rs.author}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-yellow-400">{rs.rating.toFixed(1)}</div>
              <div className="text-[10px] text-gray-500">{rs.downloads.toLocaleString()} DL</div>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2 line-clamp-2">{rs.description}</div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {rs.tags.map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        </button>
      ))}
      {rulesets.length === 0 && (
        <div className="col-span-2 text-center py-12 text-gray-500 text-sm">No rulesets match your filters</div>
      )}
    </div>
  );
}
