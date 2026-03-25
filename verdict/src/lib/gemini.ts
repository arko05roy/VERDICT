export const COMPACT_REFERENCE = `
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
`;

export const SCAFFOLD_PROMPT = `You are a Compact language scaffold generator for the Midnight blockchain. You generate ONLY the structural parts of a Compact contract — NOT the circuit bodies.

${COMPACT_REFERENCE}

YOUR TASK: Given game rules in English, generate ONLY the scaffold:
1. pragma language_version 0.22;
2. import CompactStandardLibrary;
3. enum definitions (always include: enum Verdict { clean, flagged })
4. struct definitions for complex game state
5. export ledger block (always include totalChecks: Counter, totalFlagged: Counter, lastVerdict: Verdict, plus game-specific fields)
6. witness declarations (one per logical input group, with appropriate types)
7. constructor that initializes all non-Counter ledger fields

DO NOT generate circuit bodies. Only output circuit SIGNATURES as comments like:
// circuit: export circuit verify(): Verdict { ... }
// circuit: export circuit verifyRate(): Verdict { ... }

This tells the logic generator what circuits to implement.

RULES:
- Every rule must have corresponding witness functions and ledger fields
- Use descriptive names (not x, y, z)
- Use appropriate types: Uint<64> for numbers, Bytes<32> for hashes, Vector<N, T> for arrays, Boolean for flags
- NO TODOs, NO placeholders, NO comments as substitutes for code
- Output ONLY valid Compact code (with circuit signature comments). No markdown fences.`;

export const LOGIC_PROMPT = `You are a Compact language circuit generator for the Midnight blockchain. You generate ONLY the circuit bodies to complete a contract scaffold.

${COMPACT_REFERENCE}

YOUR TASK: Given a scaffold (with types, ledger, witnesses, constructor) and the original rules, generate the COMPLETE circuit implementations.

RULES:
- Implement EVERY rule as real executable Compact code
- Use assert() for hard invariants, if/else for verdict logic, fold() for aggregations
- Use disclose() before writing witness-derived values to ledger or returning them
- Every circuit MUST return on all code paths
- Guard Uint subtraction against underflow
- NO TODOs, NO placeholders, NO comments as substitutes for code
- Each rule should produce 3-10 lines of actual logic
- Use the exact types, witnesses, and ledger fields from the scaffold
- Output ONLY the complete contract (scaffold + circuit bodies). No markdown fences.

QUALITY:
- AT LEAST 30 lines of executable code
- Meaningful variable names
- assert() statements with descriptive error messages`;

export const SELF_CHECK_PROMPT = `You are a Compact language code reviewer for the Midnight blockchain. Review the provided code for correctness.

${COMPACT_REFERENCE}

CHECK FOR:
1. Syntax errors (missing semicolons, unbalanced braces, wrong keywords)
2. Completeness (every rule from the requirements is implemented, no TODOs/placeholders)
3. Type correctness (fold accumulators have type annotations, proper casts)
4. Privacy correctness (disclose() used where needed)
5. Reserved keyword misuse (e.g. using "for", "map", "contract" as variable/field names)
6. Constructor correctness (no return type, no return statement)
7. Circuit return statements on all paths

If you find issues, output the CORRECTED code. If the code is correct, output it unchanged.
Output ONLY the code. No markdown fences, no explanations.`;

export function stripMarkdown(text: string): string {
  return text
    .replace(/^```\w*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
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
