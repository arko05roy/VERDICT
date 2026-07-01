import type {
  VerdictConfig,
  VerifyInput,
  VerifyResult,
  RulesetInfo,
} from "./types";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_TIMEOUT = 30_000;

/**
 * Verdict SDK client — connect any game or application to a deployed
 * ZK rule enforcement circuit on Midnight.
 *
 * @example
 * ```ts
 * import { Verdict } from "@verdict/sdk";
 *
 * const verdict = new Verdict("<RULESET_ADDRESS>");
 * const proof = await verdict.verify({
 *   prevState: gameState.previous,
 *   currState: gameState.current,
 *   action: playerAction,
 * });
 *
 * console.log(proof.verdict, proof.txHash);
 * ```
 */
export class Verdict {
  private readonly address: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(address: string, config?: VerdictConfig) {
    if (!address || typeof address !== "string") {
      throw new Error("Verdict: contract address is required");
    }

    this.address = address;
    this.baseUrl = (config?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
    this.headers = {
      "Content-Type": "application/json",
    };

    if (config?.apiKey) {
      this.headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
  }

  /**
   * Submit a state transition for ZK verification against this ruleset.
   *
   * The circuit runs 10 integrity checks (velocity, acceleration, bounds,
   * action validity, rate limiting, move diversity, snap detection,
   * aim correlation, chain continuity, commitment verification).
   *
   * @returns Proof result with verdict (CLEAN/FLAGGED), check details, and on-chain tx hash
   */
  async verify(input: VerifyInput): Promise<VerifyResult> {
    const body = {
      address: this.address,
      prevState: input.prevState,
      currState: input.currState,
      action: input.action,
      player: input.player,
      session: input.session,
      metadata: input.metadata,
    };

    const res = await this.fetch("/api/verify", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new VerdictError(
        data.error || `Verification failed (${res.status})`,
        res.status
      );
    }

    const data = await res.json();

    return {
      verdict: data.verdict,
      checksRun: data.checksRun,
      checksPassed: data.checksPassed,
      checksFailed: data.checksFailed,
      timestamp: data.timestamp,
      blockHeight: data.blockHeight,
      proofHash: data.proofHash,
      txHash: data.proofHash, // proof hash serves as tx reference in simulator
      details: data.details ?? [],
    };
  }

  /**
   * Fetch information about this ruleset from the network.
   */
  async info(): Promise<RulesetInfo> {
    const res = await this.fetch("/api/rulesets");

    if (!res.ok) {
      throw new VerdictError(
        `Failed to fetch rulesets (${res.status})`,
        res.status
      );
    }

    const data = await res.json();
    const rulesets: RulesetInfo[] = data.rulesets ?? [];
    const found = rulesets.find((r) => r.address === this.address);

    if (!found) {
      throw new VerdictError(
        `Ruleset not found: ${this.address.slice(0, 16)}...`,
        404
      );
    }

    return found;
  }

  /**
   * Check if this ruleset exists and is active on the network.
   */
  async isActive(): Promise<boolean> {
    try {
      const info = await this.info();
      return info.status === "active";
    } catch {
      return false;
    }
  }

  /**
   * Get the contract address this client is bound to.
   */
  getAddress(): string {
    return this.address;
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...this.headers, ...init?.headers },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Error thrown by the Verdict SDK.
 */
export class VerdictError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "VerdictError";
    this.statusCode = statusCode;
  }
}
