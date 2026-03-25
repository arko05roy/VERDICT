"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const EXAMPLE_PRESETS: { label: string; name: string; category: string; description: string; rules: string }[] = [
  {
    label: "FPS Integrity",
    name: "fps-movement-rules",
    category: "fps",
    description: "Movement and action integrity checks for FPS games",
    rules: `Players cannot move faster than 5 units per tick
Cards must be in the player's hand before playing
RNG must be committed before the bet is placed
No action can exceed 10 per second
Position must stay within map bounds (0-1000)`,
  },
  {
    label: "Sealed Auction",
    name: "sealed-auction-integrity",
    category: "auction",
    description: "ZK verification for sealed-bid auction fairness",
    rules: `Bid amount must not exceed bidder's verified balance
Bid must be submitted before the auction deadline
No bidder can submit more than one bid per auction
Winning bid must be the highest among all revealed bids
Bid commitment must match the revealed bid amount and nonce
Reserve price must be met for the auction to be valid`,
  },
  {
    label: "Token Swap",
    name: "token-swap-rules",
    category: "defi",
    description: "Integrity checks for private token swap execution",
    rules: `Input token amount must equal output amount times the exchange rate
Slippage cannot exceed the user-specified maximum tolerance
Total pool liquidity must be conserved after the swap
Swap size cannot exceed 10% of the pool depth
Minimum output amount must be respected
Swap must execute within the specified deadline timestamp`,
  },
  {
    label: "Chess Moves",
    name: "chess-move-validator",
    category: "board-game",
    description: "Move legality and game state validation for chess",
    rules: `Piece can only move according to its type's movement rules
A move cannot leave the player's own king in check
Castling is only valid if neither king nor rook has moved previously
En passant capture is only valid immediately after opponent's double pawn push
Pawn promotion must occur when a pawn reaches the last rank
Turn must alternate between white and black players`,
  },
  {
    label: "Voting System",
    name: "private-voting-integrity",
    category: "governance",
    description: "Integrity checks for private ZK voting",
    rules: `Each eligible voter can cast exactly one vote
Vote must be for a valid candidate from the registered list
Voter eligibility proof must match a committed voter registry
Vote tally must equal the total number of votes cast
Voting must occur within the designated voting period
No vote can be changed after submission`,
  },
];

const EXAMPLE_RULES = EXAMPLE_PRESETS[0].rules;

type ModalStep = 0 | 1 | 2 | 3; // 0 = no modal, 1 = define, 2 = review, 3 = deploy result

export default function DeployPage() {
  const [rules, setRules] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [compact, setCompact] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalStep>(0);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [rulesets, setRulesets] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [needsHumanReview, setNeedsHumanReview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedCompact, setEditedCompact] = useState("");
  const [validating, setValidating] = useState(false);
  const [compileAttempts, setCompileAttempts] = useState(0);
  const [reviewData, setReviewData] = useState<any>(null);

  // Fetch previously deployed rulesets
  useEffect(() => {
    fetch("/api/rulesets")
      .then((r) => r.json())
      .then((d) => setRulesets(d.rulesets || []))
      .catch(() => {});
  }, [deployResult]);

  // Animate modal in
  useEffect(() => {
    if (modal > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setModalVisible(true));
      });
    }
  }, [modal]);

  const transitionTo = useCallback((next: ModalStep) => {
    setTransitioning(true);
    setModalVisible(false);
    setTimeout(() => {
      setModal(next);
      setTransitioning(false);
      if (next > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setModalVisible(true));
        });
      }
    }, 350);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setModal(0), 350);
  }, []);

  async function handleCompile() {
    if (!rules.trim()) return;
    setCompiling(true);
    setError("");
    setCompact("");

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Compilation failed");
        return;
      }

      setCompact(data.compact);
      setEditedCompact(data.compact);
      setValidationErrors(data.validation || []);
      setCompileAttempts(data.attempts || 1);
      setNeedsHumanReview(data.needsHumanReview || false);
      setEditMode(data.needsHumanReview || false);
      setReviewData(data.review || null);
      transitionTo(2);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setCompiling(false);
    }
  }

  const [showPresets, setShowPresets] = useState(false);

  function handleLoadPreset(idx: number) {
    const p = EXAMPLE_PRESETS[idx];
    setRules(p.rules);
    setName(p.name);
    setCategory(p.category);
    setDescription(p.description);
    setShowPresets(false);
  }

  function handleLoadExample() {
    handleLoadPreset(0);
  }

  async function handleDeploy() {
    setDeploying(true);
    setError("");
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compact: editedCompact || compact, name, category, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Deploy failed");
        return;
      }
      setDeployResult(data);
      transitionTo(3);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setDeploying(false);
    }
  }

  function resetAll() {
    setRules("");
    setName("");
    setCategory("");
    setDescription("");
    setCompact("");
    setEditedCompact("");
    setDeployResult(null);
    setError("");
    setValidationErrors([]);
    setNeedsHumanReview(false);
    setEditMode(false);
    setCompileAttempts(0);
    closeModal();
  }

  const tarotCards = [
    {
      n: 1,
      label: "DEFINE",
      numeral: "I",
      title: "The Scribe",
      desc: "Write game rules in plain English",
      symbol: (
        <svg viewBox="0 0 80 100" className="w-16 h-20 mx-auto" fill="none" stroke="currentColor" strokeWidth="1">
          {/* Quill / scroll */}
          <path d="M40 10 L55 30 L50 90 L40 85 L30 90 L25 30 Z" strokeWidth="0.8" />
          <path d="M30 40 L50 40" strokeWidth="0.5" opacity="0.5" />
          <path d="M32 50 L48 50" strokeWidth="0.5" opacity="0.5" />
          <path d="M33 60 L47 60" strokeWidth="0.5" opacity="0.5" />
          <path d="M34 70 L46 70" strokeWidth="0.5" opacity="0.5" />
          <circle cx="40" cy="25" r="4" strokeWidth="0.8" />
          <path d="M36 25 L44 25 M40 21 L40 29" strokeWidth="0.5" />
        </svg>
      ),
    },
    {
      n: 2,
      label: "REVIEW",
      numeral: "II",
      title: "The Oracle",
      desc: "Inspect compiled Compact ZK circuit",
      symbol: (
        <svg viewBox="0 0 80 100" className="w-16 h-20 mx-auto" fill="none" stroke="currentColor" strokeWidth="1">
          {/* Eye of truth */}
          <ellipse cx="40" cy="45" rx="25" ry="16" strokeWidth="0.8" />
          <circle cx="40" cy="45" r="8" strokeWidth="0.8" />
          <circle cx="40" cy="45" r="3" strokeWidth="0.8" />
          <path d="M40 20 L40 29" strokeWidth="0.5" />
          <path d="M40 61 L40 70" strokeWidth="0.5" />
          <path d="M20 30 L27 35" strokeWidth="0.5" />
          <path d="M60 30 L53 35" strokeWidth="0.5" />
          <path d="M20 60 L27 55" strokeWidth="0.5" />
          <path d="M60 60 L53 55" strokeWidth="0.5" />
          {/* Rays */}
          <path d="M40 12 L38 18 L40 16 L42 18 Z" strokeWidth="0.5" />
          <path d="M40 78 L38 72 L40 74 L42 72 Z" strokeWidth="0.5" />
        </svg>
      ),
    },
    {
      n: 3,
      label: "DEPLOY",
      numeral: "III",
      title: "The Architect",
      desc: "Push to Midnight network",
      symbol: (
        <svg viewBox="0 0 80 100" className="w-16 h-20 mx-auto" fill="none" stroke="currentColor" strokeWidth="1">
          {/* Tower / structure */}
          <path d="M40 10 L60 35 L55 90 L25 90 L20 35 Z" strokeWidth="0.8" />
          <path d="M40 10 L40 30" strokeWidth="0.5" />
          <rect x="34" y="45" width="12" height="15" strokeWidth="0.8" />
          <path d="M40 45 L40 60" strokeWidth="0.5" />
          <path d="M34 52 L46 52" strokeWidth="0.5" />
          {/* Base lines */}
          <path d="M28 75 L52 75" strokeWidth="0.5" opacity="0.5" />
          <path d="M26 82 L54 82" strokeWidth="0.5" opacity="0.5" />
          {/* Crown */}
          <path d="M35 10 L40 5 L45 10" strokeWidth="0.8" />
          <circle cx="40" cy="5" r="2" strokeWidth="0.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-6 relative">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-4 opacity-30">
          <div className="w-12 h-px bg-white" />
          <span className="text-white text-[10px]">◈</span>
          <div className="w-12 h-px bg-white" />
        </div>
        <h1 className="text-lg text-white font-bold tracking-[0.2em] uppercase">
          Deploy Ruleset
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 tracking-wide">
          Choose your path. Each card reveals the next step of the ritual.
        </p>
      </div>

      {/* Tarot Cards */}
      <div className="flex items-center justify-center gap-6">
        {tarotCards.map((card) => {
          const isActive =
            card.n === 1 ||
            (card.n === 2 && compact !== "") ||
            (card.n === 3 && deployResult !== null);
          const isCompleted =
            (card.n === 1 && rules !== "") ||
            (card.n === 2 && compact !== "") ||
            (card.n === 3 && deployResult !== null);

          return (
            <button
              key={card.n}
              onClick={() => {
                if (card.n === 1) setModal(1);
                else if (card.n === 2 && compact) setModal(2);
                else if (card.n === 3 && deployResult) setModal(3);
                else setModal(1);
              }}
              className={`group relative cursor-pointer transition-all duration-500 ${
                isActive
                  ? "hover:-translate-y-3 hover:shadow-[0_20px_60px_rgba(0,255,65,0.1)]"
                  : "opacity-30 hover:opacity-50"
              }`}
              style={{ width: 220, height: 340 }}
            >
              {/* Card border — double line like real tarot */}
              <div
                className="absolute inset-0 border border-[var(--border-bright)] transition-colors duration-500 group-hover:border-[var(--accent)]"
                style={{ background: "var(--bg-secondary)" }}
              />
              {/* Inner border */}
              <div className="absolute inset-[6px] border border-[var(--border)] group-hover:border-[var(--border-bright)] transition-colors duration-500" />

              {/* Corner ornaments */}
              <div className="absolute top-[10px] left-[10px] text-[8px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors">◆</div>
              <div className="absolute top-[10px] right-[10px] text-[8px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors">◆</div>
              <div className="absolute bottom-[10px] left-[10px] text-[8px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors rotate-180">◆</div>
              <div className="absolute bottom-[10px] right-[10px] text-[8px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors rotate-180">◆</div>

              {/* Numeral at top */}
              <div className="absolute top-[22px] left-0 right-0 text-center">
                <span className="text-[11px] tracking-[0.3em] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                  {card.numeral}
                </span>
              </div>

              {/* Decorative top line */}
              <div className="absolute top-[38px] left-[20px] right-[20px] flex items-center gap-2 opacity-30">
                <div className="flex-1 h-px bg-current text-[var(--border-bright)]" />
                <span className="text-[6px] text-[var(--border-bright)]">✦</span>
                <div className="flex-1 h-px bg-current text-[var(--border-bright)]" />
              </div>

              {/* Symbol — center of card */}
              <div className={`absolute top-[55px] left-0 right-0 transition-colors duration-500 ${
                isCompleted ? "text-[var(--accent)]" : "text-[var(--border-bright)] group-hover:text-[var(--text-secondary)]"
              }`}>
                {card.symbol}
              </div>

              {/* Decorative bottom line */}
              <div className="absolute bottom-[120px] left-[20px] right-[20px] flex items-center gap-2 opacity-30">
                <div className="flex-1 h-px bg-current text-[var(--border-bright)]" />
                <span className="text-[6px] text-[var(--border-bright)]">✦</span>
                <div className="flex-1 h-px bg-current text-[var(--border-bright)]" />
              </div>

              {/* Title */}
              <div className="absolute bottom-[80px] left-0 right-0 text-center">
                <span className="text-[13px] uppercase tracking-[0.2em] text-[var(--text-primary)] font-bold group-hover:text-white transition-colors">
                  {card.title}
                </span>
              </div>

              {/* Label */}
              <div className="absolute bottom-[60px] left-0 right-0 text-center">
                <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  {card.label}
                </span>
              </div>

              {/* Description / status */}
              <div className="absolute bottom-[28px] left-[16px] right-[16px] text-center">
                {card.n === 1 && rules ? (
                  <span className="text-[10px] text-[var(--accent-dim)] font-mono">
                    {rules.trim().split("\n").filter(Boolean).length} rules inscribed
                  </span>
                ) : card.n === 2 && compact ? (
                  <span className="text-[10px] text-[var(--accent-dim)] font-mono">
                    {compact.split("\n").length} lines revealed
                  </span>
                ) : card.n === 3 && deployResult ? (
                  <span className="text-[10px] text-[var(--accent)] font-mono">
                    ✦ SEALED ✦
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    {card.desc}
                  </span>
                )}
              </div>

              {/* Glow effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(0,255,65,0.04) 0%, transparent 70%)",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Action row */}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={() => setModal(1)}
          className="btn-brutal px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] font-bold bg-white text-black hover:bg-[var(--text-primary)] transition-all cursor-pointer"
        >
          Begin Ritual
        </button>
        {deployResult && (
          <button
            onClick={resetAll}
            className="btn-brutal px-4 py-2 text-[11px] uppercase tracking-wider border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-white hover:border-white transition-all cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* ═══════ PAST RULESETS — TAROT COLLECTION ═══════ */}
      {rulesets.length > 0 && (
        <div className="mt-14">
          {/* Section divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, var(--border-bright) 0 2px, transparent 2px 6px)" }} />
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">✦ Your Rulesets ✦</span>
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(90deg, var(--border-bright) 0 2px, transparent 2px 6px)" }} />
          </div>

          {/* 3-per-row grid */}
          <div className="grid grid-cols-3 gap-5">
            {rulesets.map((rs, idx) => {
              const categorySymbols: Record<string, string> = {
                fps: "⊕",
                "card-game": "♠",
                mmorpg: "⚔",
                "turn-based": "♟",
                casino: "♦",
                "battle-royale": "◎",
              };
              const sym = categorySymbols[rs.category] || "◈";
              const romanNumerals = ["IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
              const numeral = romanNumerals[idx % romanNumerals.length];

              return (
                <div
                  key={rs.address}
                  className="group relative cursor-default transition-all duration-500 hover:-translate-y-2"
                  style={{ height: 280 }}
                >
                  {/* Outer border */}
                  <div className="absolute inset-0 border border-[var(--border)] group-hover:border-[var(--accent-dim)] transition-colors duration-500" style={{ background: "var(--bg-secondary)" }} />
                  {/* Inner border */}
                  <div className="absolute inset-[5px] border border-[var(--border)] group-hover:border-[var(--border-bright)] transition-colors duration-500" />

                  {/* Corner ornaments */}
                  <div className="absolute top-[8px] left-[8px] text-[6px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors">◆</div>
                  <div className="absolute top-[8px] right-[8px] text-[6px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors">◆</div>
                  <div className="absolute bottom-[8px] left-[8px] text-[6px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors rotate-180">◆</div>
                  <div className="absolute bottom-[8px] right-[8px] text-[6px] text-[var(--text-muted)] group-hover:text-[var(--accent-dim)] transition-colors rotate-180">◆</div>

                  {/* Numeral */}
                  <div className="absolute top-[18px] left-0 right-0 text-center">
                    <span className="text-[9px] tracking-[0.3em] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">{numeral}</span>
                  </div>

                  {/* Top divider */}
                  <div className="absolute top-[32px] left-[14px] right-[14px] flex items-center gap-1.5 opacity-25">
                    <div className="flex-1 h-px bg-[var(--border-bright)]" />
                    <span className="text-[5px] text-[var(--border-bright)]">✦</span>
                    <div className="flex-1 h-px bg-[var(--border-bright)]" />
                  </div>

                  {/* Category symbol — large center */}
                  <div className="absolute top-[50px] left-0 right-0 text-center text-[var(--border-bright)] group-hover:text-[var(--accent)] transition-colors duration-500">
                    <span className="text-3xl">{sym}</span>
                  </div>

                  {/* Category tag */}
                  <div className="absolute top-[95px] left-0 right-0 text-center">
                    <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{rs.category}</span>
                  </div>

                  {/* Bottom divider */}
                  <div className="absolute bottom-[115px] left-[14px] right-[14px] flex items-center gap-1.5 opacity-25">
                    <div className="flex-1 h-px bg-[var(--border-bright)]" />
                    <span className="text-[5px] text-[var(--border-bright)]">✦</span>
                    <div className="flex-1 h-px bg-[var(--border-bright)]" />
                  </div>

                  {/* Name */}
                  <div className="absolute bottom-[85px] left-[14px] right-[14px] text-center">
                    <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-primary)] font-bold group-hover:text-white transition-colors leading-tight block">
                      {rs.name.length > 28 ? rs.name.slice(0, 28) + "..." : rs.name}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="absolute bottom-[50px] left-[14px] right-[14px] space-y-1">
                    <div className="flex justify-between px-1">
                      <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Checks</span>
                      <span className="text-[8px] text-[var(--text-secondary)] font-mono">{rs.totalChecks?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">Flagged</span>
                      <span className="text-[8px] text-[var(--danger)] font-mono">{rs.flaggedRate}</span>
                    </div>
                  </div>

                  {/* Status seal */}
                  <div className="absolute bottom-[26px] left-0 right-0 text-center">
                    <span className="text-[8px] tracking-[0.25em] uppercase text-[var(--accent-dim)] group-hover:text-[var(--accent)] transition-colors">
                      ✦ sealed ✦
                    </span>
                  </div>

                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(0,255,65,0.04) 0%, transparent 70%)" }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ MODAL OVERLAY ═══════ */}
      {modal > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            transition: "background 0.35s ease",
            background: modalVisible
              ? "rgba(0, 0, 0, 0.85)"
              : "rgba(0, 0, 0, 0)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !transitioning) closeModal();
          }}
        >
          {/* ── MODAL 1: DEFINE ── */}
          {modal === 1 && (
            <div
              className="relative w-full max-w-2xl mx-4"
              style={{
                transition:
                  "opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                opacity: modalVisible ? 1 : 0,
                transform: modalVisible
                  ? "translateY(0) scale(1)"
                  : "translateY(24px) scale(0.97)",
              }}
            >
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)]" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)]" />

              <div className="border border-[var(--border-bright)] bg-[var(--bg-primary)]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-[10px] font-bold border border-white text-white">
                      1
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.15em] text-white font-bold">
                      Define Rules
                    </span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-[var(--text-muted)] hover:text-white text-xs cursor-pointer transition-colors"
                  >
                    ESC
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                  {/* Rules textarea */}
                  <div className="border border-[var(--border)] bg-[var(--bg-secondary)]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        Rules · English
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {rules.trim().split("\n").filter(Boolean).length} rules
                      </span>
                    </div>
                    <textarea
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                      className="w-full bg-transparent p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none h-44 font-mono"
                      placeholder={`Players cannot move faster than 5 units per tick\nCards must be in the player's hand before playing\nRNG must be committed before the bet is placed`}
                      autoFocus
                    />
                  </div>

                  {/* Metadata row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-[var(--border)] bg-[var(--bg-secondary)]">
                      <div className="px-3 py-1.5 border-b border-[var(--border)]">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          Ruleset Name
                        </span>
                      </div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-mono"
                        placeholder="my-ruleset"
                      />
                    </div>
                    <div className="border border-[var(--border)] bg-[var(--bg-secondary)]">
                      <div className="px-3 py-1.5 border-b border-[var(--border)]">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          Category
                        </span>
                      </div>
                      <input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-mono"
                        placeholder="e.g. card-game, fps, moba"
                      />
                    </div>
                  </div>
                  <div className="border border-[var(--border)] bg-[var(--bg-secondary)]">
                    <div className="px-3 py-1.5 border-b border-[var(--border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        Description
                      </span>
                    </div>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-mono"
                      placeholder="What does this ruleset enforce?"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="px-4 py-2 border border-[var(--danger)] bg-[rgba(255,51,51,0.05)] text-xs text-[var(--danger)]">
                      {error}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
                  <div className="relative">
                    <button
                      onClick={() => setShowPresets(!showPresets)}
                      className="btn-brutal px-4 py-2 text-[11px] uppercase tracking-wider border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-white hover:border-white transition-all cursor-pointer"
                    >
                      Load Example ▾
                    </button>
                    {showPresets && (
                      <div className="absolute bottom-full left-0 mb-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden min-w-[200px] z-50 shadow-lg">
                        {EXAMPLE_PRESETS.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => handleLoadPreset(i)}
                            className="block w-full text-left px-4 py-2.5 text-[11px] tracking-wide text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-white transition-all cursor-pointer"
                          >
                            <span className="font-bold uppercase">{p.label}</span>
                            <span className="block text-[10px] opacity-50 mt-0.5 normal-case">{p.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeModal}
                      className="btn-brutal px-4 py-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCompile}
                      disabled={compiling || !rules.trim()}
                      className={`btn-brutal px-5 py-2.5 text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        compiling || !rules.trim()
                          ? "bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed"
                          : "bg-white text-black hover:bg-[var(--text-primary)]"
                      }`}
                    >
                      {compiling ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                          Compiling & Validating...
                        </span>
                      ) : (
                        "Compile →"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL 2: REVIEW ── */}
          {modal === 2 && (
            <div
              className="relative w-full max-w-3xl mx-4"
              style={{
                transition:
                  "opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                opacity: modalVisible ? 1 : 0,
                transform: modalVisible
                  ? "translateY(0) scale(1)"
                  : "translateY(24px) scale(0.97)",
              }}
            >
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[var(--warning)]" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[var(--warning)]" />

              <div className="border border-[var(--border-bright)] bg-[var(--bg-primary)]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-[10px] font-bold border border-[var(--warning)] text-[var(--warning)]">
                      2
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.15em] text-white font-bold">
                      Review Compact
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-2">
                      {compact.split("\n").length} lines
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                        editMode ? "text-[var(--warning)]" : "text-[var(--text-muted)] hover:text-white"
                      }`}
                    >
                      {editMode ? "View" : "Edit"}
                    </button>
                    <button
                      onClick={async () => {
                        setValidating(true);
                        try {
                          const res = await fetch("/api/validate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ compact: editedCompact || compact }),
                          });
                          const data = await res.json();
                          setValidationErrors(data.errors || []);
                          if (data.valid) setNeedsHumanReview(false);
                        } catch {} finally { setValidating(false); }
                      }}
                      disabled={validating}
                      className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                    >
                      {validating ? "Checking..." : "Re-validate"}
                    </button>
                    {(editedCompact || compact) && (
                      <button
                        onClick={() => navigator.clipboard.writeText(editedCompact || compact)}
                        className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                      >
                        Copy
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className="text-[var(--text-muted)] hover:text-white text-xs cursor-pointer transition-colors"
                    >
                      ESC
                    </button>
                  </div>
                </div>

                {/* Validation status bar */}
                {validationErrors.length > 0 && (
                  <div className={`px-5 py-2 border-b border-[var(--border)] text-[10px] uppercase tracking-wider ${
                    validationErrors.some((e: any) => e.severity === "error")
                      ? "bg-[rgba(255,51,51,0.05)] text-[var(--danger)]"
                      : "bg-[rgba(255,170,0,0.05)] text-[var(--warning)]"
                  }`}>
                    {needsHumanReview && (
                      <div className="mb-1 font-bold normal-case tracking-normal text-[11px]">
                        Auto-fix failed after {compileAttempts} attempts. Please review and fix the issues below.
                      </div>
                    )}
                    {validationErrors.map((e: any, i: number) => (
                      <div key={i} className="py-0.5">
                        <span className="opacity-60">L{e.line}:</span> {e.message}
                        {e.severity === "warning" && <span className="ml-1 opacity-50">(warning)</span>}
                      </div>
                    ))}
                  </div>
                )}
                {validationErrors.length === 0 && compact && (
                  <div className="px-5 py-2 border-b border-[var(--border)] bg-[rgba(0,255,65,0.03)] text-[10px] uppercase tracking-wider text-[var(--accent)]">
                    All validation checks passed
                  </div>
                )}

                {/* AI self-review results */}
                {reviewData && (
                  <div className="px-5 py-2 border-b border-[var(--border)] text-[10px]">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="uppercase tracking-wider opacity-60">AI Review</span>
                      <span className={`font-mono font-bold ${
                        reviewData.score >= 8 ? "text-[var(--accent)]" : reviewData.score >= 5 ? "text-[var(--warning)]" : "text-[var(--danger)]"
                      }`}>{reviewData.score}/10</span>
                      <span className="opacity-40">•</span>
                      <span className="opacity-60">{compileAttempts} iteration{compileAttempts !== 1 ? "s" : ""}</span>
                    </div>
                    {reviewData.issues?.filter((i: any) => i.severity === "error").length > 0 && (
                      <div className="mt-1 space-y-0.5 text-[var(--danger)]">
                        {reviewData.issues.filter((i: any) => i.severity === "error").map((i: any, idx: number) => (
                          <div key={idx} className="py-0.5">{i.line ? <span className="opacity-60">L{i.line}: </span> : null}{i.description}</div>
                        ))}
                      </div>
                    )}
                    {reviewData.missingRules?.length > 0 && (
                      <div className="mt-1 text-[var(--warning)]">
                        <span className="opacity-60">Missing rules: </span>{reviewData.missingRules.join(", ")}
                      </div>
                    )}
                    {reviewData.edgeCaseGaps?.length > 0 && (
                      <div className="mt-1 text-[var(--danger)] opacity-80">
                        <div className="opacity-60 mb-0.5">Unhandled edge cases:</div>
                        {reviewData.edgeCaseGaps.map((g: string, idx: number) => (
                          <div key={idx} className="py-0.5 pl-2">— {g}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Code body */}
                <div className="p-0">
                  {editMode ? (
                    <textarea
                      value={editedCompact}
                      onChange={(e) => setEditedCompact(e.target.value)}
                      className="w-full p-5 text-xs leading-relaxed font-mono bg-transparent text-[var(--text-primary)] border-none outline-none resize-none min-h-[40vh] max-h-[50vh] overflow-y-auto"
                      spellCheck={false}
                    />
                  ) : (
                    <pre className="p-5 text-xs leading-relaxed overflow-x-auto max-h-[50vh] overflow-y-auto">
                      <code>
                        {(editedCompact || compact).split("\n").map((line, i) => {
                          const lineErrors = validationErrors.filter((e: any) => e.line === i + 1);
                          return (
                            <div key={i} className={`flex transition-colors ${
                              lineErrors.length > 0
                                ? lineErrors.some((e: any) => e.severity === "error")
                                  ? "bg-[rgba(255,51,51,0.08)]"
                                  : "bg-[rgba(255,170,0,0.06)]"
                                : "hover:bg-[var(--bg-hover)]"
                            }`}>
                              <span className="w-8 text-right pr-3 text-[var(--text-muted)] select-none shrink-0">
                                {i + 1}
                              </span>
                              <span
                                className={
                                  lineErrors.some((e: any) => e.severity === "error")
                                    ? "text-[var(--danger)]"
                                    : line.trimStart().startsWith("//")
                                    ? "text-[var(--text-muted)]"
                                    : line.includes("export") ||
                                      line.includes("pragma") ||
                                      line.includes("import")
                                    ? "text-[var(--accent-dim)]"
                                    : line.includes("assert")
                                    ? "text-[var(--warning)]"
                                    : "text-[var(--text-primary)]"
                                }
                              >
                                {line || "\u00A0"}
                              </span>
                            </div>
                          );
                        })}
                      </code>
                    </pre>
                  )}
                </div>

                {/* Source rules summary */}
                <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Source Rules
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono leading-relaxed">
                    {rules
                      .trim()
                      .split("\n")
                      .filter(Boolean)
                      .map((r, i) => `${i + 1}. ${r}`)
                      .join(" · ")}
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="mx-5 mb-3 px-4 py-2 border border-[var(--danger)] bg-[rgba(255,51,51,0.05)] text-xs text-[var(--danger)]">
                    {error}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => transitionTo(1)}
                    className="btn-brutal px-4 py-2 text-[11px] uppercase tracking-wider border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-white hover:border-white transition-all cursor-pointer"
                  >
                    ← Edit Rules
                  </button>
                  <div className="flex items-center gap-3">
                    {!name.trim() && (
                      <span className="text-[10px] text-[var(--warning)] uppercase tracking-wider">
                        Name required
                      </span>
                    )}
                    {validationErrors.some((e: any) => e.severity === "error") && (
                      <span className="text-[10px] text-[var(--danger)] uppercase tracking-wider">
                        Fix errors first
                      </span>
                    )}
                    <button
                      onClick={handleDeploy}
                      disabled={deploying || !name.trim() || validationErrors.some((e: any) => e.severity === "error")}
                      className={`btn-brutal px-5 py-2.5 text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        deploying || !name.trim() || validationErrors.some((e: any) => e.severity === "error")
                          ? "bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed"
                          : "bg-white text-black hover:bg-[var(--text-primary)]"
                      }`}
                    >
                      {deploying ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                          Deploying...
                        </span>
                      ) : (
                        "Deploy to Midnight →"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL 3: DEPLOY RESULT ── */}
          {modal === 3 && deployResult && (
            <div
              className="relative w-full max-w-2xl mx-4"
              style={{
                transition:
                  "opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                opacity: modalVisible ? 1 : 0,
                transform: modalVisible
                  ? "translateY(0) scale(1)"
                  : "translateY(24px) scale(0.97)",
              }}
            >
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)]" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)]" />

              <div
                className="border border-[var(--accent)] bg-[var(--bg-primary)]"
                style={{
                  boxShadow: "0 0 60px rgba(0, 255, 65, 0.08), 0 0 120px rgba(0, 255, 65, 0.04)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--accent)] bg-[var(--accent-glow)]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-[10px] font-bold border border-[var(--accent)] text-[var(--accent)]">
                      ✓
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--accent)] font-bold">
                      Deployed Successfully
                    </span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-[var(--text-muted)] hover:text-white text-xs cursor-pointer transition-colors"
                  >
                    ESC
                  </button>
                </div>

                {/* Details */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "CONTRACT", value: deployResult.contractAddress },
                      { label: "TX HASH", value: deployResult.txHash },
                      { label: "NETWORK", value: deployResult.network },
                      {
                        label: "DEPLOYED AT",
                        value: new Date(
                          deployResult.deployedAt
                        ).toLocaleString(),
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="border border-[var(--border)] bg-[var(--bg-secondary)] p-3"
                      >
                        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-[var(--text-primary)] font-mono break-all">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="dither-sep" />

                  {/* SDK Snippet */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                        SDK SNIPPET
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(deployResult.sdk)
                        }
                        className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="text-xs text-[var(--text-primary)] leading-relaxed bg-[var(--bg-secondary)] p-4 border border-[var(--border)] max-h-48 overflow-y-auto">
                      {deployResult.sdk}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => transitionTo(2)}
                    className="btn-brutal px-4 py-2 text-[11px] uppercase tracking-wider border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-white hover:border-white transition-all cursor-pointer"
                  >
                    ← View Code
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeModal}
                      className="btn-brutal px-4 py-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-all cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={resetAll}
                      className="btn-brutal px-5 py-2.5 text-[11px] uppercase tracking-wider font-bold bg-white text-black hover:bg-[var(--text-primary)] transition-all cursor-pointer"
                    >
                      Deploy Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
