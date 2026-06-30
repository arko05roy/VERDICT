"use client";

import { useState, useMemo } from "react";
import { DEFAULT_MARKETPLACE, type MarketplaceRuleset } from "@/lib/marketplace";
import MarketplaceGrid from "@/components/MarketplaceGrid";
import RuleEditor from "@/components/RuleEditor";
import { useRouter } from "next/navigation";
import type { GameRules } from "@/game/rules";
import { DEFAULT_RULES } from "@/game/rules";
import { getLedgerState } from "@/lib/midnight";

const GAME_TYPES = ["All", ...Array.from(new Set(DEFAULT_MARKETPLACE.map((r) => r.gameType)))];

export default function MarketplacePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [selected, setSelected] = useState<MarketplaceRuleset | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGameType, setNewGameType] = useState("Chess");
  const [newDescription, setNewDescription] = useState("");
  const [newRules, setNewRules] = useState<GameRules>({ ...DEFAULT_RULES });
  const [customRulesets, setCustomRulesets] = useState<MarketplaceRuleset[]>([]);

  const allRulesets = [...DEFAULT_MARKETPLACE, ...customRulesets];

  const filtered = useMemo(() => {
    return allRulesets.filter((rs) => {
      const matchesSearch =
        !search ||
        rs.name.toLowerCase().includes(search.toLowerCase()) ||
        rs.tags.some((t) => t.includes(search.toLowerCase())) ||
        rs.description.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "All" || rs.gameType === filterType;
      return matchesSearch && matchesType;
    });
  }, [search, filterType, allRulesets]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    console.log("[marketplace] Creating new ruleset:", newName);
    const rs: MarketplaceRuleset = {
      id: `custom-${Date.now()}`,
      name: newName,
      author: "You",
      gameType: newGameType,
      description: newDescription || "Custom ruleset",
      downloads: 0,
      rating: 0,
      verified: false,
      rules: { ...newRules },
      tags: [newGameType.toLowerCase(), "custom"],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setCustomRulesets([...customRulesets, rs]);
    setShowCreate(false);
    setNewName("");
    setNewDescription("");
    setNewRules({ ...DEFAULT_RULES });
  };

  const handleSelect = (rs: MarketplaceRuleset | null) => {
    console.log("[marketplace] Selected ruleset:", rs?.name);
    setSelected(rs);
  };

  const ledger = getLedgerState();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rule Marketplace</h1>
        <p className="text-sm text-gray-400 mt-1">
          Browse, share, and deploy verified integrity rulesets. Community-curated constraint configurations for any game type.
        </p>
      </div>

      {/* On-chain status hint */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          Rulesets can be stored on-chain via Midnight for tamper-proof verification. Total on-chain checks: <span className="text-cyan-400 font-mono">{ledger.totalChecks}</span>
        </div>
        <div className={`text-xs font-mono ${ledger.sessionActive ? "text-emerald-400" : "text-gray-500"}`}>
          {ledger.sessionActive ? "Session Active" : "No Active Session"}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rulesets..."
          className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
        />
        <div className="flex gap-1">
          {GAME_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === type
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/50"
                  : "border border-gray-700/50 text-gray-400 hover:text-white"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
        >
          {showCreate ? "Cancel" : "Create New"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
          <div className="text-sm font-medium text-cyan-400">Create Custom Ruleset</div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ruleset name"
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
            />
            <select
              value={newGameType}
              onChange={(e) => setNewGameType(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500/50"
            >
              {["Chess", "FPS", "Poker", "Racing", "Casino", "MOBA", "Other"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
          />
          <RuleEditor rules={newRules} onChange={setNewRules} />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition disabled:opacity-40"
          >
            Create Ruleset
          </button>
        </div>
      )}

      {/* Grid + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MarketplaceGrid
            rulesets={filtered}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
          />
        </div>
        <div>
          {selected ? (
            <div className="space-y-4 sticky top-16">
              <div className="rounded-lg border border-gray-700/50 p-4 space-y-2">
                <div className="text-sm font-medium text-gray-200">{selected.name}</div>
                <div className="text-xs text-gray-500">by {selected.author}</div>
                <div className="text-xs text-gray-400">{selected.description}</div>
              </div>
              <RuleEditor rules={selected.rules} onChange={() => {}} readonly />
              <button
                onClick={() => router.push("/replay")}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition"
              >
                Use in Replay
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-700/50 p-8 text-center text-sm text-gray-500">
              Select a ruleset to view its details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
