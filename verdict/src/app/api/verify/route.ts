import { NextResponse } from "next/server";
import { getContractState } from "@/lib/midnight";

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const state = await getContractState(address);
    if (!state) {
      return NextResponse.json(
        { error: "Ruleset not found" },
        { status: 404 }
      );
    }

    // Simulate a verification run with random state transition
    const flagged = Math.random() < 0.15; // ~15% chance of flagging
    const checks = 10;
    const passed = flagged ? Math.floor(Math.random() * 3) + 7 : 10;

    const result = {
      verdict: flagged ? "FLAGGED" : "CLEAN",
      checksRun: checks,
      checksPassed: passed,
      checksFailed: checks - passed,
      timestamp: new Date().toISOString(),
      blockHeight: Number(state.totalChecks) + 1,
      proofHash: Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0")
      ).join(""),
      details: [
        { name: "velocity_check", passed: !flagged || Math.random() > 0.3 },
        { name: "acceleration_check", passed: !flagged || Math.random() > 0.3 },
        { name: "bounds_check", passed: true },
        { name: "action_validity", passed: true },
        { name: "rate_limit_check", passed: !flagged || Math.random() > 0.4 },
        { name: "move_diversity", passed: !flagged || Math.random() > 0.3 },
        { name: "snap_detection", passed: !flagged || Math.random() > 0.5 },
        { name: "aim_correlation", passed: !flagged || Math.random() > 0.4 },
        { name: "chain_continuity", passed: true },
        { name: "commitment_verify", passed: true },
      ],
    };

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Verification failed" },
      { status: 500 }
    );
  }
}
