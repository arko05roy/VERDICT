import { NextResponse } from "next/server";
import { getDeployedRulesets, getContractState } from "../../../lib/midnight";

export async function GET() {
  try {
    const rulesets = getDeployedRulesets();

    const enriched = await Promise.all(
      rulesets.map(async (rs) => {
        let totalChecks = 0;
        let totalFlagged = 0;
        try {
          const state = await getContractState(rs.address);
          if (state) {
            totalChecks = Number(state.totalChecks);
            totalFlagged = Number(state.totalFlagged);
          }
        } catch {}

        const flaggedRate =
          totalChecks > 0
            ? ((totalFlagged / totalChecks) * 100).toFixed(2)
            : "0.00";

        return {
          ...rs,
          totalChecks,
          totalFlagged,
          flaggedRate: `${flaggedRate}%`,
          status: "active",
        };
      })
    );

    return NextResponse.json({ rulesets: enriched });
  } catch (err: any) {
    return NextResponse.json({ rulesets: [], error: err?.message }, { status: 200 });
  }
}
