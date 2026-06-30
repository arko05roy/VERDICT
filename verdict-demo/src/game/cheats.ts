import { type GameState, type Position, applyCheatMove } from "./engine";

// Cheat 1: Teleport — CHECK 3 (velocity)
export function simulateTeleport(state: GameState): GameState {
  const teleportTarget: Position = { x: 9, y: 9 };
  return applyCheatMove(state, teleportTarget, 3);
}

// Cheat 2: Speed Ramp — CHECK 4 (acceleration)
// Move legally in terms of max velocity, but with sudden acceleration change
export function simulateSpeedRamp(state: GameState): GameState {
  // Jump from wherever we are by maxVelocity=2, but previous velocity was 0 or 1
  // This creates accel > maxAcceleration
  const newPos: Position = { x: state.player.x + 2, y: state.player.y };
  // Override prevPrevPos to equal prevPos so previous velocity = 0, current velocity = 2, accel = 2
  // Actually we need accel > 2, so let's do velocity=2 when prev was 0
  // prevPrevPos = prevPos → prevVelocity = 0, currVelocity = 2, accel = 2
  // That's borderline. Let's make it clearer: set prevPrevPos far from prevPos (prev velocity high)
  // then current velocity low → accel = |low - high| > max
  const adjustedState: GameState = {
    ...state,
    prevPrevPos: { x: state.prevPos.x - 2, y: state.prevPos.y - 2 },
    // prev velocity = |prevPos - prevPrevPos| = 4
    // curr velocity will be 2
    // accel = |2 - 4| = 2 — still borderline at maxAccel=2
  };
  // Let's make prev velocity = 0 (prevPrevPos = prevPos) and jump 2 — accel=2=max, clean
  // Instead: make a big velocity change. Set prevPrevPos very far:
  const bigAccelState: GameState = {
    ...state,
    prevPrevPos: { x: state.prevPos.x, y: state.prevPos.y },
    // prevVelocity = 0
  };
  // Now move far: newPos is player + (2,2) = velocity 4 (but > maxVel=2, triggers check3 first)
  // We need velocity <= maxVel but accel > maxAccel
  // prevVelocity = 0, currentVelocity = 2, accel = 2 = maxAccel — PASS
  // Let's use: prevPrevPos far away so prevVelocity = 4, currentVelocity = 1, accel = 3 > 2
  const rampState: GameState = {
    ...state,
    prevPrevPos: {
      x: state.prevPos.x + 2,
      y: state.prevPos.y + 2,
    },
  };
  // prevVelocity = |prevPos - prevPrevPos| = 4
  // currentVelocity = 1 (move 1 unit)
  // accel = |1 - 4| = 3 > maxAccel(2) → FLAGGED
  const pos: Position = { x: state.player.x + 1, y: state.player.y };
  return applyCheatMove(rampState, pos, 3);
}

// Cheat 3: Bot Loop — CHECK 8 (entropy)
export function simulateBotLoop(state: GameState): GameState {
  const newPos: Position = {
    x: Math.min(state.player.x + 1, 9),
    y: state.player.y,
  };
  return applyCheatMove(state, newPos, 3, {
    actionHistory: [3, 3, 3, 3, 3, 3, 3, 3], // All same action → diversity = 0
  });
}

// Cheat 4: Aimbot — CHECK 9 (aim precision)
export function simulateAimbot(state: GameState): GameState {
  const newPos: Position = {
    x: Math.min(state.player.x + 1, 9),
    y: state.player.y,
  };
  // Create aim history with sharp angular snaps (high cross products)
  const aimHistory: Position[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },   // moving right
    { x: 100, y: 100 }, // snap up
    { x: 0, y: 100 },   // snap left
    { x: 0, y: 0 },     // snap down
    { x: 100, y: 0 },   // snap right
    { x: 100, y: 100 }, // snap up
    { x: 0, y: 100 },   // snap left
  ];
  return applyCheatMove(state, newPos, 3, { aimHistory });
}

// Cheat 5: Wallhack — CHECK 10 (info leakage)
// Move consistently toward hidden enemies
export function simulateWallhack(state: GameState): GameState {
  // Place enemies all to the right and below, then move right/down
  const enemies: Position[] = Array.from({ length: 8 }, () => ({ x: 9, y: 9 }));
  const newPos: Position = {
    x: Math.min(state.player.x + 1, 9),
    y: Math.min(state.player.y + 1, 9),
  };
  return {
    ...applyCheatMove(state, newPos, 3),
    enemies,
  };
}
