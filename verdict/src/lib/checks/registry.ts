export type ParamType = "Uint64" | "Bytes32";

export interface CheckParam {
  name: string;
  type: ParamType;
  description: string;
  default?: string;
  required: boolean;
}

export interface WitnessRequirement {
  name: string;
  returnType: string;
  description: string;
}

export interface LedgerRequirement {
  name: string;
  type: string;
  description: string;
}

export type CheckCategory =
  | "integrity"
  | "rate-limit"
  | "boundary"
  | "validity"
  | "behavioral"
  | "information";

export interface CheckDefinition {
  id: string;
  mythName: string;
  numeral: string;
  category: CheckCategory;
  symbol: string;
  description: string;
  longDescription: string;
  isHardFail: boolean;
  publicParams: CheckParam[];
  witnessRequirements: WitnessRequirement[];
  ledgerRequirements: LedgerRequirement[];
  helperFunctions: string[];
  dependencies: string[];
  needsStartSession: boolean;
  needsCommitMove: boolean;
}

export const CHECK_REGISTRY: CheckDefinition[] = [
  // ─── I. MNEMOSYNE ─── Hash-Chain Integrity
  {
    id: "mnemosyne",
    mythName: "Mnemosyne",
    numeral: "I",
    category: "integrity",
    symbol: "\u2693", // anchor
    description: "History chain — no state can be fabricated or replayed",
    longDescription:
      "Every state transition is chained to the previous one via cryptographic hash. The circuit recomputes the hash and verifies it matches the on-chain record. You cannot inject a fake state because it breaks the hash. You cannot replay an old state because the tick advances.",
    isHardFail: true,
    publicParams: [],
    witnessRequirements: [
      { name: "getPrevPos", returnType: "Vector<2, Uint<64>>", description: "Previous state position" },
      { name: "getCurrPos", returnType: "Vector<2, Uint<64>>", description: "Current state position" },
      { name: "getAction", returnType: "Uint<64>", description: "Action performed" },
      { name: "getCurrentTick", returnType: "Uint<64>", description: "Current tick/timestamp" },
      { name: "getPrevHash", returnType: "Bytes<32>", description: "Previous hash chain value" },
    ],
    ledgerRequirements: [
      { name: "lastChainHash", type: "Bytes<32>", description: "Current head of the hash chain" },
    ],
    helperFunctions: [],
    dependencies: [],
    needsStartSession: true,
    needsCommitMove: false,
  },

  // ─── II. STYX ─── Commit-Reveal Integrity
  {
    id: "styx",
    mythName: "Styx",
    numeral: "II",
    category: "integrity",
    symbol: "\u2694", // crossed swords
    description: "Oath binding — actions committed before outcomes revealed",
    longDescription:
      "Before a transition is verified, the actor must have already committed to it. The circuit checks that the revealed data matches the commitment. This prevents retroactive editing, front-running, and after-the-fact manipulation.",
    isHardFail: true,
    publicParams: [],
    witnessRequirements: [
      { name: "getPrevPos", returnType: "Vector<2, Uint<64>>", description: "Previous state position" },
      { name: "getCurrPos", returnType: "Vector<2, Uint<64>>", description: "Current state position" },
      { name: "getAction", returnType: "Uint<64>", description: "Action performed" },
      { name: "getNonce", returnType: "Bytes<32>", description: "Commitment randomness" },
    ],
    ledgerRequirements: [
      { name: "commitment", type: "Bytes<32>", description: "Stored commitment hash" },
    ],
    helperFunctions: [],
    dependencies: [],
    needsStartSession: false,
    needsCommitMove: true,
  },

  // ─── III. HERMES ─── Velocity / First-Order Rate
  {
    id: "hermes",
    mythName: "Hermes",
    numeral: "III",
    category: "rate-limit",
    symbol: "\u26A1", // lightning
    description: "First-order rate — state cannot change faster than allowed",
    longDescription:
      "Computes the distance between consecutive states. If the state changed more than the allowed maximum in a single tick, the transition is flagged. Catches teleportation, impossibly fast state changes, and rate-limit violations.",
    isHardFail: false,
    publicParams: [
      { name: "maxVelocity", type: "Uint64", description: "Maximum state change per tick (Manhattan distance)", required: true },
    ],
    witnessRequirements: [
      { name: "getPrevPos", returnType: "Vector<2, Uint<64>>", description: "Previous state position" },
      { name: "getCurrPos", returnType: "Vector<2, Uint<64>>", description: "Current state position" },
    ],
    ledgerRequirements: [],
    helperFunctions: ["absDiff"],
    dependencies: [],
    needsStartSession: false,
    needsCommitMove: false,
  },

  // ─── IV. PHAETHON ─── Acceleration / Second-Order Rate
  {
    id: "phaethon",
    mythName: "Phaethon",
    numeral: "IV",
    category: "rate-limit",
    symbol: "\u2604", // comet
    description: "Second-order rate — acceleration cannot exceed limits",
    longDescription:
      "Computes the change in velocity between two consecutive transitions. Catches actors who stay just under the rate limit per tick but accelerate impossibly fast. Requires three consecutive state frames.",
    isHardFail: false,
    publicParams: [
      { name: "maxAcceleration", type: "Uint64", description: "Maximum velocity change per tick", required: true },
    ],
    witnessRequirements: [
      { name: "getPrevPrevPos", returnType: "Vector<2, Uint<64>>", description: "State position two frames ago" },
      { name: "getPrevPos", returnType: "Vector<2, Uint<64>>", description: "Previous state position" },
      { name: "getCurrPos", returnType: "Vector<2, Uint<64>>", description: "Current state position" },
      { name: "getIsFirstMove", returnType: "Uint<64>", description: "1 on first move (skip check), 0 otherwise" },
    ],
    ledgerRequirements: [],
    helperFunctions: ["absDiff"],
    dependencies: ["hermes"],
    needsStartSession: false,
    needsCommitMove: false,
  },

  // ─── V. TERMINUS ─── Boundary Enforcement
  {
    id: "terminus",
    mythName: "Terminus",
    numeral: "V",
    category: "boundary",
    symbol: "\u25A3", // square with inner square
    description: "Boundary enforcement — state must stay within valid ranges",
    longDescription:
      "Verifies that the current state is within defined boundaries. If the state exceeds the valid range in any dimension, the transition is flagged. Applies to any system with valid state ranges.",
    isHardFail: false,
    publicParams: [
      { name: "boundX", type: "Uint64", description: "Maximum value for first dimension", required: true },
      { name: "boundY", type: "Uint64", description: "Maximum value for second dimension", required: true },
    ],
    witnessRequirements: [
      { name: "getCurrPos", returnType: "Vector<2, Uint<64>>", description: "Current state position" },
    ],
    ledgerRequirements: [],
    helperFunctions: [],
    dependencies: [],
    needsStartSession: false,
    needsCommitMove: false,
  },

  // ─── VI. THEMIS ─── Action Validity
  {
    id: "themis",
    mythName: "Themis",
    numeral: "VI",
    category: "validity",
    symbol: "\u2696", // scales
    description: "Action legitimacy — only defined operations are permitted",
    longDescription:
      "Actions are numeric IDs (0 to N-1). Anything outside that range does not exist in the system's rule set. Prevents fabricated operations, invalid commands, or actions the actor should not have access to.",
    isHardFail: false,
    publicParams: [
      { name: "validActionCount", type: "Uint64", description: "Number of valid action IDs (0 to N-1)", required: true },
    ],
    witnessRequirements: [
      { name: "getAction", returnType: "Uint<64>", description: "Action performed" },
    ],
    ledgerRequirements: [],
    helperFunctions: [],
    dependencies: [],
    needsStartSession: false,
    needsCommitMove: false,
  },

  // ─── VII. CHRONOS ─── Action Frequency
  {
    id: "chronos",
    mythName: "Chronos",
    numeral: "VII",
    category: "validity",
    symbol: "\u231B", // hourglass
    description: "Time-window frequency — actions cannot exceed rate per window",
    longDescription:
      "Counts actions within a sliding time window. First asserts tick history is monotonically increasing (timestamps cannot go backwards), then counts actions within the window. Catches superhuman speed, automated spam, and macro execution.",
    isHardFail: false,
    publicParams: [
      { name: "maxActionsPerWindow", type: "Uint64", description: "Maximum actions allowed in the time window", required: true },
      { name: "windowSize", type: "Uint64", description: "Sliding window size in ticks", required: true },
    ],
    witnessRequirements: [
      { name: "getTickHistory", returnType: "Vector<8, Uint<64>>", description: "Last 8 tick timestamps" },
      { name: "getCurrentTick", returnType: "Uint<64>", description: "Current tick/timestamp" },
    ],
    ledgerRequirements: [],
    helperFunctions: [],
    dependencies: [],
    needsStartSession: false,
    needsCommitMove: false,
  },

  // ─── VIII. MOIRAI ─── Behavioral Entropy
  {
    id: "moirai",
    mythName: "Moirai",
    numeral: "VIII",
    category: "behavioral",
    symbol: "\u2698", // flower
    description: "Pattern entropy — behavior must show natural diversity",
    longDescription:
      "Measures action diversity using the Gini-Simpson index. Low diversity indicates scripted, automated, or bot-like behavior. A legitimate actor produces varied actions; a scripted loop does not.",
    isHardFail: false,
    publicParams: [
      { name: "minDiversity", type: "Uint64", description: "Minimum behavioral entropy threshold (Gini-Simpson)", required: true },
    ],
    witnessRequirements: [
      { name: "getActionHistory", returnType: "Vector<8, Uint<64>>", description: "Last 8 actions performed" },
    ],
    ledgerRequirements: [],
    helperFunctions: [],
    dependencies: [],
    needsStartSession: false,
    needsCommitMove: false,
  },

  // ─── IX. DAEDALUS ─── Precision Anomaly
  {
    id: "daedalus",
    mythName: "Daedalus",
    numeral: "IX",
    category: "behavioral",
    symbol: "\u2318", // command/clover
    description: "Precision anomaly — detects inhuman accuracy patterns",
    longDescription:
      "Analyzes trajectory data for superhuman smoothness. For each triplet of consecutive data points, computes cross-product curvature. Too many perfectly straight segments (snaps) indicates algorithmic precision rather than human input.",
    isHardFail: false,
    publicParams: [
      { name: "snapThreshold", type: "Uint64", description: "Curvature threshold for precision detection", required: true },
      { name: "maxSnaps", type: "Uint64", description: "Maximum straight-line segments allowed", required: true },
    ],
    witnessRequirements: [
      { name: "getAimHistory", returnType: "Vector<16, Uint<64>>", description: "8 data points, [x,y] flattened to 16 values" },
    ],
    ledgerRequirements: [],
    helperFunctions: ["absDiff"],
    dependencies: [],
    needsStartSession: false,
    needsCommitMove: false,
  },

  // ─── X. PROMETHEUS ─── Information Leakage
  {
    id: "prometheus",
    mythName: "Prometheus",
    numeral: "X",
    category: "information",
    symbol: "\u2602", // umbrella (hidden knowledge)
    description: "Knowledge leakage — detects correlation with hidden data",
    longDescription:
      "Detects whether an actor's behavior correlates with information they should not have access to. Verifies the hidden data integrity via hash, then computes directional correlation. Information leakage has a behavioral signature: the actor moves toward things they should not know about more often than chance allows.",
    isHardFail: false,
    publicParams: [
      { name: "maxCorrelation", type: "Uint64", description: "Maximum allowed directional correlation with hidden entities", required: true },
      { name: "enemyPosHashPublic", type: "Bytes32", description: "Hash of hidden entity positions (integrity check)", required: true },
    ],
    witnessRequirements: [
      { name: "getPrevPos", returnType: "Vector<2, Uint<64>>", description: "Previous state position" },
      { name: "getCurrPos", returnType: "Vector<2, Uint<64>>", description: "Current state position" },
      { name: "getEnemyPositions", returnType: "Vector<16, Uint<64>>", description: "8 hidden entities, [x,y] flattened to 16 values" },
    ],
    ledgerRequirements: [],
    helperFunctions: ["absDiff"],
    dependencies: [],
    needsStartSession: false,
    needsCommitMove: false,
  },
];

export function getCheckById(id: string): CheckDefinition | undefined {
  return CHECK_REGISTRY.find((c) => c.id === id);
}

export function getChecksByCategory(category: CheckCategory): CheckDefinition[] {
  return CHECK_REGISTRY.filter((c) => c.category === category);
}

export function getCheckMetadata(ids?: string[]) {
  const checks = ids
    ? CHECK_REGISTRY.filter((c) => ids.includes(c.id))
    : CHECK_REGISTRY;
  return checks.map(({ id, mythName, numeral, category, symbol, description, longDescription, isHardFail, publicParams, dependencies }) => ({
    id,
    mythName,
    numeral,
    category,
    symbol,
    description,
    longDescription,
    isHardFail,
    publicParams,
    dependencies,
  }));
}
