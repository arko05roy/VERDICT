"use client";

import { useState, useEffect, useMemo, useRef } from "react";

type Ruleset = {
  address: string;
  name: string;
  category: string;
  description: string;
};

const LANGUAGES = ["TypeScript", "Python", "Rust", "Go"] as const;
type Lang = (typeof LANGUAGES)[number];

const LANG_ICONS: Record<Lang, string> = {
  TypeScript: "TS",
  Python: "PY",
  Rust: "RS",
  Go: "GO",
};

const CATEGORY_SYMBOLS: Record<string, string> = {
  fps: "⊕",
  "card-game": "♠",
  mmorpg: "⚔",
  "turn-based": "♟",
  casino: "♦",
  "battle-royale": "◎",
};

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

function syntaxHighlight(line: string): string {
  if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#"))
    return "text-[#444]";
  if (
    line.includes("import") ||
    line.includes("from ") ||
    line.includes("use ")
  )
    return "text-[var(--accent-dim)]";
  if (line.includes('"')) return "text-[#c8a87a]";
  if (
    line.includes("const ") ||
    line.includes("let ") ||
    line.includes("await ")
  )
    return "text-[#aaa]";
  return "text-[#999]";
}

export default function IntegratePage() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [input, setInput] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [lang, setLang] = useState<Lang>("TypeScript");
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
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
  }, []);

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

  const resolvedAddress = useMemo(() => {
    if (selectedAddress) return selectedAddress;
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

  const HOW_IT_WORKS = [
    { numeral: "I", title: "Capture", desc: "Game client captures state transition — position, action, timing", symbol: "⊕" },
    { numeral: "II", title: "Submit", desc: "SDK submits transition to VERDICT as a ZK witness (private)", symbol: "◈" },
    { numeral: "III", title: "Prove", desc: "Circuit runs 10 integrity checks inside zero-knowledge proof", symbol: "⚑" },
    { numeral: "IV", title: "Settle", desc: "Proof settles on Midnight — returns CLEAN or FLAGGED", symbol: "✦" },
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
          Integrate
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 tracking-wide">
          Bind any game or application to a deployed ruleset. Two lines of code.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* ═══ Step 1: Select Ruleset — Click-to-open trigger ═══ */}
        <div
          className="mb-6"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[8px] tracking-[0.3em] text-[#444] font-bold">I</span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#555] font-bold">Select Ruleset</span>
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, #222 0 2px, transparent 2px 6px)" }} />
          </div>

          <button
            onClick={() => { setSelectorOpen(true); setTimeout(() => modalInputRef.current?.focus(), 50); }}
            className="group relative w-full cursor-pointer text-left"
          >
            <div className={`absolute inset-0 border-2 transition-all duration-300 ${selectedAddress ? "border-[var(--accent)]" : "border-[#2e2e2e] group-hover:border-[#484848]"}`}
              style={{ background: "linear-gradient(135deg, #0c0c0c 0%, #080808 100%)" }} />
            <div className={`absolute inset-[5px] border transition-colors duration-300 ${selectedAddress ? "border-[#2a2a2a]" : "border-[#181818] group-hover:border-[#252525]"}`} />

            {["top-[8px] left-[8px]","top-[8px] right-[8px]","bottom-[8px] left-[8px] rotate-180","bottom-[8px] right-[8px] rotate-180"].map((pos, i) => (
              <div key={i} className={`absolute ${pos} text-[7px] transition-colors duration-300 ${selectedAddress ? "text-[var(--accent-dim)]" : "text-[#3a3a3a] group-hover:text-[#666]"}`}>◆</div>
            ))}
            <div className={`absolute top-[8px] left-1/2 -translate-x-1/2 text-[5px] transition-colors ${selectedAddress ? "text-[var(--accent-dim)]" : "text-[#2a2a2a] group-hover:text-[#444]"}`}>✦</div>

            <div className="relative flex items-center px-6 py-[18px] gap-4">
              <svg className={`w-[18px] h-[18px] shrink-0 transition-colors duration-300 ${selectedAddress ? "text-[var(--accent)]" : "text-[#444] group-hover:text-[#888]"}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5 L21 21" strokeLinecap="square" />
              </svg>

              <span className={`flex-1 text-[13px] font-mono tracking-[0.04em] transition-colors duration-300 ${input ? "text-[#e0e0e0]" : "text-[#3a3a3a] group-hover:text-[#666]"}`}>
                {input || "Paste address or search by name…"}
              </span>

              {input ? (
                <button onClick={(e) => { e.stopPropagation(); setInput(""); setSelectedAddress(""); }}
                  className="text-[#555] hover:text-white transition-colors text-[10px] cursor-pointer border border-[#2a2a2a] px-1.5 py-0.5 hover:border-[#555]">
                  ✕
                </button>
              ) : (
                <span className="text-[9px] uppercase tracking-[0.25em] text-[#2a2a2a] group-hover:text-[#444] transition-colors font-mono border border-[#1e1e1e] group-hover:border-[#333] px-2 py-1">
                  Click to Select
                </span>
              )}
            </div>

            <div className="absolute bottom-0 left-[20%] right-[20%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.4), transparent)" }} />
          </button>
        </div>

        {/* ═══ Selected ruleset badge ═══ */}
        {selectedRuleset && (
          <div
            className="mb-6 relative"
            style={{ animation: "search-modal-in 0.2s cubic-bezier(0.16,1,0.3,1)" }}
          >
            <div className="absolute inset-0 border border-[var(--accent)]" style={{ background: "rgba(0,255,65,0.02)" }} />
            <div className="absolute inset-[3px] border border-[#1a1a1a]" />

            <div className="relative px-5 py-3 flex items-center gap-4">
              <span className="w-2 h-2 bg-[var(--accent)] live-dot shrink-0" />
              <span className="text-lg text-[#333]">{CATEGORY_SYMBOLS[selectedRuleset.category] || "◈"}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] text-white font-bold uppercase tracking-[0.1em] block truncate">{selectedRuleset.name}</span>
                <span className="text-[9px] text-[#444] font-mono">{selectedRuleset.address}</span>
              </div>
              <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--accent)] border border-[var(--accent)] px-2 py-0.5 shrink-0">{selectedRuleset.category}</span>
              <button
                onClick={() => { setSelectedAddress(""); setInput(""); }}
                className="text-[9px] text-[#333] hover:text-white transition-colors cursor-pointer border border-[#1e1e1e] hover:border-[#444] px-2 py-1 uppercase tracking-[0.15em]"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: Language + Code ═══ */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[8px] tracking-[0.3em] text-[#444] font-bold">II</span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#555] font-bold">Copy SDK Snippet</span>
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, #222 0 2px, transparent 2px 6px)" }} />
          </div>

          {/* Language tabs — tarot style */}
          <div className="flex gap-0 mb-0">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`relative cursor-pointer transition-all duration-300 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold border ${
                  l === lang
                    ? "border-[var(--accent)] text-[var(--accent)] border-b-2 border-b-[var(--accent)] bg-[rgba(0,255,65,0.03)] z-10"
                    : "border-[#1a1a1a] text-[#333] hover:text-[#666] hover:border-[#333]"
                }`}
              >
                <span className="mr-1.5 text-[8px] opacity-60">{LANG_ICONS[l]}</span>
                {l}
              </button>
            ))}
          </div>

          {/* Code panel */}
          <div className="relative mb-8">
            <div className="absolute inset-0 border-2 border-[#333]" style={{ background: "linear-gradient(180deg, #0b0b0b, #070707)" }} />
            <div className="absolute inset-[5px] border border-[#161616]" />

            {["top-[7px] left-[7px]","top-[7px] right-[7px]","bottom-[7px] left-[7px] rotate-180","bottom-[7px] right-[7px] rotate-180"].map((pos, i) => (
              <div key={i} className={`absolute ${pos} text-[6px] text-[#2a2a2a]`}>◆</div>
            ))}

            <div className="relative">
              <div className="flex items-center justify-between px-6 py-3 border-b border-[#161616]">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#444]">
                  {lang} · {resolvedAddress ? "configured" : "placeholder"}
                </span>
                <button
                  type="button"
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

              <pre className="px-6 py-5 text-[12px] leading-[1.8] font-mono overflow-x-auto">
                <code>
                  {snippet.split("\n").map((line, i) => (
                    <div key={i} className="flex">
                      <span className="w-7 text-right pr-4 text-[#222] select-none shrink-0 text-[10px]">{i + 1}</span>
                      <span className={syntaxHighlight(line)}>{line || "\u00A0"}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* ═══ Step 3: How It Works ═══ */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease 0.35s, transform 0.4s ease 0.35s",
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[8px] tracking-[0.3em] text-[#444] font-bold">III</span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#555] font-bold">How It Works</span>
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, #222 0 2px, transparent 2px 6px)" }} />
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {HOW_IT_WORKS.map((step, idx) => (
              <div
                key={step.numeral}
                className="group relative transition-all duration-500 hover:-translate-y-1"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(8px)",
                  transition: `opacity 0.4s ease ${0.4 + idx * 0.08}s, transform 0.4s ease ${0.4 + idx * 0.08}s`,
                }}
              >
                <div className="absolute inset-0 border border-[#222] group-hover:border-[var(--accent)] transition-colors duration-500" style={{ background: "#0a0a0a" }} />
                <div className="absolute inset-[3px] border border-[#151515] group-hover:border-[#222] transition-colors" />

                {["top-[5px] left-[5px]","top-[5px] right-[5px]","bottom-[5px] left-[5px] rotate-180","bottom-[5px] right-[5px] rotate-180"].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} text-[4px] text-[#222] group-hover:text-[var(--accent-dim)] transition-colors`}>◆</div>
                ))}

                <div className="relative px-4 py-5 text-center">
                  <span className="text-[8px] tracking-[0.3em] text-[#333] block mb-2">{step.numeral}</span>

                  <div className="flex items-center gap-1.5 justify-center mb-3 opacity-25">
                    <div className="w-4 h-px bg-[#333]" />
                    <span className="text-[4px] text-[#333]">✦</span>
                    <div className="w-4 h-px bg-[#333]" />
                  </div>

                  <span className="text-xl text-[#333] group-hover:text-[var(--accent)] transition-colors duration-500 block mb-3">{step.symbol}</span>

                  <span className="text-[10px] text-[#aaa] font-bold uppercase tracking-[0.15em] block mb-1.5 group-hover:text-white transition-colors">{step.title}</span>
                  <span className="text-[9px] text-[#444] leading-relaxed block group-hover:text-[#666] transition-colors">{step.desc}</span>
                </div>

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at center, rgba(0,255,65,0.04) 0%, transparent 70%)" }} />
              </div>
            ))}
          </div>

          {/* Connection arrows between cards */}
          <div className="flex items-center justify-center gap-1 -mt-6 mb-8 opacity-20">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-16 h-px bg-[var(--accent)]" />
                <span className="text-[8px] text-[var(--accent)]">→</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Install Commands ═══ */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease 0.6s",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[8px] tracking-[0.3em] text-[#444] font-bold">IV</span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#555] font-bold">Install SDK</span>
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, #222 0 2px, transparent 2px 6px)" }} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { pm: "npm", cmd: "npm install @verdict/sdk" },
              { pm: "yarn", cmd: "yarn add @verdict/sdk" },
              { pm: "pip", cmd: "pip install verdict-sdk" },
              { pm: "cargo", cmd: "cargo add verdict-sdk" },
            ].map((pkg) => (
              <button
                key={pkg.pm}
                onClick={() => {
                  navigator.clipboard.writeText(pkg.cmd);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="group relative cursor-pointer text-left"
              >
                <div className="absolute inset-0 border border-[#1a1a1a] group-hover:border-[#333] transition-colors" style={{ background: "#080808" }} />
                <div className="relative px-4 py-3 flex items-center gap-3">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-[#333] border border-[#1e1e1e] px-1.5 py-0.5 shrink-0 group-hover:border-[#333] group-hover:text-[#555] transition-colors">{pkg.pm}</span>
                  <code className="text-[11px] text-[#555] font-mono flex-1 group-hover:text-[#888] transition-colors">{pkg.cmd}</code>
                  <span className="text-[8px] text-[#222] group-hover:text-[#555] transition-colors uppercase tracking-wider">copy</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Bottom Ornament ═══ */}
      <div className="mt-14 flex items-center justify-center gap-3 opacity-20">
        <div className="w-12 h-px bg-white" />
        <span className="text-[8px] text-white tracking-[0.3em]">◈ VERDICT ◈</span>
        <div className="w-12 h-px bg-white" />
      </div>

      {/* ═══ Selector Modal ═══ */}
      {selectorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
          style={{
            backdropFilter: "blur(20px) saturate(0.6)",
            WebkitBackdropFilter: "blur(20px) saturate(0.6)",
            background: "rgba(0,0,0,0.18)",
          }}
          onClick={() => setSelectorOpen(false)}
        >
          <div
            className="relative w-full max-w-xl mx-6"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "search-modal-in 0.22s cubic-bezier(0.16,1,0.3,1)" }}
          >
            {/* Glow ring */}
            <div className="absolute -inset-[1px] pointer-events-none"
              style={{ boxShadow: "0 0 0 1px rgba(0,255,65,0.5), 0 0 60px rgba(0,255,65,0.1), 0 30px 80px rgba(0,0,0,0.6)" }} />

            <div className="absolute inset-0 border-2 border-[var(--accent)]" style={{ background: "rgba(6,6,6,0.96)" }} />
            <div className="absolute inset-[5px] border border-[#1e1e1e]" />

            {["top-[8px] left-[8px]","top-[8px] right-[8px]","bottom-[8px] left-[8px] rotate-180","bottom-[8px] right-[8px] rotate-180"].map((pos, i) => (
              <div key={i} className={`absolute ${pos} text-[8px] text-[var(--accent)]`}>◆</div>
            ))}
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
                  placeholder="Search rulesets…"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setSelectorOpen(false); }}
                />

                {input && (
                  <button onClick={() => { setInput(""); setSelectedAddress(""); }}
                    className="text-[#444] hover:text-white transition-colors text-[10px] cursor-pointer border border-[#222] hover:border-[#555] px-1.5 py-0.5">
                    ✕
                  </button>
                )}

                <button onClick={() => setSelectorOpen(false)}
                  className="text-[8px] uppercase tracking-[0.25em] text-[#333] hover:text-[#888] transition-colors cursor-pointer border border-[#1e1e1e] hover:border-[#333] px-2 py-1 font-mono">
                  ESC
                </button>
              </div>

              {/* Accent divider */}
              <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.3), transparent)" }} />

              {/* Results */}
              <div className="max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-[9px] text-[#2a2a2a] uppercase tracking-[0.3em]">
                      {rulesets.length === 0 ? "No rulesets deployed yet" : "No rulesets match"}
                    </p>
                  </div>
                ) : (
                  filtered.map((r) => {
                    const sym = CATEGORY_SYMBOLS[r.category] || "◈";
                    return (
                      <button
                        key={r.address}
                        type="button"
                        className="group w-full text-left flex items-center gap-4 px-5 py-3 border-b border-[#111] last:border-b-0 hover:bg-[rgba(0,255,65,0.03)] transition-colors cursor-pointer"
                        style={{ borderLeft: "2px solid transparent" }}
                        onClick={() => { handleSelect(r); setSelectorOpen(false); }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = "var(--accent)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = "transparent")}
                      >
                        <span className="text-lg text-[#333] group-hover:text-[var(--accent)] transition-colors duration-300 w-5 text-center shrink-0">{sym}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-[#aaa] font-bold uppercase tracking-[0.1em] group-hover:text-white transition-colors block truncate">{r.name}</span>
                          <span className="text-[8px] text-[#333] font-mono">{r.address.slice(0, 10)}…{r.address.slice(-4)}</span>
                        </div>
                        <span className="text-[7px] uppercase tracking-[0.2em] text-[#333] border border-[#1a1a1a] px-2 py-0.5 shrink-0 group-hover:border-[#333] group-hover:text-[#555] transition-colors">{r.category}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,65,0.15), transparent)" }} />
              <div className="px-5 py-3 flex items-center">
                <span className="text-[7px] uppercase tracking-[0.25em] text-[#222]">
                  {filtered.length} ruleset{filtered.length !== 1 ? "s" : ""}
                </span>
                <div className="flex-1" />
                <span className="text-[7px] text-[#1e1e1e] uppercase tracking-[0.2em]">Click to select · ESC close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
