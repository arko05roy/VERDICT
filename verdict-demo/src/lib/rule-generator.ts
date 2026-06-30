import type { GameRules } from "../game/rules";

const DEFAULTS: GameRules = {
  maxVelocity: 2,
  maxAcceleration: 2,
  boundX: 9,
  boundY: 9,
  validActionCount: 4,
  maxActionsPerWindow: 8,
  windowSize: 100,
  minDiversity: 10,
  snapThreshold: 1000,
  maxSnaps: 4,
  maxCorrelation: 14,
};

export function generateRulesFromText(text: string): Promise<GameRules> {
  const lower = text.toLowerCase();
  const rules: GameRules = { ...DEFAULTS };

  // Board size
  const boardMatch = lower.match(/(\d+)\s*x\s*(\d+)\s*board/);
  if (boardMatch) {
    rules.boundX = parseInt(boardMatch[1], 10) - 1;
    rules.boundY = parseInt(boardMatch[2], 10) - 1;
  }

  // Max velocity / speed
  const velMatch = lower.match(/max\s*(?:velocity|speed)\s*(\d+)/);
  if (velMatch) rules.maxVelocity = parseInt(velMatch[1], 10);

  // Max acceleration
  const accelMatch = lower.match(/max\s*accel(?:eration)?\s*(\d+)/);
  if (accelMatch) rules.maxAcceleration = parseInt(accelMatch[1], 10);

  // Piece types / action count
  const actionMatch = lower.match(/(\d+)\s*(?:piece types?|action types?|actions?|piece)/);
  if (actionMatch) rules.validActionCount = parseInt(actionMatch[1], 10);

  // Window size
  const windowMatch = lower.match(/window\s*(?:size)?\s*(\d+)/);
  if (windowMatch) rules.windowSize = parseInt(windowMatch[1], 10);

  // Game type presets
  if (lower.includes("chess")) {
    rules.boundX = 7;
    rules.boundY = 7;
    rules.validActionCount = 6;
    rules.maxVelocity = 7;
    rules.maxAcceleration = 7;
    rules.maxCorrelation = 32;
  } else if (lower.includes("poker") || lower.includes("card")) {
    rules.boundX = 0;
    rules.boundY = 0;
    rules.validActionCount = 5; // fold, check, call, raise, all-in
    rules.maxVelocity = 0;
    rules.maxAcceleration = 0;
    rules.maxCorrelation = 20;
  } else if (lower.includes("fps") || lower.includes("shooter")) {
    rules.boundX = 999;
    rules.boundY = 999;
    rules.validActionCount = 8;
    rules.maxVelocity = 10;
    rules.maxAcceleration = 5;
    rules.snapThreshold = 50;
    rules.maxSnaps = 2;
    rules.maxCorrelation = 10;
  } else if (lower.includes("racing") || lower.includes("race")) {
    rules.boundX = 999;
    rules.boundY = 99;
    rules.validActionCount = 4;
    rules.maxVelocity = 20;
    rules.maxAcceleration = 3;
    rules.maxCorrelation = 20;
  }

  // Diversity
  const divMatch = lower.match(/min\s*diversity\s*(\d+)/);
  if (divMatch) rules.minDiversity = parseInt(divMatch[1], 10);

  // Snap threshold
  const snapMatch = lower.match(/snap\s*threshold\s*(\d+)/);
  if (snapMatch) rules.snapThreshold = parseInt(snapMatch[1], 10);

  return Promise.resolve(rules);
}

export const RULE_PRESETS: { name: string; description: string; rules: GameRules }[] = [
  {
    name: "Chess",
    description: "Standard 8x8 chess with 6 piece types",
    rules: {
      maxVelocity: 7,
      maxAcceleration: 7,
      boundX: 7,
      boundY: 7,
      validActionCount: 6,
      maxActionsPerWindow: 8,
      windowSize: 100,
      minDiversity: 0,
      snapThreshold: 1000,
      maxSnaps: 6,
      maxCorrelation: 32,
    },
  },
  {
    name: "Poker",
    description: "Texas Hold'em — action-based, no spatial movement",
    rules: {
      maxVelocity: 0,
      maxAcceleration: 0,
      boundX: 0,
      boundY: 0,
      validActionCount: 5,
      maxActionsPerWindow: 4,
      windowSize: 50,
      minDiversity: 4,
      snapThreshold: 1000,
      maxSnaps: 6,
      maxCorrelation: 20,
    },
  },
  {
    name: "FPS",
    description: "Competitive first-person shooter — tight aim and speed checks",
    rules: {
      maxVelocity: 10,
      maxAcceleration: 5,
      boundX: 999,
      boundY: 999,
      validActionCount: 8,
      maxActionsPerWindow: 16,
      windowSize: 60,
      minDiversity: 8,
      snapThreshold: 50,
      maxSnaps: 2,
      maxCorrelation: 10,
    },
  },
  {
    name: "Racing",
    description: "Racing simulation — high speed, low acceleration tolerance",
    rules: {
      maxVelocity: 20,
      maxAcceleration: 3,
      boundX: 999,
      boundY: 99,
      validActionCount: 4,
      maxActionsPerWindow: 20,
      windowSize: 100,
      minDiversity: 4,
      snapThreshold: 500,
      maxSnaps: 4,
      maxCorrelation: 20,
    },
  },
];
