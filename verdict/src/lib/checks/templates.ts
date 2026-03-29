// Pre-audited Compact code templates for each guardian check.
// These are extracted directly from the proven verdict.compact contract.
// Each template uses the witness variable names established by the compiler's
// witness loading block — they are NOT parameterized with mustache syntax.
// The compiler inserts these verbatim after loading the relevant witnesses.

export const HELPER_ABSDIFF = `circuit absDiff(a: Uint<64>, b: Uint<64>): Uint<64> {
  return a >= b ? a - b : b - a;
}`;

// ─── CHECK TEMPLATES ───
// Each key matches the check ID from the registry.
// Templates assume specific local variable names that the compiler provides
// via its witness loading block (p, c, pp, action, etc.).
// Public params are referenced by their registry param names directly
// (they become circuit parameters).

export const CHECK_TEMPLATES: Record<string, string> = {
  // ═══ I. MNEMOSYNE — Hash-Chain Integrity ═══
  mnemosyne: `  // CHECK: MNEMOSYNE — Hash-Chain Integrity
  const recomputedHash = persistentHash<Vector<6, Uint<64>>>(
    [p[0], p[1], c[0], c[1], action, now]
  );
  assert(prevHash == lastChainHash, "Mnemosyne: hash chain broken");
  lastChainHash = disclose(recomputedHash);`,

  // ═══ II. STYX — Commit-Reveal Integrity ═══
  styx: `  // CHECK: STYX — Commit-Reveal Integrity
  const recomputedCommit = persistentCommit<Vector<5, Uint<64>>>(
    [p[0], p[1], c[0], c[1], action], nonce
  );
  assert(recomputedCommit == commitment, "Styx: commitment mismatch");`,

  // ═══ III. HERMES — Velocity ═══
  hermes: `  // CHECK: HERMES — First-Order Rate
  const dx = absDiff(c[0], p[0]);
  const dy = absDiff(c[1], p[1]);
  const velocity = dx + dy;
  const hermesFail = velocity > maxVelocity ? 1 : 0;`,

  // ═══ IV. PHAETHON — Acceleration ═══
  phaethon: `  // CHECK: PHAETHON — Second-Order Rate
  const pdx = absDiff(p[0], pp[0]);
  const pdy = absDiff(p[1], pp[1]);
  const prevVelocity = pdx + pdy;
  const accel = absDiff(velocity as Uint<64>, prevVelocity as Uint<64>);
  const phaethonFail = isFirst == 0 ? (accel > maxAcceleration ? 1 : 0) : 0;`,

  // ═══ V. TERMINUS — Bounds ═══
  terminus: `  // CHECK: TERMINUS — Boundary Enforcement
  const terminusFail = (c[0] > boundX ? 1 : 0) + (c[1] > boundY ? 1 : 0);`,

  // ═══ VI. THEMIS — Action Validity ═══
  themis: `  // CHECK: THEMIS — Action Legitimacy
  const themisFail = action >= validActionCount ? 1 : 0;`,

  // ═══ VII. CHRONOS — Action Frequency ═══
  chronos: `  // CHECK: CHRONOS — Time-Window Frequency
  assert(tickHist[0] <= tickHist[1], "Chronos: tick history not monotonic");
  assert(tickHist[1] <= tickHist[2], "Chronos: tick history not monotonic");
  assert(tickHist[2] <= tickHist[3], "Chronos: tick history not monotonic");
  assert(tickHist[3] <= tickHist[4], "Chronos: tick history not monotonic");
  assert(tickHist[4] <= tickHist[5], "Chronos: tick history not monotonic");
  assert(tickHist[5] <= tickHist[6], "Chronos: tick history not monotonic");
  assert(tickHist[6] <= tickHist[7], "Chronos: tick history not monotonic");

  const windowStart = now - windowSize;
  const actionsInWindow: Uint<64> =
    (tickHist[0] >= windowStart ? 1 : 0) +
    (tickHist[1] >= windowStart ? 1 : 0) +
    (tickHist[2] >= windowStart ? 1 : 0) +
    (tickHist[3] >= windowStart ? 1 : 0) +
    (tickHist[4] >= windowStart ? 1 : 0) +
    (tickHist[5] >= windowStart ? 1 : 0) +
    (tickHist[6] >= windowStart ? 1 : 0) +
    (tickHist[7] >= windowStart ? 1 : 0);

  const chronosFail = actionsInWindow > maxActionsPerWindow ? 1 : 0;`,

  // ═══ VIII. MOIRAI — Behavioral Entropy ═══
  moirai: `  // CHECK: MOIRAI — Pattern Entropy (Gini-Simpson)
  const freq0: Uint<64> = fold(
    (acc: Uint<64>, a) => (acc + (a == 0 ? 1 : 0)) as Uint<64>,
    0 as Uint<64>,
    actHist
  );
  const freq1: Uint<64> = fold(
    (acc: Uint<64>, a) => (acc + (a == 1 ? 1 : 0)) as Uint<64>,
    0 as Uint<64>,
    actHist
  );
  const freq2: Uint<64> = fold(
    (acc: Uint<64>, a) => (acc + (a == 2 ? 1 : 0)) as Uint<64>,
    0 as Uint<64>,
    actHist
  );
  const freq3: Uint<64> = fold(
    (acc: Uint<64>, a) => (acc + (a == 3 ? 1 : 0)) as Uint<64>,
    0 as Uint<64>,
    actHist
  );

  const sumSq = freq0 * freq0 + freq1 * freq1 + freq2 * freq2 + freq3 * freq3;
  const diversity = 64 - sumSq;
  const moiraiFail = diversity < minDiversity ? 1 : 0;`,

  // ═══ IX. DAEDALUS — Precision Anomaly ═══
  daedalus: `  // CHECK: DAEDALUS — Precision Anomaly (Cross-Product Curvature)
  const threshSq = snapThreshold * snapThreshold;

  const d0x_0 = absDiff(aimFlat[2], aimFlat[0]);
  const d0y_0 = absDiff(aimFlat[3], aimFlat[1]);
  const d1x_0 = absDiff(aimFlat[4], aimFlat[2]);
  const d1y_0 = absDiff(aimFlat[5], aimFlat[3]);
  const cross0 = absDiff((d0x_0 * d1y_0) as Uint<64>, (d0y_0 * d1x_0) as Uint<64>);
  const snap0 = cross0 * cross0 > threshSq ? 1 : 0;

  const d0x_1 = absDiff(aimFlat[4], aimFlat[2]);
  const d0y_1 = absDiff(aimFlat[5], aimFlat[3]);
  const d1x_1 = absDiff(aimFlat[6], aimFlat[4]);
  const d1y_1 = absDiff(aimFlat[7], aimFlat[5]);
  const cross1 = absDiff((d0x_1 * d1y_1) as Uint<64>, (d0y_1 * d1x_1) as Uint<64>);
  const snap1 = cross1 * cross1 > threshSq ? 1 : 0;

  const d0x_2 = absDiff(aimFlat[6], aimFlat[4]);
  const d0y_2 = absDiff(aimFlat[7], aimFlat[5]);
  const d1x_2 = absDiff(aimFlat[8], aimFlat[6]);
  const d1y_2 = absDiff(aimFlat[9], aimFlat[7]);
  const cross2 = absDiff((d0x_2 * d1y_2) as Uint<64>, (d0y_2 * d1x_2) as Uint<64>);
  const snap2 = cross2 * cross2 > threshSq ? 1 : 0;

  const d0x_3 = absDiff(aimFlat[8], aimFlat[6]);
  const d0y_3 = absDiff(aimFlat[9], aimFlat[7]);
  const d1x_3 = absDiff(aimFlat[10], aimFlat[8]);
  const d1y_3 = absDiff(aimFlat[11], aimFlat[9]);
  const cross3 = absDiff((d0x_3 * d1y_3) as Uint<64>, (d0y_3 * d1x_3) as Uint<64>);
  const snap3 = cross3 * cross3 > threshSq ? 1 : 0;

  const d0x_4 = absDiff(aimFlat[10], aimFlat[8]);
  const d0y_4 = absDiff(aimFlat[11], aimFlat[9]);
  const d1x_4 = absDiff(aimFlat[12], aimFlat[10]);
  const d1y_4 = absDiff(aimFlat[13], aimFlat[11]);
  const cross4 = absDiff((d0x_4 * d1y_4) as Uint<64>, (d0y_4 * d1x_4) as Uint<64>);
  const snap4 = cross4 * cross4 > threshSq ? 1 : 0;

  const d0x_5 = absDiff(aimFlat[12], aimFlat[10]);
  const d0y_5 = absDiff(aimFlat[13], aimFlat[11]);
  const d1x_5 = absDiff(aimFlat[14], aimFlat[12]);
  const d1y_5 = absDiff(aimFlat[15], aimFlat[13]);
  const cross5 = absDiff((d0x_5 * d1y_5) as Uint<64>, (d0y_5 * d1x_5) as Uint<64>);
  const snap5 = cross5 * cross5 > threshSq ? 1 : 0;

  const totalSnaps = snap0 + snap1 + snap2 + snap3 + snap4 + snap5;
  const daedalusFail = totalSnaps > maxSnaps ? 1 : 0;`,

  // ═══ X. PROMETHEUS — Information Leakage ═══
  prometheus: `  // CHECK: PROMETHEUS — Knowledge Leakage
  const recomputedEnemyHash = persistentHash<Vector<16, Uint<64>>>(enemyFlat);
  assert(recomputedEnemyHash == enemyPosHashPublic, "Prometheus: hidden data hash mismatch");

  const movingRight = c[0] > p[0] ? 1 : 0;
  const movingUp    = c[1] > p[1] ? 1 : 0;

  const towardX0 = movingRight == (enemyFlat[0] > c[0] ? 1 : 0) ? 1 : 0;
  const towardY0 = movingUp    == (enemyFlat[1] > c[1] ? 1 : 0) ? 1 : 0;
  const towardX1 = movingRight == (enemyFlat[2] > c[0] ? 1 : 0) ? 1 : 0;
  const towardY1 = movingUp    == (enemyFlat[3] > c[1] ? 1 : 0) ? 1 : 0;
  const towardX2 = movingRight == (enemyFlat[4] > c[0] ? 1 : 0) ? 1 : 0;
  const towardY2 = movingUp    == (enemyFlat[5] > c[1] ? 1 : 0) ? 1 : 0;
  const towardX3 = movingRight == (enemyFlat[6] > c[0] ? 1 : 0) ? 1 : 0;
  const towardY3 = movingUp    == (enemyFlat[7] > c[1] ? 1 : 0) ? 1 : 0;
  const towardX4 = movingRight == (enemyFlat[8] > c[0] ? 1 : 0) ? 1 : 0;
  const towardY4 = movingUp    == (enemyFlat[9] > c[1] ? 1 : 0) ? 1 : 0;
  const towardX5 = movingRight == (enemyFlat[10] > c[0] ? 1 : 0) ? 1 : 0;
  const towardY5 = movingUp    == (enemyFlat[11] > c[1] ? 1 : 0) ? 1 : 0;
  const towardX6 = movingRight == (enemyFlat[12] > c[0] ? 1 : 0) ? 1 : 0;
  const towardY6 = movingUp    == (enemyFlat[13] > c[1] ? 1 : 0) ? 1 : 0;
  const towardX7 = movingRight == (enemyFlat[14] > c[0] ? 1 : 0) ? 1 : 0;
  const towardY7 = movingUp    == (enemyFlat[15] > c[1] ? 1 : 0) ? 1 : 0;

  const totalCorrelation =
    towardX0 + towardY0 + towardX1 + towardY1 +
    towardX2 + towardY2 + towardX3 + towardY3 +
    towardX4 + towardY4 + towardX5 + towardY5 +
    towardX6 + towardY6 + towardX7 + towardY7;

  const prometheusFail = totalCorrelation > maxCorrelation ? 1 : 0;`,
};

// Mapping from check IDs to their soft-fail variable names
// (used by the compiler for aggregation)
export const SOFT_FAIL_VARS: Record<string, string> = {
  hermes: "hermesFail",
  phaethon: "phaethonFail",
  terminus: "terminusFail",
  themis: "themisFail",
  chronos: "chronosFail",
  moirai: "moiraiFail",
  daedalus: "daedalusFail",
  prometheus: "prometheusFail",
};

// Witness variable name mapping — the compiler uses these to load witnesses
// and assign them to the local variable names the templates expect
export const WITNESS_VAR_MAP: Record<string, string> = {
  getPrevPrevPos: "pp",
  getPrevPos: "p",
  getCurrPos: "c",
  getAction: "action",
  getIsFirstMove: "isFirst",
  getPrevHash: "prevHash",
  getNonce: "nonce",
  getAimHistory: "aimFlat",
  getActionHistory: "actHist",
  getTickHistory: "tickHist",
  getCurrentTick: "now",
  getEnemyPositions: "enemyFlat",
};
