import {
  type CircuitContext,
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger
} from "../managed/verdict/contract/index.js";
import { type VerdictPrivateState, witnesses } from "../witnesses.js";

export class VerdictSimulator {
  readonly contract: Contract<VerdictPrivateState>;
  circuitContext: CircuitContext<VerdictPrivateState>;

  constructor(initialState: VerdictPrivateState) {
    this.contract = new Contract<VerdictPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState
    } = this.contract.initialState(
      createConstructorContext(initialState, "0".repeat(64))
    );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState
    );
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): VerdictPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public startSession(genesisHash: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.startSession(
      this.circuitContext, genesisHash
    ).context;
    return this.getLedger();
  }

  public commitMove(commitment: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.commitMove(
      this.circuitContext, commitment
    ).context;
    return this.getLedger();
  }

  public verifyTransition(
    maxVelocity: bigint,
    maxAcceleration: bigint,
    boundX: bigint,
    boundY: bigint,
    validActionCount: bigint,
    maxActionsPerWindow: bigint,
    windowSize: bigint,
    minDiversity: bigint,
    snapThreshold: bigint,
    maxSnaps: bigint,
    maxCorrelation: bigint,
    enemyPosHashPublic: Uint8Array,
  ): { verdict: number; ledger: Ledger } {
    const result = this.contract.impureCircuits.verifyTransition(
      this.circuitContext,
      maxVelocity, maxAcceleration, boundX, boundY,
      validActionCount, maxActionsPerWindow, windowSize,
      minDiversity, snapThreshold, maxSnaps, maxCorrelation,
      enemyPosHashPublic,
    );
    this.circuitContext = result.context;
    return { verdict: result.result, ledger: this.getLedger() };
  }

  /** Helper: update the private state for the next circuit call */
  public setPrivateState(state: VerdictPrivateState): void {
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      this.circuitContext.currentZswapLocalState,
      this.circuitContext.currentQueryContext.state,
      state
    );
  }
}
