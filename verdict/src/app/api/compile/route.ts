import { NextRequest, NextResponse } from "next/server";

const COMPACT_REFERENCE = `
Compact language reference (Midnight ZK circuit language):
- Start with: pragma language_version 0.21;
- Import: import CompactStandardLibrary;
- Types: Uint<64>, Boolean, Bytes<32>, Field, Counter, Vector<N, T>
- Enums: enum Name { val1, val2 }
- Structs: struct Name { field: Type }
- Ledger (on-chain state): export ledger name: Type;
- Witness (private input): witness name(): Type;
- Circuit: export circuit name(params): ReturnType { ... }
- Constructor: constructor() { ... } — initializes ledger
- Assertions: assert(condition, "message")
- Hash: persistentHash<T>(value): Bytes<32>
- Commitment: persistentCommit<T>(value, rand): Bytes<32>
- disclose(value) — REQUIRED to write private values to ledger
- Loops: for (const i of 0..N) stmt; for (const i of vec) stmt;
- Higher-order: map(f, vec), fold(f, init, vec)
- Ternary: cond ? expr1 : expr2
- CRITICAL: Uint subtraction panics on underflow. Always guard: if (a > b) { a - b } else { b - a }
- CRITICAL: Cannot write private values to ledger without disclose()
- CRITICAL: fold needs explicit type: fold((acc: Uint<64>, v) => (acc + v) as Uint<64>, 0 as Uint<64>, vec)

Example contract:
\`\`\`compact
pragma language_version 0.21;
import CompactStandardLibrary;

enum Verdict { clean, flagged }

export ledger totalChecks: Counter;
export ledger totalFlagged: Counter;
export ledger lastVerdict: Verdict;

witness getState(): Vector<3, Uint<64>>;
witness getThreshold(): Uint<64>;

export circuit verify(): Verdict {
  const state = getState();
  const threshold = getThreshold();
  const value = state[0];
  const limit = state[1];

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
`;

const SYSTEM_PROMPT = `You are a Compact language compiler. You translate English game rules into Compact ZK circuit code for the Midnight blockchain.

${COMPACT_REFERENCE}

Rules:
1. Output ONLY valid Compact code. No markdown fences, no explanations.
2. Every contract must start with pragma and import.
3. Use Verdict enum (clean/flagged) for results.
4. Use Counter for totalChecks and totalFlagged ledger state.
5. Use witness functions for private inputs.
6. Always guard Uint subtraction against underflow.
7. Always use disclose() before writing to ledger or branching on private values.
8. Keep circuits minimal — only the checks the user described.
9. Use fold/map for repetitive checks over vectors.
10. Add a constructor that initializes ledger state.`;

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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              parts: [
                {
                  text: `Translate these game rules into a Compact ZK circuit contract:\n\n${rules}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", res.status, err);
      return NextResponse.json(
        { error: `Gemini API error: ${res.status} — ${err}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip any markdown fences the model might have added
    const compact = text
      .replace(/^```\w*\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    return NextResponse.json({ compact });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Compilation failed" },
      { status: 500 }
    );
  }
}
