import { Buffer } from 'node:buffer';
import { access, readFile, writeFile } from 'node:fs/promises';
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
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk';
import { makeDefaultSubmissionService } from '@midnightntwrk/wallet-sdk-capabilities/submission';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// @ts-expect-error The Node ws implementation supplies the runtime WebSocket API.
globalThis.WebSocket = WebSocket;

const seed = process.env.SEED;
if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
  throw new Error('SEED must be a 64-character hex string');
}

const outputPath = './preprod-addresses-50.json';
try {
  await access(outputPath);
  throw new Error(`${outputPath} already exists; refusing to issue the recipients twice`);
} catch (error: unknown) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

setNetworkId('preprod');

const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
if (hdWallet.type !== 'seedOk') throw new Error('Failed to restore HD wallet');

const account = hdWallet.hdWallet.selectAccount(0);
const sourceDerivation = account
  .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
  .deriveKeysAt(0);
if (sourceDerivation.type !== 'keysDerived') throw new Error('Failed to derive source wallet keys');

const recipients = Array.from({ length: 50 }, (_, offset) => {
  const derivationIndex = offset + 1;
  const derived = account.selectRoles([Roles.NightExternal]).deriveKeysAt(derivationIndex);
  if (derived.type !== 'keysDerived') {
    throw new Error(`Could not derive recipient at index ${derivationIndex}`);
  }
  const keyStore = createKeystore(derived.keys[Roles.NightExternal], getNetworkId());
  const address = new UnshieldedAddress(Buffer.from(keyStore.getAddress(), 'hex'));
  return {
    derivationIndex,
    address,
    bech32: keyStore.getBech32Address().toString(),
  };
});
hdWallet.hdWallet.clear();

const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(sourceDerivation.keys[Roles.Zswap]);
const dustSecretKey = ledger.DustSecretKey.fromSeed(sourceDerivation.keys[Roles.Dust]);
const sourceKeystore = createKeystore(sourceDerivation.keys[Roles.NightExternal], getNetworkId());

const indexer = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const indexerWs = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const nodeUrl = 'https://rpc.preprod.midnight.network';
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
  provingServerUrl: new URL('http://127.0.0.1:6300'),
  relayURL: new URL(nodeUrl.replace(/^http/, 'ws')),
};
const unshieldedConfig = {
  ...sharedConnection,
  txHistoryStorage: new NoOpTransactionHistoryStorage(),
};
const dustConfig = {
  ...shieldedConfig,
  batchUpdates: { size: 1_000, timeout: 10, spacing: 1 },
  costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
};
const dustSnapshot = await readFile('./dust-snapshot.json', 'utf8');
const rpcSubmission = makeDefaultSubmissionService({ relayURL: shieldedConfig.relayURL });

const wallet = await WalletFacade.init({
  configuration: { ...shieldedConfig, ...unshieldedConfig, ...dustConfig },
  shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
  unshielded: (cfg) =>
    UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(sourceKeystore)),
  dust: (cfg) => DustWallet(cfg).restore(dustSnapshot),
  // The Preprod RPC closes its finalization watcher normally; indexer verification follows.
  submissionService: () => ({
    submitTransaction: ((transaction: ledger.FinalizedTransaction) =>
      rpcSubmission.submitTransaction(transaction, 'Submitted')) as any,
    close: () => rpcSubmission.close(),
  }),
});

try {
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  const state = await wallet.waitForSyncedState();
  const nightBalance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  const amountPerRecipient = 1_000_000n; // 1 tNIGHT (six decimal places)
  const totalAmount = amountPerRecipient * BigInt(recipients.length);
  if (nightBalance < totalAmount) {
    throw new Error(`Insufficient tNIGHT: need ${totalAmount}, have ${nightBalance}`);
  }

  console.log(`Funding ${recipients.length} derived Preprod addresses with 1 tNIGHT each...`);
  const recipe = await wallet.transferTransaction(
    [{
      type: 'unshielded',
      outputs: recipients.map(({ address }) => ({
        type: unshieldedToken().raw,
        receiverAddress: address,
        amount: amountPerRecipient,
      })),
    }],
    { shieldedSecretKeys, dustSecretKey },
    { ttl: new Date(Date.now() + 30 * 60 * 1_000), payFees: true },
  );
  const signed = await wallet.signRecipe(recipe, (data) => sourceKeystore.signData(data));
  const transaction = await wallet.finalizeRecipe(signed);
  const identifiers = transaction.identifiers().map(String);
  await wallet.submitTransaction(transaction);

  await writeFile(outputPath, JSON.stringify({
    network: 'preprod',
    sourceAddress: sourceKeystore.getBech32Address().toString(),
    amountPerAddress: '1 tNIGHT',
    totalAmount: '50 tNIGHT',
    transactionIdentifiers: identifiers,
    submittedAt: new Date().toISOString(),
    addresses: recipients.map(({ derivationIndex, bech32 }) => ({ derivationIndex, address: bech32 })),
  }, null, 2));
  console.log(`Submitted: ${identifiers.join(', ')}`);
  console.log(`Saved public recipient record: ${outputPath}`);
} finally {
  await wallet.stop();
}
