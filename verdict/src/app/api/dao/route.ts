import { NextResponse } from "next/server";
import { CHECK_REGISTRY } from "@/lib/checks/registry";
import { getDeployedRulesets } from "@/lib/midnight";

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

  // Genesis verifier v1.0: all 10 guardians (bitmask 0x3FF = 1023)
  const verifierVersions = [
    {
      versionId: 1,
      guardianMask: "1023",
      guardianCount: 10,
      active: true,
      createdAt: new Date("2026-03-11").toISOString(),
    },
  ];

  const rulesets = getDeployedRulesets();

  return NextResponse.json({
    totalChecks: genesisChecks.length,
    checks: genesisChecks,
    council: {
      size: 3,
      threshold: 2,
    },
    proposals: [],
    totalProposals: 0,
    verifierVersions,
    totalVerifierVersions: verifierVersions.length,
    latestVerifierVersion: 1,
    totalRulesets: rulesets.length,
  });
}
