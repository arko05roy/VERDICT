import { NextRequest, NextResponse } from "next/server";
import { validateCompact } from "../../../lib/compact-validator";
import {
  callGemini,
  SCAFFOLD_PROMPT,
  LOGIC_PROMPT,
  SELF_CHECK_PROMPT,
  stripMarkdown,
} from "../../../lib/gemini";

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
    // Step 1: Generate scaffold (types, ledger, witnesses, constructor)
    const scaffoldUserPrompt = `Generate the scaffold (pragma, imports, enums, structs, ledger, witness declarations, constructor, and circuit signature comments) for these game rules:\n\n${rules}`;
    const rawScaffold = await callGemini(apiKey, SCAFFOLD_PROMPT, scaffoldUserPrompt);
    let scaffold = stripMarkdown(rawScaffold);

    // Step 2: Self-check scaffold (syntax + completeness)
    const scaffoldCheckPrompt = `Review this Compact scaffold for syntax errors and completeness against these rules:\n\nRules:\n${rules}\n\nScaffold:\n${scaffold}`;
    const checkedScaffold = await callGemini(apiKey, SELF_CHECK_PROMPT, scaffoldCheckPrompt);
    scaffold = stripMarkdown(checkedScaffold);

    // Step 3: Generate logic (circuit bodies) given scaffold
    const logicUserPrompt = `Here is the scaffold for a Compact contract:\n\n${scaffold}\n\nNow generate the COMPLETE contract with fully implemented circuit bodies for these rules:\n\n${rules}\n\nKeep the scaffold exactly as-is (types, ledger, witnesses, constructor). Only add the circuit implementations. Output the FULL contract.`;
    const rawLogic = await callGemini(apiKey, LOGIC_PROMPT, logicUserPrompt);
    let fullContract = stripMarkdown(rawLogic);

    // Step 4: Self-check full contract (syntax + completeness)
    const logicCheckPrompt = `Review this complete Compact contract for syntax errors, completeness, and correctness against these rules:\n\nRules:\n${rules}\n\nContract:\n${fullContract}`;
    const checkedContract = await callGemini(apiKey, SELF_CHECK_PROMPT, logicCheckPrompt);
    fullContract = stripMarkdown(checkedContract);

    // Step 5: Local validation
    const validation = validateCompact(fullContract);

    // Find scaffold end line (after constructor closing brace, before circuits)
    const lines = fullContract.split("\n");
    let scaffoldEndLine = 0;
    let inConstructor = false;
    let braceDepth = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("constructor")) inConstructor = true;
      if (inConstructor) {
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }
        if (inConstructor && braceDepth === 0 && line.includes("}")) {
          scaffoldEndLine = i + 1; // 1-indexed
          inConstructor = false;
        }
      }
    }
    // Fallback: if no constructor found, find first "export circuit" line
    if (scaffoldEndLine === 0) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith("export circuit")) {
          scaffoldEndLine = i; // line before first circuit
          break;
        }
      }
    }

    const hasErrors = validation.errors.some((e: any) => e.severity === "error");

    return NextResponse.json({
      compact: fullContract,
      validation: validation.errors,
      attempts: 1,
      scaffoldEndLine,
      needsHumanReview: hasErrors,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Compilation failed" },
      { status: 500 }
    );
  }
}
