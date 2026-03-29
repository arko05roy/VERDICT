import { NextRequest, NextResponse } from "next/server";
import { parseVCL, validateVCL, compileVCL } from "@/lib/vcl";
import { validateCompact } from "@/lib/compact-validator";

export async function POST(req: NextRequest) {
  const { vcl } = await req.json();

  if (!vcl || typeof vcl !== "string" || vcl.trim().length === 0) {
    return NextResponse.json({ error: "VCL input cannot be empty" }, { status: 400 });
  }

  try {
    // Step 1: Parse VCL
    const parsed = parseVCL(vcl);
    if (!parsed.ok) {
      return NextResponse.json({
        error: "VCL parse error",
        vclErrors: parsed.errors,
      }, { status: 400 });
    }

    // Step 2: Validate against check registry
    const validationErrors = validateVCL(parsed.document);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: "VCL validation error",
        vclErrors: validationErrors,
      }, { status: 400 });
    }

    // Step 3: Deterministic compilation — no AI
    const result = compileVCL(parsed.document);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Step 4: Validate generated Compact (should always pass)
    const compactValidation = validateCompact(result.compact);

    return NextResponse.json({
      compact: result.compact,
      enabledChecks: result.enabledChecks,
      checkCount: result.checkCount,
      validation: compactValidation.errors,
      vcl,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Compilation failed" },
      { status: 500 }
    );
  }
}
