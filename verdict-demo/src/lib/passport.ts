export interface Badge {
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface PassportData {
  totalGames: number;
  totalMoves: number;
  totalFlagged: number;
  checksBreakdown: Record<number, number>;
  streak: number;
  since: string;
}

export interface IntegrityPassport {
  score: number;
  grade: string;
  cleanRate: number;
  totalVerified: number;
  streak: number;
  badges: Badge[];
}

function computeGrade(score: number): string {
  if (score >= 97) return "S";
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function computeBadges(data: PassportData): Badge[] {
  return [
    {
      name: "First 100",
      description: "Verified 100 moves without a flag",
      icon: "shield-check",
      earned: data.totalMoves >= 100 && data.totalFlagged === 0,
    },
    {
      name: "1000 Club",
      description: "Over 1,000 verified game states",
      icon: "trophy",
      earned: data.totalMoves >= 1000,
    },
    {
      name: "Perfect Game",
      description: "Completed a full game with zero flags",
      icon: "sparkles",
      earned: data.totalGames >= 1 && data.totalFlagged === 0,
    },
    {
      name: "Clean Streak 10",
      description: "10 consecutive clean games",
      icon: "flame",
      earned: data.streak >= 10,
    },
    {
      name: "Veteran",
      description: "Over 50 games verified",
      icon: "medal",
      earned: data.totalGames >= 50,
    },
  ];
}

export function computeIntegrityScore(data: PassportData): IntegrityPassport {
  const cleanRate =
    data.totalMoves > 0 ? (data.totalMoves - data.totalFlagged) / data.totalMoves : 1;

  // Base score from clean rate (0-80)
  let score = cleanRate * 80;

  // Streak bonus (up to 10 points)
  score += Math.min(data.streak, 10);

  // Volume bonus (up to 10 points)
  score += Math.min(data.totalGames / 10, 10);

  score = Math.round(Math.min(100, Math.max(0, score)));

  return {
    score,
    grade: computeGrade(score),
    cleanRate: Math.round(cleanRate * 10000) / 10000,
    totalVerified: data.totalMoves,
    streak: data.streak,
    badges: computeBadges(data),
  };
}

export function generateMockPassport(): IntegrityPassport {
  return computeIntegrityScore({
    totalGames: 142,
    totalMoves: 8534,
    totalFlagged: 12,
    checksBreakdown: {
      3: 5,
      4: 2,
      8: 3,
      9: 1,
      10: 1,
    },
    streak: 23,
    since: "2024-01-15",
  });
}
