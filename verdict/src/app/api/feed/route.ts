import { NextResponse } from "next/server";
import { getDeployedRulesets, getContractState } from "../../../lib/midnight";

const INDEXER_URL = "http://127.0.0.1:8088/api/v3/graphql";

async function getLatestBlock(): Promise<{
  height: number;
  timestamp: number;
  hash: string;
} | null> {
  try {
    const res = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "{ block { height timestamp hash } }",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.block ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const block = await getLatestBlock();
    const rulesets = getDeployedRulesets();

    // Build feed from deployed rulesets + their on-chain state
    const entries = await Promise.all(
      rulesets.map(async (rs) => {
        let state = null;
        try {
          state = await getContractState(rs.address);
        } catch {
          // Contract state may not be queryable yet
        }
        const totalChecks = state ? Number(state.totalChecks) : 0;
        const totalFlagged = state ? Number(state.totalFlagged) : 0;
        const lastVerdict = state
          ? state.lastVerdict === 0n
            ? "CLEAN"
            : "FLAGGED"
          : "PENDING";

        return {
          ruleset: rs.name,
          address: rs.address,
          player: rs.address.slice(0, 10) + "...",
          verdict: lastVerdict,
          checks:
            lastVerdict === "CLEAN"
              ? "10/10"
              : lastVerdict === "FLAGGED"
                ? "9/10"
                : "—",
          totalChecks,
          totalFlagged,
          time: rs.deployedAt,
          block: block?.height ?? 0,
        };
      })
    );

    return NextResponse.json({
      entries,
      blockHeight: block?.height ?? 0,
      blockHash: block?.hash ?? "",
      timestamp: Date.now(),
      networkId: "undeployed",
      rulesetCount: rulesets.length,
    });
  } catch (err: any) {
    console.error("[feed] Error:", err);
    return NextResponse.json(
      {
        entries: [],
        blockHeight: 0,
        blockHash: "",
        timestamp: Date.now(),
        networkId: "undeployed",
        rulesetCount: 0,
        error: err?.message,
      },
      { status: 200 } // Don't fail the feed — just return empty
    );
  }
}
