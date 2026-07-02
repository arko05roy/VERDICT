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
} from "../managed/verdict-dao/contract/index.js";
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";

// DAO witnesses need: getCallerHash() and getCurrentTick()
export type VerdictDaoPrivateState = {
  callerHash: Uint8Array;
  currentTick: bigint;
};

export type DaoWitnesses = {
  getCallerHash(context: WitnessContext<Ledger, VerdictDaoPrivateState>): [VerdictDaoPrivateState, Uint8Array];
  getCurrentTick(context: WitnessContext<Ledger, VerdictDaoPrivateState>): [VerdictDaoPrivateState, bigint];
};

export const daoWitnesses: DaoWitnesses = {
  getCallerHash(ctx: WitnessContext<Ledger, VerdictDaoPrivateState>): [VerdictDaoPrivateState, Uint8Array] {
    return [ctx.privateState, ctx.privateState.callerHash];
  },
  getCurrentTick(ctx: WitnessContext<Ledger, VerdictDaoPrivateState>): [VerdictDaoPrivateState, bigint] {
    return [ctx.privateState, ctx.privateState.currentTick];
  },
};

export class VerdictDaoSimulator {
  readonly contract: Contract<VerdictDaoPrivateState>;
  circuitContext: CircuitContext<VerdictDaoPrivateState>;

  constructor(initialState: VerdictDaoPrivateState, threshold: bigint) {
    this.contract = new Contract<VerdictDaoPrivateState>(daoWitnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState
    } = this.contract.initialState(
      createConstructorContext(initialState, "0".repeat(64)),
      threshold
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

  public getPrivateState(): VerdictDaoPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public setPrivateState(state: VerdictDaoPrivateState): void {
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      this.circuitContext.currentZswapLocalState,
      this.circuitContext.currentQueryContext.state,
      state
    );
  }

  // ── Council ──

  public registerCouncilMember(memberHash: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerCouncilMember(
      this.circuitContext,
      memberHash
    ).context;
    return this.getLedger();
  }

  // ── Guardian Registry ──

  public registerGenesisCheck(
    id: bigint,
    nameHash: Uint8Array,
    categoryHash: Uint8Array,
    templateHash: Uint8Array
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerGenesisCheck(
      this.circuitContext,
      id,
      nameHash,
      categoryHash,
      templateHash
    ).context;
    return this.getLedger();
  }

  public proposeCheck(checkId: bigint, templateHash: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.proposeCheck(
      this.circuitContext,
      checkId,
      templateHash
    ).context;
    return this.getLedger();
  }

  public vote(proposalId: bigint, voteFor: boolean): Ledger {
    this.circuitContext = this.contract.impureCircuits.vote(
      this.circuitContext,
      proposalId,
      voteFor
    ).context;
    return this.getLedger();
  }

  public finalizeProposal(
    proposalId: bigint,
    nameHash: Uint8Array,
    categoryHash: Uint8Array
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.finalizeProposal(
      this.circuitContext,
      proposalId,
      nameHash,
      categoryHash
    ).context;
    return this.getLedger();
  }

  // ── Verifier Versions ──

  public registerGenesisVerifier(
    versionId: bigint,
    guardianMask: bigint,
    guardianCount: bigint,
    codeHash: Uint8Array,
    contractAddress: Uint8Array
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerGenesisVerifier(
      this.circuitContext,
      versionId,
      guardianMask,
      guardianCount,
      codeHash,
      contractAddress
    ).context;
    return this.getLedger();
  }

  public registerVerifierVersion(
    versionId: bigint,
    guardianMask: bigint,
    guardianCount: bigint,
    codeHash: Uint8Array,
    contractAddress: Uint8Array
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerVerifierVersion(
      this.circuitContext,
      versionId,
      guardianMask,
      guardianCount,
      codeHash,
      contractAddress
    ).context;
    return this.getLedger();
  }

  // ── Rulesets ──

  public registerRuleset(
    rulesetId: bigint,
    verifierVersion: bigint,
    enableMask: bigint,
    paramsHash: Uint8Array
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerRuleset(
      this.circuitContext,
      rulesetId,
      verifierVersion,
      enableMask,
      paramsHash
    ).context;
    return this.getLedger();
  }

  public migrateRuleset(
    rulesetId: bigint,
    newVerifierVersion: bigint
  ): Ledger {
    this.circuitContext = this.contract.impureCircuits.migrateRuleset(
      this.circuitContext,
      rulesetId,
      newVerifierVersion
    ).context;
    return this.getLedger();
  }

  public deactivateRuleset(rulesetId: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.deactivateRuleset(
      this.circuitContext,
      rulesetId
    ).context;
    return this.getLedger();
  }
}
