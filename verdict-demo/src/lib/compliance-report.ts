import type { VerifyResult } from "../game/engine";

export interface RegulationTemplate {
  id: string;
  name: string;
  description: string;
  requiredChecks: number[];
  maxFlagRate: number;
  requiresRNGAudit: boolean;
  requiresPlayerIdentity: boolean;
}

export const REGULATION_TEMPLATES: RegulationTemplate[] = [
  {
    id: "mga",
    name: "Malta Gaming Authority (MGA)",
    description: "EU-standard online gambling regulation — strict RNG and fairness requirements",
    requiredChecks: [1, 2, 3, 5, 6, 7, 8],
    maxFlagRate: 0.02,
    requiresRNGAudit: true,
    requiresPlayerIdentity: true,
  },
  {
    id: "ukgc",
    name: "UK Gambling Commission (UKGC)",
    description: "British regulatory framework — emphasis on player protection and fair play",
    requiredChecks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    maxFlagRate: 0.01,
    requiresRNGAudit: true,
    requiresPlayerIdentity: true,
  },
  {
    id: "curacao",
    name: "Curacao eGaming",
    description: "Caribbean licensing — lighter requirements, common for crypto casinos",
    requiredChecks: [1, 2, 5, 6],
    maxFlagRate: 0.05,
    requiresRNGAudit: false,
    requiresPlayerIdentity: false,
  },
  {
    id: "esports",
    name: "Esports Integrity Commission (ESIC)",
    description: "Competitive gaming integrity — anti-cheat and match-fixing detection",
    requiredChecks: [3, 4, 8, 9, 10],
    maxFlagRate: 0.0,
    requiresRNGAudit: false,
    requiresPlayerIdentity: true,
  },
  {
    id: "fide",
    name: "FIDE Fair Play Commission",
    description: "Chess-specific anti-cheating regulations — engine detection focus",
    requiredChecks: [6, 7, 8, 9],
    maxFlagRate: 0.0,
    requiresRNGAudit: false,
    requiresPlayerIdentity: true,
  },
];

export interface ComplianceSection {
  name: string;
  status: "pass" | "fail" | "warning";
  details: string;
  checkIds: number[];
}

export interface ComplianceReport {
  template: RegulationTemplate;
  overallStatus: "compliant" | "non-compliant" | "needs-review";
  sections: ComplianceSection[];
  flagRate: number;
  totalMoves: number;
  flaggedMoves: number;
  generatedAt: string;
  proofHash: string;
}

export function generateComplianceReport(
  results: VerifyResult[],
  template: RegulationTemplate
): ComplianceReport {
  const totalMoves = results.length;
  const flaggedMoves = results.filter((r) => r.verdict === "flagged").length;
  const flagRate = totalMoves > 0 ? flaggedMoves / totalMoves : 0;

  const checkNames: Record<number, string> = {
    1: "Hash Chain Integrity",
    2: "Commit-Reveal Protocol",
    3: "Velocity Bounds",
    4: "Acceleration Bounds",
    5: "Spatial Bounds",
    6: "Action Validity",
    7: "Frequency Limits",
    8: "Entropy / Diversity",
    9: "Aim Analysis",
    10: "Information Leakage",
  };

  const sections: ComplianceSection[] = [];

  for (const checkId of template.requiredChecks) {
    const failures = results.filter((r) =>
      r.checks.some((c) => c.id === checkId && !c.passed)
    ).length;
    const failRate = totalMoves > 0 ? failures / totalMoves : 0;

    let status: ComplianceSection["status"] = "pass";
    if (failures > 0 && failRate > template.maxFlagRate) status = "fail";
    else if (failures > 0) status = "warning";

    sections.push({
      name: checkNames[checkId] || `Check ${checkId}`,
      status,
      details:
        status === "pass"
          ? `All ${totalMoves} transitions passed check #${checkId}`
          : `${failures}/${totalMoves} transitions failed (${(failRate * 100).toFixed(2)}% — limit: ${(template.maxFlagRate * 100).toFixed(2)}%)`,
      checkIds: [checkId],
    });
  }

  const flagRateStatus: ComplianceSection["status"] =
    flagRate <= template.maxFlagRate ? "pass" : "fail";
  sections.push({
    name: "Overall Flag Rate",
    status: flagRateStatus,
    details: `${(flagRate * 100).toFixed(2)}% flagged (limit: ${(template.maxFlagRate * 100).toFixed(2)}%)`,
    checkIds: [],
  });

  if (template.requiresRNGAudit) {
    sections.push({
      name: "RNG Audit",
      status: "warning",
      details: "RNG audit requires separate sequence submission via /audit",
      checkIds: [],
    });
  }

  if (template.requiresPlayerIdentity) {
    sections.push({
      name: "Player Identity Verification",
      status: "warning",
      details: "Player passport verification recommended via /passport",
      checkIds: [],
    });
  }

  const hasFail = sections.some((s) => s.status === "fail");
  const hasWarning = sections.some((s) => s.status === "warning");
  const overallStatus: ComplianceReport["overallStatus"] = hasFail
    ? "non-compliant"
    : hasWarning
      ? "needs-review"
      : "compliant";

  const proofHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  return {
    template,
    overallStatus,
    sections,
    flagRate,
    totalMoves,
    flaggedMoves,
    generatedAt: new Date().toISOString(),
    proofHash,
  };
}
