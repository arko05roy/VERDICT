import { NextResponse } from "next/server";

const RULESETS = ["fps-anticheat-v2", "poker-fairness", "moba-integrity", "casino-rng-proof", "chess-move-valid"];
const VERDICTS = ["CLEAN", "CLEAN", "CLEAN", "CLEAN", "CLEAN", "CLEAN", "CLEAN", "CLEAN", "CLEAN", "FLAGGED"];

function randomAddr() {
  const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `0x${hex.slice(0, 4)}...${hex.slice(4)}`;
}

export async function GET() {
  const entries = Array.from({ length: 10 }, (_, i) => {
    const verdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];
    return {
      ruleset: RULESETS[Math.floor(Math.random() * RULESETS.length)],
      player: randomAddr(),
      verdict,
      checks: verdict === "CLEAN" ? "10/10" : `${7 + Math.floor(Math.random() * 3)}/10`,
      time: `${i * 2 + Math.floor(Math.random() * 3)}s ago`,
      block: 4209117 - i,
    };
  });

  return NextResponse.json({ entries, timestamp: Date.now() });
}
