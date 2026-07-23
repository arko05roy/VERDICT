/** Shared Preprod / deployment configuration (safe for client + server). */
export const PREPROD_ENDPOINTS = {
  node: "https://rpc.preprod.midnight.network",
  indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
  indexerWs: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  proofServer: "https://lace-proof-pub.preprod.midnight.network",
  faucet: "https://midnight-tmnight-preprod.nethermind.dev/",
  explorer: "https://preprod.midnightexplorer.com",
} as const;

/** Indexer-confirmed reference VERDICT contract on Preprod. */
export const PREPROD_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_VERDICT_PREPROD_CONTRACT_ADDRESS ??
  process.env.VERDICT_PREPROD_CONTRACT_ADDRESS ??
  "b3b8f32f51d28ca2265e29da8be2d08cd5c20ae4152adfdd452bdee9fc6242e3";

/** Indexer-confirmed VERDICT governance contract on Preprod. */
export const PREPROD_DAO_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_VERDICT_DAO_PREPROD_CONTRACT_ADDRESS ??
  process.env.VERDICT_DAO_PREPROD_CONTRACT_ADDRESS ??
  "257219f97796f9447d155fff4dfdf8c29decde9ac6584afb32916ec0fabf835b";

export function explorerContractUrl(address: string): string {
  return `${PREPROD_ENDPOINTS.explorer}/contract/${address}`;
}
