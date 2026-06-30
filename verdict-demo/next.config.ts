import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@midnight-ntwrk/compact-js",
    "@midnight-ntwrk/compact-runtime",
    "@midnight-ntwrk/ledger-v7",
    "@midnight-ntwrk/midnight-js-contracts",
    "@midnight-ntwrk/midnight-js-http-client-proof-provider",
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider",
    "@midnight-ntwrk/midnight-js-level-private-state-provider",
    "@midnight-ntwrk/midnight-js-network-id",
    "@midnight-ntwrk/midnight-js-node-zk-config-provider",
    "@midnight-ntwrk/midnight-js-types",
    "@midnight-ntwrk/midnight-js-utils",
    "@midnight-ntwrk/verdict-contract",
    "@midnight-ntwrk/wallet-sdk-dust-wallet",
    "@midnight-ntwrk/wallet-sdk-facade",
    "@midnight-ntwrk/wallet-sdk-hd",
    "@midnight-ntwrk/wallet-sdk-shielded",
    "@midnight-ntwrk/wallet-sdk-unshielded-wallet",
    "@midnight-ntwrk/ledger",
    "@midnight-ntwrk/onchain-runtime-v2",
    "@midnight-ntwrk/wallet-sdk-abstractions",
    "@midnight-ntwrk/wallet-sdk-address-format",
    "@midnight-ntwrk/wallet-sdk-indexer-client",
    "@midnight-ntwrk/wallet-sdk-node-client",
    "@midnight-ntwrk/wallet-sdk-prover-client",
    "@midnight-ntwrk/wallet-sdk-runtime",
    "@midnight-ntwrk/wallet-sdk-utilities",
    "@midnight-ntwrk/platform-js",
    "classic-level",
    "ws",
    "pino",
    "pino-pretty",
  ],
};

export default nextConfig;
