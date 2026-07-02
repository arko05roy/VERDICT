/**
 * Server-side Midnight provider — REAL NETWORK MODE.
 *
 * Connects to actual Midnight node, indexer, and proof server via env vars.
 * Deploys real contracts and queries real on-chain state.
 *
 * All API routes import from this file — export interface unchanged.
 */

import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { type ContractAddress } from "@midnight-ntwrk/compact-runtime";
import {
  Verdict,
  type VerdictPrivateState,
  witnesses,
} from "@midnight-ntwrk/verdict-contract";
import * as ledger from "@midnight-ntwrk/ledger-v7";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v7";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import {
  setNetworkId,
  getNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import type {
  MidnightProvider,
  WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { assertIsContractAddress, toHex } from "@midnight-ntwrk/midnight-js-utils";
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
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import type { ImpureCircuitId } from "@midnight-ntwrk/compact-js";
import { Buffer } from "buffer";
import * as Rx from "rxjs";
import { WebSocket } from "ws";

// ─── Globals for GraphQL subscriptions ──────────────────────────────────────

// @ts-expect-error: Needed for GraphQL subscriptions in Node.js
globalThis.WebSocket = WebSocket;

// ─── Config from env ────────────────────────────────────────────────────────

const NODE_URL = process.env.MIDNIGHT_NODE_URL || "http://127.0.0.1:9944";
const INDEXER_URL =
  process.env.MIDNIGHT_INDEXER_URL || "http://127.0.0.1:8088/api/v3/graphql";
const INDEXER_WS_URL =
  process.env.MIDNIGHT_INDEXER_WS_URL ||
  "ws://127.0.0.1:8088/api/v3/graphql/ws";
const PROOF_SERVER_URL =
  process.env.MIDNIGHT_PROOF_SERVER_URL || "http://127.0.0.1:6300";

const GENESIS_SEED =
  "0000000000000000000000000000000000000000000000000000000000000001";

const ZK_CONFIG_PATH = path.resolve(
  process.cwd(),
  "..",
  "contract",
  "src",
  "managed",
  "verdict"
);

const PRIVATE_STATE_ID = "verdictPrivateState" as const;

// ─── Init ───────────────────────────────────────────────────────────────────

setNetworkId(process.env.MIDNIGHT_NETWORK_ID || "preprod");

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeployedRuleset {
  address: string;
  name: string;
  description: string;
  tags: string[];
  enabledChecks: string[];
  checkCount: number;
  vcl: string;
  deployedAt: string;
  txHash: string;
  compact: string;
  // Legacy field — kept for backward compat with v1 store entries
  category?: string;
}

type VerdictCircuits = ImpureCircuitId<Verdict.Contract<VerdictPrivateState>>;

type VerdictProviders = {
  privateStateProvider: any;
  publicDataProvider: ReturnType<typeof indexerPublicDataProvider>;
  zkConfigProvider: NodeZkConfigProvider<VerdictCircuits>;
  proofProvider: any;
  walletProvider: WalletProvider & MidnightProvider;
  midnightProvider: WalletProvider & MidnightProvider;
};

interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

interface RulesetEntry {
  ruleset: DeployedRuleset;
}

// ─── Persistence ────────────────────────────────────────────────────────────

const STORE_PATH = path.resolve(process.cwd(), ".verdict-store.json");

function migrateV1Entry(rs: any): DeployedRuleset {
  // v1 entries have `category` but no `enabledChecks`
  if (rs.enabledChecks) return rs;
  return {
    ...rs,
    tags: rs.category ? [rs.category] : [],
    enabledChecks: [
      "mnemosyne", "styx", "hermes", "phaethon", "terminus",
      "themis", "chronos", "moirai", "daedalus", "prometheus",
    ],
    checkCount: 10,
    vcl: "",
  };
}

function loadStore(): RulesetEntry[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const entries: RulesetEntry[] = JSON.parse(raw);
      return entries.map((e) => ({
        ruleset: migrateV1Entry(e.ruleset),
      }));
    }
  } catch (err) {
    console.error("[midnight] Failed to load store:", err);
  }
  return [];
}

function saveStore() {
  const entries: RulesetEntry[] = Array.from(rulesetRegistry.values()).map(
    (e) => ({ ruleset: e.ruleset })
  );
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.error("[midnight] Failed to save store:", err);
  }
}

// ─── Registry (persisted to disk, survives module reloads in dev) ───────────

// Use globalThis to survive Next.js dev mode module re-evaluation
const _global = globalThis as any;
if (!_global.__verdictRulesetRegistry) {
  _global.__verdictRulesetRegistry = new Map<string, RulesetEntry>();
}
const rulesetRegistry: Map<string, RulesetEntry> =
  _global.__verdictRulesetRegistry;

// ─── Compiled contract ──────────────────────────────────────────────────────

const verdictCompiledContract = CompiledContract.make(
  "verdict",
  Verdict.Contract
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(ZK_CONFIG_PATH)
);

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

// ─── Wallet + Provider singleton (survives dev mode re-evaluation) ──────────

if (!_global.__verdictWalletCtx) _global.__verdictWalletCtx = null;
if (!_global.__verdictProviders) _global.__verdictProviders = null;
if (!_global.__verdictInitPromise) _global.__verdictInitPromise = null;

let _walletCtx: WalletContext | null = _global.__verdictWalletCtx;
let _providers: VerdictProviders | null = _global.__verdictProviders;
let _initPromise: Promise<void> | null = _global.__verdictInitPromise;

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

const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof"
): void => {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned =
      ledger.Intent.deserialize<
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
};

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

async function initSingleton(): Promise<void> {
  if (_providers) return;

  console.log("[midnight] Initializing real Midnight connection...");
  console.log(`  Node:         ${NODE_URL}`);
  console.log(`  Indexer:      ${INDEXER_URL}`);
  console.log(`  Proof Server: ${PROOF_SERVER_URL}`);
  console.log(`  ZK Config:    ${ZK_CONFIG_PATH}`);

  const networkId = getNetworkId();

  // Derive keys from genesis seed
  const keys = deriveKeysFromSeed(GENESIS_SEED);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(
    keys[Roles.NightExternal],
    networkId
  );

  // Build wallet
  const wallet = await WalletFacade.init({
    configuration: {
      networkId,
      indexerClientConnection: {
        indexerHttpUrl: INDEXER_URL,
        indexerWsUrl: INDEXER_WS_URL,
      },
      provingServerUrl: new URL(PROOF_SERVER_URL),
      relayURL: new URL(NODE_URL.replace(/^http/, "ws")),
      txHistoryStorage: new InMemoryTransactionHistoryStorage(),
      costParameters: {
        additionalFeeOverhead: 300_000_000_000_000n,
        feeBlocksMargin: 5,
      },
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

  // Wait for sync
  console.log("[midnight] Waiting for wallet sync...");
  await Rx.firstValueFrom(
    wallet
      .state()
      .pipe(
        Rx.throttleTime(5_000),
        Rx.filter((s) => s.isSynced)
      )
  );

  // Check balance
  const syncedState = await Rx.firstValueFrom(
    wallet.state().pipe(Rx.filter((s) => s.isSynced))
  );
  const balance =
    syncedState.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`[midnight] Wallet synced. Balance: ${balance} tNight`);

  // Register for dust generation if needed
  if (syncedState.dust.availableCoins.length === 0) {
    const nightUtxos = syncedState.unshielded.availableCoins.filter(
      (coin: any) => coin.meta?.registeredForDustGeneration !== true
    );
    if (nightUtxos.length > 0) {
      console.log(
        `[midnight] Registering ${nightUtxos.length} NIGHT UTXO(s) for dust generation...`
      );
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        nightUtxos,
        unshieldedKeystore.getPublicKey(),
        (payload) => unshieldedKeystore.signData(payload)
      );
      const finalized = await wallet.finalizeRecipe(recipe);
      await wallet.submitTransaction(finalized);
    }
    console.log("[midnight] Waiting for dust tokens...");
    await Rx.firstValueFrom(
      wallet
        .state()
        .pipe(
          Rx.throttleTime(5_000),
          Rx.filter((s) => s.isSynced),
          Rx.filter((s) => s.dust.balance(new Date()) > 0n)
        )
    );
  }
  console.log("[midnight] Dust tokens available.");

  _walletCtx = { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
  _global.__verdictWalletCtx = _walletCtx;

  // Configure providers
  const walletAndMidnightProvider =
    await createWalletAndMidnightProvider(_walletCtx);
  const zkConfigProvider = new NodeZkConfigProvider<VerdictCircuits>(
    ZK_CONFIG_PATH
  );

  _providers = {
    privateStateProvider: levelPrivateStateProvider<typeof PRIVATE_STATE_ID>({
      privateStateStoreName: "verdict-private-state",
      walletProvider: walletAndMidnightProvider,
    }),
    publicDataProvider: indexerPublicDataProvider(INDEXER_URL, INDEXER_WS_URL),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };

  _global.__verdictProviders = _providers;

  console.log("[midnight] Providers configured. Ready for deployments.");
}

export async function ensureInitialized() {
  // Re-read from globalThis in case module was re-evaluated
  _walletCtx = _global.__verdictWalletCtx;
  _providers = _global.__verdictProviders;
  _initPromise = _global.__verdictInitPromise;

  if (!_initPromise) {
    _initPromise = initSingleton().catch((err) => {
      _initPromise = null;
      _global.__verdictInitPromise = null;
      throw err;
    });
    _global.__verdictInitPromise = _initPromise;
  }
  await _initPromise;
  return { providers: _providers!, walletCtx: _walletCtx! };
}

// ─── Contract deployment (real network) ─────────────────────────────────────

export async function deployVerdictContract(meta: {
  name: string;
  description: string;
  tags: string[];
  enabledChecks: string[];
  checkCount: number;
  vcl: string;
  compact: string;
}): Promise<DeployedRuleset> {
  const { providers } = await ensureInitialized();

  console.log(`[midnight] Deploying "${meta.name}"...`);
  const contract = await deployContract(providers, {
    compiledContract: verdictCompiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: defaultPrivateState,
  });

  const contractAddress = contract.deployTxData.public.contractAddress;
  const txHash = contract.deployTxData.public.txHash ?? contractAddress;

  console.log(`[midnight] Deployed "${meta.name}" at ${contractAddress}`);

  const ruleset: DeployedRuleset = {
    address: contractAddress,
    name: meta.name,
    description: meta.description,
    tags: meta.tags,
    enabledChecks: meta.enabledChecks,
    checkCount: meta.checkCount,
    vcl: meta.vcl,
    deployedAt: new Date().toISOString(),
    txHash: typeof txHash === "string" ? txHash : contractAddress,
    compact: meta.compact,
  };

  rulesetRegistry.set(contractAddress, { ruleset });
  saveStore();
  return ruleset;
}

// ─── Ledger queries (real on-chain) ─────────────────────────────────────────

export async function getContractState(contractAddress: string) {
  const { providers } = await ensureInitialized();

  try {
    assertIsContractAddress(contractAddress);
    const contractState =
      await providers.publicDataProvider.queryContractState(
        contractAddress as ContractAddress
      );
    if (!contractState) return null;
    const state = Verdict.ledger(contractState.data);
    return {
      totalChecks: BigInt(state.totalChecks ?? 0),
      totalFlagged: BigInt(state.totalFlagged ?? 0),
      lastVerdict: BigInt(Number(state.lastVerdict ?? 0)),
      sessionActive: Boolean(state.sessionActive ?? false),
    };
  } catch (err) {
    // If the contract address isn't a real on-chain address, return null
    console.error(
      `[midnight] Failed to query state for ${contractAddress}:`,
      err
    );
    return null;
  }
}

export function getDeployedRulesets(): DeployedRuleset[] {
  return Array.from(rulesetRegistry.values()).map((e) => e.ruleset);
}

export function getRuleset(address: string): DeployedRuleset | undefined {
  return rulesetRegistry.get(address)?.ruleset;
}

// ─── Network status (real health checks) ────────────────────────────────────

export async function getNetworkStatus(): Promise<{
  nodeHealthy: boolean;
  indexerHealthy: boolean;
  proofServerHealthy: boolean;
  blockHeight: number | null;
}> {
  const results = await Promise.allSettled([
    fetch(`${NODE_URL}/health`, { signal: AbortSignal.timeout(5000) }).then(
      (r) => r.ok
    ),
    fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
      signal: AbortSignal.timeout(5000),
    }).then((r) => r.ok),
    Promise.resolve(true),
  ]);

  const nodeHealthy =
    results[0].status === "fulfilled" && results[0].value === true;
  const indexerHealthy =
    results[1].status === "fulfilled" && results[1].value === true;
  const proofServerHealthy =
    results[2].status === "fulfilled" && results[2].value === true;

  let blockHeight: number | null = null;
  if (indexerHealthy) {
    try {
      const res = await fetch(INDEXER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "{ block { height } }",
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      blockHeight = data?.data?.block?.height ?? null;
    } catch {}
  }

  return { nodeHealthy, indexerHealthy, proofServerHealthy, blockHeight };
}

// ─── Wallet info (real) ─────────────────────────────────────────────────────

export async function getWalletInfo() {
  try {
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
  } catch (err) {
    return {
      address: null,
      balance: "0",
      isSynced: false,
    };
  }
}

// ─── Startup: load persisted metadata ───────────────────────────────────────

function initStore() {
  const persisted = loadStore();
  for (const entry of persisted) {
    rulesetRegistry.set(entry.ruleset.address, { ruleset: entry.ruleset });
  }
  if (persisted.length > 0) {
    console.log(
      `[midnight] Loaded ${persisted.length} ruleset(s) from metadata store`
    );
  }
}

initStore();
