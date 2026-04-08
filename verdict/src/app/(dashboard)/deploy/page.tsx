"use client";

import { useState, useEffect, useCallback } from "react";

type CheckMeta = {
  id: string;
  mythName: string;
  numeral: string;
  category: string;
  symbol: string;
  description: string;
  longDescription: string;
  isHardFail: boolean;
  publicParams: { name: string; type: string; description: string; required: boolean }[];
  dependencies: string[];
};

type Suggestion = {
  checkId: string;
  confidence: number;
  suggestedParams: Record<string, string>;
  reason: string;
};

type ModalStep = 0 | 1 | 2 | 3 | 4 | 5;

const CATEGORY_ORDER = ["integrity", "rate-limit", "boundary", "validity", "behavioral", "information"];
const CATEGORY_LABELS: Record<string, string> = {
  integrity: "INTEGRITY",
  "rate-limit": "RATE LIMITS",
  boundary: "BOUNDARIES",
  validity: "VALIDITY",
  behavioral: "BEHAVIORAL",
  information: "INFORMATION",
};

export default function DeployPage() {
  // Step 1 state
  const [systemDescription, setSystemDescription] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Step 2 state
  const [allChecks, setAllChecks] = useState<CheckMeta[]>([]);
  const [enabledChecks, setEnabledChecks] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  // Step 3 state
  const [checkParams, setCheckParams] = useState<Record<string, Record<string, string>>>({});

  // Step 4 state
  const [compact, setCompact] = useState("");
  const [vcl, setVcl] = useState("");
  const [compileError, setCompileError] = useState("");
  const [compiledConfig, setCompiledConfig] = useState<any>(null);

  // Step 5 state
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);

  // UI state
  const [modal, setModal] = useState<ModalStep>(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState("");
  const [rulesets, setRulesets] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/checks").then((r) => r.json()).then((d) => setAllChecks(d.checks || [])).catch(() => {});
    fetch("/api/rulesets").then((r) => r.json()).then((d) => setRulesets(d.rulesets || [])).catch(() => {});
  }, [deployResult]);

  useEffect(() => {
    if (modal > 0) {
      requestAnimationFrame(() => { requestAnimationFrame(() => setModalVisible(true)); });
    }
  }, [modal]);

  const transitionTo = useCallback((next: ModalStep) => {
    setModalVisible(false);
    setTimeout(() => {
      setModal(next);
      if (next > 0) {
        requestAnimationFrame(() => { requestAnimationFrame(() => setModalVisible(true)); });
      }
    }, 350);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setModal(0), 350);
  }, []);

  // ─── Step 1: Suggest Guardians ───
  async function handleSuggest() {
    if (!systemDescription.trim()) return;
    setSuggesting(true);
    setError("");
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: systemDescription }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      const sugg: Suggestion[] = data.suggestions || [];
      setSuggestions(sugg);

      // Pre-enable suggested checks
      const suggested = new Set(sugg.map((s: Suggestion) => s.checkId));
      setEnabledChecks(suggested);

      // Pre-fill suggested params
      const params: Record<string, Record<string, string>> = {};
      for (const s of sugg) {
        if (s.suggestedParams && Object.keys(s.suggestedParams).length > 0) {
          params[s.checkId] = s.suggestedParams;
        }
      }
      setCheckParams(params);

      transitionTo(2);
    } catch (e: any) {
      setError(e.message || "Suggestion failed");
    } finally {
      setSuggesting(false);
    }
  }

  function handleSkipSuggest() {
    setSuggestions([]);
    transitionTo(2);
  }

  // ─── Step 2: Toggle checks ───
  function toggleCheck(id: string) {
    setEnabledChecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getDependencyWarnings(): string[] {
    const warnings: string[] = [];
    for (const id of enabledChecks) {
      const check = allChecks.find((c) => c.id === id);
      if (!check) continue;
      for (const dep of check.dependencies) {
        if (!enabledChecks.has(dep)) {
          const depCheck = allChecks.find((c) => c.id === dep);
          warnings.push(`${check.mythName} requires ${depCheck?.mythName || dep}`);
        }
      }
    }
    return warnings;
  }

  // ─── Step 3→4: Build VCL and compile ───
  async function handleCompile() {
    setCompileError("");
    setCompact("");

    // Build VCL from enabled checks + params
    let vclStr = "version 1.0\n";
    for (const id of enabledChecks) {
      const check = allChecks.find((c) => c.id === id);
      if (!check) continue;
      const params = checkParams[id] || {};
      const paramLines = Object.entries(params)
        .filter(([, v]) => String(v).trim() !== "")
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      if (paramLines) {
        vclStr += `\nuse ${check.mythName} {\n${paramLines}\n}\n`;
      } else {
        vclStr += `\nuse ${check.mythName} {}\n`;
      }
    }
    setVcl(vclStr);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vcl: vclStr }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.vclErrors
          ? data.vclErrors.map((e: any) => `Line ${e.line}: ${e.message}`).join("\n")
          : data.error || "Compilation failed";
        setCompileError(errMsg);
        return;
      }
      if (data.config) {
        setCompiledConfig(data.config);
      }
      if (data.compact) {
        setCompact(data.compact);
      }
      transitionTo(4);
    } catch (e: any) {
      setCompileError(e.message || "Network error");
    }
  }

  // ─── Step 5: Deploy ───
  async function handleDeploy() {
    setDeploying(true);
    setError("");
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          tags,
          enabledChecks: [...enabledChecks],
          vcl,
          verifierVersion: compiledConfig?.verifierVersion || "1",
          enableMask: compiledConfig?.enableMask || "1023",
          params: compiledConfig?.params || {},
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Deploy failed"); return; }
      setDeployResult(data);
      transitionTo(5);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setDeploying(false);
    }
  }

  function resetAll() {
    setSystemDescription(""); setName(""); setDescription(""); setTagsInput("");
    setEnabledChecks(new Set()); setSuggestions([]); setCheckParams({});
    setCompact(""); setVcl(""); setCompileError(""); setCompiledConfig(null); setDeployResult(null);
    setError(""); closeModal();
  }

  // ─── Grouped checks for Step 2 ───
  const groupedChecks = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    checks: allChecks.filter((c) => c.category === cat),
  })).filter((g) => g.checks.length > 0);

  // ─── Tarot step cards ───
  const steps = [
    { n: 1, numeral: "I", label: "DESCRIBE", title: "The Oracle", desc: "Describe your system" },
    { n: 2, numeral: "II", label: "CHOOSE", title: "The Fates", desc: "Select your guardians" },
    { n: 3, numeral: "III", label: "CONFIGURE", title: "The Scribe", desc: "Set parameters" },
    { n: 4, numeral: "IV", label: "REVIEW", title: "The Eye", desc: "Review configuration" },
    { n: 5, numeral: "V", label: "REGISTER", title: "The Architect", desc: "Register ruleset" },
  ];

  function setParam(checkId: string, paramName: string, value: string) {
    setCheckParams((prev) => ({
      ...prev,
      [checkId]: { ...(prev[checkId] || {}), [paramName]: value },
    }));
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12">
        <p className="text-[var(--text-muted)] text-xs tracking-[0.3em] mb-2">DEPLOY RULESET</p>
        <h1 className="text-2xl text-[var(--text-primary)] mb-1">Choose your path</h1>
        <p className="text-sm text-[var(--text-secondary)]">Each card reveals the next step</p>
      </div>

      {/* Step cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-5 gap-4 mb-16">
        {steps.map((s) => (
          <button
            key={s.n}
            onClick={() => {
              if (s.n === 1) transitionTo(1);
            }}
            className={`group relative border rounded-sm p-6 text-center transition-all duration-300
              ${s.n === 1 ? "border-[var(--border-bright)] hover:border-[var(--accent)] cursor-pointer" : "border-[var(--border)] cursor-default opacity-40"}
              bg-[var(--bg-secondary)]`}
          >
            <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-3">{s.numeral}</p>
            <div className="text-3xl text-[var(--text-muted)] mb-3 group-hover:text-[var(--accent)] transition-colors">{"\u25C7"}</div>
            <p className="text-xs tracking-[0.2em] text-[var(--text-primary)] mb-1">{s.label}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">{s.title}</p>
          </button>
        ))}
      </div>

      {/* Modal overlay */}
      {modal > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            className={`relative w-full max-w-4xl max-h-[85vh] overflow-y-auto mx-4 border border-[var(--border-bright)] bg-[var(--bg-primary)] rounded-sm p-8 transition-all duration-350 ${modalVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
          >
            {/* Close button */}
            <button onClick={closeModal} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">{"\u2715"}</button>

            {/* ════ STEP 1: DESCRIBE ════ */}
            {modal === 1 && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-1">I</p>
                <h2 className="text-xl text-[var(--text-primary)] mb-1">The Oracle</h2>
                <p className="text-xs text-[var(--text-secondary)] mb-8">Describe your system. The oracle will suggest guardians.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">SYSTEM DESCRIPTION</label>
                    <textarea
                      value={systemDescription}
                      onChange={(e) => setSystemDescription(e.target.value)}
                      rows={5}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-sm p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      placeholder="e.g., A decentralized exchange where users submit limit orders. Orders are matched by a centralized engine. We need to verify that the engine executes trades at the declared price and doesn't front-run user orders."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">RULESET NAME</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-sm p-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                        placeholder="e.g., order-integrity"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">TAGS (comma-separated)</label>
                      <input
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-sm p-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                        placeholder="e.g., defi, order-matching, exchange"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">DESCRIPTION</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-sm p-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      placeholder="Brief description of what this ruleset verifies"
                    />
                  </div>
                </div>

                {error && <p className="text-[var(--danger)] text-xs mt-4">{error}</p>}

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleSuggest}
                    disabled={suggesting || !systemDescription.trim()}
                    className="px-6 py-2 text-xs tracking-[0.2em] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)] disabled:opacity-30 transition-colors"
                  >
                    {suggesting ? "CONSULTING ORACLE..." : "SUGGEST GUARDIANS"}
                  </button>
                  <button
                    onClick={handleSkipSuggest}
                    className="px-6 py-2 text-xs tracking-[0.2em] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    SKIP — CHOOSE MANUALLY
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 2: CHOOSE GUARDIANS ════ */}
            {modal === 2 && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-1">II</p>
                <h2 className="text-xl text-[var(--text-primary)] mb-1">The Fates</h2>
                <p className="text-xs text-[var(--text-secondary)] mb-6">Select your guardians. Click to enable or disable.</p>

                {suggestions.length > 0 && (
                  <p className="text-[10px] text-[var(--accent)] tracking-[0.2em] mb-4">
                    {"\u2726"} AI-suggested guardians are pre-selected
                  </p>
                )}

                {/* Dependency warnings */}
                {getDependencyWarnings().map((w, i) => (
                  <p key={i} className="text-[var(--warning)] text-xs mb-2">{"\u26A0"} {w}</p>
                ))}

                <div className="space-y-6">
                  {groupedChecks.map((group) => (
                    <div key={group.category}>
                      <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-3">{"\u2500\u2500\u2500"} {group.label} {"\u2500\u2500\u2500"}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {group.checks.map((check) => {
                          const enabled = enabledChecks.has(check.id);
                          const suggested = suggestions.some((s) => s.checkId === check.id);
                          return (
                            <button
                              key={check.id}
                              onClick={() => toggleCheck(check.id)}
                              className={`relative text-left border rounded-sm p-4 transition-all duration-200
                                ${enabled
                                  ? "border-[var(--accent)] bg-[var(--accent-glow)]"
                                  : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-bright)]"
                                }
                                ${suggested && !enabled ? "ring-1 ring-[var(--accent)]/30" : ""}
                              `}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <span className="text-[10px] text-[var(--text-muted)] mr-2">{check.numeral}</span>
                                  <span className={`text-sm font-medium ${enabled ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                                    {check.mythName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {check.isHardFail && (
                                    <span className="text-[8px] tracking-[0.15em] text-[var(--danger)] border border-[var(--danger)]/30 px-1 py-0.5 rounded-sm">ASSERT</span>
                                  )}
                                  <span className={`text-lg ${enabled ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                                    {enabled ? "\u25C9" : "\u25CB"}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{check.description}</p>
                              {suggested && (
                                <p className="text-[9px] text-[var(--accent)]/60 mt-1">{"\u2726"} suggested</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-8 pt-4 border-t border-[var(--border)]">
                  <button onClick={() => transitionTo(1)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{"\u2190"} Back</button>
                  <div className="text-xs text-[var(--text-muted)]">{enabledChecks.size} guardian{enabledChecks.size !== 1 ? "s" : ""} selected</div>
                  <button
                    onClick={() => enabledChecks.size > 0 && transitionTo(3)}
                    disabled={enabledChecks.size === 0}
                    className="px-6 py-2 text-xs tracking-[0.2em] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)] disabled:opacity-30 transition-colors"
                  >
                    CONFIGURE {"\u2192"}
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 3: CONFIGURE PARAMS ════ */}
            {modal === 3 && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-1">III</p>
                <h2 className="text-xl text-[var(--text-primary)] mb-1">The Scribe</h2>
                <p className="text-xs text-[var(--text-secondary)] mb-6">Set parameters for each guardian. These define your system's rules.</p>

                <div className="space-y-4">
                  {[...enabledChecks].map((id) => {
                    const check = allChecks.find((c) => c.id === id);
                    if (!check) return null;
                    const hasParams = check.publicParams.length > 0;

                    return (
                      <div key={id} className="border border-[var(--border)] rounded-sm bg-[var(--bg-secondary)]">
                        <div className="p-4 border-b border-[var(--border)]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--text-muted)]">{check.numeral}</span>
                            <span className="text-sm text-[var(--accent)]">{check.mythName}</span>
                            {!hasParams && <span className="text-[10px] text-[var(--text-muted)]">{"\u2014"} no parameters needed</span>}
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1">{check.description}</p>
                        </div>
                        {hasParams && (
                          <div className="p-4 space-y-3">
                            {check.publicParams.map((param) => (
                              <div key={param.name} className="flex items-center gap-4">
                                <div className="w-1/3">
                                  <label className="text-[10px] text-[var(--text-muted)] tracking-[0.15em]">
                                    {param.name}
                                    {param.required && <span className="text-[var(--danger)] ml-1">*</span>}
                                  </label>
                                  <p className="text-[9px] text-[var(--text-muted)]/60">{param.description}</p>
                                </div>
                                <input
                                  value={checkParams[id]?.[param.name] || ""}
                                  onChange={(e) => setParam(id, param.name, e.target.value)}
                                  className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-sm px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                                  placeholder={param.type === "Bytes32" ? "0x..." : "e.g., 100"}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {compileError && (
                  <pre className="mt-4 p-3 bg-[var(--bg-tertiary)] border border-[var(--danger)]/30 rounded-sm text-[var(--danger)] text-xs whitespace-pre-wrap">{compileError}</pre>
                )}

                <div className="flex justify-between items-center mt-8 pt-4 border-t border-[var(--border)]">
                  <button onClick={() => transitionTo(2)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{"\u2190"} Back</button>
                  <button
                    onClick={handleCompile}
                    className="px-6 py-2 text-xs tracking-[0.2em] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors"
                  >
                    COMPILE {"\u2192"}
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 4: REVIEW ════ */}
            {modal === 4 && (
              <div>
                <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-1">IV</p>
                <h2 className="text-xl text-[var(--text-primary)] mb-1">The Eye</h2>
                <p className="text-xs text-[var(--text-secondary)] mb-6">Review your ruleset configuration before registering.</p>

                <div className="mb-4 p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                  <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-2">ACTIVE GUARDIANS</p>
                  <div className="flex flex-wrap gap-2">
                    {[...enabledChecks].map((id) => {
                      const check = allChecks.find((c) => c.id === id);
                      return (
                        <span key={id} className="text-[10px] tracking-[0.15em] text-[var(--accent)] border border-[var(--accent)]/30 px-2 py-0.5 rounded-sm">
                          {check?.numeral} {check?.mythName}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Config summary */}
                {compiledConfig && (
                  <div className="mb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                        <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">VERIFIER VERSION</p>
                        <p className="text-sm text-[var(--text-primary)]">v{compiledConfig.verifierVersion}.0 — Genesis</p>
                      </div>
                      <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                        <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">ENABLE MASK</p>
                        <p className="text-sm text-[var(--text-primary)] font-mono">0b{BigInt(compiledConfig.enableMask).toString(2).padStart(10, "0")}</p>
                      </div>
                    </div>

                    {Object.keys(compiledConfig.params || {}).length > 0 && (
                      <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                        <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-2">PARAMETERS</p>
                        <div className="space-y-1">
                          {Object.entries(compiledConfig.params).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs">
                              <span className="text-[var(--text-secondary)]">{k}</span>
                              <span className="text-[var(--text-primary)] font-mono">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* VCL source */}
                <details className="mb-4">
                  <summary className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] cursor-pointer hover:text-[var(--text-secondary)]">VCL SOURCE</summary>
                  <pre className="mt-2 p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-sm text-xs text-[var(--text-secondary)] overflow-x-auto max-h-64 overflow-y-auto">{vcl}</pre>
                </details>

                {/* Compiled Compact contract */}
                {compact && (
                  <details className="mb-4">
                    <summary className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] cursor-pointer hover:text-[var(--text-secondary)]">COMPILED COMPACT CONTRACT</summary>
                    <pre className="mt-2 p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-sm text-xs text-[var(--text-secondary)] overflow-x-auto max-h-80 overflow-y-auto">{compact}</pre>
                  </details>
                )}

                <div className="flex justify-between items-center mt-8 pt-4 border-t border-[var(--border)]">
                  <button onClick={() => transitionTo(3)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{"\u2190"} Back</button>
                  <button
                    onClick={handleDeploy}
                    disabled={deploying}
                    className="px-6 py-2 text-xs tracking-[0.2em] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-glow)] disabled:opacity-30 transition-colors"
                  >
                    {deploying ? "REGISTERING..." : "REGISTER RULESET \u2192"}
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 5: RESULT ════ */}
            {modal === 5 && deployResult && (
              <div className="text-center">
                <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-1">V</p>
                <h2 className="text-xl text-[var(--text-primary)] mb-1">The Architect</h2>
                <p className="text-xs text-[var(--accent)] mb-8">{"\u2726"} Ruleset registered successfully</p>

                <div className="text-left space-y-3 mb-8">
                  <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                    <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">CONTRACT ADDRESS</p>
                    <p className="text-xs text-[var(--text-primary)] font-mono break-all">{deployResult.contractAddress}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                      <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">NAME</p>
                      <p className="text-xs text-[var(--text-primary)]">{deployResult.name}</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                      <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">GUARDIANS</p>
                      <p className="text-xs text-[var(--text-primary)]">{deployResult.checkCount || enabledChecks.size}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                      <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">VERIFIER</p>
                      <p className="text-xs text-[var(--text-primary)]">v{deployResult.verifierVersion || "1"}.0</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                      <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">NETWORK</p>
                      <p className="text-xs text-[var(--text-primary)]">{deployResult.network || "preprod"}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-sm">
                    <p className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] mb-1">SDK</p>
                    <pre className="text-xs text-[var(--accent)] whitespace-pre-wrap">{deployResult.sdk}</pre>
                  </div>
                  {(deployResult.compact || compact) && (
                    <details>
                      <summary className="text-[10px] text-[var(--text-muted)] tracking-[0.2em] cursor-pointer hover:text-[var(--text-secondary)]">COMPACT CONTRACT</summary>
                      <pre className="mt-2 p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-sm text-xs text-[var(--text-secondary)] overflow-x-auto max-h-80 overflow-y-auto">{deployResult.compact || compact}</pre>
                    </details>
                  )}
                </div>

                <button onClick={resetAll} className="px-6 py-2 text-xs tracking-[0.2em] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  DEPLOY ANOTHER
                </button>
              </div>
            )}

            {error && modal !== 1 && <p className="text-[var(--danger)] text-xs mt-4">{error}</p>}
          </div>
        </div>
      )}

      {/* Previously deployed rulesets */}
      {rulesets.length > 0 && (
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] mb-4">YOUR RULESETS</p>
          <div className="grid grid-cols-3 gap-4">
            {rulesets.map((rs: any, i: number) => (
              <div key={rs.address || i} className="border border-[var(--border)] rounded-sm p-4 bg-[var(--bg-secondary)] hover:border-[var(--border-bright)] transition-colors">
                <p className="text-sm text-[var(--text-primary)] mb-1">{rs.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono mb-2">{rs.address?.slice(0, 16)}...</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(rs.tags || [rs.category]).filter(Boolean).map((tag: string) => (
                    <span key={tag} className="text-[8px] tracking-[0.15em] text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-sm">{tag}</span>
                  ))}
                  <span className="text-[8px] text-[var(--text-muted)]">{rs.checkCount || 10} guardians</span>
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                  <span>{rs.totalChecks || 0} proofs</span>
                  <span>{rs.flaggedRate || "0.00%"} flagged</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
