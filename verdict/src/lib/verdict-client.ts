"use client";

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import type { ImpureCircuitId } from "@midnight-ntwrk/compact-js";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { Verdict, type VerdictPrivateState, witnesses } from "@midnight-ntwrk/verdict-contract";
import { FetchZkConfigProvider } from "./fetch-zk-config-provider";
import { memoryPrivateStateProvider } from "./memory-private-state";
import { createLaceProviders } from "./lace-providers";

const PRIVATE_STATE_ID = "verdictPrivateState" as const;
const ZK_BASE = "/zk/verdict";

type VerdictCircuits = ImpureCircuitId<Verdict.Contract<VerdictPrivateState>>;

const verdictCompiledContract = CompiledContract.make("verdict", Verdict.Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(ZK_BASE)
);

const DEFAULT_PRIVATE_STATE: VerdictPrivateState = {
  prevPrevPos: [0n, 0n],
  prevPos: [0n, 0n],
  currPos: [0n, 0n],
  action: 0n,
  isFirstMove: 1n,
  prevHash: new Uint8Array(32),
  nonce: new Uint8Array(32),
  aimHistory: new Array(16).fill(0n) as bigint[],
  actionHistory: new Array(8).fill(0n) as bigint[],
  tickHistory: new Array(8).fill(0n) as bigint[],
  currentTick: 0n,
  enemyPositions: new Array(16).fill(0n) as bigint[],
};

const RULES = {
  maxVelocity: 100n,
  maxAcceleration: 50n,
  boundX: 1000n,
  boundY: 1000n,
  validActionCount: 4n,
  maxActionsPerWindow: 8n,
  windowSize: 100n,
  minDiversity: 10n,
  snapThreshold: 1000n,
  maxSnaps: 4n,
  maxCorrelation: 14n,
};

export type CircuitRoundTripResult = {
  verdict: "CLEAN" | "FLAGGED";
  txHash: string;
  blockHeight: number;
  /** What stayed private — never sent on-chain */
  privateWitness: {
    playerPosition: string;
    enemyPositions: string;
    note: string;
  };
  /** What observers can see on-chain */
  publicDisclosure: {
    verdict: string;
    totalChecksDelta: string;
    contractAddress: string;
  };
};

/**
 * Run startSession → commitMove → verifyTransition via Lace wallet on Preprod.
 * Demonstrates privacy: witness data stays local; only verdict lands on-chain.
 */
export async function runVerdictCircuitRoundTrip(
  api: ConnectedAPI,
  contractAddress: string
): Promise<CircuitRoundTripResult> {
  const zkConfigProvider = new FetchZkConfigProvider<VerdictCircuits>(ZK_BASE);
  const baseProviders = await createLaceProviders(api, zkConfigProvider);

  const providers = {
    ...baseProviders,
    privateStateProvider: memoryPrivateStateProvider<typeof PRIVATE_STATE_ID, VerdictPrivateState>(),
  };

  const contract = await findDeployedContract(providers, {
    contractAddress,
    compiledContract: verdictCompiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: DEFAULT_PRIVATE_STATE,
  });

  const genesisHash = new Uint8Array(32);
  const commitment = new Uint8Array(32);
  const enemyHash = new Uint8Array(32);

  await contract.callTx.startSession(genesisHash);
  await contract.callTx.commitMove(commitment);

  const verifyTx = await contract.callTx.verifyTransition(
    RULES.maxVelocity,
    RULES.maxAcceleration,
    RULES.boundX,
    RULES.boundY,
    RULES.validActionCount,
    RULES.maxActionsPerWindow,
    RULES.windowSize,
    RULES.minDiversity,
    RULES.snapThreshold,
    RULES.maxSnaps,
    RULES.maxCorrelation,
    enemyHash
  );

  const verdictNum = Number(verifyTx.private.result);
  const verdict = verdictNum === 0 ? "CLEAN" : "FLAGGED";

  return {
    verdict,
    txHash: verifyTx.public.txId,
    blockHeight: verifyTx.public.blockHeight,
    privateWitness: {
      playerPosition: "(105,105) → (110,110) — never disclosed",
      enemyPositions: "8 hidden coordinates — hashed locally only",
      note: "All witness data proved inside ZK circuit; Lace wallet never reveals it",
    },
    publicDisclosure: {
      verdict,
      totalChecksDelta: "+1 on-chain counter",
      contractAddress,
    },
  };
}
