import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  getCallerHash(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getCurrentTick(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  registerCouncilMember(context: __compactRuntime.CircuitContext<PS>,
                        memberHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerGenesisCheck(context: __compactRuntime.CircuitContext<PS>,
                       id_0: bigint,
                       nameHash_0: Uint8Array,
                       categoryHash_0: Uint8Array,
                       templateHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proposeCheck(context: __compactRuntime.CircuitContext<PS>,
               checkId_0: bigint,
               templateHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>,
       proposalId_0: bigint,
       voteFor_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  finalizeProposal(context: __compactRuntime.CircuitContext<PS>,
                   proposalId_0: bigint,
                   nameHash_0: Uint8Array,
                   categoryHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerGenesisVerifier(context: __compactRuntime.CircuitContext<PS>,
                          versionId_0: bigint,
                          guardianMask_0: bigint,
                          guardianCount_0: bigint,
                          codeHash_0: Uint8Array,
                          contractAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerVerifierVersion(context: __compactRuntime.CircuitContext<PS>,
                          versionId_0: bigint,
                          guardianMask_0: bigint,
                          guardianCount_0: bigint,
                          codeHash_0: Uint8Array,
                          contractAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerRuleset(context: __compactRuntime.CircuitContext<PS>,
                  rulesetId_0: bigint,
                  verifierVersion_0: bigint,
                  enableMask_0: bigint,
                  paramsHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  migrateRuleset(context: __compactRuntime.CircuitContext<PS>,
                 rulesetId_0: bigint,
                 newVerifierVersion_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deactivateRuleset(context: __compactRuntime.CircuitContext<PS>,
                    rulesetId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerCouncilMember(context: __compactRuntime.CircuitContext<PS>,
                        memberHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerGenesisCheck(context: __compactRuntime.CircuitContext<PS>,
                       id_0: bigint,
                       nameHash_0: Uint8Array,
                       categoryHash_0: Uint8Array,
                       templateHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proposeCheck(context: __compactRuntime.CircuitContext<PS>,
               checkId_0: bigint,
               templateHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>,
       proposalId_0: bigint,
       voteFor_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  finalizeProposal(context: __compactRuntime.CircuitContext<PS>,
                   proposalId_0: bigint,
                   nameHash_0: Uint8Array,
                   categoryHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerGenesisVerifier(context: __compactRuntime.CircuitContext<PS>,
                          versionId_0: bigint,
                          guardianMask_0: bigint,
                          guardianCount_0: bigint,
                          codeHash_0: Uint8Array,
                          contractAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerVerifierVersion(context: __compactRuntime.CircuitContext<PS>,
                          versionId_0: bigint,
                          guardianMask_0: bigint,
                          guardianCount_0: bigint,
                          codeHash_0: Uint8Array,
                          contractAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerRuleset(context: __compactRuntime.CircuitContext<PS>,
                  rulesetId_0: bigint,
                  verifierVersion_0: bigint,
                  enableMask_0: bigint,
                  paramsHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  migrateRuleset(context: __compactRuntime.CircuitContext<PS>,
                 rulesetId_0: bigint,
                 newVerifierVersion_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deactivateRuleset(context: __compactRuntime.CircuitContext<PS>,
                    rulesetId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerCouncilMember(context: __compactRuntime.CircuitContext<PS>,
                        memberHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerGenesisCheck(context: __compactRuntime.CircuitContext<PS>,
                       id_0: bigint,
                       nameHash_0: Uint8Array,
                       categoryHash_0: Uint8Array,
                       templateHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  proposeCheck(context: __compactRuntime.CircuitContext<PS>,
               checkId_0: bigint,
               templateHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  vote(context: __compactRuntime.CircuitContext<PS>,
       proposalId_0: bigint,
       voteFor_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  finalizeProposal(context: __compactRuntime.CircuitContext<PS>,
                   proposalId_0: bigint,
                   nameHash_0: Uint8Array,
                   categoryHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerGenesisVerifier(context: __compactRuntime.CircuitContext<PS>,
                          versionId_0: bigint,
                          guardianMask_0: bigint,
                          guardianCount_0: bigint,
                          codeHash_0: Uint8Array,
                          contractAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerVerifierVersion(context: __compactRuntime.CircuitContext<PS>,
                          versionId_0: bigint,
                          guardianMask_0: bigint,
                          guardianCount_0: bigint,
                          codeHash_0: Uint8Array,
                          contractAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerRuleset(context: __compactRuntime.CircuitContext<PS>,
                  rulesetId_0: bigint,
                  verifierVersion_0: bigint,
                  enableMask_0: bigint,
                  paramsHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  migrateRuleset(context: __compactRuntime.CircuitContext<PS>,
                 rulesetId_0: bigint,
                 newVerifierVersion_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  deactivateRuleset(context: __compactRuntime.CircuitContext<PS>,
                    rulesetId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly totalChecks: bigint;
  checkRegistry: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { nameHash: Uint8Array,
                             categoryHash: Uint8Array,
                             templateHash: Uint8Array,
                             active: boolean,
                             addedAt: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { nameHash: Uint8Array,
  categoryHash: Uint8Array,
  templateHash: Uint8Array,
  active: boolean,
  addedAt: bigint
}]>
  };
  proposals: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { checkId: bigint,
                             templateHash: Uint8Array,
                             proposerHash: Uint8Array,
                             votesFor: bigint,
                             votesAgainst: bigint,
                             status: number,
                             createdAt: bigint
                           };
    [Symbol.iterator](): Iterator<[bigint, { checkId: bigint,
  templateHash: Uint8Array,
  proposerHash: Uint8Array,
  votesFor: bigint,
  votesAgainst: bigint,
  status: number,
  createdAt: bigint
}]>
  };
  readonly totalProposals: bigint;
  council: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly councilSize: bigint;
  readonly voteThreshold: bigint;
  votes: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  verifierVersions: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { versionId: bigint,
                             guardianMask: bigint,
                             guardianCount: bigint,
                             codeHash: Uint8Array,
                             contractAddress: Uint8Array,
                             createdAt: bigint,
                             active: boolean
                           };
    [Symbol.iterator](): Iterator<[bigint, { versionId: bigint,
  guardianMask: bigint,
  guardianCount: bigint,
  codeHash: Uint8Array,
  contractAddress: Uint8Array,
  createdAt: bigint,
  active: boolean
}]>
  };
  readonly totalVerifierVersions: bigint;
  readonly latestVerifierVersion: bigint;
  rulesets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { rulesetId: bigint,
                             verifierVersion: bigint,
                             enableMask: bigint,
                             paramsHash: Uint8Array,
                             ownerHash: Uint8Array,
                             createdAt: bigint,
                             active: boolean
                           };
    [Symbol.iterator](): Iterator<[bigint, { rulesetId: bigint,
  verifierVersion: bigint,
  enableMask: bigint,
  paramsHash: Uint8Array,
  ownerHash: Uint8Array,
  createdAt: bigint,
  active: boolean
}]>
  };
  readonly totalRulesets: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               threshold_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
