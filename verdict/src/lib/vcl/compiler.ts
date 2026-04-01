import { CHECK_REGISTRY, getCheckById, type CheckDefinition } from "../checks/registry";
import { CHECK_TEMPLATES, HELPER_ABSDIFF, SOFT_FAIL_VARS, WITNESS_VAR_MAP } from "../checks/templates";
import type { VCLDocument, VCLConfigResult } from "./types";

type CompileResult =
  | { ok: true; compact: string; enabledChecks: string[]; checkCount: number }
  | { ok: false; error: string };

/**
 * Deterministically compile a VCL document into valid Compact source code.
 * Pure function — no AI, no network, no side effects.
 */
export function compileVCL(doc: VCLDocument): CompileResult {
  const enabledIds = doc.checks.map((c) => c.checkId);
  const enabledDefs: CheckDefinition[] = [];

  for (const id of enabledIds) {
    const def = getCheckById(id);
    if (!def) return { ok: false, error: `Unknown check: ${id}` };
    enabledDefs.push(def);
  }

  if (enabledDefs.length === 0) {
    return { ok: false, error: "No checks selected" };
  }

  // Build param map for quick lookup
  const paramMap = new Map<string, Record<string, string>>();
  for (const usage of doc.checks) {
    paramMap.set(usage.checkId, usage.params);
  }

  // Collect all requirements (deduplicated)
  const witnesses = collectWitnesses(enabledDefs);
  const ledgerFields = collectLedger(enabledDefs);
  const needsAbsDiff = enabledDefs.some((d) => d.helperFunctions.includes("absDiff"));
  const needsStartSession = enabledDefs.some((d) => d.needsStartSession);
  const needsCommitMove = enabledDefs.some((d) => d.needsCommitMove);
  const publicParams = collectPublicParams(enabledDefs);

  // Build the Compact source
  const sections: string[] = [];

  // Preamble
  sections.push("pragma language_version >= 0.20;");
  sections.push("");
  sections.push("import CompactStandardLibrary;");
  sections.push("");
  sections.push("enum Verdict { clean, flagged }");

  // Ledger
  sections.push("");
  sections.push("// === LEDGER STATE ===");
  sections.push("export ledger totalChecks: Counter;");
  sections.push("export ledger totalFlagged: Counter;");
  sections.push("export ledger lastVerdict: Verdict;");
  if (needsCommitMove) {
    sections.push("export ledger commitment: Bytes<32>;");
  }
  if (needsStartSession) {
    sections.push("export ledger lastChainHash: Bytes<32>;");
  }
  sections.push("export ledger sessionActive: Boolean;");
  for (const field of ledgerFields) {
    // Skip fields we already emitted above
    if (["lastChainHash", "commitment", "sessionActive"].includes(field.name)) continue;
    sections.push(`export ledger ${field.name}: ${field.type};`);
  }

  // Witnesses
  sections.push("");
  sections.push("// === WITNESSES ===");
  for (const w of witnesses) {
    sections.push(`witness ${w.name}(): ${w.returnType};`);
  }

  // Helpers
  if (needsAbsDiff) {
    sections.push("");
    sections.push("// === HELPERS ===");
    sections.push(HELPER_ABSDIFF);
  }

  // startSession circuit
  if (needsStartSession) {
    sections.push("");
    sections.push("// === SESSION START ===");
    sections.push("export circuit startSession(genesisHash: Bytes<32>): [] {");
    sections.push("  lastChainHash = disclose(genesisHash);");
    sections.push("  sessionActive = disclose(true);");
    sections.push("}");
  }

  // commitMove circuit
  if (needsCommitMove) {
    sections.push("");
    sections.push("// === COMMIT PHASE ===");
    sections.push("export circuit commitMove(c: Bytes<32>): [] {");
    sections.push("  commitment = disclose(c);");
    sections.push("}");
  }

  // Main verifyTransition circuit
  sections.push("");
  sections.push("// === VERIFICATION CIRCUIT ===");

  // Build parameter list
  const paramList = publicParams.map((p) => {
    const compactType = p.type === "Bytes32" ? "Bytes<32>" : "Uint<64>";
    return `  ${p.name}: ${compactType}`;
  });
  sections.push("export circuit verifyTransition(");
  sections.push(paramList.join(",\n"));
  sections.push("): Verdict {");
  sections.push("");

  // Load witnesses
  sections.push("  // Load private witnesses");
  for (const w of witnesses) {
    const varName = WITNESS_VAR_MAP[w.name];
    if (varName) {
      sections.push(`  const ${varName} = ${w.name}();`);
    }
  }
  sections.push("");
  sections.push("  totalChecks.increment(1);");

  // Emit each check template
  const softFailChecks: string[] = [];

  for (const def of enabledDefs) {
    const template = CHECK_TEMPLATES[def.id];
    if (!template) {
      return { ok: false, error: `Missing template for check: ${def.id}` };
    }

    sections.push("");
    sections.push(template);

    // Track soft-fail variables for aggregation
    const failVar = SOFT_FAIL_VARS[def.id];
    if (failVar) {
      softFailChecks.push(failVar);
    }
  }

  // Aggregation
  if (softFailChecks.length > 0) {
    sections.push("");
    sections.push("  // === AGGREGATE ===");
    sections.push(`  const anyFailed = ${softFailChecks.join(" + ")};`);
    sections.push("");
    sections.push("  const isFlagged = disclose(anyFailed > 0);");
    sections.push("");
    sections.push("  if (isFlagged) {");
    sections.push("    totalFlagged.increment(1);");
    sections.push("    lastVerdict = Verdict.flagged;");
    sections.push("    return Verdict.flagged;");
    sections.push("  }");
    sections.push("");
    sections.push("  lastVerdict = Verdict.clean;");
    sections.push("  return Verdict.clean;");
  } else {
    // Only hard-fail checks — if we got here, all asserts passed
    sections.push("");
    sections.push("  lastVerdict = Verdict.clean;");
    sections.push("  return Verdict.clean;");
  }

  sections.push("}");

  return {
    ok: true,
    compact: sections.join("\n"),
    enabledChecks: enabledIds,
    checkCount: enabledIds.length,
  };
}

// ─── Helpers ───

function collectWitnesses(defs: CheckDefinition[]) {
  const seen = new Set<string>();
  const result: { name: string; returnType: string }[] = [];

  for (const def of defs) {
    for (const w of def.witnessRequirements) {
      if (!seen.has(w.name)) {
        seen.add(w.name);
        result.push({ name: w.name, returnType: w.returnType });
      }
    }
  }

  return result;
}

function collectLedger(defs: CheckDefinition[]) {
  const seen = new Set<string>();
  const result: { name: string; type: string }[] = [];

  for (const def of defs) {
    for (const l of def.ledgerRequirements) {
      if (!seen.has(l.name)) {
        seen.add(l.name);
        result.push({ name: l.name, type: l.type });
      }
    }
  }

  return result;
}

function collectPublicParams(defs: CheckDefinition[]) {
  const seen = new Set<string>();
  const result: { name: string; type: string }[] = [];

  for (const def of defs) {
    for (const p of def.publicParams) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        result.push({ name: p.name, type: p.type });
      }
    }
  }

  return result;
}

// ─── Guardian index mapping (registry order → bit position) ───

const GUARDIAN_BIT_INDEX: Record<string, number> = {};
CHECK_REGISTRY.forEach((def, idx) => {
  GUARDIAN_BIT_INDEX[def.id] = idx;
});

/**
 * Compile a VCL document into a config object (no Compact code generation).
 * Returns verifier version, enable bitmask, and flattened params.
 */
export function compileVCLToConfig(doc: VCLDocument): VCLConfigResult {
  const enabledIds = doc.checks.map((c) => c.checkId);

  for (const id of enabledIds) {
    const def = getCheckById(id);
    if (!def) return { ok: false, error: `Unknown check: ${id}` };
  }

  if (enabledIds.length === 0) {
    return { ok: false, error: "No checks selected" };
  }

  // Compute bitmask: bit N = 1 if guardian at registry index N is enabled
  let enableMask = 0n;
  for (const id of enabledIds) {
    const bitIndex = GUARDIAN_BIT_INDEX[id];
    if (bitIndex !== undefined) {
      enableMask |= 1n << BigInt(bitIndex);
    }
  }

  // Flatten all params into a single map
  const params: Record<string, string> = {};
  for (const usage of doc.checks) {
    for (const [key, value] of Object.entries(usage.params)) {
      params[key] = value;
    }
  }

  return {
    ok: true,
    config: {
      verifierVersion: "1",
      enableMask,
      enabledChecks: enabledIds,
      checkCount: enabledIds.length,
      params,
    },
  };
}
