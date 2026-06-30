import type { GameRules } from "../game/rules";

export interface MarketplaceRuleset {
  id: string;
  name: string;
  author: string;
  gameType: string;
  description: string;
  downloads: number;
  rating: number;
  verified: boolean;
  rules: GameRules;
  tags: string[];
  createdAt: string;
}

export const DEFAULT_MARKETPLACE: MarketplaceRuleset[] = [
  {
    id: "chess-standard",
    name: "Chess — Standard FIDE",
    author: "VERDICT Labs",
    gameType: "Chess",
    description: "Standard 8x8 chess with full piece type validation. Used by major online chess platforms for engine detection.",
    downloads: 12847,
    rating: 4.9,
    verified: true,
    rules: {
      maxVelocity: 7, maxAcceleration: 7, boundX: 7, boundY: 7,
      validActionCount: 6, maxActionsPerWindow: 8, windowSize: 100,
      minDiversity: 0, snapThreshold: 1000, maxSnaps: 6, maxCorrelation: 32,
    },
    tags: ["chess", "fide", "competitive"],
    createdAt: "2024-01-15",
  },
  {
    id: "chess-blitz",
    name: "Chess — Blitz (3+0)",
    author: "SpeedChess.io",
    gameType: "Chess",
    description: "Optimized for blitz chess — tighter timing windows to catch engine-assisted play in fast time controls.",
    downloads: 8234,
    rating: 4.7,
    verified: true,
    rules: {
      maxVelocity: 7, maxAcceleration: 7, boundX: 7, boundY: 7,
      validActionCount: 6, maxActionsPerWindow: 4, windowSize: 30,
      minDiversity: 2, snapThreshold: 800, maxSnaps: 4, maxCorrelation: 28,
    },
    tags: ["chess", "blitz", "speed"],
    createdAt: "2024-03-02",
  },
  {
    id: "fps-competitive",
    name: "FPS — Competitive Shooter",
    author: "VERDICT Labs",
    gameType: "FPS",
    description: "Anti-cheat ruleset for competitive FPS games. Strict aim snap detection and movement validation.",
    downloads: 23591,
    rating: 4.8,
    verified: true,
    rules: {
      maxVelocity: 10, maxAcceleration: 5, boundX: 999, boundY: 999,
      validActionCount: 8, maxActionsPerWindow: 16, windowSize: 60,
      minDiversity: 8, snapThreshold: 50, maxSnaps: 2, maxCorrelation: 10,
    },
    tags: ["fps", "shooter", "competitive", "anti-aimbot"],
    createdAt: "2024-02-10",
  },
  {
    id: "poker-holdem",
    name: "Poker — Texas Hold'em",
    author: "CryptoPoker DAO",
    gameType: "Poker",
    description: "Action-only validation for poker — catches colluding bots and information-sharing between players.",
    downloads: 6712,
    rating: 4.5,
    verified: true,
    rules: {
      maxVelocity: 0, maxAcceleration: 0, boundX: 0, boundY: 0,
      validActionCount: 5, maxActionsPerWindow: 4, windowSize: 50,
      minDiversity: 4, snapThreshold: 1000, maxSnaps: 6, maxCorrelation: 20,
    },
    tags: ["poker", "card-game", "casino"],
    createdAt: "2024-04-18",
  },
  {
    id: "racing-sim",
    name: "Racing — Simulation",
    author: "TrackProtocol",
    gameType: "Racing",
    description: "High-speed racing validation — catches impossible acceleration, teleportation, and speed hacks.",
    downloads: 4201,
    rating: 4.6,
    verified: false,
    rules: {
      maxVelocity: 20, maxAcceleration: 3, boundX: 999, boundY: 99,
      validActionCount: 4, maxActionsPerWindow: 20, windowSize: 100,
      minDiversity: 4, snapThreshold: 500, maxSnaps: 4, maxCorrelation: 20,
    },
    tags: ["racing", "simulation", "speed"],
    createdAt: "2024-05-22",
  },
  {
    id: "casino-roulette",
    name: "Casino — Roulette",
    author: "FairSpin",
    gameType: "Casino",
    description: "Roulette integrity verification — ensures RNG compliance and payout correctness.",
    downloads: 9340,
    rating: 4.4,
    verified: true,
    rules: {
      maxVelocity: 0, maxAcceleration: 0, boundX: 36, boundY: 0,
      validActionCount: 3, maxActionsPerWindow: 10, windowSize: 200,
      minDiversity: 8, snapThreshold: 1000, maxSnaps: 6, maxCorrelation: 18,
    },
    tags: ["casino", "roulette", "gambling"],
    createdAt: "2024-06-01",
  },
  {
    id: "moba-standard",
    name: "MOBA — Standard",
    author: "EsportsGuard",
    gameType: "MOBA",
    description: "MOBA anti-cheat — validates movement speed, cooldown abuse, and gold generation anomalies.",
    downloads: 15782,
    rating: 4.7,
    verified: true,
    rules: {
      maxVelocity: 8, maxAcceleration: 4, boundX: 255, boundY: 255,
      validActionCount: 10, maxActionsPerWindow: 12, windowSize: 80,
      minDiversity: 6, snapThreshold: 200, maxSnaps: 3, maxCorrelation: 16,
    },
    tags: ["moba", "competitive", "esports"],
    createdAt: "2024-03-15",
  },
  {
    id: "battle-royale",
    name: "Battle Royale — Standard",
    author: "VERDICT Labs",
    gameType: "FPS",
    description: "Battle royale specific ruleset — large map bounds, wallhack and aimbot focused.",
    downloads: 18421,
    rating: 4.8,
    verified: true,
    rules: {
      maxVelocity: 12, maxAcceleration: 6, boundX: 4999, boundY: 4999,
      validActionCount: 8, maxActionsPerWindow: 20, windowSize: 120,
      minDiversity: 6, snapThreshold: 40, maxSnaps: 2, maxCorrelation: 8,
    },
    tags: ["fps", "battle-royale", "competitive"],
    createdAt: "2024-07-10",
  },
];
