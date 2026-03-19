/**
 * Server-side Midnight SDK integration (SDK 2.0.0 / Node 0.21.0)
 * Matches the official midnight-local-dev wallet pattern.
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
import { type DefaultConfiguration, WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import { HDWallet, Roles } from "@midnight-ntwrk/wallet-sdk-hd";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import * as ledger from "@midnight-ntwrk/ledger-v7";
import { WebSocket } from "ws";
import * as Rx from "rxjs";
import { Buffer } from "buffer";
import path from "node:path";

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
  networkId: string;
}

interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

// ─── Config ───

const zkConfigPath = path.resolve("/Users/arkoroy/Desktop/ratri/contract/src/managed/verdict");

const CONFIGS: Record<string, Config> = {
  standalone: {
    indexer: "http://127.0.0.1:8088/api/v3/graphql",
    indexerWS: "ws://127.0.0.1:8088/api/v3/graphql/ws",
    node: "http://127.0.0.1:9944",
    proofServer: "http://127.0.0.1:6300",
    networkId: "undeployed",
  },
};

// ─── Compiled contract ───

let compiledContract: any = null;

function getCompiledContract() {
  if (!compiledContract) {
    console.log("[midnight-server] Compiling contract from:", zkConfigPath);
    console.log("[midnight-server] Witnesses keys:", Object.keys(witnesses));

    // @ts-expect-error — Compact SDK generics
    const base = CompiledContract.make("verdict", Verdict.Contract);

    // Inject real witnesses (withVacantWitnesses sets witnesses:{} which Contract constructor rejects)
    const symbols = Object.getOwnPropertySymbols(base);
    const contextSymbol = symbols.find(s => s !== Symbol.for("compact-js/CompiledContract"));
    if (contextSymbol) {
      (base as any)[contextSymbol].witnesses = witnesses;
      console.log("[midnight-server] Injected real witnesses");
    }

    compiledContract = CompiledContract.withCompiledFileAssets(base as any, zkConfigPath);
    console.log("[midnight-server] Compiled contract created");
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

// ─── Singleton state ───

let walletCtx: WalletContext | null = null;
let providers: VerdictProviders | null = null;
let contract: DeployedVerdictContract | null = null;
let currentNetwork = "standalone";

// Genesis pre-funded wallet seed for standalone
const GENESIS_SEED = "0000000000000000000000000000000000000000000000000000000000000001";

// ─── Wallet (SDK 2.0.0 pattern from midnight-local-dev) ───

async function buildWallet(config: Config, hexSeed: string): Promise<WalletContext> {
  console.log("[midnight-server] Building wallet from seed...");

  const seed = Buffer.from(hexSeed, "hex");
  const hdWallet = HDWallet.fromSeed(seed);
  if (hdWallet.type !== "seedOk") throw new Error("Failed to initialize HDWallet");

  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);

  if (derivationResult.type !== "keysDerived") throw new Error("Failed to derive keys");
  hdWallet.hdWallet.clear();

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derivationResult.keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(derivationResult.keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(derivationResult.keys[Roles.NightExternal], config.networkId);

  // SDK 2.0.0 pattern: WalletFacade.init with factory functions
  const configuration: DefaultConfiguration = {
    networkId: config.networkId,
    indexerClientConnection: {
      indexerHttpUrl: config.indexer,
      indexerWsUrl: config.indexerWS,
    },
    provingServerUrl: new URL(config.proofServer),
    relayURL: new URL(config.node.replace(/^http/, "ws")),
    costParameters: {
      additionalFeeOverhead: BigInt("300000000000000"),
      feeBlocksMargin: 5,
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  };

  const wallet = await WalletFacade.init({
    configuration,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  console.log("[midnight-server] Wallet initialized");
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
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

// ─── Public API ───

export async function connect(network: string, seed?: string): Promise<{
  walletAddress: string;
  network: string;
  balance: string;
}> {
  console.log(`[midnight-server] connect(${network})`);

  const config = CONFIGS[network] || CONFIGS.standalone;
  setNetworkId(config.networkId);
  currentNetwork = network;

  const walletSeed = seed || GENESIS_SEED;
  walletCtx = await buildWallet(config, walletSeed);

  console.log("[midnight-server] Syncing wallet...");
  await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((state) => state.isSynced),
    ),
  );

  // Configure providers
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

  const syncedState = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const balance = syncedState.unshielded?.balances[ledger.nativeToken().raw] ?? BigInt(0);

  const address = String(walletCtx.unshieldedKeystore.getBech32Address());
  console.log("[midnight-server] Wallet connected:", address, "Balance:", balance.toString());

  // Register for dust generation if needed
  try {
    const dustBalance = syncedState.dust?.balance(new Date()) ?? BigInt(0);
    if (dustBalance === BigInt(0)) {
      console.log("[midnight-server] Registering Night UTXOs for dust generation...");
      const unregisteredNightUtxos = syncedState.unshielded?.availableCoins.filter(
        (coin: any) => coin.meta?.registeredForDustGeneration !== true
      ) ?? [];
      if (unregisteredNightUtxos.length > 0) {
        const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
          unregisteredNightUtxos,
          walletCtx.unshieldedKeystore.getPublicKey(),
          (payload) => walletCtx!.unshieldedKeystore.signData(payload),
        );
        const finalized = await walletCtx.wallet.finalizeRecipe(recipe);
        await walletCtx.wallet.submitTransaction(finalized);
        console.log("[midnight-server] Dust registration submitted, waiting for dust (30s timeout)...");
        await Rx.firstValueFrom(
          walletCtx.wallet.state().pipe(
            Rx.throttleTime(5_000),
            Rx.filter((s) => (s.dust?.balance(new Date()) ?? BigInt(0)) > BigInt(0)),
            Rx.timeout(30_000),
          ),
        ).catch(() => {
          console.warn("[midnight-server] Dust wait timed out — continuing without dust");
        });
        console.log("[midnight-server] Dust step complete");
      }
    } else {
      console.log("[midnight-server] Dust already available:", dustBalance.toString());
    }
  } catch (e) {
    console.error("[midnight-server] Dust registration failed:", e);
  }

  return { walletAddress: address, network, balance: balance.toString() };
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
  if (!providers) throw new Error("Not connected");

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
  if (!contract) throw new Error("No contract");

  const result = await contract.callTx.startSession(new Uint8Array(32));
  const txHash = toHex(Buffer.from((result as any).txHash ?? new Uint8Array(32)));
  console.log("[midnight-server] Session started, tx:", txHash);
  return { txHash };
}

export async function commitMove(commitment: Uint8Array): Promise<{ txHash: string }> {
  console.log("[midnight-server] commitMove()");
  if (!contract) throw new Error("No contract");

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
  if (!contract) throw new Error("No contract");

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
  console.log("[midnight-server] Verdict:", verdict, "tx:", txHash);
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
    .then((cs) => (cs != null ? Verdict.ledger(cs.data) : null));

  if (!state) return null;

  console.log("[midnight-server] Ledger:", {
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

export function getStatus() {
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
    try { await walletCtx.wallet.stop(); } catch (e) { console.error("[midnight-server] Stop error:", e); }
  }
  walletCtx = null;
  providers = null;
  contract = null;
}

export async function updatePrivateState(state: VerdictPrivateState): Promise<void> {
  if (!providers) throw new Error("Not connected");
  await providers.privateStateProvider.set(VerdictPrivateStateId, state);
  console.log("[midnight-server] Private state updated");
}
