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

function findMatchingBrace(code: string, startIdx: number): number {
  let depth = 1;
  let pos = startIdx;
  while (pos < code.length && depth > 0) {
    if (code[pos] === "{") depth++;
    if (code[pos] === "}") depth--;
    pos++;
  }
  return pos;
}

function getLineNumber(code: string, index: number): number {
  return code.slice(0, index).split("\n").length;
}

export function validateCompact(code: string): ValidationResult {
  const errors: CompactError[] = [];
  const lines = code.split("\n");

  // --- Markdown/explanation contamination ---
  if (/^```/.test(code) || /```$/.test(code.trim())) {
    errors.push({ line: 1, message: "Code contains markdown fences — output must be pure Compact code", severity: "error" });
  }
  // Check first non-empty line for natural language (not inside string literals)
  const firstContent = lines.find(l => l.trim().length > 0)?.trim() || "";
  if (/^(Here |This |The |I |Note:|Below |Sure|Of course)/.test(firstContent) && !firstContent.startsWith("//")) {
    errors.push({ line: 1, message: "Code starts with natural language — output must be pure Compact code", severity: "error" });
  }

  // --- Comment density check (core quality gate) ---
  const codeLines = lines.filter(l => l.trim().length > 0);
  const commentOnlyLines = codeLines.filter(l => l.trim().startsWith("//"));
  const commentRatio = codeLines.length > 0 ? commentOnlyLines.length / codeLines.length : 0;
  if (commentRatio > 0.25) {
    errors.push({
      line: 1,
      message: `Code is ${Math.round(commentRatio * 100)}% comments (${commentOnlyLines.length}/${codeLines.length} lines). Contract must be mostly executable code, not comments.`,
      severity: "error",
    });
  }
  // Check for TODO/placeholder comments
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/\/\/\s*(TODO|FIXME|HACK|XXX|PLACEHOLDER|implement|add .* here|add more|fill in|stub)/i.test(trimmed)) {
      errors.push({
        line: i + 1,
        message: `Placeholder comment found: "${trimmed}". All logic must be fully implemented.`,
        severity: "error",
      });
    }
    // Check for commented-out code blocks (lines that look like code but are commented)
    if (/^\/\/\s*(const |let |if |for |assert|return |export |witness |circuit )/.test(trimmed)) {
      errors.push({
        line: i + 1,
        message: `Commented-out code detected. Implement the logic or remove the comment.`,
        severity: "warning",
      });
    }
  }

  // --- 1. Pragma check ---
  const pragmaMatch = code.match(/pragma\s+language_version\s*(>=?\s*)?([\d.]+)\s*;/);
  if (!pragmaMatch) {
    errors.push({ line: 1, message: "Missing `pragma language_version >= 0.20;`", severity: "error" });
  } else {
    const version = parseFloat(pragmaMatch[2]);
    if (version < 0.20) {
      const pragmaLine = lines.findIndex(l => l.includes("pragma language_version")) + 1;
      errors.push({ line: pragmaLine, message: `Pragma version should be at least 0.20, got ${pragmaMatch[2]}`, severity: "error" });
    }
  }

  // --- 2. Import check ---
  if (!code.includes("import CompactStandardLibrary")) {
    errors.push({ line: 2, message: "Missing `import CompactStandardLibrary;`", severity: "error" });
  }

  // --- 3. Balanced braces ---
  let braceDepth = 0;
  let inString = false;
  for (let i = 0; i < lines.length; i++) {
    let inLineComment = false;
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      const next = lines[i][j + 1];
      if (ch === "/" && next === "/") { inLineComment = true; break; }
      if (ch === '"' && (j === 0 || lines[i][j - 1] !== "\\")) inString = !inString;
      if (inString || inLineComment) continue;
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

  // --- 4. Structural completeness ---
  const hasLedger = /\bledger\s*\{/.test(code) || /\bledger\s+\w+\s*:/.test(code);
  const hasCircuit = /\bcircuit\s+\w+\s*\(/.test(code);
  const hasWitness = /\bwitness\s+\w+\s*\(/.test(code);
  const hasExportedCircuit = /\bexport\s+circuit\s+/.test(code);

  if (!hasLedger) {
    errors.push({ line: 1, message: "No ledger declaration found. Contract must have on-chain state.", severity: "error" });
  }
  if (!hasCircuit) {
    errors.push({ line: 1, message: "No circuit found. Contract must have at least one verification circuit.", severity: "error" });
  }
  if (!hasWitness) {
    errors.push({ line: 1, message: "No witness functions found. Contract must have private inputs.", severity: "error" });
  }
  if (hasCircuit && !hasExportedCircuit) {
    errors.push({ line: 1, message: "No exported circuit found. At least one circuit must be exported.", severity: "warning" });
  }

  // --- 5. Circuit return check ---
  const circuitRegex = /^(\s*)(export\s+)?circuit\s+(\w+)\s*\([^)]*\)\s*:\s*([^{]+)\s*\{/gm;
  let match;
  while ((match = circuitRegex.exec(code)) !== null) {
    const name = match[3];
    const startIdx = match.index + match[0].length;
    const endIdx = findMatchingBrace(code, startIdx);
    const body = code.slice(startIdx, endIdx - 1);
    if (!body.includes("return ") && !body.includes("return;")) {
      errors.push({ line: getLineNumber(code, match.index), message: `Circuit \`${name}\` may be missing a \`return\` statement`, severity: "error" });
    }
  }

  // --- 6. Constructor checks ---
  const constructorMatches = code.match(/\bconstructor\s*\(/g) || [];
  if (constructorMatches.length > 1) {
    errors.push({ line: 1, message: "Multiple constructors found — at most one allowed", severity: "error" });
  }
  const ctorReturnType = code.match(/\bconstructor\s*\([^)]*\)\s*:/);
  if (ctorReturnType) {
    errors.push({ line: getLineNumber(code, ctorReturnType.index!), message: "Constructor must not have a return type annotation", severity: "error" });
  }
  const ctorBodyRegex = /\bconstructor\s*\([^)]*\)\s*\{/g;
  let ctorMatch;
  while ((ctorMatch = ctorBodyRegex.exec(code)) !== null) {
    const startIdx = ctorMatch.index + ctorMatch[0].length;
    const endIdx = findMatchingBrace(code, startIdx);
    const body = code.slice(startIdx, endIdx - 1);
    if (/\breturn\b/.test(body)) {
      errors.push({ line: getLineNumber(code, ctorMatch.index), message: "Constructor must not contain a `return` statement", severity: "error" });
    }
  }

  // Check for missing constructor when ledger has non-Counter fields
  const hasConstructor = constructorMatches.length > 0;
  if (hasLedger && !hasConstructor) {
    // Check if ledger has non-Counter fields that need initialization
    const ledgerBlockRegex = /\bledger\s*\{([^}]+)\}/gs;
    let lbMatch;
    let hasNonCounter = false;
    while ((lbMatch = ledgerBlockRegex.exec(code)) !== null) {
      const body = lbMatch[1];
      const fieldLines = body.split("\n").map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith("//"));
      for (const fl of fieldLines) {
        if (fl.includes(":") && !fl.includes("Counter") && !fl.includes(",") === false) {
          hasNonCounter = true;
        }
        if (fl.includes(":") && !fl.includes("Counter")) {
          hasNonCounter = true;
        }
      }
    }
    if (hasNonCounter) {
      errors.push({ line: 1, message: "Missing constructor. Non-Counter ledger fields must be initialized.", severity: "warning" });
    }
  }

  // --- 7. Generic circuit export check ---
  const genericExport = /export\s+circuit\s+\w+\s*</g;
  let gMatch;
  while ((gMatch = genericExport.exec(code)) !== null) {
    errors.push({ line: getLineNumber(code, gMatch.index), message: "Generic circuits cannot be exported", severity: "error" });
  }

  // --- 8. Uint subtraction underflow warning ---
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) continue;
    // Strip inline comments
    const noComment = line.replace(/\/\/.*$/, "");
    // Look for subtraction patterns
    const subMatch = noComment.match(/(\w+)\s*-\s*(\w+)/);
    if (subMatch && !noComment.includes("..")) {
      const [, a, b] = subMatch;
      if (!RESERVED_KEYWORDS.has(a) && !RESERVED_KEYWORDS.has(b) && !/^\d+$/.test(a) && !/^\d+$/.test(b)) {
        // Check if there's a guard nearby (within 3 lines above)
        const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
        const hasGuard = context.includes(`${a} >= ${b}`) || context.includes(`${a} > ${b}`) || context.includes("assert");
        if (!hasGuard) {
          errors.push({
            line: i + 1,
            message: `Uint subtraction \`${a} - ${b}\` may underflow. Guard with \`if (${a} >= ${b})\` or ternary.`,
            severity: "warning",
          });
        }
      }
    }
  }

  // --- 9. disclose() check (tracks witness-derived values through const bindings) ---
  const witnessNames: string[] = [];
  const witnessRegex = /\bwitness\s+(\w+)\s*\(/g;
  let wMatch;
  while ((wMatch = witnessRegex.exec(code)) !== null) {
    witnessNames.push(wMatch[1]);
  }

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
    const singleLedger = /\bledger\s+(\w+)\s*:/g;
    let slMatch;
    while ((slMatch = singleLedger.exec(code)) !== null) {
      ledgerFields.push(slMatch[1]);
    }

    // Build a set of witness-derived variable names by tracing const assignments
    // inside each circuit body
    const circuitBodies: { startLine: number; body: string }[] = [];
    const cRegex = /\b(export\s+)?circuit\s+\w+\s*\([^)]*\)\s*:[^{]*\{/g;
    let cMatch;
    while ((cMatch = cRegex.exec(code)) !== null) {
      const startIdx = cMatch.index + cMatch[0].length;
      const endIdx = findMatchingBrace(code, startIdx);
      circuitBodies.push({
        startLine: getLineNumber(code, cMatch.index),
        body: code.slice(cMatch.index, endIdx),
      });
    }

    for (const circuit of circuitBodies) {
      const cLines = circuit.body.split("\n");
      // Track which variables are witness-derived
      const tainted = new Set<string>(witnessNames);

      for (let i = 0; i < cLines.length; i++) {
        const cl = cLines[i].trim();
        if (cl.startsWith("//")) continue;

        // Track taint through const assignments: const x = taintedVar...
        const constMatch = cl.match(/const\s+(\w+)\s*=\s*(.+)/);
        if (constMatch) {
          const varName = constMatch[1];
          const rhs = constMatch[2];
          // If the RHS references any tainted variable, this var is also tainted
          const isTainted = [...tainted].some(t => new RegExp(`\\b${t}\\b`).test(rhs));
          if (isTainted) {
            // Unless it's wrapped in disclose()
            if (!rhs.includes("disclose")) {
              tainted.add(varName);
            }
          }
        }

        // Check ledger field assignments
        for (const field of ledgerFields) {
          const assignRegex = new RegExp(`\\b${field}\\s*=\\s*(?!=)`);
          if (assignRegex.test(cl) && !cl.includes("+=") && !cl.includes("-=")) {
            if (!cl.includes("disclose")) {
              // Check if the assigned value is tainted
              const rhs = cl.split("=").slice(1).join("=");
              const assignsTainted = [...tainted].some(t => new RegExp(`\\b${t}\\b`).test(rhs));
              if (assignsTainted) {
                errors.push({
                  line: circuit.startLine + i,
                  message: `Ledger field \`${field}\` assigned witness-derived value without \`disclose()\`. Wrap the value: \`${field} = disclose(value);\``,
                  severity: "error",
                });
              }
            }
          }
        }

        // Check if/else branching on tainted values that affect public state
        const ifMatch = cl.match(/if\s*\(([^)]+)\)/);
        if (ifMatch) {
          const condition = ifMatch[1];
          const condTainted = [...tainted].some(t => new RegExp(`\\b${t}\\b`).test(condition));
          if (condTainted && !condition.includes("disclose")) {
            // Check if the branch body writes to ledger
            const restOfCircuit = cLines.slice(i).join("\n");
            const branchWritesToLedger = ledgerFields.some(f =>
              new RegExp(`\\b${f}\\s*(=|\\+=|-=)`).test(restOfCircuit)
            );
            if (branchWritesToLedger) {
              errors.push({
                line: circuit.startLine + i,
                message: `Branching on witness-derived value without \`disclose()\`. Use \`if (disclose(${condition}))\``,
                severity: "error",
              });
            }
          }
        }
      }
    }
  }

  // --- 10. Recursive struct check ---
  const structRegex = /\bstruct\s+(\w+)\s*\{([^}]+)\}/g;
  let sMatch;
  while ((sMatch = structRegex.exec(code)) !== null) {
    const structName = sMatch[1];
    const body = sMatch[2];
    if (new RegExp(`\\b${structName}\\b`).test(body)) {
      errors.push({ line: getLineNumber(code, sMatch.index), message: `Struct \`${structName}\` has recursive self-reference`, severity: "error" });
    }
  }

  // --- 11. fold type annotation check ---
  const foldRegex = /\bfold\s*\(\s*\((\w+)\s*([,:])/g;
  let fMatch;
  while ((fMatch = foldRegex.exec(code)) !== null) {
    if (fMatch[2] === ",") {
      errors.push({
        line: getLineNumber(code, fMatch.index),
        message: `fold accumulator \`${fMatch[1]}\` missing type annotation. Use \`(${fMatch[1]}: Type, ...)\``,
        severity: "warning",
      });
    }
  }

  // --- 12. Reserved keyword as identifier ---
  const declRegex = /\b(circuit|witness|struct|enum)\s+(\w+)/g;
  let dMatch;
  while ((dMatch = declRegex.exec(code)) !== null) {
    if (RESERVED_KEYWORDS.has(dMatch[2])) {
      errors.push({ line: getLineNumber(code, dMatch.index), message: `\`${dMatch[2]}\` is a reserved keyword and cannot be used as a name`, severity: "error" });
    }
  }

  // --- 13. Minimum code quality gate ---
  const executableLines = codeLines.filter(l => {
    const t = l.trim();
    return t.length > 0 && !t.startsWith("//") && !t.startsWith("/*") && !t.startsWith("*");
  });
  if (executableLines.length < 15) {
    errors.push({
      line: 1,
      message: `Contract has only ${executableLines.length} lines of executable code. A proper Compact contract should have at least 15 lines.`,
      severity: "warning",
    });
  }

  // --- 14. Semicolon check on key statements ---
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("//") || trimmed.length === 0) continue;
    // Lines that should end with semicolons
    if (/^(pragma|import|witness)\s+/.test(trimmed) && !trimmed.endsWith(";")) {
      errors.push({ line: i + 1, message: `Statement should end with a semicolon: \`${trimmed.slice(0, 50)}\``, severity: "error" });
    }
    // const declarations (but not inside for-loop headers)
    if (/^\s*const\s+\w+\s*=/.test(lines[i]) && !trimmed.endsWith(";") && !trimmed.endsWith(",") && !trimmed.endsWith("{") && !trimmed.endsWith("(")) {
      // Could be a multi-line expression — only warn if next line doesn't look like continuation
      const nextLine = (lines[i + 1] || "").trim();
      if (!nextLine.startsWith(".") && !nextLine.startsWith(")") && !nextLine.startsWith(",") && !nextLine.startsWith("?") && nextLine.length > 0) {
        errors.push({ line: i + 1, message: `Statement may be missing a semicolon`, severity: "warning" });
      }
    }
  }

  const hasErrors = errors.some(e => e.severity === "error");
  return { valid: !hasErrors, errors };
}
