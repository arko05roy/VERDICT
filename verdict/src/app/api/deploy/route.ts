import { NextRequest, NextResponse } from "next/server";
import { deployVerdictContract } from "@/lib/midnight";

export async function POST(req: NextRequest) {
  const { name, description, tags, enabledChecks, vcl, verifierVersion, enableMask, params } = await req.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Ruleset name is required" }, { status: 400 });
  }

  if (!enabledChecks || enabledChecks.length === 0) {
    return NextResponse.json({ error: "At least one Guardian must be enabled" }, { status: 400 });
  }

  try {
    const ruleset = await deployVerdictContract({
      name,
      description: description || "",
      tags: tags || [],
      enabledChecks: enabledChecks || [],
      checkCount: enabledChecks?.length || 0,
      vcl: vcl || "",
      compact: "", // No longer generating Compact per ruleset
      verifierVersion: verifierVersion || "1",
      enableMask: enableMask || "1023",
      params: params || {},
    });

    return NextResponse.json({
      success: true,
      contractAddress: ruleset.address,
      name: ruleset.name,
      description: ruleset.description,
      tags: ruleset.tags,
      enabledChecks: ruleset.enabledChecks,
      checkCount: ruleset.checkCount,
      verifierVersion: ruleset.verifierVersion,
      enableMask: ruleset.enableMask,
      deployedAt: ruleset.deployedAt,
      network: process.env.MIDNIGHT_NETWORK || "preprod",
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
