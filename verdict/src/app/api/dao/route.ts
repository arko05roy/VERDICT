import { NextResponse } from "next/server";
import { CHECK_REGISTRY } from "@/lib/checks/registry";

// DAO route — returns governance state.
// Day-0: Returns the genesis check registry from the local library.
// Future: Will query the on-chain verdict-dao contract.

export async function GET() {
  const genesisChecks = CHECK_REGISTRY.map((c) => ({
    id: c.id,
    mythName: c.mythName,
    numeral: c.numeral,
    category: c.category,
    description: c.description,
    isHardFail: c.isHardFail,
    active: true,
  }));

  return NextResponse.json({
    totalChecks: genesisChecks.length,
    checks: genesisChecks,
    council: {
      size: 3,
      threshold: 2,
    },
    proposals: [],
    totalProposals: 0,
  });
}
