"use client";

import { useState, useEffect, useMemo } from "react";

type Ruleset = {
  address: string;
  name: string;
  category: string;
  description: string;
};

const LANGUAGES = ["TypeScript", "Python", "Rust", "Go"] as const;
type Lang = (typeof LANGUAGES)[number];

function getSnippet(lang: Lang, address: string): string {
  const addr = address || "<RULESET_ADDRESS>";
  switch (lang) {
    case "TypeScript":
      return `import { Verdict } from "@verdict/sdk";

const verdict = new Verdict("${addr}");

// Submit a state transition for verification
const proof = await verdict.verify({
  prevState: gameState.previous,
  currState: gameState.current,
  action: playerAction,
});

// proof.verdict === "CLEAN" | "FLAGGED"
// proof.txHash — on-chain proof reference
console.log(proof.verdict, proof.txHash);`;
    case "Python":
      return `from verdict import Verdict

verdict = Verdict("${addr}")

# Submit a state transition for verification
proof = await verdict.verify(
    prev_state=game_state.previous,
    curr_state=game_state.current,
    action=player_action,
)

# proof.verdict == "CLEAN" | "FLAGGED"
# proof.tx_hash — on-chain proof reference
print(proof.verdict, proof.tx_hash)`;
    case "Rust":
      return `use verdict_sdk::Verdict;

let verdict = Verdict::new("${addr}");

// Submit a state transition for verification
let proof = verdict.verify(VerifyInput {
    prev_state: game_state.previous,
    curr_state: game_state.current,
    action: player_action,
}).await?;

// proof.verdict == Verdict::Clean | Verdict::Flagged
// proof.tx_hash — on-chain proof reference
println!("{:?} {}", proof.verdict, proof.tx_hash);`;
    case "Go":
      return `import "github.com/verdict-protocol/verdict-go"

v := verdict.New("${addr}")

// Submit a state transition for verification
proof, err := v.Verify(verdict.VerifyInput{
    PrevState: gameState.Previous,
    CurrState: gameState.Current,
    Action:    playerAction,
})

// proof.Verdict == "CLEAN" | "FLAGGED"
// proof.TxHash — on-chain proof reference
fmt.Println(proof.Verdict, proof.TxHash)`;
  }
}

export default function IntegratePage() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [input, setInput] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [lang, setLang] = useState<Lang>("TypeScript");
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchRulesets() {
      try {
        const res = await fetch("/api/rulesets");
        const data = await res.json();
        setRulesets(data.rulesets || []);
      } catch {}
    }
    fetchRulesets();
  }, []);

  // Filter rulesets based on input (search by name, category, or address)
  const filtered = useMemo(() => {
    if (!input.trim()) return rulesets;
    const q = input.toLowerCase();
    return rulesets.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
    );
  }, [input, rulesets]);

  // Resolve which address to use in the snippet
  const resolvedAddress = useMemo(() => {
    if (selectedAddress) return selectedAddress;
    // If input looks like a hex address (32+ chars, hex only), use it directly
    if (/^[0-9a-fA-F]{32,}$/.test(input.trim())) return input.trim();
    return "";
  }, [selectedAddress, input]);

  const selectedRuleset = rulesets.find((r) => r.address === resolvedAddress);

  const snippet = getSnippet(lang, resolvedAddress);

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSelect(r: Ruleset) {
    setSelectedAddress(r.address);
    setInput(r.name);
    setDropdownOpen(false);
  }

  function handleInputChange(val: string) {
    setInput(val);
    setSelectedAddress("");
    setDropdownOpen(true);
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 opacity-40">
          <div className="w-6 h-px bg-white" />
          <span className="text-white text-[10px]">◈</span>
          <div className="w-16 h-px bg-white" />
        </div>
        <h1 className="text-lg text-white font-bold tracking-wide">
          Integrate
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Connect any game or app to a deployed ruleset. Two lines of code.
        </p>
      </div>

      {/* Ruleset selector */}
      <div className="panel corner-frame mb-4 relative">
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Select Ruleset
          </span>
        </div>
        <input
          className="w-full bg-transparent px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-mono"
          placeholder="Paste ruleset address or search by name..."
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
        />

        {/* Dropdown */}
        {dropdownOpen && filtered.length > 0 && !selectedAddress && (
          <div className="absolute left-0 right-0 top-full z-50 panel border border-[var(--border)] max-h-56 overflow-y-auto">
            {filtered.map((r) => (
              <button
                key={r.address}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(r);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-primary)]">
                    {r.name}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5">
                    {r.category}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {r.address.slice(0, 16)}...{r.address.slice(-8)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected ruleset info */}
      {selectedRuleset && (
        <div className="panel corner-frame mb-4 px-4 py-3 flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-[var(--accent)] live-dot shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white font-bold">
              {selectedRuleset.name}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
              {selectedRuleset.address}
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 shrink-0">
            {selectedRuleset.category}
          </span>
          <button
            type="button"
            className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer shrink-0"
            onClick={() => {
              setSelectedAddress("");
              setInput("");
            }}
          >
            clear
          </button>
        </div>
      )}

      {/* Language tabs */}
      <div className="flex gap-0 mb-0">
        {LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            className={`text-[10px] uppercase tracking-wider px-3 py-1.5 border cursor-pointer transition-all ${
              l === lang
                ? "border-white text-white border-b-2 border-b-white bg-[var(--bg-hover)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-active)]"
            }`}
            onClick={() => setLang(l)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Code snippet */}
      <div className="panel corner-frame mb-6">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            SDK Snippet · {lang}
          </span>
          <button
            type="button"
            className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            onClick={handleCopy}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="p-4 text-xs leading-relaxed overflow-x-auto">
          <code>
            {snippet.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-3 text-[var(--text-muted)] select-none shrink-0">
                  {i + 1}
                </span>
                <span
                  className={
                    line.trimStart().startsWith("//") ||
                    line.trimStart().startsWith("#")
                      ? "text-[var(--text-muted)]"
                      : line.includes("import") ||
                          line.includes("from ") ||
                          line.includes("use ")
                        ? "text-[var(--accent-dim)]"
                        : "text-[var(--text-primary)]"
                  }
                >
                  {line || "\u00A0"}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* How it works */}
      <div className="panel corner-frame">
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            How It Works
          </span>
        </div>
        <div className="p-4">
          {[
            [
              "1",
              "Game client captures state transition (position, action, timing)",
            ],
            [
              "2",
              "SDK submits transition to VERDICT as a ZK witness (private)",
            ],
            [
              "3",
              "Circuit runs 10 integrity checks inside zero-knowledge proof",
            ],
            [
              "4",
              "Proof settles on Midnight — returns CLEAN or FLAGGED",
            ],
          ].map(([n, desc], i) => (
            <div key={n}>
              <div className="flex gap-3 items-start py-3">
                <span className="text-white text-xs font-bold shrink-0 w-5 h-5 border border-[var(--border-bright)] flex items-center justify-center">
                  {n}
                </span>
                <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {desc}
                </span>
              </div>
              {i < 3 && <div className="dither-sep ml-8" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
