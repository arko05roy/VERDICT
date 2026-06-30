import type { GameState, VerifyResult } from "@/game/engine";
import type { GameRules } from "@/game/rules";

// Generates a deterministic proof hash from verification results
// Uses the same data that would go into the ZK circuit
export async function generateProofHash(data: {
  states: GameState[];
  results: VerifyResult[];
  rules: GameRules;
}): Promise<string> {
  // Serialize the verification-relevant data
  const payload = JSON.stringify({
    totalMoves: data.results.length,
    verdicts: data.results.map(r => r.verdict),
    checkResults: data.results.map(r => r.checks.map(c => c.passed)),
    rulesHash: Object.values(data.rules),
    positions: data.states.map(s => [s.player.x, s.player.y]),
  });

  const encoded = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Sync version using simple hash for immediate use
export function generateProofHashSync(data: {
  results: VerifyResult[];
  rules: GameRules;
}): string {
  // Simple deterministic hash: djb2
  let hash = 5381;
  const str = JSON.stringify({
    verdicts: data.results.map(r => r.verdict),
    checks: data.results.map(r => r.checks.map(c => c.passed)),
    rules: Object.values(data.rules),
  });
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xFFFFFFFF; // Convert to 32bit integer
  }
  // Expand to 64 hex chars by hashing multiple times
  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    hash = ((hash << 5) + hash) + i;
    hash = hash & 0xFFFFFFFF;
    parts.push((hash >>> 0).toString(16).padStart(8, '0'));
  }
  return '0x' + parts.join('');
}
