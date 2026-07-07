/**
 * Deploy VERDICT contract to Preprod and print the address.
 * Usage: SEED=<funded-hex-seed> npx tsx counter-cli/src/deploy-only.ts
 */
import { createLogger } from './logger-utils.js';
import { PreprodConfig } from './config.js';
import * as api from './api.js';

const config = new PreprodConfig();
const logger = await createLogger(config.logDir);
api.setLogger(logger);

const seed = process.env.SEED;
if (!seed) {
  console.error('Set SEED to a funded wallet hex seed. Fund at https://faucet.preprod.midnight.network/');
  process.exit(1);
}

console.log('\n[deploy-only] Building wallet...');
const walletCtx = await api.buildWalletAndWaitForFunds(config, seed);
const providers = await api.configureProviders(walletCtx, config);

console.log('[deploy-only] Deploying verdict contract...');
const contract = await api.deploy(providers);
const addr = contract.deployTxData.public.contractAddress;

console.log('\n════════════════════════════════════════');
console.log('  PREPROD CONTRACT DEPLOYED');
console.log('════════════════════════════════════════');
console.log(`  Address: ${addr}`);
console.log(`  Explorer: https://explorer.preprod.midnight.network/contract/${addr}`);
console.log('\n  Add to .env:');
console.log(`  NEXT_PUBLIC_VERDICT_PREPROD_CONTRACT_ADDRESS=${addr}`);
console.log('════════════════════════════════════════\n');

await walletCtx.wallet.stop();
process.exit(0);
