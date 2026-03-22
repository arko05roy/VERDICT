const SNIPPET = `import { Verdict } from "@verdict/sdk";

const verdict = new Verdict("<RULESET_ADDRESS>");

// Submit a state transition for verification
const proof = await verdict.verify({
  prevState: gameState.previous,
  currState: gameState.current,
  action: playerAction,
});

// proof.verdict === "CLEAN" | "FLAGGED"`;

export default function IntegratePage() {
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
      <div className="panel corner-frame mb-4">
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Select Ruleset
          </span>
        </div>
        <input
          className="w-full bg-transparent px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none font-mono"
          placeholder="Enter ruleset address or search by name..."
        />
      </div>

      {/* Code snippet */}
      <div className="panel corner-frame mb-6">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            SDK Snippet · TypeScript
          </span>
          <button className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer">
            Copy
          </button>
        </div>
        <pre className="p-4 text-xs leading-relaxed overflow-x-auto">
          <code>
            {SNIPPET.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-3 text-[var(--text-muted)] select-none shrink-0">
                  {i + 1}
                </span>
                <span
                  className={
                    line.startsWith("//")
                      ? "text-[var(--text-muted)]"
                      : line.startsWith("import") || line.startsWith("const")
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }
                >
                  {line || "\u00A0"}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Language tabs — hard bottom border */}
      <div className="mb-6">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2 block">
          Also Available In
        </span>
        <div className="flex gap-0">
          {["TypeScript", "Python", "Rust", "Go"].map((lang, i) => (
            <span
              key={lang}
              className={`text-[10px] uppercase tracking-wider px-3 py-1.5 border cursor-pointer transition-all ${
                i === 0
                  ? "border-white text-white border-b-2 border-b-white bg-[var(--bg-hover)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-active)]"
              }`}
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* How it works — with dither separators between steps */}
      <div className="panel corner-frame">
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            How It Works
          </span>
        </div>
        <div className="p-4">
          {[
            ["1", "Game client captures state transition (position, action, timing)"],
            ["2", "SDK submits transition to VERDICT as a ZK witness (private)"],
            ["3", "Circuit runs 10 integrity checks inside zero-knowledge proof"],
            ["4", "Proof settles on Midnight — returns CLEAN or FLAGGED"],
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
