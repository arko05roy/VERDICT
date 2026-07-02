import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  getPrevPrevPos(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  getPrevPos(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  getCurrPos(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  getAction(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  getIsFirstMove(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  getPrevHash(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getAimHistory(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  getActionHistory(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  getTickHistory(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
  getCurrentTick(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  getEnemyPositions(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
}

export type ImpureCircuits<PS> = {
  startSession(context: __compactRuntime.CircuitContext<PS>,
               genesisHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  commitMove(context: __compactRuntime.CircuitContext<PS>, c_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyTransition(context: __compactRuntime.CircuitContext<PS>,
                   maxVelocity_0: bigint,
                   maxAcceleration_0: bigint,
                   boundX_0: bigint,
                   boundY_0: bigint,
                   validActionCount_0: bigint,
                   maxActionsPerWindow_0: bigint,
                   windowSize_0: bigint,
                   minDiversity_0: bigint,
                   snapThreshold_0: bigint,
                   maxSnaps_0: bigint,
                   maxCorrelation_0: bigint,
                   enemyPosHashPublic_0: Uint8Array): __compactRuntime.CircuitResults<PS, number>;
}

export type ProvableCircuits<PS> = {
  startSession(context: __compactRuntime.CircuitContext<PS>,
               genesisHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  commitMove(context: __compactRuntime.CircuitContext<PS>, c_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyTransition(context: __compactRuntime.CircuitContext<PS>,
                   maxVelocity_0: bigint,
                   maxAcceleration_0: bigint,
                   boundX_0: bigint,
                   boundY_0: bigint,
                   validActionCount_0: bigint,
                   maxActionsPerWindow_0: bigint,
                   windowSize_0: bigint,
                   minDiversity_0: bigint,
                   snapThreshold_0: bigint,
                   maxSnaps_0: bigint,
                   maxCorrelation_0: bigint,
                   enemyPosHashPublic_0: Uint8Array): __compactRuntime.CircuitResults<PS, number>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  startSession(context: __compactRuntime.CircuitContext<PS>,
               genesisHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  commitMove(context: __compactRuntime.CircuitContext<PS>, c_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyTransition(context: __compactRuntime.CircuitContext<PS>,
                   maxVelocity_0: bigint,
                   maxAcceleration_0: bigint,
                   boundX_0: bigint,
                   boundY_0: bigint,
                   validActionCount_0: bigint,
                   maxActionsPerWindow_0: bigint,
                   windowSize_0: bigint,
                   minDiversity_0: bigint,
                   snapThreshold_0: bigint,
                   maxSnaps_0: bigint,
                   maxCorrelation_0: bigint,
                   enemyPosHashPublic_0: Uint8Array): __compactRuntime.CircuitResults<PS, number>;
}

export type Ledger = {
  readonly totalChecks: bigint;
  readonly totalFlagged: bigint;
  readonly lastVerdict: number;
  readonly commitment: Uint8Array;
  readonly lastChainHash: Uint8Array;
  readonly sessionActive: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
