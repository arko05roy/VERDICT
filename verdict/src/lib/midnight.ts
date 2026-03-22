/**
 * Server-side Midnight provider — singleton that manages wallet, providers,
 * and contract deployment against the local dev environment.
 *
 * Only imported from API routes (server-side Node.js).
 */

import { type ContractAddress } from "@midnight-ntwrk/compact-runtime";
import {
  Verdict,
  type VerdictPrivateState,
  witnesses,
} from "@midnight-ntwrk/verdict-contract";
import * as ledger from "@midnight-ntwrk/ledger-v7";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v7";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import {
  type MidnightProvider,
  type WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
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
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import {
  assertIsContractAddress,
  toHex,
} from "@midnight-ntwrk/midnight-js-utils";
import {
  setNetworkId,
  getNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import type { ImpureCircuitId } from "@midnight-ntwrk/compact-js";
import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import type {
  DeployedContract,
  FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { WebSocket } from "ws";
import * as Rx from "rxjs";
import { Buffer } from "buffer";
import path from "node:path";

// Required for GraphQL subscriptions in Node.js
// @ts-expect-error: global WebSocket assignment for Node.js
globalThis.WebSocket = WebSocket;

// ─── Config ──────────────────────────────────────────────────────────────────

const NETWORK_ID = "undeployed";
const NODE_URL = "http://127.0.0.1:9944";
const INDEXER_URL = "http://127.0.0.1:8088/api/v3/graphql";
const INDEXER_WS_URL = "ws://127.0.0.1:8088/api/v3/graphql/ws";
const PROOF_SERVER_URL = "http://127.0.0.1:6300";

// Genesis dev wallet seed (local dev only — pre-funded by the dev node)
const GENESIS_SEED =
  "0000000000000000000000000000000000000000000000000000000000000001";

// Path to compiled contract assets
const ZK_CONFIG_PATH = path.resolve(
  process.cwd(),
  "..",
  "contract",
  "src",
  "managed",
  "verdict"
);
const PRIVATE_STATE_STORE = "verdict-private-state";

// ─── Types ───────────────────────────────────────────────────────────────────

type VerdictCircuits = ImpureCircuitId<Verdict.Contract<VerdictPrivateState>>;
const VerdictPrivateStateId = "verdictPrivateState";
type VerdictProviders = MidnightProviders<
  VerdictCircuits,
  typeof VerdictPrivateStateId,
  VerdictPrivateState
>;
type DeployedVerdictContract =
  | DeployedContract<Verdict.Contract<VerdictPrivateState>>
  | FoundContract<Verdict.Contract<VerdictPrivateState>>;

interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

// ─── Singleton state ─────────────────────────────────────────────────────────

let walletCtx: WalletContext | null = null;
let providers: VerdictProviders | null = null;
let initPromise: Promise<void> | null = null;

// Track deployed contracts: name → { address, deployedAt, ... }
export interface DeployedRuleset {
  address: string;
  name: string;
  category: string;
  description: string;
  deployedAt: string;
  txHash: string;
  compact: string;
}

const deployedRulesets: Map<string, DeployedRuleset> = new Map();

// ─── Compiled contract ───────────────────────────────────────────────────────

const verdictCompiledContract = CompiledContract.make(
  "verdict",
  Verdict.Contract
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(ZK_CONFIG_PATH)
);

const verdictContractInstance = new Verdict.Contract(witnesses);

const defaultPrivateState: VerdictPrivateState = {
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

// ─── Key derivation ──────────────────────────────────────────────────────────

function deriveKeysFromSeed(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, "hex"));
  if (hdWallet.type !== "seedOk")
    throw new Error("Failed to initialize HDWallet from seed");
  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derivationResult.type !== "keysDerived")
    throw new Error("Failed to derive keys");
  hdWallet.hdWallet.clear();
  return derivationResult.keys;
}

// ─── Transaction signing ─────────────────────────────────────────────────────

function signTransactionIntents(
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof"
): void {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize<
      ledger.SignatureEnabled,
      ledger.Proofish,
      ledger.PreBinding
    >("signature", proofMarker, "pre-binding", intent.serialize());
    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);
    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) =>
          cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature
      );
      cloned.fallibleUnshieldedOffer =
        cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }
    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) =>
          cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature
      );
      cloned.guaranteedUnshieldedOffer =
        cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }
    tx.intents.set(segment, cloned);
  }
}

// ─── Wallet + Provider construction ──────────────────────────────────────────

async function createWalletAndMidnightProvider(
  ctx: WalletContext
): Promise<WalletProvider & MidnightProvider> {
  const state = await Rx.firstValueFrom(
    ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced))
  );
  return {
    getCoinPublicKey() {
      return state.shielded.coinPublicKey.toHexString();
    },
    getEncryptionPublicKey() {
      return state.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx, ttl?) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        {
          shieldedSecretKeys: ctx.shieldedSecretKeys,
          dustSecretKey: ctx.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) }
      );
      const signFn = (payload: Uint8Array) =>
        ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, "proof");
      if (recipe.balancingTransaction) {
        signTransactionIntents(
          recipe.balancingTransaction,
          signFn,
          "pre-proof"
        );
      }
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) {
      return ctx.wallet.submitTransaction(tx) as any;
    },
  };
}

async function buildWallet(seed: string): Promise<WalletContext> {
  const keys = deriveKeysFromSeed(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(
    keys[Roles.NightExternal],
    getNetworkId()
  );

  const wallet = await WalletFacade.init({
    configuration: {
      networkId: getNetworkId(),
      indexerClientConnection: {
        indexerHttpUrl: INDEXER_URL,
        indexerWsUrl: INDEXER_WS_URL,
      },
      provingServerUrl: new URL(PROOF_SERVER_URL),
      relayURL: new URL(NODE_URL.replace(/^http/, "ws")),
      costParameters: {
        additionalFeeOverhead: 300_000_000_000_000n,
        feeBlocksMargin: 5,
      },
      txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    },
    shielded: (cfg) =>
      ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) =>
      UnshieldedWallet({
        networkId: cfg.networkId,
        indexerClientConnection: cfg.indexerClientConnection,
        txHistoryStorage: cfg.txHistoryStorage,
      }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) =>
      DustWallet({
        networkId: cfg.networkId,
        costParameters: cfg.costParameters,
        indexerClientConnection: cfg.indexerClientConnection,
        provingServerUrl: cfg.provingServerUrl,
        relayURL: cfg.relayURL,
      }).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust
      ),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

async function configureProviders(
  ctx: WalletContext
): Promise<VerdictProviders> {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider<VerdictCircuits>(
    ZK_CONFIG_PATH
  );
  return {
    privateStateProvider: levelPrivateStateProvider<
      typeof VerdictPrivateStateId
    >({
      privateStateStoreName: PRIVATE_STATE_STORE,
      walletProvider: walletAndMidnightProvider,
    }),
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, INDEXER_WS_URL),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
}

// ─── Initialization (lazy singleton) ─────────────────────────────────────────

async function doInit() {
  console.log("[midnight] Initializing — setting network ID...");
  setNetworkId(NETWORK_ID);

  console.log("[midnight] Building wallet from genesis seed...");
  walletCtx = await buildWallet(GENESIS_SEED);

  console.log("[midnight] Syncing wallet...");
  await Rx.firstValueFrom(
    walletCtx.wallet
      .state()
      .pipe(
        Rx.throttleTime(5_000),
        Rx.filter((s) => s.isSynced)
      )
  );

  const syncedState = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced))
  );
  const balance =
    syncedState.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(
    `[midnight] Wallet synced. Balance: ${balance.toLocaleString()} tNight`
  );
  console.log(
    `[midnight] Address: ${walletCtx.unshieldedKeystore.getBech32Address()}`
  );

  console.log("[midnight] Configuring providers...");
  providers = await configureProviders(walletCtx);
  console.log("[midnight] Ready.");
}

export async function ensureInitialized(): Promise<{
  providers: VerdictProviders;
  walletCtx: WalletContext;
}> {
  if (!initPromise) {
    initPromise = doInit().catch((err) => {
      initPromise = null; // allow retry on failure
      throw err;
    });
  }
  await initPromise;
  return { providers: providers!, walletCtx: walletCtx! };
}

// ─── Contract deployment ─────────────────────────────────────────────────────

export async function deployVerdictContract(meta: {
  name: string;
  category: string;
  description: string;
  compact: string;
}): Promise<DeployedRuleset> {
  const { providers } = await ensureInitialized();

  console.log(`[midnight] Deploying contract "${meta.name}"...`);
  const contract = await deployContract(providers, {
    compiledContract: verdictCompiledContract,
    privateStateId: VerdictPrivateStateId,
    initialPrivateState: defaultPrivateState,
  });

  const address = contract.deployTxData.public.contractAddress;
  const txHash = toHex(contract.deployTxData.public.txHash ?? new Uint8Array(32));

  const ruleset: DeployedRuleset = {
    address,
    name: meta.name,
    category: meta.category,
    description: meta.description,
    deployedAt: new Date().toISOString(),
    txHash,
    compact: meta.compact,
  };

  deployedRulesets.set(address, ruleset);
  console.log(`[midnight] Contract deployed at: ${address}`);
  return ruleset;
}

// ─── Ledger queries ──────────────────────────────────────────────────────────

export async function getContractState(contractAddress: string) {
  const { providers } = await ensureInitialized();
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(
    contractAddress as ContractAddress
  );
  if (!contractState) return null;
  return Verdict.ledger(contractState.data);
}

export function getDeployedRulesets(): DeployedRuleset[] {
  return Array.from(deployedRulesets.values());
}

export function getRuleset(address: string): DeployedRuleset | undefined {
  return deployedRulesets.get(address);
}

// ─── Network status ──────────────────────────────────────────────────────────

export async function getNetworkStatus(): Promise<{
  nodeHealthy: boolean;
  indexerHealthy: boolean;
  proofServerHealthy: boolean;
  blockHeight: number | null;
}> {
  const results = await Promise.allSettled([
    fetch(`${NODE_URL}/health`).then((r) => r.ok),
    fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "{ block { height } }",
      }),
    }).then(async (r) => {
      if (!r.ok) return { healthy: true, blockHeight: null };
      const data = await r.json();
      return {
        healthy: true,
        blockHeight: data?.data?.block?.height ?? null,
      };
    }),
    fetch(`${PROOF_SERVER_URL}/version`).then((r) => r.ok),
  ]);

  const nodeHealthy =
    results[0].status === "fulfilled" && results[0].value === true;
  const indexerResult =
    results[1].status === "fulfilled" ? results[1].value : null;
  const indexerHealthy =
    typeof indexerResult === "object" && indexerResult !== null
      ? (indexerResult as any).healthy === true
      : false;
  const blockHeight =
    typeof indexerResult === "object" && indexerResult !== null
      ? (indexerResult as any).blockHeight
      : null;
  const proofServerHealthy =
    results[2].status === "fulfilled" && results[2].value === true;

  return { nodeHealthy, indexerHealthy, proofServerHealthy, blockHeight };
}

// ─── Wallet info ─────────────────────────────────────────────────────────────

export async function getWalletInfo() {
  const { walletCtx } = await ensureInitialized();
  const state = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced))
  );
  const balance =
    state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  return {
    address: walletCtx.unshieldedKeystore.getBech32Address(),
    balance: balance.toString(),
    isSynced: true,
  };
}
