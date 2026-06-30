/**
 * Non-interactive proof round-trip test on preprod devnet.
 * 1. Build fresh wallet & wait for funds
 * 2. Deploy verdict contract
 * 3. startSession → commitMove → verifyTransition (CLEAN) → read ledger
 */

import { createLogger } from './logger-utils.js';
import { PreprodConfig } from './config.js';
import * as api from './api.js';

const config = new PreprodConfig();
const logger = await createLogger(config.logDir);
api.setLogger(logger);

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  VERDICT — Proof Round-trip Test (Preprod)');
console.log('══════════════════════════════════════════════════════════════\n');

// Step 1: Wallet
// Use SEED env var to restore a pre-funded wallet, or generate a fresh one
const seed = process.env.SEED;
console.log('[1/4] Building wallet...');
const walletCtx = seed
  ? await api.buildWalletAndWaitForFunds(config, seed)
  : await api.buildFreshWallet(config);

// Step 2: Providers
console.log('[2/4] Configuring providers...');
const providers = await api.configureProviders(walletCtx, config);

// Step 3: Deploy
console.log('[3/4] Deploying verdict contract...');
const contract = await api.deploy(providers);
const addr = contract.deployTxData.public.contractAddress;
console.log(`  Contract address: ${addr}`);

// Step 4: Proof round-trip
console.log('[4/4] Running proof round-trip...');

console.log('  → startSession (genesis hash)...');
const startTx = await contract.callTx.startSession(new Uint8Array(32));
console.log(`    tx: ${startTx.public.txId} (block ${startTx.public.blockHeight})`);

console.log('  → commitMove...');
const commitTx = await contract.callTx.commitMove(new Uint8Array(32));
console.log(`    tx: ${commitTx.public.txId} (block ${commitTx.public.blockHeight})`);

console.log('  → verifyTransition (CLEAN move)...');
const verifyTx = await contract.callTx.verifyTransition(
  100n,   // maxVelocity
  50n,    // maxAcceleration
  1000n,  // boundX
  1000n,  // boundY
  4n,     // validActionCount
  8n,     // maxActionsPerWindow
  100n,   // windowSize
  10n,    // minDiversity
  1000n,  // snapThreshold
  4n,     // maxSnaps
  14n,    // maxCorrelation
  new Uint8Array(32), // enemyPosHashPublic
);
console.log(`    tx: ${verifyTx.public.txId} (block ${verifyTx.public.blockHeight})`);

console.log('\n  → Reading ledger state...');
const state = await api.getVerdictLedgerState(providers, addr);
if (state) {
  console.log(`    totalChecks:   ${state.totalChecks}`);
  console.log(`    totalFlagged:  ${state.totalFlagged}`);
  console.log(`    lastVerdict:   ${state.lastVerdict === 0 ? 'CLEAN' : 'FLAGGED'}`);
  console.log(`    sessionActive: ${state.sessionActive}`);
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  Round-trip complete.');
console.log('══════════════════════════════════════════════════════════════\n');

await walletCtx.wallet.stop();
process.exit(0);
