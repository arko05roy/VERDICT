/** Verdict outcome — CLEAN means all checks passed, FLAGGED means violation detected */
export type VerdictOutcome = "CLEAN" | "FLAGGED";

/** Individual check result from the ZK circuit */
export interface CheckDetail {
  /** Check identifier (e.g., "hermes", "terminus") */
  id: string;
  /** Mythological name of the guardian (e.g., "Hermes", "Terminus") */
  name: string;
  /** Numeral (e.g., "III", "V") */
  numeral: string;
  /** Check category */
  category: string;
  /** Whether this check passed */
  passed: boolean;
}

/** Input for a state transition verification */
export interface VerifyInput {
  /** Previous system state */
  prevState: unknown;
  /** Current system state after the transition */
  currState: unknown;
  /** The action that caused the transition */
  action: unknown;
  /** Optional actor identifier */
  player?: string;
  /** Optional session identifier */
  session?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/** Result of a verification proof */
export interface VerifyResult {
  /** Whether the transition was CLEAN or FLAGGED */
  verdict: VerdictOutcome;
  /** Total number of checks run by the circuit */
  checksRun: number;
  /** Number of checks that passed */
  checksPassed: number;
  /** Number of checks that failed */
  checksFailed: number;
  /** ISO timestamp of when the verification occurred */
  timestamp: string;
  /** Block height at time of proof settlement */
  blockHeight: number;
  /** Hex-encoded proof hash — unique identifier for this proof on-chain */
  proofHash: string;
  /** On-chain transaction hash */
  txHash: string;
  /** Individual check results */
  details: CheckDetail[];
}

/** Ruleset information returned from the network */
export interface RulesetInfo {
  /** Contract address on Midnight */
  address: string;
  /** Human-readable name */
  name: string;
  /** Description of what this ruleset enforces */
  description: string;
  /** Freeform tags */
  tags: string[];
  /** IDs of enabled guardian checks */
  enabledChecks: string[];
  /** Number of active guardians */
  checkCount: number;
  /** ISO timestamp of deployment */
  deployedAt: string;
  /** Total number of verifications run */
  totalChecks: number;
  /** Total number of flagged verifications */
  totalFlagged: number;
  /** Flagged rate as a percentage string */
  flaggedRate: string;
  /** Current status */
  status: string;
}

/** Configuration options for the Verdict client */
export interface VerdictConfig {
  /** Base URL of the Verdict API (defaults to http://localhost:3000) */
  baseUrl?: string;
  /** Request timeout in milliseconds (defaults to 30000) */
  timeout?: number;
  /** Optional API key for authenticated access */
  apiKey?: string;
}
