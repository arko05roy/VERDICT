import { CHECK_REGISTRY, getCheckById } from "../checks/registry";
import type { VCLCheckUsage, VCLDocument, VCLError, VCLParseResult } from "./types";

/**
 * Parse VCL (Verdict Compile Language) text into a structured document.
 *
 * VCL syntax:
 *   version 1.0
 *
 *   use Mnemosyne {}
 *   use Hermes {
 *     maxVelocity: 5
 *   }
 *   use Terminus {
 *     boundX: 1000
 *     boundY: 1000
 *   }
 */
export function parseVCL(input: string): VCLParseResult {
  const lines = input.split("\n");
  const errors: VCLError[] = [];
  let version: string | null = null;
  const checks: VCLCheckUsage[] = [];

  let currentCheck: { name: string; params: Record<string, string>; line: number } | null = null;
  let insideBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip empty lines and comments
    if (trimmed === "" || trimmed.startsWith("//")) continue;

    // Version declaration
    if (trimmed.startsWith("version ")) {
      if (version !== null) {
        errors.push({ line: lineNum, message: "Duplicate version declaration" });
        continue;
      }
      version = trimmed.slice(8).trim();
      if (version !== "1.0") {
        errors.push({ line: lineNum, message: `Unsupported VCL version: ${version}. Expected 1.0` });
      }
      continue;
    }

    // Start of a use block
    if (trimmed.startsWith("use ")) {
      if (insideBlock) {
        errors.push({ line: lineNum, message: `Nested use blocks are not allowed. Close '${currentCheck?.name}' first` });
        continue;
      }

      // Parse: "use CheckName {" or "use CheckName { }" (single-line empty)
      const rest = trimmed.slice(4).trim();
      const braceIdx = rest.indexOf("{");
      if (braceIdx === -1) {
        errors.push({ line: lineNum, message: "Expected '{' after check name" });
        continue;
      }

      const checkName = rest.slice(0, braceIdx).trim();
      const afterBrace = rest.slice(braceIdx + 1).trim();

      // Resolve check name (case-insensitive match against mythName)
      const checkDef = CHECK_REGISTRY.find(
        (c) => c.mythName.toLowerCase() === checkName.toLowerCase()
      );
      if (!checkDef) {
        errors.push({ line: lineNum, message: `Unknown check: '${checkName}'. Available: ${CHECK_REGISTRY.map((c) => c.mythName).join(", ")}` });
        // Still parse to avoid cascading errors
        currentCheck = { name: checkName.toLowerCase(), params: {}, line: lineNum };
      } else {
        currentCheck = { name: checkDef.id, params: {}, line: lineNum };
      }

      // Check for single-line close: "use Mnemosyne {}"
      if (afterBrace === "}" || afterBrace === "}") {
        checks.push({
          checkId: currentCheck.name,
          params: currentCheck.params,
          line: currentCheck.line,
        });
        currentCheck = null;
        insideBlock = false;
        continue;
      }

      // Check for inline params on same line as brace (not supported for cleanliness)
      if (afterBrace !== "") {
        errors.push({ line: lineNum, message: "Parameters must be on separate lines after '{'" });
      }

      insideBlock = true;
      continue;
    }

    // Close block
    if (trimmed === "}") {
      if (!insideBlock || !currentCheck) {
        errors.push({ line: lineNum, message: "Unexpected '}' — not inside a use block" });
        continue;
      }

      checks.push({
        checkId: currentCheck.name,
        params: currentCheck.params,
        line: currentCheck.line,
      });
      currentCheck = null;
      insideBlock = false;
      continue;
    }

    // Inside a block — parse param: value
    if (insideBlock && currentCheck) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) {
        errors.push({ line: lineNum, message: `Expected 'paramName: value', got '${trimmed}'` });
        continue;
      }

      const paramName = trimmed.slice(0, colonIdx).trim();
      const paramValue = trimmed.slice(colonIdx + 1).trim();

      if (!paramName) {
        errors.push({ line: lineNum, message: "Missing parameter name" });
        continue;
      }
      if (!paramValue) {
        errors.push({ line: lineNum, message: `Missing value for parameter '${paramName}'` });
        continue;
      }

      currentCheck.params[paramName] = paramValue;
      continue;
    }

    // Unrecognized line
    errors.push({ line: lineNum, message: `Unexpected: '${trimmed}'` });
  }

  // Unclosed block
  if (insideBlock && currentCheck) {
    errors.push({ line: currentCheck.line, message: `Unclosed use block for '${currentCheck.name}'` });
  }

  // Missing version
  if (version === null) {
    errors.push({ line: 1, message: "Missing version declaration. Add 'version 1.0' at the top" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    document: { version: version!, checks },
  };
}

/**
 * Validate a parsed VCL document against the check registry.
 * Checks: required params present, no unknown params, dependency satisfaction.
 */
export function validateVCL(doc: VCLDocument): VCLError[] {
  const errors: VCLError[] = [];
  const enabledIds = new Set(doc.checks.map((c) => c.checkId));

  // Check for duplicates
  const seen = new Set<string>();
  for (const usage of doc.checks) {
    if (seen.has(usage.checkId)) {
      errors.push({ line: usage.line, message: `Duplicate check: '${usage.checkId}'` });
    }
    seen.add(usage.checkId);
  }

  for (const usage of doc.checks) {
    const def = getCheckById(usage.checkId);
    if (!def) {
      errors.push({ line: usage.line, message: `Unknown check ID: '${usage.checkId}'` });
      continue;
    }

    // Check required params
    for (const param of def.publicParams) {
      if (param.required && !(param.name in usage.params)) {
        errors.push({
          line: usage.line,
          message: `Missing required parameter '${param.name}' for ${def.mythName}`,
        });
      }
    }

    // Check for unknown params
    const validParamNames = new Set(def.publicParams.map((p) => p.name));
    for (const key of Object.keys(usage.params)) {
      if (!validParamNames.has(key)) {
        errors.push({
          line: usage.line,
          message: `Unknown parameter '${key}' for ${def.mythName}. Valid: ${[...validParamNames].join(", ") || "none"}`,
        });
      }
    }

    // Check dependencies
    for (const depId of def.dependencies) {
      if (!enabledIds.has(depId)) {
        const depDef = getCheckById(depId);
        errors.push({
          line: usage.line,
          message: `${def.mythName} requires ${depDef?.mythName ?? depId} to be enabled`,
        });
      }
    }
  }

  return errors;
}
