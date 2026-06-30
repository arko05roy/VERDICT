import { ACTIONS, type ActionType, type GameRules, DEFAULT_RULES } from "./rules";

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  player: Position;
  prevPos: Position;
  prevPrevPos: Position;
  enemies: Position[];
  tick: number;
  isFirstMove: boolean;
  actionHistory: number[];
  tickHistory: number[];
  aimHistory: Position[];
  moveLog: MoveLogEntry[];
  sessionStarted: boolean;
}

export interface MoveLogEntry {
  from: Position;
  to: Position;
  action: number;
  tick: number;
  velocity: number;
  acceleration: number;
  verdict: "clean" | "flagged" | "pending";
  failedChecks: number[];
}

export interface CheckResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
}

export interface VerifyResult {
  verdict: "clean" | "flagged";
  checks: CheckResult[];
  velocity: number;
  acceleration: number;
  diversity: number;
  correlation: number;
  totalSnaps: number;
}

function randomEnemies(count: number, boundX: number, boundY: number): Position[] {
  const enemies: Position[] = [];
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: Math.floor(Math.random() * (boundX + 1)),
      y: Math.floor(Math.random() * (boundY + 1)),
    });
  }
  return enemies;
}

export function createInitialState(rules: GameRules = DEFAULT_RULES): GameState {
  const startPos = { x: Math.floor(rules.boundX / 2), y: Math.floor(rules.boundY / 2) };
  return {
    player: { ...startPos },
    prevPos: { ...startPos },
    prevPrevPos: { ...startPos },
    enemies: randomEnemies(8, rules.boundX, rules.boundY),
    tick: 100, // Start high enough to avoid windowSize underflow
    isFirstMove: true,
    actionHistory: [0, 1, 2, 3, 0, 1, 2, 3], // Diverse initial history
    tickHistory: [10, 20, 30, 40, 50, 60, 70, 80],
    aimHistory: Array.from({ length: 8 }, (_, i) => ({ x: startPos.x + i, y: startPos.y + i })),
    moveLog: [],
    sessionStarted: false,
  };
}

export function applyMove(state: GameState, action: ActionType): GameState {
  const dx = action === ACTIONS.RIGHT ? 1 : action === ACTIONS.LEFT ? -1 : 0;
  const dy = action === ACTIONS.UP ? -1 : action === ACTIONS.DOWN ? 1 : 0;

  const newPos = { x: state.player.x + dx, y: state.player.y + dy };
  const newTick = state.tick + 10;

  return {
    ...state,
    prevPrevPos: { ...state.prevPos },
    prevPos: { ...state.player },
    player: newPos,
    tick: newTick,
    isFirstMove: false,
    actionHistory: [...state.actionHistory.slice(1), action],
    tickHistory: [...state.tickHistory.slice(1), newTick],
    aimHistory: [...state.aimHistory.slice(1), newPos],
    sessionStarted: true,
  };
}

// Apply a cheat move — directly set positions without normal constraints
export function applyCheatMove(
  state: GameState,
  newPos: Position,
  action: number,
  overrides?: Partial<Pick<GameState, "actionHistory" | "aimHistory">>
): GameState {
  const newTick = state.tick + 10;

  return {
    ...state,
    prevPrevPos: { ...state.prevPos },
    prevPos: { ...state.player },
    player: newPos,
    tick: newTick,
    isFirstMove: false,
    actionHistory: overrides?.actionHistory ?? [...state.actionHistory.slice(1), action],
    tickHistory: [...state.tickHistory.slice(1), newTick],
    aimHistory: overrides?.aimHistory ?? [...state.aimHistory.slice(1), newPos],
    sessionStarted: true,
  };
}

// Local verification (mirrors the Compact circuit logic exactly)
export function verifyTransition(state: GameState, rules: GameRules): VerifyResult {
  const { player: c, prevPos: p, prevPrevPos: pp } = state;
  const action = state.actionHistory[state.actionHistory.length - 1];

  const checks: CheckResult[] = [];
  const allCheckDefs = [
    { id: 1, name: "Hash Chain", category: "Cryptographic" },
    { id: 2, name: "Commit-Reveal", category: "Cryptographic" },
    { id: 3, name: "Velocity", category: "Physics" },
    { id: 4, name: "Acceleration", category: "Physics" },
    { id: 5, name: "Bounds", category: "Spatial" },
    { id: 6, name: "Action Valid", category: "Rule" },
    { id: 7, name: "Frequency", category: "Temporal" },
    { id: 8, name: "Entropy", category: "Statistical" },
    { id: 9, name: "Aim Analysis", category: "Statistical" },
    { id: 10, name: "Info Leakage", category: "Info-Theory" },
  ];

  // CHECK 1 & 2: Cryptographic (always pass in local sim — no chain)
  checks.push({ ...allCheckDefs[0], passed: true });
  checks.push({ ...allCheckDefs[1], passed: true });

  // CHECK 3: Velocity
  const dx = Math.abs(c.x - p.x);
  const dy = Math.abs(c.y - p.y);
  const velocity = dx + dy;
  checks.push({ ...allCheckDefs[2], passed: velocity <= rules.maxVelocity });

  // CHECK 4: Acceleration
  const pdx = Math.abs(p.x - pp.x);
  const pdy = Math.abs(p.y - pp.y);
  const prevVelocity = pdx + pdy;
  const accel = Math.abs(velocity - prevVelocity);
  const check4Pass = state.isFirstMove || accel <= rules.maxAcceleration;
  checks.push({ ...allCheckDefs[3], passed: check4Pass });

  // CHECK 5: Bounds
  checks.push({ ...allCheckDefs[4], passed: c.x >= 0 && c.x <= rules.boundX && c.y >= 0 && c.y <= rules.boundY });

  // CHECK 6: Action validity
  checks.push({ ...allCheckDefs[5], passed: action >= 0 && action < rules.validActionCount });

  // CHECK 7: Frequency
  const windowStart = state.tick - rules.windowSize;
  const actionsInWindow = state.tickHistory.filter((t) => t >= windowStart).length;
  checks.push({ ...allCheckDefs[6], passed: actionsInWindow <= rules.maxActionsPerWindow });

  // CHECK 8: Entropy (Gini-Simpson)
  const freqs = [0, 0, 0, 0];
  for (const a of state.actionHistory) freqs[a] = (freqs[a] || 0) + 1;
  const sumSq = freqs.reduce((s, f) => s + f * f, 0);
  const diversity = 64 - sumSq;
  checks.push({ ...allCheckDefs[7], passed: diversity >= rules.minDiversity });

  // CHECK 9: Aim snaps
  const aim = state.aimHistory;
  let totalSnaps = 0;
  for (let i = 0; i < 6; i++) {
    const d0x = aim[i + 1].x - aim[i].x;
    const d0y = aim[i + 1].y - aim[i].y;
    const d1x = aim[i + 2].x - aim[i + 1].x;
    const d1y = aim[i + 2].y - aim[i + 1].y;
    const cross = d0x * d1y - d0y * d1x;
    if (cross * cross > rules.snapThreshold * rules.snapThreshold) totalSnaps++;
  }
  checks.push({ ...allCheckDefs[8], passed: totalSnaps <= rules.maxSnaps });

  // CHECK 10: Correlation
  const movingRight = c.x > p.x ? 1 : 0;
  const movingUp = c.y > p.y ? 1 : 0;
  let totalCorrelation = 0;
  for (const e of state.enemies) {
    if (movingRight === (e.x > c.x ? 1 : 0)) totalCorrelation++;
    if (movingUp === (e.y > c.y ? 1 : 0)) totalCorrelation++;
  }
  checks.push({ ...allCheckDefs[9], passed: totalCorrelation <= rules.maxCorrelation });

  const failedChecks = checks.filter((ch) => !ch.passed);
  return {
    verdict: failedChecks.length === 0 ? "clean" : "flagged",
    checks,
    velocity,
    acceleration: accel,
    diversity,
    correlation: totalCorrelation,
    totalSnaps,
  };
}
