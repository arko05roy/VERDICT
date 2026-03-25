import { NextRequest, NextResponse } from "next/server";
import { validateCompact } from "../../../lib/compact-validator";
import {
  callGemini,
  SELF_CHECK_PROMPT,
  COMPACT_REFERENCE,
  stripMarkdown,
} from "../../../lib/gemini";

const FIX_PROMPT = `You are a Compact language error fixer for the Midnight blockchain. You fix specific errors in Compact code.

${COMPACT_REFERENCE}

RULES:
- Fix ONLY the reported errors. Do NOT rewrite working code.
- Do NOT replace implementations with comments or TODOs.
- Keep all existing logic intact.
- Output ONLY the corrected code. No markdown fences, no explanations.`;

export async function POST(req: NextRequest) {
  const { compact, errors, scaffoldEndLine } = await req.json();

  if (!compact || typeof compact !== "string" || compact.trim().length === 0) {
    return NextResponse.json({ error: "Compact code cannot be empty" }, { status: 400 });
  }
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return NextResponse.json({ error: "No errors to fix" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const lines = compact.split("\n");
    const boundary = scaffoldEndLine || Math.floor(lines.length / 2);
    const realErrors = errors.filter((e: any) => e.severity === "error");

    // Determine which chunk is broken
    const scaffoldErrors = realErrors.filter((e: any) => e.line <= boundary);
    const logicErrors = realErrors.filter((e: any) => e.line > boundary);

    let scaffoldChunk = lines.slice(0, boundary).join("\n");
    let logicChunk = lines.slice(boundary).join("\n");
    let fixedScaffold = scaffoldChunk;
    let fixedLogic = logicChunk;

    // Fix scaffold chunk if it has errors
    if (scaffoldErrors.length > 0) {
      const errorList = scaffoldErrors
        .map((e: any) => `Line ${e.line}: ${e.message}`)
        .join("\n");
      const fixPrompt = `Fix these errors in the SCAFFOLD section of a Compact contract:\n\nErrors:\n${errorList}\n\nScaffold code:\n${scaffoldChunk}\n\nFor context, the full contract also has circuit logic after this scaffold. Fix ONLY the scaffold. Output ONLY the corrected scaffold code.`;
      const rawFix = await callGemini(apiKey, FIX_PROMPT, fixPrompt);
      fixedScaffold = stripMarkdown(rawFix);
    }

    // Fix logic chunk if it has errors
    if (logicErrors.length > 0) {
      const errorList = logicErrors
        .map((e: any) => `Line ${e.line}: ${e.message}`)
        .join("\n");
      const fixPrompt = `Fix these errors in the CIRCUIT LOGIC section of a Compact contract:\n\nErrors:\n${errorList}\n\nCircuit code:\n${logicChunk}\n\nFor context, the scaffold (types, ledger, witnesses) is:\n${fixedScaffold}\n\nFix ONLY the circuit logic. Output ONLY the corrected circuit code.`;
      const rawFix = await callGemini(apiKey, FIX_PROMPT, fixPrompt);
      fixedLogic = stripMarkdown(rawFix);
    }

    // Reassemble
    let fixedContract = fixedScaffold + "\n" + fixedLogic;

    // Self-check the reassembled contract
    const checkPrompt = `Review this Compact contract for syntax errors and correctness. If issues exist, fix them. Output ONLY the corrected code:\n\n${fixedContract}`;
    const checkedContract = await callGemini(apiKey, SELF_CHECK_PROMPT, checkPrompt);
    fixedContract = stripMarkdown(checkedContract);

    // Local validation
    const validation = validateCompact(fixedContract);

    return NextResponse.json({
      compact: fixedContract,
      validation: validation.errors,
      fixed: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Fix failed" },
      { status: 500 }
    );
  }
}
