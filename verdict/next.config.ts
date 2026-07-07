import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        "node:fs": false,
        "node:path": false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        "isomorphic-ws": path.join(__dirname, "src/lib/ws-shim.ts"),
      };
    }
    return config;
  },
  serverExternalPackages: [
    "@midnight-ntwrk/compact-runtime",
    "@midnight-ntwrk/compact-js",
    "@midnight-ntwrk/ledger-v7",
    "@midnight-ntwrk/midnight-js-contracts",
    "@midnight-ntwrk/midnight-js-http-client-proof-provider",
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider",
    "@midnight-ntwrk/midnight-js-level-private-state-provider",
    "@midnight-ntwrk/midnight-js-network-id",
    "@midnight-ntwrk/midnight-js-node-zk-config-provider",
    "@midnight-ntwrk/midnight-js-types",
    "@midnight-ntwrk/midnight-js-utils",
    "@midnight-ntwrk/wallet-sdk-facade",
    "@midnight-ntwrk/wallet-sdk-dust-wallet",
    "@midnight-ntwrk/wallet-sdk-hd",
    "@midnight-ntwrk/wallet-sdk-shielded",
    "@midnight-ntwrk/wallet-sdk-unshielded-wallet",
    "@midnight-ntwrk/wallet-sdk-abstractions",
    "@midnight-ntwrk/wallet-sdk-address-format",
    "@midnight-ntwrk/wallet-sdk-capabilities",
    "@midnight-ntwrk/wallet-sdk-prover-client",
    "@midnight-ntwrk/wallet-sdk-utilities",
    "@midnight-ntwrk/onchain-runtime-v2",
    "@midnight-ntwrk/platform-js",
    "@midnight-ntwrk/ledger",
    "@midnight-ntwrk/verdict-contract",
    "pino",
    "ws",
    "classic-level",
    "level",
  ],
};

export default nextConfig;
