import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import {
  Transaction,
  SignatureEnabled,
  Proof,
  PreBinding,
  Binding,
  CostModel,
  type FinalizedTransaction,
  type ProvingProvider,
} from "@midnight-ntwrk/ledger-v7";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {
  getNetworkId,
  setNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import type {
  MidnightProvider,
  ProofProvider,
  WalletProvider,
  ZKConfigProvider,
} from "@midnight-ntwrk/midnight-js-types";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";
import {
  parseCoinPublicKeyToHex,
  parseEncPublicKeyToHex,
  toHex,
  fromHex,
} from "@midnight-ntwrk/midnight-js-utils";

export async function createLaceProviders<K extends string>(
  api: ConnectedAPI,
  zkConfigProvider: ZKConfigProvider<K>
) {
  await api.hintUsage([
    "getShieldedAddresses",
    "getProvingProvider",
    "balanceUnsealedTransaction",
    "submitTransaction",
    "getConfiguration",
  ]);

  const config = await api.getConfiguration();
  setNetworkId(config.networkId as "preprod");

  const addresses = await api.getShieldedAddresses();
  const networkId = getNetworkId();
  const coinPublicKey = parseCoinPublicKeyToHex(
    addresses.shieldedCoinPublicKey,
    networkId
  );
  const encryptionPublicKey = parseEncPublicKeyToHex(
    addresses.shieldedEncryptionPublicKey,
    networkId
  );

  const provingProvider: ProvingProvider = await api.getProvingProvider(
    zkConfigProvider.asKeyMaterialProvider()
  );

  const proofProvider: ProofProvider = {
    async proveTx(unprovenTx) {
      const costModel = CostModel.initialCostModel();
      return unprovenTx.prove(provingProvider, costModel);
    },
  };

  const walletProvider: WalletProvider & MidnightProvider = {
    getCoinPublicKey() {
      return coinPublicKey;
    },
    getEncryptionPublicKey() {
      return encryptionPublicKey;
    },
    async balanceTx(tx: UnboundTransaction) {
      const hex = toHex(tx.serialize());
      const { tx: balancedHex } = await api.balanceUnsealedTransaction(hex, {
        payFees: true,
      });
      return Transaction.deserialize(
        SignatureEnabled.instance,
        Proof.instance,
        Binding.instance,
        fromHex(balancedHex)
      ) as FinalizedTransaction;
    },
    async submitTx(tx: FinalizedTransaction) {
      const hex = toHex(tx.serialize());
      await api.submitTransaction(hex);
      const ids = tx.identifiers();
      return ids[0] ?? tx.transactionHash();
    },
  };

  const publicDataProvider = indexerPublicDataProvider(
    config.indexerUri,
    config.indexerWsUri
  );

  return {
    privateStateProvider: null as never, // filled by caller
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider: walletProvider,
  };
}
