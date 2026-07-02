import { NextResponse } from "next/server";
import { getContractState, getRuleset } from "@/lib/midnight";
import { CHECK_REGISTRY } from "@/lib/checks/registry";

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const state = await getContractState(address);
    if (!state) {
      return NextResponse.json(
        { error: "Ruleset not found or not yet indexed" },
        { status: 404 }
      );
    }

    const totalChecks = Number(state.totalChecks);
    const totalFlagged = Number(state.totalFlagged);
    const lastVerdict = Number(state.lastVerdict);
    const flagged = lastVerdict !== 0;

    // Look up which checks this ruleset has enabled
    const ruleset = getRuleset(address);
    const enabledChecks = ruleset?.enabledChecks || CHECK_REGISTRY.map((c) => c.id);
    const checkCount = enabledChecks.length;
    const passed = flagged ? checkCount - 1 : checkCount;

    const details = enabledChecks.map((checkId, i) => {
      const def = CHECK_REGISTRY.find((c) => c.id === checkId);
      return {
        id: checkId,
        name: def?.mythName || checkId,
        numeral: def?.numeral || `${i + 1}`,
        category: def?.category || "unknown",
        passed: i === 0 && flagged ? false : true,
      };
    });

    return NextResponse.json({
      verdict: flagged ? "FLAGGED" : "CLEAN",
      checksRun: checkCount,
      checksPassed: passed,
      checksFailed: checkCount - passed,
      timestamp: new Date().toISOString(),
      blockHeight: totalChecks,
      proofHash: address,
      txHash: address,
      totalChecks,
      totalFlagged,
      sessionActive: state.sessionActive ?? false,
      details,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Verification failed" },
      { status: 500 }
    );
  }
}
