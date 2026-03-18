/**
 * Server-side Midnight SDK integration.
 * Runs in Next.js API routes (Node.js), not in the browser.
 *
 * This module wraps the real Midnight SDK calls from counter-cli/src/api.ts
 * for use in the verdict-demo frontend via API routes.
 */

import { Verdict, type VerdictPrivateState, witnesses } from "@midnight-ntwrk/verdict-contract";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import type { DeployedContract, FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import type { ImpureCircuitId } from "@midnight-ntwrk/compact-js";
import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import { setNetworkId, getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { assertIsContractAddress, toHex } from "@midnight-ntwrk/midnight-js-utils";
import { WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import { HDWallet, Roles, generateRandomSeed } from "@midnight-ntwrk/wallet-sdk-hd";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import * as ledger from "@midnight-ntwrk/ledger-v7";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v7";
import { WebSocket } from "ws";
import * as Rx from "rxjs";
import { Buffer } from "buffer";
import path from "node:path";

// ─── Polyfill WebSocket for Node ───
// @ts-expect-error: Needed for GraphQL subscriptions in Node.js
globalThis.WebSocket = WebSocket;

// ─── Types ───

type VerdictCircuits = ImpureCircuitId<Verdict.Contract<VerdictPrivateState>>;
const VerdictPrivateStateId = "verdictPrivateState";
type VerdictProviders = MidnightProviders<VerdictCircuits, typeof VerdictPrivateStateId, VerdictPrivateState>;
type DeployedVerdictContract = DeployedContract<Verdict.Contract<VerdictPrivateState>> | FoundContract<Verdict.Contract<VerdictPrivateState>>;

interface Config {
  indexer: string;
  indexerWS: string;
  node: string;
  proofServer: string;
}

interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

// ─── Config ───

const zkConfigPath = path.resolve(process.cwd(), "..", "contract", "src", "managed", "verdict");

const CONFIGS: Record<string, Config> = {
  standalone: {
    indexer: "http://127.0.0.1:8088/api/v3/graphql",
    indexerWS: "ws://127.0.0.1:8088/api/v3/graphql/ws",
    node: "http://127.0.0.1:9944",
    proofServer: "http://127.0.0.1:6300",
  },
  preprod: {
    indexer: "https://indexer.preprod.midnight.network/api/v3/graphql",
    indexerWS: "wss://indexer.preprod.midnight.network/api/v3/graphql/ws",
    node: "https://rpc.preprod.midnight.network",
    proofServer: "http://127.0.0.1:6300",
  },
  preview: {
    indexer: "https://indexer.preview.midnight.network/api/v3/graphql",
    indexerWS: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
    node: "https://rpc.preview.midnight.network",
    proofServer: "http://127.0.0.1:6300",
  },
};

// ─── Compiled contract ───

let compiledContract: any = null;

function getCompiledContract() {
  if (!compiledContract) {
    console.log("[midnight-server] Compiling contract from:", zkConfigPath);
    compiledContract = (CompiledContract as any).make("verdict", Verdict.Contract).pipe(
      (CompiledContract as any).withVacantWitnesses,
      (CompiledContract as any).withCompiledFileAssets(zkConfigPath),
    );
  }
  return compiledContract;
}

// ─── Default private state ───

const defaultPrivateState: VerdictPrivateState = {
  prevPrevPos: [BigInt(0), BigInt(0)],
  prevPos: [BigInt(0), BigInt(0)],
  currPos: [BigInt(0), BigInt(0)],
  action: BigInt(0),
  isFirstMove: BigInt(1),
  prevHash: new Uint8Array(32),
  nonce: new Uint8Array(32),
  aimHistory: new Array(16).fill(BigInt(0)),
  actionHistory: new Array(8).fill(BigInt(0)),
  tickHistory: new Array(8).fill(BigInt(0)),
  currentTick: BigInt(0),
  enemyPositions: new Array(16).fill(BigInt(0)),
};

// ─── Singleton state (persists across API calls within same server process) ───

let walletCtx: WalletContext | null = null;
let providers: VerdictProviders | null = null;
let contract: DeployedVerdictContract | null = null;
let currentNetwork: string = "preprod";
let currentSeed: string | null = null;

// ─── Wallet ───

function deriveKeysFromSeed(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, "hex"));
  if (hdWallet.type !== "seedOk") throw new Error("Failed to initialize HDWallet from seed");
  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derivationResult.type !== "keysDerived") throw new Error("Failed to derive keys");
  hdWallet.hdWallet.clear();
  return derivationResult.keys;
}

async function createWalletAndMidnightProvider(ctx: WalletContext): Promise<WalletProvider & MidnightProvider> {
  const state = await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return {
    getCoinPublicKey() { return state.shielded.coinPublicKey.toHexString(); },
    getEncryptionPublicKey() { return state.shielded.encryptionPublicKey.toHexString(); },
    async balanceTx(tx: any, ttl?: any) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, "proof");
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, "pre-proof");
      }
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx: any) { return ctx.wallet.submitTransaction(tx) as any; },
  };
}

function signTransactionIntents(
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof",
): void {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>(
      "signature", proofMarker, "pre-binding", intent.serialize(),
    );
    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);
    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: any, i: number) => cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }
    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: any, i: number) => cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }
    tx.intents.set(segment, cloned);
  }
}

// ─── Public API functions (called from API routes) ───

export async function connect(network: string, seed?: string): Promise<{
  walletAddress: string;
  network: string;
  balance: string;
}> {
  console.log(`[midnight-server] connect(${network})`);

  const config = CONFIGS[network];
  if (!config) throw new Error(`Unknown network: ${network}`);

  const networkIdMap: Record<string, string> = { standalone: "undeployed", preprod: "preprod", preview: "preview" };
  setNetworkId(networkIdMap[network] || "preprod");
  currentNetwork = network;

  // Standalone uses the pre-funded genesis mint wallet — no faucet needed
  const GENESIS_SEED = "0000000000000000000000000000000000000000000000000000000000000001";
  const walletSeed = seed || (network === "standalone" ? GENESIS_SEED : toHex(Buffer.from(generateRandomSeed())));
  currentSeed = walletSeed;

  console.log("[midnight-server] Deriving keys from seed...");
  const keys = deriveKeysFromSeed(walletSeed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

  const buildShieldedConfig = () => ({
    networkId: getNetworkId(),
    indexerClientConnection: { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS },
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.node.replace(/^http/, "ws")),
  });

  const buildUnshieldedConfig = () => ({
    networkId: getNetworkId(),
    indexerClientConnection: { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  });

  const buildDustConfig = () => ({
    networkId: getNetworkId(),
    costParameters: { additionalFeeOverhead: BigInt("300000000000000"), feeBlocksMargin: 5 },
    indexerClientConnection: { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS },
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.node.replace(/^http/, "ws")),
  });

  console.log("[midnight-server] Building wallet...");
  const shieldedWallet = ShieldedWallet(buildShieldedConfig()).startWithSecretKeys(shieldedSecretKeys);
  const unshieldedWallet = UnshieldedWallet(buildUnshieldedConfig()).startWithPublicKey(
    PublicKey.fromKeyStore(unshieldedKeystore),
  );
  const dustWallet = DustWallet(buildDustConfig()).startWithSecretKey(
    dustSecretKey,
    ledger.LedgerParameters.initialParameters().dust,
  );
  const wallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  walletCtx = { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };

  console.log("[midnight-server] Syncing wallet...");
  await Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(5_000), Rx.filter((state) => state.isSynced)));

  const walletAndMidnightProvider = await createWalletAndMidnightProvider(walletCtx);
  const zkConfigProvider = new NodeZkConfigProvider<VerdictCircuits>(zkConfigPath);

  providers = {
    privateStateProvider: levelPrivateStateProvider<typeof VerdictPrivateStateId>({
      privateStateStoreName: "verdict-private-state-web",
      walletProvider: walletAndMidnightProvider,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };

  const syncedState = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const balance = syncedState.unshielded.balances[unshieldedToken().raw] ?? BigInt(0);

  const address = String(unshieldedKeystore.getBech32Address());
  console.log("[midnight-server] Wallet connected:", address, "Balance:", balance.toString());

  return {
    walletAddress: address,
    network,
    balance: balance.toString(),
  };
}

export async function deploy(): Promise<{ contractAddress: string }> {
  console.log("[midnight-server] deploy()");

  if (!providers) throw new Error("Not connected — call connect first");

  const compiled = getCompiledContract();
  console.log("[midnight-server] Deploying contract...");

  contract = await deployContract(providers, {
    compiledContract: compiled,
    privateStateId: VerdictPrivateStateId,
    initialPrivateState: defaultPrivateState,
  });

  const addr = contract.deployTxData.public.contractAddress;
  console.log("[midnight-server] Contract deployed at:", addr);
  return { contractAddress: addr };
}

export async function join(contractAddress: string): Promise<{ contractAddress: string }> {
  console.log(`[midnight-server] join(${contractAddress})`);

  if (!providers) throw new Error("Not connected — call connect first");

  const compiled = getCompiledContract();
  contract = await findDeployedContract(providers, {
    contractAddress,
    compiledContract: compiled,
    privateStateId: VerdictPrivateStateId,
    initialPrivateState: defaultPrivateState,
  });

  console.log("[midnight-server] Joined contract at:", contractAddress);
  return { contractAddress };
}

export async function startSession(): Promise<{ txHash: string }> {
  console.log("[midnight-server] startSession()");

  if (!contract) throw new Error("No contract — deploy or join first");

  const genesisHash = new Uint8Array(32);
  const result = await contract.callTx.startSession(genesisHash);
  const txHash = toHex(Buffer.from((result as any).txHash ?? new Uint8Array(32)));

  console.log("[midnight-server] Session started, tx:", txHash);
  return { txHash };
}

export async function commitMove(commitment: Uint8Array): Promise<{ txHash: string }> {
  console.log("[midnight-server] commitMove()");

  if (!contract) throw new Error("No contract — deploy or join first");

  const result = await contract.callTx.commitMove(commitment);
  const txHash = toHex(Buffer.from((result as any).txHash ?? new Uint8Array(32)));

  console.log("[midnight-server] Move committed, tx:", txHash);
  return { txHash };
}

export async function verifyTransition(params: {
  maxVelocity: string;
  maxAcceleration: string;
  boundX: string;
  boundY: string;
  validActionCount: string;
  maxActionsPerWindow: string;
  windowSize: string;
  minDiversity: string;
  snapThreshold: string;
  maxSnaps: string;
  maxCorrelation: string;
  enemyPosHash: number[];
}): Promise<{ verdict: number; txHash: string }> {
  console.log("[midnight-server] verifyTransition()");

  if (!contract) throw new Error("No contract — deploy or join first");

  const result = await contract.callTx.verifyTransition(
    BigInt(params.maxVelocity),
    BigInt(params.maxAcceleration),
    BigInt(params.boundX),
    BigInt(params.boundY),
    BigInt(params.validActionCount),
    BigInt(params.maxActionsPerWindow),
    BigInt(params.windowSize),
    BigInt(params.minDiversity),
    BigInt(params.snapThreshold),
    BigInt(params.maxSnaps),
    BigInt(params.maxCorrelation),
    new Uint8Array(params.enemyPosHash),
  );

  const verdict = (result as any).data ?? 0;
  const txHash = toHex(Buffer.from((result as any).txHash ?? new Uint8Array(32)));

  console.log("[midnight-server] Verification complete, verdict:", verdict, "tx:", txHash);
  return { verdict, txHash };
}

export async function readLedgerState(contractAddress: string): Promise<{
  totalChecks: string;
  totalFlagged: string;
  lastVerdict: number;
  sessionActive: boolean;
} | null> {
  console.log(`[midnight-server] readLedgerState(${contractAddress})`);

  if (!providers) throw new Error("Not connected");

  assertIsContractAddress(contractAddress as ContractAddress);
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress as ContractAddress)
    .then((contractState) => (contractState != null ? Verdict.ledger(contractState.data) : null));

  if (!state) {
    console.log("[midnight-server] No ledger state found");
    return null;
  }

  console.log("[midnight-server] Ledger state:", {
    totalChecks: state.totalChecks.toString(),
    totalFlagged: state.totalFlagged.toString(),
    lastVerdict: state.lastVerdict,
    sessionActive: state.sessionActive,
  });

  return {
    totalChecks: state.totalChecks.toString(),
    totalFlagged: state.totalFlagged.toString(),
    lastVerdict: state.lastVerdict,
    sessionActive: state.sessionActive,
  };
}

export function getStatus(): {
  connected: boolean;
  network: string;
  hasContract: boolean;
  contractAddress: string | null;
  walletAddress: string | null;
} {
  return {
    connected: walletCtx !== null && providers !== null,
    network: currentNetwork,
    hasContract: contract !== null,
    contractAddress: contract?.deployTxData.public.contractAddress ?? null,
    walletAddress: walletCtx ? String(walletCtx.unshieldedKeystore.getBech32Address()) : null,
  };
}

export async function disconnect(): Promise<void> {
  console.log("[midnight-server] disconnect()");
  if (walletCtx) {
    try { await walletCtx.wallet.stop(); } catch (e) { console.error("[midnight-server] Error stopping wallet:", e); }
  }
  walletCtx = null;
  providers = null;
  contract = null;
  currentSeed = null;
}

export async function updatePrivateState(state: VerdictPrivateState): Promise<void> {
  console.log("[midnight-server] updatePrivateState()");
  // The private state is managed by the leveldb provider.
  // When we call contract.callTx.verifyTransition(), the witnesses read from this state.
  // We need to update it before each verification.
  if (!providers) throw new Error("Not connected");

  // Write to the private state store
  await providers.privateStateProvider.set(VerdictPrivateStateId, state);
  console.log("[midnight-server] Private state updated");
}
