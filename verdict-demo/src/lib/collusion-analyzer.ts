import type { GameState } from "../game/engine";

export interface PairAnalysis {
  playerA: number;
  playerB: number;
  correlationScore: number;
  sharedInfoScore: number;
  suspiciousPatterns: string[];
  verdict: "clean" | "suspicious" | "flagged";
}

export interface CollusionResult {
  pairs: PairAnalysis[];
  overallVerdict: "clean" | "suspicious" | "flagged";
}

function positionCorrelation(logsA: GameState[], logsB: GameState[]): number {
  const len = Math.min(logsA.length, logsB.length);
  if (len === 0) return 0;

  let corr = 0;
  for (let i = 0; i < len; i++) {
    const a = logsA[i];
    const b = logsB[i];
    // Does A move toward B's enemies? (Check 10 cross-player logic)
    const aMovingRight = a.player.x > a.prevPos.x ? 1 : 0;
    const aMovingUp = a.player.y > a.prevPos.y ? 1 : 0;

    for (const enemy of b.enemies) {
      if (aMovingRight === (enemy.x > a.player.x ? 1 : 0)) corr++;
      if (aMovingUp === (enemy.y > a.player.y ? 1 : 0)) corr++;
    }
  }

  const maxCorr = len * 16; // 8 enemies * 2 axes
  return maxCorr > 0 ? corr / maxCorr : 0;
}

function actionSequenceSimilarity(logsA: GameState[], logsB: GameState[]): number {
  const len = Math.min(logsA.length, logsB.length);
  if (len === 0) return 0;

  let matches = 0;
  let total = 0;
  for (let i = 0; i < len; i++) {
    const histA = logsA[i].actionHistory;
    const histB = logsB[i].actionHistory;
    for (let j = 0; j < histA.length; j++) {
      if (histA[j] === histB[j]) matches++;
      total++;
    }
  }

  return total > 0 ? matches / total : 0;
}

function timingCorrelation(logsA: GameState[], logsB: GameState[]): number {
  const len = Math.min(logsA.length, logsB.length);
  if (len < 2) return 0;

  const deltasA: number[] = [];
  const deltasB: number[] = [];

  for (let i = 1; i < len; i++) {
    deltasA.push(logsA[i].tick - logsA[i - 1].tick);
    deltasB.push(logsB[i].tick - logsB[i - 1].tick);
  }

  const n = deltasA.length;
  const meanA = deltasA.reduce((s, v) => s + v, 0) / n;
  const meanB = deltasB.reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = deltasA[i] - meanA;
    const db = deltasB[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  return denom > 0 ? Math.abs(cov / denom) : 0;
}

function sharedInfoScore(logsA: GameState[], logsB: GameState[]): number {
  const len = Math.min(logsA.length, logsB.length);
  if (len === 0) return 0;

  let infoLeaks = 0;
  for (let i = 0; i < len; i++) {
    const a = logsA[i];
    const b = logsB[i];
    // Check if player A's aim history tracks player B's position
    for (const aim of a.aimHistory) {
      const dist = Math.abs(aim.x - b.player.x) + Math.abs(aim.y - b.player.y);
      if (dist <= 1) infoLeaks++;
    }
  }

  const maxLeaks = len * 8;
  return maxLeaks > 0 ? infoLeaks / maxLeaks : 0;
}

function analyzePair(
  indexA: number,
  indexB: number,
  logsA: GameState[],
  logsB: GameState[]
): PairAnalysis {
  const posCorr = positionCorrelation(logsA, logsB);
  const actionSim = actionSequenceSimilarity(logsA, logsB);
  const timingCorr = timingCorrelation(logsA, logsB);
  const infoScore = sharedInfoScore(logsA, logsB);

  const correlationScore = (posCorr * 0.3 + actionSim * 0.3 + timingCorr * 0.4) * 100;
  const patterns: string[] = [];

  if (posCorr > 0.7) patterns.push("High positional correlation — movements mirror each other");
  if (actionSim > 0.6) patterns.push("Action sequences suspiciously similar");
  if (timingCorr > 0.8) patterns.push("Move timing highly correlated — possible signal sharing");
  if (infoScore > 0.3) patterns.push("Aim patterns track opponent position — possible info leak");

  let verdict: PairAnalysis["verdict"] = "clean";
  if (correlationScore > 70 || patterns.length >= 3) verdict = "flagged";
  else if (correlationScore > 45 || patterns.length >= 1) verdict = "suspicious";

  return {
    playerA: indexA,
    playerB: indexB,
    correlationScore: Math.round(correlationScore * 100) / 100,
    sharedInfoScore: Math.round(infoScore * 100) / 100,
    suspiciousPatterns: patterns,
    verdict,
  };
}

export function analyzeCollusion(playerLogs: GameState[][]): CollusionResult {
  const pairs: PairAnalysis[] = [];

  for (let i = 0; i < playerLogs.length; i++) {
    for (let j = i + 1; j < playerLogs.length; j++) {
      pairs.push(analyzePair(i, j, playerLogs[i], playerLogs[j]));
    }
  }

  let overallVerdict: CollusionResult["overallVerdict"] = "clean";
  if (pairs.some((p) => p.verdict === "flagged")) overallVerdict = "flagged";
  else if (pairs.some((p) => p.verdict === "suspicious")) overallVerdict = "suspicious";

  return { pairs, overallVerdict };
}
