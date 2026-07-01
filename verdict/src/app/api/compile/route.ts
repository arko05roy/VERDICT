import { NextRequest, NextResponse } from "next/server";
import { validateCompact } from "../../../lib/compact-validator";

const COMPACT_REFERENCE = `
Compact language reference (Midnight ZK circuit language, version 0.22):

## Pragma & Imports
- MUST start with: pragma language_version 0.22;
- MUST include: import CompactStandardLibrary;

## Primitive Types
- Boolean: true / false
- Uint<n>: unsigned integer using n bits (e.g. Uint<64>, Uint<32>)
- Uint<m..n>: bounded unsigned integer from m to n inclusive
- Field: scalar field element
- Bytes<n>: fixed-length byte array (e.g. Bytes<32>)
- Vector<N, T>: fixed-length homogeneous tuple (e.g. Vector<8, Uint<64>>)
- [T1, T2, ...]: heterogeneous tuple

## Ledger ADTs (on-chain state)
- Counter: incrementable/decrementable (use += and -=)
- Set<T>: insert(val), member(val), remove(val)
- Map<K, T>: key-value pairs (nesting only in values, NOT keys)
- List<T>: pushFront(val), popFront(), head()
- MerkleTree<n, T>: depth 2-32

## User-Defined Types
- enum Name { val1, val2 }
- struct Name { field1: Type, field2: Type } — NO recursive self-references allowed
- Access enum values: Name.val1

## Declarations
- Ledger (public on-chain state):
    export ledger {
      fieldName: Type,
      anotherField: Type
    }
  OR individual: export ledger fieldName: Type;
- Witness (private off-chain input): witness name(params): ReturnType;
  Witnesses have NO body in Compact — implemented in TypeScript.
- Circuit (verifiable computation):
    export circuit name(params): ReturnType { ... }
  Every code path MUST end with \`return\`.
  Generic circuits (with <T>) CANNOT be exported.
- Constructor: constructor(params) { ... }
  At most ONE per contract. NO return type annotation. NO return statement.

## Expressions & Operators
- Arithmetic: +, -, *, /, % (all on Uint)
- Comparison: ==, !=, <, <=, >, >=
- Logical: &&, ||, ! (short-circuit evaluation)
- Ternary: cond ? expr1 : expr2
- Type cast: expr as Type
- Binding: const x = expr; (immutable, block-scoped)

## Control Flow
- if (cond) { ... } else { ... }
- for (const i of 0..N) { ... } — N must be compile-time constant
- for (const item of vector) { ... }

## Higher-Order Functions
- map(f, vec): apply f to each element
- fold(f, init, vec): left-associative accumulation
  CRITICAL: fold accumulator MUST have explicit type annotation:
    fold((acc: Uint<64>, v: Uint<64>) => (acc + v) as Uint<64>, 0 as Uint<64>, vec)

## Privacy & Disclosure
- Privacy is DEFAULT. All witness data is private.
- disclose(value) — REQUIRED to:
  - Write witness-derived values to public ledger
  - Return witness-derived values from exported circuits
  - Branch on witness-derived values that affect public state
- Example: lastVerdict = disclose(computedVerdict);
- Example: if (disclose(isValid)) { ... }

## Cryptographic Functions
- persistentHash<T>(value): Bytes<32> — for ledger storage
- persistentCommit<T>(value, randomness): Bytes<32> — commitment scheme
- transientHash<T>(value): Bytes<32> — temporary use
- transientCommit<T>(value, randomness): Bytes<32> — temporary, masks witness data

## Assertions
- assert(condition, "error message")

## CRITICAL RULES
1. Uint subtraction PANICS on underflow. ALWAYS guard:
   const diff = (a >= b) ? (a - b) : (b - a);
   OR: if (a >= b) { result = a - b; } else { result = b - a; }
2. NEVER write witness-derived values to ledger without disclose()
3. Every circuit MUST have return on all code paths
4. Constructor MUST NOT have return type or return statement
5. fold accumulator MUST have type annotation
6. Generic circuits CANNOT be exported
7. Struct fields CANNOT reference their own struct type
8. Reserved keywords: export, import, module, circuit, witness, ledger, sealed, const, if, else, for, return, true, false, default, assert, pad, as, struct, enum, contract, pure, fold, map

## Example 1: Simple threshold check
\`\`\`compact
pragma language_version 0.22;
import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger {
  totalChecks: Counter,
  totalFlagged: Counter,
  lastVerdict: Verdict
}

witness getState(): Vector<3, Uint<64>>;
witness getThreshold(): Uint<64>;

export circuit verify(): Verdict {
  const state = getState();
  const threshold = getThreshold();
  const value = state[0];
  const valid = value <= threshold;

  totalChecks += 1;

  if (disclose(valid)) {
    lastVerdict = Verdict.clean;
    return Verdict.clean;
  } else {
    totalFlagged += 1;
    lastVerdict = Verdict.flagged;
    return Verdict.flagged;
  }
}

constructor() {
  lastVerdict = Verdict.clean;
}
\`\`\`

## Example 2: Vector checks with fold
\`\`\`compact
pragma language_version 0.22;
import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger {
  totalChecks: Counter,
  totalFlagged: Counter,
  lastVerdict: Verdict
}

witness getActions(): Vector<8, Uint<64>>;
witness getMaxRate(): Uint<64>;

export circuit verifyRate(): Verdict {
  const actions = getActions();
  const maxRate = getMaxRate();

  const total = fold(
    (acc: Uint<64>, a: Uint<64>) => (acc + a) as Uint<64>,
    0 as Uint<64>,
    actions
  );

  const withinLimit = total <= maxRate;

  totalChecks += 1;

  if (disclose(withinLimit)) {
    lastVerdict = Verdict.clean;
    return Verdict.clean;
  } else {
    totalFlagged += 1;
    lastVerdict = Verdict.flagged;
    return Verdict.flagged;
  }
}

constructor() {
  lastVerdict = Verdict.clean;
}
\`\`\`
`;

const SYSTEM_PROMPT = `You are a production-grade Compact language compiler for the Midnight blockchain. You translate English game rules into COMPLETE, FULLY IMPLEMENTED Compact ZK circuit code.

${COMPACT_REFERENCE}

CRITICAL — COMPLETENESS REQUIREMENTS:
- Every single rule the user provides MUST be translated into actual executable Compact logic.
- NEVER use comments as placeholders (e.g. "// TODO", "// add more checks here", "// implement this").
- NEVER leave logic unimplemented. Every check MUST have real code with real assertions, comparisons, and branches.
- NEVER abbreviate or skip rules. If the user gives 5 rules, the contract must enforce ALL 5 with actual code.
- NEVER use comments to describe what code "would" do — WRITE THE CODE.
- The ONLY acceptable comments are brief inline clarifications on complex expressions (sparingly).

CONTRACT STRUCTURE — follow this EXACT pattern:
1. pragma language_version 0.22;
2. import CompactStandardLibrary;
3. Define enums (Verdict with clean/flagged, plus any game-specific enums)
4. Define structs for complex game state (player state, positions, cards, etc.)
5. Define ledger with:
   - totalChecks: Counter (always)
   - totalFlagged: Counter (always)
   - lastVerdict: Verdict (always)
   - Additional ledger fields to track game-specific aggregate state (e.g. totalActionsVerified, rulesEnforced, etc.)
6. Define witness functions for EACH distinct piece of private input needed:
   - One witness per logical data group (e.g. getPlayerState, getActionData, getRngCommitment)
   - Use appropriate types: Uint<64> for numbers, Bytes<32> for hashes/commitments, Vector<N, T> for arrays, Boolean for flags
   - NEVER use a single catch-all witness — break inputs into semantic groups
7. Define one or more exported circuits that:
   - Call witness functions to get private inputs
   - Perform EVERY check as real Compact code using assert(), comparisons, if/else, fold, etc.
   - Use assert() for hard invariants that must always hold
   - Use conditional logic for checks that determine clean vs flagged
   - Track violations with a counter variable: const violations = ...
   - Update ledger counters (totalChecks += 1, etc.)
   - Use disclose() before writing witness-derived values to ledger or branching on them for public state
   - Return Verdict.clean or Verdict.flagged on ALL code paths
8. Constructor that initializes all non-Counter ledger fields

TRANSLATION RULES — how to convert English to Compact:
- "X cannot exceed Y" → assert(x <= y, "X exceeds Y") OR compare and count as violation
- "X must be within bounds (A-B)" → assert(x >= a, "below min"); assert(x <= b, "above max")
- "X must be committed before Y" → Use persistentHash or persistentCommit to verify commitment matches
- "Rate limit: max N per period" → Sum actions with fold(), assert total <= limit
- "X must be in player's hand/inventory" → Use a Vector/Set to represent the collection, verify membership
- "No duplicate X" → Check pairwise inequality or use a Set
- "RNG must be fair/committed" → Verify hash of revealed value matches prior commitment using persistentHash
- "Position must stay within map" → Range check: assert(pos >= minBound, ...); assert(pos <= maxBound, ...)
- "Speed/velocity limit" → Compute distance between old and new position, compare to max
- "Action must be valid type" → Compare against known enum values or valid range
- "Turn order must be respected" → Check currentPlayer matches expected player ID

QUALITY STANDARDS:
- Generate AT LEAST 30 lines of Compact code for any non-trivial ruleset
- Each rule should produce 3-10 lines of actual logic (witnesses, assertions, comparisons)
- Use descriptive witness function names that reflect the game domain
- Use meaningful variable names (not x, y, z — use playerSpeed, cardValue, actionCount)
- Include assert() statements with descriptive error message strings
- When multiple rules interact, verify their relationships (e.g. action happened before deadline AND within bounds)
- Use structs when a rule involves multi-field data (e.g. a position has x and y coordinates)

OUTPUT FORMAT:
- Output ONLY valid Compact code. No markdown fences, no explanations before or after the code.
- Do NOT start with \`\`\` or end with \`\`\`
- Do NOT include any text like "Here is...", "This contract...", etc.`;

const MAX_RETRIES = 2;

function stripMarkdown(text: string): string {
  return text
    .replace(/^```\w*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function POST(req: NextRequest) {
  const { rules } = await req.json();

  if (!rules || typeof rules !== "string" || rules.trim().length === 0) {
    return NextResponse.json(
      { error: "Rules cannot be empty" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    let currentCode = "";
    let lastValidation = { valid: false, errors: [] as any[] };
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      const userPrompt =
        attempt === 0
          ? `Translate EVERY one of these game rules into a COMPLETE, FULLY IMPLEMENTED Compact ZK circuit contract. Each rule must become real executable Compact code — not a comment, not a placeholder, not a TODO. Use assert() for hard checks, if/else for verdict logic, fold() for aggregations over vectors, and persistentHash() for commitment verification. Define separate witness functions for each logical input group. The contract must be production-quality with 30+ lines of real logic.\n\nRules:\n${rules}`
          : `Your previous Compact code had these validation errors:\n${lastValidation.errors
              .filter((e: any) => e.severity === "error")
              .map((e: any) => `Line ${e.line}: ${e.message}`)
              .join("\n")}\n\nHere is the code to fix:\n\n${currentCode}\n\nFix the errors while keeping ALL rule implementations complete. Do NOT replace working code with comments. Output ONLY the corrected Compact code.`;

      const raw = await callGemini(apiKey, SYSTEM_PROMPT, userPrompt);
      currentCode = stripMarkdown(raw);
      lastValidation = validateCompact(currentCode);

      if (lastValidation.valid || lastValidation.errors.every((e: any) => e.severity === "warning")) {
        return NextResponse.json({
          compact: currentCode,
          validation: lastValidation.errors,
          attempts: attempt + 1,
          needsHumanReview: false,
        });
      }

      attempt++;
    }

    // After max retries, return code WITH errors for human fix
    return NextResponse.json({
      compact: currentCode,
      validation: lastValidation.errors,
      attempts: attempt,
      needsHumanReview: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Compilation failed" },
      { status: 500 }
    );
  }
}
