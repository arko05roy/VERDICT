import { NextRequest, NextResponse } from "next/server";
import { deployVerdictContract } from "@/lib/midnight";
import { validateCompact } from "@/lib/compact-validator";

export async function POST(req: NextRequest) {
  const { compact, name, description, tags, enabledChecks, vcl } = await req.json();

  if (!compact || typeof compact !== "string" || compact.trim().length === 0) {
    return NextResponse.json({ error: "Compact code cannot be empty" }, { status: 400 });
  }

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Ruleset name is required" }, { status: 400 });
  }

  const validation = validateCompact(compact);
  const criticalErrors = validation.errors.filter((e: any) => e.severity === "error");
  if (criticalErrors.length > 0) {
    return NextResponse.json({
      error: "Compact code has validation errors",
      validation: criticalErrors,
    }, { status: 400 });
  }

  try {
    const ruleset = await deployVerdictContract({
      name,
      description: description || "",
      tags: tags || [],
      enabledChecks: enabledChecks || [],
      checkCount: enabledChecks?.length || 0,
      vcl: vcl || "",
      compact,
    });

    return NextResponse.json({
      success: true,
      contractAddress: ruleset.address,
      name: ruleset.name,
      description: ruleset.description,
      tags: ruleset.tags,
      enabledChecks: ruleset.enabledChecks,
      checkCount: ruleset.checkCount,
      deployedAt: ruleset.deployedAt,
      network: process.env.MIDNIGHT_NETWORK || "undeployed",
      txHash: ruleset.txHash,
      sdk: `import { Verdict } from "@verdict/sdk";\nconst v = new Verdict("${ruleset.address}");\nconst proof = await v.verify(stateTransition);`,
    });
  } catch (err: any) {
    console.error("[deploy] Error:", err);
    return NextResponse.json(
      { error: `Deployment failed: ${err?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
