import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import {
  HDWallet,
  Roles,
  WalletFacade,
  ShieldedWallet,
  DustWallet,
  UnshieldedWallet,
  createKeystore,
  PublicKey,
  NoOpTransactionHistoryStorage,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnightntwrk/wallet-sdk';
import { PublicKeys } from '@midnightntwrk/wallet-sdk/shielded/v1';
import { makeDefaultSubmissionService } from '@midnightntwrk/wallet-sdk-capabilities/submission';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import * as Verdict from './managed/verdict/contract/index.js';
import * as VerdictDao from './managed/verdict-dao/contract/index.js';
import {
  witnesses,
  type VerdictPrivateState,
} from '../../contract/src/witnesses.ts';

// @ts-expect-error The Node ws implementation supplies the runtime WebSocket API.
globalThis.WebSocket = WebSocket;

const seed = process.env.SEED;
if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
  throw new Error('SEED must be a 64-character hex string');
}

const indexer = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const indexerWs = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const nodeUrl = 'https://rpc.preprod.midnight.network';
const proofServer = 'http://127.0.0.1:6300';
const deploymentTarget = process.env.DEPLOY_CONTRACT === 'dao' ? 'dao' : 'verdict';
const zkConfigPath = fileURLToPath(
  new URL(
    deploymentTarget === 'dao' ? './managed/verdict-dao' : './managed/verdict',
    import.meta.url,
  ),
);
const snapshot = await readFile('./dust-snapshot.json', 'utf8');

type VerdictDaoPrivateState = {
  callerHash: Uint8Array;
  currentTick: bigint;
};

const daoWitnesses = {
  getCallerHash(
    context: import('@midnight-ntwrk/compact-runtime').WitnessContext<
      VerdictDao.Ledger,
      VerdictDaoPrivateState
    >,
  ): [VerdictDaoPrivateState, Uint8Array] {
    return [context.privateState, context.privateState.callerHash];
  },
  getCurrentTick(
    context: import('@midnight-ntwrk/compact-runtime').WitnessContext<
      VerdictDao.Ledger,
      VerdictDaoPrivateState
    >,
  ): [VerdictDaoPrivateState, bigint] {
    return [context.privateState, context.privateState.currentTick];
  },
};

setNetworkId('preprod');

const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
if (hdWallet.type !== 'seedOk') throw new Error('Failed to restore HD wallet');
const derivation = hdWallet.hdWallet
  .selectAccount(0)
  .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
  .deriveKeysAt(0);
if (derivation.type !== 'keysDerived') throw new Error('Failed to derive wallet keys');
hdWallet.hdWallet.clear();

const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derivation.keys[Roles.Zswap]);
const dustSecretKey = ledger.DustSecretKey.fromSeed(derivation.keys[Roles.Dust]);
const unshieldedKeystore = createKeystore(derivation.keys[Roles.NightExternal], getNetworkId());

const sharedConnection = {
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: indexer,
    indexerWsUrl: indexerWs,
    bufferSize: 20_000,
    resumeThreshold: 500,
  },
};
const shieldedConfig = {
  ...sharedConnection,
  provingServerUrl: new URL(proofServer),
  relayURL: new URL(nodeUrl.replace(/^http/, 'ws')),
};
const unshieldedConfig = {
  ...sharedConnection,
  txHistoryStorage: new NoOpTransactionHistoryStorage(),
};
const dustConfig = {
  ...shieldedConfig,
  batchUpdates: { size: 1_000, timeout: 10, spacing: 1 },
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
};
const rpcSubmission = makeDefaultSubmissionService({ relayURL: shieldedConfig.relayURL });

const wallet = await WalletFacade.init({
  configuration: {
    ...shieldedConfig,
    ...unshieldedConfig,
    ...dustConfig,
  },
  shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
  unshielded: (cfg) =>
    UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
  dust: (cfg) => DustWallet(cfg).restore(snapshot),
  // Preprod's RPC currently closes long-lived watch subscriptions normally
  // before the SDK's "Finalized" waiter resolves. Submission to the node is
  // sufficient here; deploy visibility is verified through the indexer.
  submissionService: () => ({
    submitTransaction: ((transaction: ledger.FinalizedTransaction) =>
      rpcSubmission.submitTransaction(transaction, 'Submitted')) as any,
    close: () => rpcSubmission.close(),
  }),
});

const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  proofMarker: 'proof' | 'pre-proof',
): void => {
  if (!tx.intents) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize(
      'signature',
      proofMarker,
      'pre-binding',
      intent.serialize(),
    );
    const signature = unshieldedKeystore.signData(cloned.signatureData(segment));
    if (cloned.fallibleUnshieldedOffer) {
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(
        cloned.fallibleUnshieldedOffer.inputs.map(
          (_input: unknown, index: number) =>
            cloned.fallibleUnshieldedOffer!.signatures.at(index) ?? signature,
        ),
      );
    }
    if (cloned.guaranteedUnshieldedOffer) {
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(
        cloned.guaranteedUnshieldedOffer.inputs.map(
          (_input: unknown, index: number) =>
            cloned.guaranteedUnshieldedOffer!.signatures.at(index) ?? signature,
        ),
      );
    }
    tx.intents.set(segment, cloned);
  }
};

try {
  console.log('Starting funded CLI wallet from synchronized DUST checkpoint...');
  await wallet.unshielded.start();
  await (wallet as unknown as {
    pendingTransactionsService: { start: () => Promise<void> };
  }).pendingTransactionsService.start();
  await wallet.unshielded.waitForSyncedState(0n);
  await wallet.dust.start(dustSecretKey);
  const dustState = await wallet.dust.waitForSyncedState(0n);
  await writeFile('./dust-snapshot.json', await wallet.dust.serializeState());
  const dustBalance = dustState.balance(new Date());
  console.log(`Spendable tDUST raw balance: ${dustBalance}`);
  if (dustBalance <= 0n) {
    throw new Error('The synchronized wallet has no spendable tDUST');
  }

  const publicKeys = PublicKeys.fromSecretKeys(shieldedSecretKeys);
  const coinKey = new ShieldedCoinPublicKey(
    Buffer.from(publicKeys.coinPublicKey as unknown as string, 'hex'),
  );
  const encryptionKey = new ShieldedEncryptionPublicKey(
    Buffer.from(publicKeys.encryptionPublicKey as unknown as string, 'hex'),
  );
  const walletProvider = {
    getCoinPublicKey: () => coinKey.toHexString(),
    getEncryptionPublicKey: () => encryptionKey.toHexString(),
    balanceTx: async (transaction: any, ttl?: Date) => {
      const recipe = await wallet.balanceUnboundTransaction(
        transaction,
        { shieldedSecretKeys, dustSecretKey },
        {
          ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000),
          tokenKindsToBalance: ['unshielded', 'dust'],
        },
      );
      signTransactionIntents(recipe.baseTransaction, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, 'pre-proof');
      }
      return wallet.finalizeRecipe(recipe);
    },
    submitTx: async (transaction: any) => {
      const identifiers = transaction.identifiers().map(String);
      const deployAddresses = [...(transaction.intents?.values() ?? [])]
        .flatMap((intent: any) => intent.actions ?? [])
        .filter((action: unknown) => action instanceof ledger.ContractDeploy)
        .map((action: ledger.ContractDeploy) => String(action.address));
      console.log(`Finalized transaction identifier(s): ${identifiers.join(', ')}`);
      console.log(`Deployment address in transaction: ${deployAddresses.join(', ')}`);
      return wallet.submitTransaction(transaction);
    },
  };

  const compiledContract =
    deploymentTarget === 'dao'
      ? CompiledContract.make('verdict-dao', VerdictDao.Contract).pipe(
          CompiledContract.withWitnesses(daoWitnesses),
          CompiledContract.withCompiledFileAssets(zkConfigPath),
        )
      : CompiledContract.make('verdict', Verdict.Contract).pipe(
          CompiledContract.withWitnesses(witnesses),
          CompiledContract.withCompiledFileAssets(zkConfigPath),
        );
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      midnightDbName: `./verdict-${deploymentTarget}-preprod-private-state`,
      privateStateStoreName: `verdict-${deploymentTarget}-private-state`,
      signingKeyStoreName: `verdict-${deploymentTarget}-signing-keys`,
      accountId: unshieldedKeystore.getBech32Address().toString(),
      privateStoragePasswordProvider: () => `V3rdict-Preprod!${seed}`,
    }),
    publicDataProvider: indexerPublicDataProvider(indexer, indexerWs),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  const initialPrivateState: VerdictPrivateState = {
    prevPrevPos: [0n, 0n],
    prevPos: [0n, 0n],
    currPos: [0n, 0n],
    action: 0n,
    isFirstMove: 1n,
    prevHash: new Uint8Array(32),
    nonce: new Uint8Array(32),
    aimHistory: new Array(16).fill(0n),
    actionHistory: new Array(8).fill(0n),
    tickHistory: new Array(8).fill(0n),
    currentTick: 0n,
    enemyPositions: new Array(16).fill(0n),
  };

  console.log(
    `Proving and submitting ${deploymentTarget === 'dao' ? 'VERDICT DAO' : 'VERDICT'} deployment...`,
  );
  const contract =
    deploymentTarget === 'dao'
      ? await deployContract(providers as any, {
          compiledContract: compiledContract as any,
          privateStateId: 'verdictDaoPrivateState',
          initialPrivateState: {
            callerHash: new Uint8Array(32),
            currentTick: 0n,
          },
          args: [1n],
        })
      : await deployContract(providers as any, {
          compiledContract: compiledContract as any,
          privateStateId: 'verdictPrivateState',
          initialPrivateState,
          args: [],
        });
  const contractAddress = contract.deployTxData.public.contractAddress;
  const result = {
    network: 'preprod',
    contractAddress,
    deployedAt: new Date().toISOString(),
    explorer: `https://explorer.preprod.midnight.network/contract/${contractAddress}`,
  };
  await writeFile(
    deploymentTarget === 'dao' ? './preprod-dao-deploy.json' : './preprod-deploy.json',
    JSON.stringify(result, null, 2),
  );
  console.log(`PREPROD CONTRACT ADDRESS: ${contractAddress}`);
  console.log(`Explorer: ${result.explorer}`);
} finally {
  await wallet.stop();
}
