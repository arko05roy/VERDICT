/**
 * Non-interactive deploy test — deploys the verdict contract to the local standalone network.
 * Usage: node --experimental-specifier-resolution=node --loader ts-node/esm src/deploy-test.ts
 */

import { StandaloneConfig } from './config.js';
import * as api from './api.js';
import { createLogger } from './logger-utils.js';

const config = new StandaloneConfig();
const logger = await createLogger(config.logDir);
api.setLogger(logger);

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

console.log('\n[deploy-test] Starting deployment test...');
console.log(`  Node:         ${config.node}`);
console.log(`  Indexer:      ${config.indexer}`);
console.log(`  Proof Server: ${config.proofServer}\n`);

try {
  // Step 1: Build wallet
  console.log('[deploy-test] Building wallet from genesis seed...');
  const walletCtx = await api.buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED);
  console.log('[deploy-test] Wallet ready.\n');

  // Step 2: Configure providers
  console.log('[deploy-test] Configuring providers...');
  const providers = await api.configureProviders(walletCtx, config);
  console.log('[deploy-test] Providers configured.\n');

  // Step 3: Deploy contract
  console.log('[deploy-test] Deploying verdict contract...');
  const contract = await api.deploy(providers);
  const contractAddress = contract.deployTxData.public.contractAddress;
  console.log(`\n[deploy-test] ✓ Contract deployed at: ${contractAddress}\n`);

  // Step 4: Read ledger state
  console.log('[deploy-test] Reading ledger state...');
  const state = await api.getVerdictLedgerState(providers, contractAddress);
  if (state) {
    console.log(`  totalChecks:   ${state.totalChecks}`);
    console.log(`  totalFlagged:  ${state.totalFlagged}`);
    console.log(`  lastVerdict:   ${state.lastVerdict === 0 ? 'CLEAN' : 'FLAGGED'}`);
    console.log(`  sessionActive: ${state.sessionActive}`);
  }

  console.log('\n[deploy-test] ✓ Deployment test PASSED!\n');
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);

  // Clean up
  await walletCtx.wallet.stop();
} catch (e) {
  console.error('\n[deploy-test] ✗ Deployment test FAILED:');
  console.error(e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) {
    console.error(e.stack);
  }
  process.exit(1);
}

process.exit(0);
