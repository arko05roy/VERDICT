export interface CompactError {
  line: number;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: CompactError[];
}

const RESERVED_KEYWORDS = new Set([
  "export", "import", "module", "circuit", "witness", "ledger", "sealed",
  "const", "if", "else", "for", "return", "true", "false", "default",
  "assert", "pad", "as", "struct", "enum", "contract", "pure", "fold", "map",
]);

/**
 * Structural/heuristic validator for Compact ZK circuit code.
 * Not a full parser — catches the most common AI generation mistakes.
 */
export function validateCompact(code: string): ValidationResult {
  const errors: CompactError[] = [];
  const lines = code.split("\n");

  // --- Check for markdown/explanation contamination ---
  if (/^```/.test(code) || /```$/.test(code.trim())) {
    errors.push({ line: 1, message: "Code contains markdown fences — output must be pure Compact code", severity: "error" });
  }
  if (/^(Here|This|The|I |Note|Below|Sure|Of course)/m.test(code)) {
    errors.push({ line: 1, message: "Code contains natural language explanation — output must be pure Compact code", severity: "error" });
  }

  // --- 1. Pragma check ---
  const pragmaMatch = code.match(/pragma\s+language_version\s+([\d.]+)\s*;/);
  if (!pragmaMatch) {
    errors.push({ line: 1, message: "Missing `pragma language_version 0.22;`", severity: "error" });
  } else if (pragmaMatch[1] !== "0.22") {
    const pragmaLine = lines.findIndex(l => l.includes("pragma language_version")) + 1;
    errors.push({ line: pragmaLine, message: `Pragma version should be 0.22, got ${pragmaMatch[1]}`, severity: "error" });
  }

  // --- 2. Import check ---
  if (!code.includes("import CompactStandardLibrary")) {
    errors.push({ line: 2, message: "Missing `import CompactStandardLibrary;`", severity: "error" });
  }

  // --- 3. Balanced braces ---
  let braceDepth = 0;
  let inString = false;
  let inLineComment = false;
  for (let i = 0; i < lines.length; i++) {
    inLineComment = false;
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      const next = lines[i][j + 1];
      if (ch === "/" && next === "/") { inLineComment = true; break; }
      if (ch === '"' && (j === 0 || lines[i][j - 1] !== "\\")) inString = !inString;
      if (inString) continue;
      if (ch === "{") braceDepth++;
      if (ch === "}") braceDepth--;
      if (braceDepth < 0) {
        errors.push({ line: i + 1, message: "Unmatched closing brace `}`", severity: "error" });
        braceDepth = 0;
      }
    }
  }
  if (braceDepth !== 0) {
    errors.push({ line: lines.length, message: `Unbalanced braces: ${braceDepth} unclosed \`{\``, severity: "error" });
  }

  // --- 4. Circuit return check ---
  const circuitRegex = /^(\s*)(export\s+)?circuit\s+(\w+)\s*\([^)]*\)\s*:\s*([^{]+)\s*\{/gm;
  let match;
  while ((match = circuitRegex.exec(code)) !== null) {
    const name = match[3];
    const startIdx = match.index + match[0].length;
    // find matching closing brace
    let depth = 1;
    let pos = startIdx;
    while (pos < code.length && depth > 0) {
      if (code[pos] === "{") depth++;
      if (code[pos] === "}") depth--;
      pos++;
    }
    const body = code.slice(startIdx, pos - 1);
    if (!body.includes("return ") && !body.includes("return;")) {
      const circuitLine = code.slice(0, match.index).split("\n").length;
      errors.push({ line: circuitLine, message: `Circuit \`${name}\` may be missing a \`return\` statement`, severity: "error" });
    }
  }

  // --- 5. Constructor checks ---
  const constructorMatches = code.match(/\bconstructor\s*\(/g) || [];
  if (constructorMatches.length > 1) {
    errors.push({ line: 1, message: "Multiple constructors found — at most one allowed", severity: "error" });
  }
  const ctorReturnType = code.match(/\bconstructor\s*\([^)]*\)\s*:/);
  if (ctorReturnType) {
    const ctorLine = code.slice(0, ctorReturnType.index).split("\n").length;
    errors.push({ line: ctorLine, message: "Constructor must not have a return type annotation", severity: "error" });
  }
  // Constructor should not have return
  const ctorBodyRegex = /\bconstructor\s*\([^)]*\)\s*\{/g;
  let ctorMatch;
  while ((ctorMatch = ctorBodyRegex.exec(code)) !== null) {
    const startIdx = ctorMatch.index + ctorMatch[0].length;
    let depth = 1;
    let pos = startIdx;
    while (pos < code.length && depth > 0) {
      if (code[pos] === "{") depth++;
      if (code[pos] === "}") depth--;
      pos++;
    }
    const body = code.slice(startIdx, pos - 1);
    if (/\breturn\b/.test(body)) {
      const line = code.slice(0, ctorMatch.index).split("\n").length;
      errors.push({ line, message: "Constructor must not contain a `return` statement", severity: "error" });
    }
  }

  // --- 6. Generic circuit export check ---
  const genericExport = /export\s+circuit\s+\w+\s*</g;
  let gMatch;
  while ((gMatch = genericExport.exec(code)) !== null) {
    const line = code.slice(0, gMatch.index).split("\n").length;
    errors.push({ line, message: "Generic circuits cannot be exported", severity: "error" });
  }

  // --- 7. Uint subtraction warning ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("//")) continue;
    // Look for `identifier - identifier` or `identifier - number` patterns
    // but not inside comments or strings
    const subMatch = line.match(/(\w+)\s*-\s*(\w+)/);
    if (subMatch && !line.includes("//") && !line.includes("if") && !line.includes("assert")) {
      // Check it's not a negative literal or part of a range like 0..N
      if (!line.includes("..") && !line.match(/^\s*(const|\/\/)/)) {
        // Only warn if both operands look like variables (not keywords/types)
        const [, a, b] = subMatch;
        if (!RESERVED_KEYWORDS.has(a) && !RESERVED_KEYWORDS.has(b) && !/^\d+$/.test(a)) {
          errors.push({
            line: i + 1,
            message: `Uint subtraction \`${a} - ${b}\` may underflow. Guard with \`if (${a} >= ${b})\``,
            severity: "warning",
          });
        }
      }
    }
  }

  // --- 8. disclose() check ---
  // Collect witness function names
  const witnessNames: string[] = [];
  const witnessRegex = /\bwitness\s+(\w+)\s*\(/g;
  let wMatch;
  while ((wMatch = witnessRegex.exec(code)) !== null) {
    witnessNames.push(wMatch[1]);
  }
  // Check if ledger writes use disclose
  if (witnessNames.length > 0) {
    // Collect ledger field names
    const ledgerFields: string[] = [];
    const ledgerRegex = /\bledger\s*\{([^}]+)\}/gs;
    let lMatch;
    while ((lMatch = ledgerRegex.exec(code)) !== null) {
      const fields = lMatch[1].match(/(\w+)\s*:/g);
      if (fields) {
        for (const f of fields) {
          ledgerFields.push(f.replace(/\s*:/, ""));
        }
      }
    }
    // Also catch single-line ledger declarations
    const singleLedger = /\bledger\s+(\w+)\s*:/g;
    let slMatch;
    while ((slMatch = singleLedger.exec(code)) !== null) {
      ledgerFields.push(slMatch[1]);
    }

    // For each line that assigns to a ledger field, check nearby disclose usage
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const field of ledgerFields) {
        // Check for direct assignment: `field = expr` (not `field +=` which is Counter)
        const assignRegex = new RegExp(`\\b${field}\\s*=\\s*(?!\\=)`);
        if (assignRegex.test(line) && !line.includes("+=") && !line.includes("-=")) {
          // Check if disclose is in the same line or the assignment
          if (!line.includes("disclose")) {
            // Check if the value being assigned comes from a witness
            const hasWitnessRef = witnessNames.some(w => line.includes(w));
            if (hasWitnessRef) {
              errors.push({
                line: i + 1,
                message: `Ledger field \`${field}\` assigned witness-derived value without \`disclose()\``,
                severity: "error",
              });
            }
          }
        }
      }
    }
  }

  // --- 9. Recursive struct check ---
  const structRegex = /\bstruct\s+(\w+)\s*\{([^}]+)\}/g;
  let sMatch;
  while ((sMatch = structRegex.exec(code)) !== null) {
    const structName = sMatch[1];
    const body = sMatch[2];
    if (new RegExp(`\\b${structName}\\b`).test(body)) {
      const line = code.slice(0, sMatch.index).split("\n").length;
      errors.push({ line, message: `Struct \`${structName}\` has recursive self-reference`, severity: "error" });
    }
  }

  // --- 10. fold type annotation check ---
  const foldRegex = /\bfold\s*\(\s*\(\s*(\w+)\s*[,)]/g;
  let fMatch;
  while ((fMatch = foldRegex.exec(code)) !== null) {
    // Check if accumulator has type annotation
    const afterAcc = code.slice(fMatch.index + fMatch[0].length - 1, fMatch.index + fMatch[0].length + 30);
    const fullParam = code.slice(fMatch.index).match(/\bfold\s*\(\s*\((\w+)\s*([,:])/);
    if (fullParam && fullParam[2] === ",") {
      const line = code.slice(0, fMatch.index).split("\n").length;
      errors.push({
        line,
        message: `fold accumulator \`${fullParam[1]}\` missing type annotation. Use \`(${fullParam[1]}: Type, ...)\``,
        severity: "warning",
      });
    }
  }

  // --- 11. Reserved keyword as identifier ---
  const declRegex = /\b(circuit|witness|struct|enum)\s+(\w+)/g;
  let dMatch;
  while ((dMatch = declRegex.exec(code)) !== null) {
    if (RESERVED_KEYWORDS.has(dMatch[2])) {
      const line = code.slice(0, dMatch.index).split("\n").length;
      errors.push({ line, message: `\`${dMatch[2]}\` is a reserved keyword and cannot be used as a name`, severity: "error" });
    }
  }

  const hasErrors = errors.some(e => e.severity === "error");
  return { valid: !hasErrors, errors };
}
