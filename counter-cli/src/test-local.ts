/**
 * Quick end-to-end test against local Docker containers (fixed ports).
 * Tests: wallet build → deploy → startSession → commitMove → verifyTransition → read ledger.
 */

import { createLogger } from './logger-utils.js';
import { StandaloneConfig } from './config.js';
import * as api from './api.js';

const config = new StandaloneConfig();
const logger = await createLogger(config.logDir);
api.setLogger(logger);

// Genesis seed — pre-funded on the local dev node
const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  VERDICT — Local E2E Test (standalone Docker)');
console.log('══════════════════════════════════════════════════════════════\n');

console.log('[1/5] Building wallet from genesis seed...');
const walletCtx = await api.buildWalletAndWaitForFunds(config, GENESIS_SEED);

console.log('[2/5] Configuring providers...');
const providers = await api.configureProviders(walletCtx, config);

console.log('[3/5] Deploying verdict contract...');
const contract = await api.deploy(providers);
const addr = contract.deployTxData.public.contractAddress;
console.log(`  Contract address: ${addr}`);

console.log('[4/5] Running proof round-trip...');

console.log('  → startSession...');
const startTx = await contract.callTx.startSession(new Uint8Array(32));
console.log(`    tx block: ${startTx.public.blockHeight}`);

console.log('  → commitMove...');
const commitTx = await contract.callTx.commitMove(new Uint8Array(32));
console.log(`    tx block: ${commitTx.public.blockHeight}`);

console.log('  → verifyTransition (CLEAN)...');
const verifyTx = await contract.callTx.verifyTransition(
  100n, 50n, 1000n, 1000n, 4n, 8n, 100n, 10n, 1000n, 4n, 14n, new Uint8Array(32),
);
console.log(`    tx block: ${verifyTx.public.blockHeight}`);

console.log('[5/5] Reading ledger state...');
const state = await api.getVerdictLedgerState(providers, addr);
if (state) {
  console.log(`  totalChecks:   ${state.totalChecks}`);
  console.log(`  totalFlagged:  ${state.totalFlagged}`);
  console.log(`  lastVerdict:   ${state.lastVerdict === 0 ? 'CLEAN' : 'FLAGGED'}`);
  console.log(`  sessionActive: ${state.sessionActive}`);
}

console.log('\n  E2E TEST PASSED');
console.log('══════════════════════════════════════════════════════════════\n');

await walletCtx.wallet.stop();
process.exit(0);
