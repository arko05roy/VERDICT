/**
 * Deploy VERDICT contract to Preprod and print the address.
 * Usage:
 *   SEED=<funded-hex-seed> npm run deploy:preprod
 *   npm run deploy:preprod   # generates fresh wallet — fund at faucet, then re-run
 */
import { createLogger } from './logger-utils.js';
import { PreprodConfig, currentDir } from './config.js';
import * as api from './api.js';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { Buffer } from 'buffer';
import fs from 'node:fs';
import path from 'node:path';

const config = new PreprodConfig();
const logger = await createLogger(config.logDir);
api.setLogger(logger);

const seed = process.env.SEED ?? toHex(Buffer.from(generateRandomSeed()));
const outPath = path.resolve(currentDir, '..', 'logs', 'preprod-deploy.json');

console.log('\n[deploy-only] Building wallet...');
const walletCtx = await api.buildWalletForPreprodDeploy(config, seed);
const providers = api.configureDeployProviders(walletCtx, config);

console.log('[deploy-only] Deploying verdict contract...');
const contract = await api.deploy(providers);
const addr = contract.deployTxData.public.contractAddress;

const record = {
  contractAddress: addr,
  seed,
  network: 'preprod',
  deployedAt: new Date().toISOString(),
  explorer: `https://explorer.preprod.midnight.network/contract/${addr}`,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(record, null, 2));

console.log('\n════════════════════════════════════════');
console.log('  PREPROD CONTRACT DEPLOYED');
console.log('════════════════════════════════════════');
console.log(`  Address: ${addr}`);
console.log(`  Explorer: ${record.explorer}`);
console.log(`  Seed: ${seed}`);
console.log('\n  Vercel / .env.local:');
console.log(`  NEXT_PUBLIC_VERDICT_PREPROD_CONTRACT_ADDRESS=${addr}`);
console.log(`  MIDNIGHT_WALLET_SEED=${seed}`);
console.log(`\n  Saved: ${outPath}`);
console.log('════════════════════════════════════════\n');

await walletCtx.wallet.stop();
process.exit(0);
