export interface GameRules {
  maxVelocity: number;
  maxAcceleration: number;
  boundX: number;
  boundY: number;
  validActionCount: number;
  maxActionsPerWindow: number;
  windowSize: number;
  minDiversity: number;
  snapThreshold: number;
  maxSnaps: number;
  maxCorrelation: number;
}

export const DEFAULT_RULES: GameRules = {
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

// Action mapping
export const ACTIONS = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
} as const;

export type ActionType = (typeof ACTIONS)[keyof typeof ACTIONS];
