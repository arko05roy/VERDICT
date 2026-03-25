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

## FULL EXAMPLE — Multi-rule FPS integrity contract with edge cases
Rules: "Players cannot move faster than 5 units per tick, Position must stay within map bounds (0-1000), No action can exceed 10 per second, RNG must be committed before the bet is placed, Cards must be in the player's hand before playing"

\`\`\`compact
pragma language_version 0.22;
import CompactStandardLibrary;

enum Verdict { clean, flagged }

struct Position {
  x: Uint<64>,
  y: Uint<64>
}

export ledger {
  totalChecks: Counter,
  totalFlagged: Counter,
  lastVerdict: Verdict,
  totalClean: Counter
}

witness getPreviousPosition(): Position;
witness getCurrentPosition(): Position;
witness getMaxSpeed(): Uint<64>;
witness getActionTimestamps(): Vector<16, Uint<64>>;
witness getActionCount(): Uint<64>;
witness getMaxActionsPerSecond(): Uint<64>;
witness getTimestampWindowStart(): Uint<64>;
witness getTimestampWindowEnd(): Uint<64>;
witness getRngRevealedValue(): Uint<64>;
witness getRngRandomness(): Bytes<32>;
witness getRngCommitmentOnLedger(): Bytes<32>;
witness getBetTimestamp(): Uint<64>;
witness getRngCommitTimestamp(): Uint<64>;
witness getPlayerHand(): Vector<8, Uint<64>>;
witness getPlayedCard(): Uint<64>;
witness getMapMinBound(): Uint<64>;
witness getMapMaxBound(): Uint<64>;

export circuit verifyGameIntegrity(): Verdict {
  const prevPos = getPreviousPosition();
  const currPos = getCurrentPosition();
  const maxSpeed = getMaxSpeed();

  // --- Rule 1: Speed check with underflow-safe distance ---
  const dx = (currPos.x >= prevPos.x) ? (currPos.x - prevPos.x) : (prevPos.x - currPos.x);
  const dy = (currPos.y >= prevPos.y) ? (currPos.y - prevPos.y) : (prevPos.y - currPos.y);
  const distanceSquared = (dx * dx + dy * dy) as Uint<64>;
  const maxDistSquared = (maxSpeed * maxSpeed) as Uint<64>;
  assert(distanceSquared <= maxDistSquared, "movement speed exceeds maximum allowed per tick");

  // --- Rule 2: Map bounds (both axes, both min and max) ---
  const mapMin = getMapMinBound();
  const mapMax = getMapMaxBound();
  assert(currPos.x >= mapMin, "x position below map minimum");
  assert(currPos.x <= mapMax, "x position above map maximum");
  assert(currPos.y >= mapMin, "y position below map minimum");
  assert(currPos.y <= mapMax, "y position above map maximum");
  assert(prevPos.x >= mapMin, "previous x position below map minimum");
  assert(prevPos.x <= mapMax, "previous x position above map maximum");
  assert(prevPos.y >= mapMin, "previous y position below map minimum");
  assert(prevPos.y <= mapMax, "previous y position above map maximum");

  // --- Rule 3: Rate limiting (sum actions in window, compare to max) ---
  const actions = getActionTimestamps();
  const actionCount = getActionCount();
  const windowStart = getTimestampWindowStart();
  const windowEnd = getTimestampWindowEnd();
  assert(windowEnd >= windowStart, "time window end must be >= start");
  const maxRate = getMaxActionsPerSecond();
  const windowDuration = (windowEnd - windowStart) as Uint<64>;
  const maxAllowed = (windowDuration > 0 as Uint<64>) ? ((maxRate * windowDuration) as Uint<64>) : maxRate;
  assert(actionCount <= maxAllowed, "action rate exceeds maximum per second");

  const actionsInWindow = fold(
    (acc: Uint<64>, ts: Uint<64>) => (
      (ts >= windowStart && ts <= windowEnd) ? ((acc + 1) as Uint<64>) : acc
    ) as Uint<64>,
    0 as Uint<64>,
    actions
  );
  assert(actionsInWindow <= maxAllowed, "counted actions in window exceed rate limit");

  // --- Rule 4: RNG commitment verification (commit-reveal) ---
  const rngRevealed = getRngRevealedValue();
  const rngRandomness = getRngRandomness();
  const rngCommitOnLedger = getRngCommitmentOnLedger();
  const recomputedCommit = persistentCommit<Uint<64>>(rngRevealed, rngRandomness);
  assert(recomputedCommit == rngCommitOnLedger, "RNG revealed value does not match prior commitment");
  const betTs = getBetTimestamp();
  const commitTs = getRngCommitTimestamp();
  assert(commitTs <= betTs, "RNG must be committed before the bet is placed");

  // --- Rule 5: Card must be in hand (check played card exists in hand vector) ---
  const hand = getPlayerHand();
  const played = getPlayedCard();
  const cardFound = fold(
    (acc: Uint<64>, card: Uint<64>) => (
      (card == played) ? ((acc + 1) as Uint<64>) : acc
    ) as Uint<64>,
    0 as Uint<64>,
    hand
  );
  assert(cardFound >= (1 as Uint<64>), "played card not found in player hand");

  // --- All checks passed ---
  totalChecks += 1;
  totalClean += 1;
  lastVerdict = disclose(Verdict.clean);
  return Verdict.clean;
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

RULE DECOMPOSITION FRAMEWORK — apply this to ANY rule, from ANY domain:
Do NOT rely on pattern matching against known game types. Instead, decompose every rule using these 5 steps:

STEP 1 — IDENTIFY THE CONSTRAINT TYPE:
Every rule falls into one or more of these universal categories:
  a) COMPARISON: "X must/cannot be [more/less/equal] than Y" → assert(x op y, msg)
  b) RANGE/BOUNDS: "X must be between A and B" → assert(x >= a); assert(x <= b)
  c) ORDERING: "X must happen before/after Y" → assert(timestampX <= timestampY)
  d) MEMBERSHIP: "X must be in/part of Y" → fold over collection, count matches, assert >= 1
  e) UNIQUENESS: "no duplicate X" → pairwise inequality check or count == 1
  f) RATE/QUOTA: "at most N of X per Y" → fold to count, assert count <= limit
  g) CONSERVATION: "total X must remain constant" (e.g. total chips, total supply) → assert(before == after)
  h) INTEGRITY: "X must match committed/hashed value" → recompute hash/commitment, assert equality
  i) STATE TRANSITION: "X can only change from A to B" → assert(oldState == A); assert(newState == B)
  j) DEPENDENCY: "X requires Y" (prerequisite) → assert Y is satisfied before checking X
  k) EXCLUSION: "X and Y cannot both be true" → assert(!(condX && condY))
  l) ACCUMULATION: "sum/total of X must satisfy Y" → fold to sum, then assert against Y
  m) PROPORTIONAL: "X must be at most N% of Y" → assert(x * 100 <= y * n) (avoid division)

STEP 2 — IDENTIFY REQUIRED DATA:
For each constraint, determine:
  - What private inputs are needed? → define witness functions (one per logical group)
  - What types? Numbers → Uint<64>, hashes → Bytes<32>, collections → Vector<N, T>, flags → Boolean, compound → struct
  - What previous/reference state is needed? → separate witness for before-state vs after-state

STEP 3 — IMPLEMENT THE CHECK:
Write real Compact code using:
  - assert(condition, "descriptive message") for hard invariants
  - if/else branching for soft checks that determine clean vs flagged
  - fold() with typed accumulator for aggregations over vectors
  - persistentHash<T>/persistentCommit<T> for cryptographic verification
  - Structs for multi-field data

STEP 4 — ADD EDGE CASE GUARDS (mandatory for every check):
For EVERY constraint, ask: "What malicious input could bypass this?"
  - ARITHMETIC: guard ALL subtractions with (a >= b) ? (a - b) : (b - a), cast multiplications with \`as Uint<64>\`, guard divisions against zero
  - BOUNDS: always check BOTH min AND max, check ALL dimensions/fields, check BOTH current AND previous state
  - COLLECTIONS: scan ENTIRE collection with fold, never check only first/last element
  - TRUST NOTHING: witnesses are untrusted — add assert() sanity checks on inputs (non-zero, within sane ranges, valid enum values)
  - RECOMPUTE: never trust a witness-provided boolean/result — recompute the check inside the circuit
  - OVERFLOW: cast arithmetic with \`as Uint<64>\`, use proportional checks (a * d <= b * c) instead of division

STEP 5 — CROSS-RULE INTERACTIONS:
Check if rules depend on each other:
  - If rule A validates input and rule B uses that input → enforce A before B
  - If two rules share the same data → use the same witness, don't fetch twice
  - If rules are contradictory → the circuit should detect and flag

COMMON DOMAIN PATTERNS (examples, not exhaustive — apply the framework above to ANY domain):
  - Games: movement limits, inventory checks, turn order, score bounds, RNG fairness
  - Auctions: bid >= minimum, bid <= balance, no self-bidding, ascending order, time window
  - Trading: balance conservation, price bounds, slippage limits, trade size caps
  - Voting: one vote per participant, vote within options, tally integrity, deadline enforcement
  - Puzzles: state transition validity, move legality, solution verification, step count limits
  - Supply chain: quantity conservation, timestamp ordering, signature verification, origin validation

QUALITY STANDARDS:
- Generate AT LEAST 50 lines of Compact code for any non-trivial ruleset (edge cases add real code)
- Each rule should produce 5-15 lines of actual logic (witnesses, validations, assertions, edge case guards)
- Use descriptive witness function names that reflect the game domain
- Use meaningful variable names (not x, y, z — use playerSpeed, cardValue, actionCount)
- EVERY assert() MUST have a descriptive error message string explaining what went wrong
- When multiple rules interact, verify their relationships (e.g. action happened before deadline AND within bounds)
- Use structs when a rule involves multi-field data (e.g. a position has x and y coordinates)
- Use separate witness functions for each logical input group — do NOT bundle unrelated data

OUTPUT FORMAT:
- Output ONLY valid Compact code. No markdown fences, no explanations before or after the code.
- Do NOT start with \`\`\` or end with \`\`\`
- Do NOT include any text like "Here is...", "This contract...", etc.`;

const MAX_ITERATIONS = 4; // generate → self-review → refine (up to 4 cycles for edge case coverage)

function stripMarkdown(text: string): string {
  return text
    .replace(/^```\w*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string, temperature = 0.1): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature,
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

const SELF_REVIEW_PROMPT = `You are a security-focused Compact language code auditor for the Midnight blockchain. This code will verify game integrity in production ZK circuits. Incomplete or bypassed checks mean cheaters win. Be ruthless.

${COMPACT_REFERENCE}

Given the ORIGINAL RULES and the GENERATED CODE, perform a 5-part audit:

1. RULE COVERAGE (critical):
   - For EACH original rule, identify the exact lines of code that enforce it
   - A rule enforced only by a comment is NOT implemented — flag as missing
   - A rule checked only partially (e.g. checking X axis but not Y axis for a position bound) is INCOMPLETE — flag it

2. EDGE CASE AUDIT (critical — think like an attacker trying to bypass EACH check):
   For every constraint in the code, systematically check:
   - ARITHMETIC: Is EVERY subtraction guarded with >= ternary? (unguarded = circuit panic = DoS). Are multiplications cast with \`as Uint<64>\`? Any division by zero possible?
   - BOUNDS: Does EVERY numeric/spatial check cover BOTH min AND max? Are ALL dimensions/fields checked independently?
   - PREVIOUS STATE: If comparing before/after, is the "before" state also validated? (attacker can fake starting state)
   - COLLECTIONS: Does every membership/search scan ALL elements (fold over entire vector), not just first/last?
   - TRUST: Does ANY check rely on a witness-provided boolean or pre-computed result instead of recomputing in the circuit?
   - TEMPORAL: Are ordering constraints enforced with assert(), not just assumed?
   - AGGREGATION: Are totals/counts independently computed via fold, or do they trust witness-provided sums?
   - CONSERVATION: If a rule implies something is conserved (balance, total supply), is before == after actually checked?
   - INPUT SANITY: Are there assert() guards on witness inputs for sane ranges, non-zero, valid enum values?
   - CROSS-RULE: Do rules that share data use the same witness? Are dependencies between rules enforced in the right order?

3. CORRECTNESS:
   - disclose() on ALL witness-derived values before ledger writes or public branches
   - return on ALL code paths in every circuit
   - fold() accumulator type annotation
   - Constructor initializes all non-Counter ledger fields
   - No recursive structs

4. CODE QUALITY:
   - NO placeholder comments (TODO, implement, stub, add here)
   - NO commented-out code
   - Comment-to-code ratio must be < 25%
   - Every assert() must have a descriptive error string
   - Variable names must be meaningful and domain-specific

5. STRUCTURAL COMPLETENESS:
   - pragma 0.22, import CompactStandardLibrary
   - Verdict enum, ledger with counters, witnesses (separate per input group), exported circuits, constructor

SCORING:
- 10: Every rule fully implemented with edge cases covered, no issues
- 8-9: All rules implemented, minor edge cases or warnings only
- 5-7: Most rules implemented but missing edge cases or has errors
- 1-4: Rules missing, serious correctness issues, or mostly comments

OUTPUT — respond with ONLY a JSON object (no markdown fences, no other text):
{
  "passed": true/false,
  "issues": [
    {"severity": "error"|"warning", "description": "specific problem and exact fix needed", "line": number_or_null}
  ],
  "missingRules": ["exact rule text from original input that has no real implementation"],
  "edgeCaseGaps": ["specific edge case not handled, e.g. 'previous Y position not bounds-checked'"],
  "score": 1-10
}

Set passed = true ONLY if score >= 8 AND zero errors AND zero missingRules AND zero critical edgeCaseGaps.`;

interface ReviewResult {
  passed: boolean;
  issues: { severity: string; description: string; line?: number }[];
  missingRules: string[];
  edgeCaseGaps: string[];
  score: number;
}

async function selfReview(apiKey: string, originalRules: string, code: string): Promise<ReviewResult> {
  const prompt = `ORIGINAL RULES:\n${originalRules}\n\nGENERATED COMPACT CODE:\n\`\`\`\n${code}\n\`\`\`\n\nAudit this code thoroughly. Think like an attacker trying to bypass each check. Output ONLY the JSON object.`;

  const raw = await callGemini(apiKey, SELF_REVIEW_PROMPT, prompt, 0.05);
  const cleaned = raw.replace(/^```\w*\n?/gm, "").replace(/```$/gm, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      passed: parsed.passed ?? false,
      issues: parsed.issues ?? [],
      missingRules: parsed.missingRules ?? [],
      edgeCaseGaps: parsed.edgeCaseGaps ?? [],
      score: parsed.score ?? 0,
    };
  } catch {
    return { passed: false, issues: [{ severity: "error", description: "Self-review returned invalid output" }], missingRules: [], edgeCaseGaps: [], score: 0 };
  }
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
    let lastReview: ReviewResult | null = null;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      // --- PHASE 1: Generate / Refine ---
      let userPrompt: string;

      if (iteration === 0) {
        // Initial generation
        userPrompt = `Translate EVERY one of these rules into a COMPLETE, FULLY IMPLEMENTED Compact ZK circuit contract for production use on the Midnight blockchain.

PROCESS — follow this for each rule:
1. Classify the constraint type (comparison, range, ordering, membership, uniqueness, rate, conservation, integrity, state transition, dependency, exclusion, accumulation, proportional)
2. Identify all required private inputs → create witness functions with appropriate types
3. Write the actual verification logic using assert(), if/else, fold(), persistentHash/persistentCommit
4. Add edge case guards: underflow-safe subtraction, both-sided bounds, full collection scans, zero guards, overflow casts, sanity checks on witness inputs
5. Check cross-rule interactions — shared data, dependencies, contradictions

HARD REQUIREMENTS:
- Each rule → real executable Compact code. NOT a comment. NOT a placeholder.
- 50+ lines of real logic minimum
- Every assert() has a descriptive error message
- Every Uint subtraction guarded with >= ternary
- Every arithmetic cast with \`as Uint<64>\`
- Witnesses are UNTRUSTED — validate inputs before using them
- Never trust a witness boolean — recompute the check in the circuit
- Separate witness per logical input group

Rules:\n${rules}`;
      } else {
        // Build feedback from BOTH static validation AND AI self-review
        const feedbackParts: string[] = [];

        if (lastValidation.errors.length > 0) {
          const staticErrors = lastValidation.errors
            .filter((e: any) => e.severity === "error")
            .map((e: any) => `[STATIC] Line ${e.line}: ${e.message}`);
          if (staticErrors.length > 0) {
            feedbackParts.push(`Static validation errors:\n${staticErrors.join("\n")}`);
          }
        }

        if (lastReview && !lastReview.passed) {
          const reviewErrors = lastReview.issues
            .filter(i => i.severity === "error")
            .map(i => `[REVIEW] ${i.line ? `Line ${i.line}: ` : ""}${i.description}`);
          if (reviewErrors.length > 0) {
            feedbackParts.push(`AI review errors:\n${reviewErrors.join("\n")}`);
          }
          if (lastReview.missingRules.length > 0) {
            feedbackParts.push(`Rules NOT implemented (must add real code for these):\n${lastReview.missingRules.map(r => `- "${r}"`).join("\n")}`);
          }
          if (lastReview.edgeCaseGaps.length > 0) {
            feedbackParts.push(`EDGE CASES NOT HANDLED (a cheater could exploit these — you MUST add guards):\n${lastReview.edgeCaseGaps.map(g => `- ${g}`).join("\n")}`);
          }
          feedbackParts.push(`Security audit score: ${lastReview.score}/10`);
        }

        userPrompt = `Your previous Compact code needs improvement.\n\n${feedbackParts.join("\n\n")}\n\nOriginal rules:\n${rules}\n\nPrevious code:\n${currentCode}\n\nFix ALL issues. Implement ALL missing rules as real executable code. Do NOT use comments as placeholders. Do NOT remove working code. Output ONLY the improved Compact code.`;
      }

      const raw = await callGemini(apiKey, SYSTEM_PROMPT, userPrompt);
      currentCode = stripMarkdown(raw);

      // --- PHASE 2: Static validation ---
      lastValidation = validateCompact(currentCode);
      const staticPassed = lastValidation.valid || lastValidation.errors.every((e: any) => e.severity === "warning");

      // --- PHASE 3: AI self-review ---
      lastReview = await selfReview(apiKey, rules, currentCode);

      // If both static AND self-review pass, we're done
      if (staticPassed && lastReview.passed) {
        return NextResponse.json({
          compact: currentCode,
          validation: lastValidation.errors,
          review: { score: lastReview.score, issues: lastReview.issues },
          attempts: iteration + 1,
          needsHumanReview: false,
        });
      }

      iteration++;
    }

    // After max iterations, return best effort with all feedback
    return NextResponse.json({
      compact: currentCode,
      validation: lastValidation.errors,
      review: lastReview ? { score: lastReview.score, issues: lastReview.issues, missingRules: lastReview.missingRules, edgeCaseGaps: lastReview.edgeCaseGaps } : null,
      attempts: iteration,
      needsHumanReview: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Compilation failed" },
      { status: 500 }
    );
  }
}
