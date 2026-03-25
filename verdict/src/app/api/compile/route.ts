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

const SYSTEM_PROMPT = `You are a Compact language compiler for the Midnight blockchain. You translate English game rules into valid Compact ZK circuit code.

${COMPACT_REFERENCE}

OUTPUT RULES:
1. Output ONLY valid Compact code. No markdown fences, no explanations, no comments outside the code.
2. Every contract MUST start with pragma language_version 0.22; and import CompactStandardLibrary;
3. Use Verdict enum (clean/flagged) for verification results.
4. Use Counter for totalChecks and totalFlagged ledger state.
5. Use witness functions for all private inputs.
6. ALWAYS guard Uint subtraction against underflow with >= check.
7. ALWAYS use disclose() before writing witness-derived values to ledger or branching on them.
8. Keep circuits minimal — only the checks the user described.
9. Use fold/map with explicit type annotations for repetitive checks over vectors.
10. Add a constructor that initializes all non-Counter ledger fields.
11. Every circuit MUST return on all code paths.
12. Do NOT use pragma version 0.21 — use 0.22.`;

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
          maxOutputTokens: 4096,
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
          ? `Translate these game rules into a Compact ZK circuit contract:\n\n${rules}`
          : `Your previous Compact code had these validation errors:\n${lastValidation.errors
              .filter((e: any) => e.severity === "error")
              .map((e: any) => `Line ${e.line}: ${e.message}`)
              .join("\n")}\n\nHere is the code to fix:\n\n${currentCode}\n\nOutput ONLY the corrected Compact code.`;

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
