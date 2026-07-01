"use client";

import { useState } from "react";

const EXAMPLE_RULES = `Players cannot move faster than 5 units per tick
Cards must be in the player's hand before playing
RNG must be committed before the bet is placed
No action can exceed 10 per second
Position must stay within map bounds (0-1000)`;

export default function DeployPage() {
  const [rules, setRules] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [compact, setCompact] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);

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
      setStep(2);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setCompiling(false);
    }
  }

  function handleLoadExample() {
    setRules(EXAMPLE_RULES);
    setName("fps-movement-rules");
    setCategory("fps");
    setDescription("Movement and action integrity checks for FPS games");
  }

  async function handleDeploy() {
    setDeploying(true);
    setError("");
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compact, name, category, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Deploy failed");
        return;
      }
      setDeployResult(data);
      setStep(3);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-lg text-[var(--text-primary)] font-bold tracking-wide">
          Deploy Ruleset
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Define rules in plain English. VERDICT compiles them to ZK circuits
          and deploys on Midnight.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold border ${
                step >= s
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]"
                  : "border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              {step > s ? "✓" : s}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider mr-3 ${
                step >= s
                  ? "text-[var(--text-secondary)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {s === 1 ? "Define" : s === 2 ? "Review" : "Deploy"}
            </span>
            {s < 3 && (
              <span className="text-[var(--text-muted)] text-[10px] mr-1">
                →
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Rule input */}
      <div className="noise border border-[var(--border)] bg-[var(--bg-secondary)] mb-4">
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
          className="w-full bg-transparent p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none h-40 font-mono"
          placeholder={`Players cannot move faster than 5 units per tick\nCards must be in the player's hand before playing\nRNG must be committed before the bet is placed\nNo action can exceed 10 per second`}
        />
      </div>

      {/* Metadata row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
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
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCompile}
          disabled={compiling || !rules.trim()}
          className={`px-4 py-2 text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
            compiling || !rules.trim()
              ? "bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed"
              : "bg-[var(--accent)] text-[var(--bg-primary)] hover:brightness-110"
          }`}
        >
          {compiling ? "Compiling..." : "Compile to Compact"}
        </button>
        <button
          onClick={handleLoadExample}
          className="px-4 py-2 text-[11px] uppercase tracking-wider border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
        >
          Load Example
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-2 border border-[var(--danger)] bg-[rgba(255,51,51,0.05)] text-xs text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Generated output */}
      <div className="mt-6 border border-[var(--border)] bg-[var(--bg-secondary)] noise">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Generated Compact · Preview
          </span>
          {compact && (
            <button
              onClick={() => navigator.clipboard.writeText(compact)}
              className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              Copy
            </button>
          )}
        </div>
        {compact ? (
          <pre className="p-4 text-xs leading-relaxed overflow-x-auto max-h-96 overflow-y-auto">
            <code>
              {compact.split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-right pr-3 text-[var(--text-muted)] select-none shrink-0">
                    {i + 1}
                  </span>
                  <span
                    className={
                      line.trimStart().startsWith("//")
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
              ))}
            </code>
          </pre>
        ) : (
          <div className="p-4 text-xs text-[var(--text-muted)] leading-relaxed">
            {compiling ? (
              <span className="text-[var(--text-secondary)]">
                Translating English rules to Compact via Gemini...
              </span>
            ) : (
              <>
                <span className="text-[var(--text-secondary)]">
                  // Write rules above and click Compile
                </span>
                <br />
                <span>pragma language_version 0.21;</span>
                <br />
                <span>...</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Deploy button — only after compile */}
      {compact && step >= 2 && !deployResult && (
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleDeploy}
            disabled={deploying || !name.trim()}
            className={`px-5 py-2.5 text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
              deploying || !name.trim()
                ? "bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed"
                : "bg-[var(--accent)] text-[var(--bg-primary)] hover:brightness-110"
            }`}
          >
            {deploying ? "Deploying..." : "Deploy to Midnight"}
          </button>
          <button
            onClick={() => {
              setCompact("");
              setStep(1);
              setDeployResult(null);
            }}
            className="px-4 py-2 text-[11px] uppercase tracking-wider border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
          >
            Edit Rules
          </button>
          {!name.trim() && (
            <span className="text-[10px] text-[var(--warning)] uppercase tracking-wider">
              Ruleset name required
            </span>
          )}
        </div>
      )}

      {/* Deploy result */}
      {deployResult && (
        <div className="mt-6 border border-[var(--accent)] bg-[var(--accent-glow)] noise">
          <div className="px-4 py-2.5 border-b border-[var(--accent)]">
            <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-bold">
              Deployed Successfully
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "CONTRACT", value: deployResult.contractAddress },
                { label: "TX HASH", value: deployResult.txHash },
                { label: "NETWORK", value: deployResult.network },
                { label: "DEPLOYED AT", value: new Date(deployResult.deployedAt).toLocaleString() },
              ].map((item) => (
                <div key={item.label}>
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-[var(--text-primary)] font-mono break-all">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border)] pt-3">
              <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                SDK SNIPPET
              </span>
              <pre className="text-xs text-[var(--text-primary)] leading-relaxed bg-[var(--bg-primary)] p-3 border border-[var(--border)]">
                {deployResult.sdk}
              </pre>
            </div>

            <button
              onClick={() => {
                setRules("");
                setName("");
                setCategory("");
                setDescription("");
                setCompact("");
                setStep(1);
                setDeployResult(null);
                setError("");
              }}
              className="px-4 py-2 text-[11px] uppercase tracking-wider border border-[var(--border-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
            >
              Deploy Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
