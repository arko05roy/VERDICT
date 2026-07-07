/** Shared Preprod / deployment configuration (safe for client + server). */
export const PREPROD_ENDPOINTS = {
  node: "https://rpc.preprod.midnight.network",
  indexer: "https://indexer.preprod.midnight.network/api/v3/graphql",
  indexerWs: "wss://indexer.preprod.midnight.network/api/v3/graphql/ws",
  proofServer: "https://lace-proof-pub.preprod.midnight.network",
  faucet: "https://faucet.preprod.midnight.network/",
  explorer: "https://explorer.preprod.midnight.network",
} as const;

/** Genesis VERDICT contract on Preprod — set after `npm run deploy:preprod` */
export const PREPROD_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_VERDICT_PREPROD_CONTRACT_ADDRESS ??
  process.env.VERDICT_PREPROD_CONTRACT_ADDRESS ??
  "";

export function explorerContractUrl(address: string): string {
  return `${PREPROD_ENDPOINTS.explorer}/contract/${address}`;
}
