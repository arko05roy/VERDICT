import { Verdict, type VerdictPrivateState } from '@midnight-ntwrk/verdict-contract';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ImpureCircuitId } from '@midnight-ntwrk/compact-js';

export type VerdictCircuits = ImpureCircuitId<Verdict.Contract<VerdictPrivateState>>;

export const VerdictPrivateStateId = 'verdictPrivateState';

export type VerdictProviders = MidnightProviders<VerdictCircuits, typeof VerdictPrivateStateId, VerdictPrivateState>;

export type VerdictContract = Verdict.Contract<VerdictPrivateState>;

export type DeployedVerdictContract = DeployedContract<VerdictContract> | FoundContract<VerdictContract>;
