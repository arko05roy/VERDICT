import { type WalletContext } from './api.js';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type StartedDockerComposeEnvironment, type DockerComposeEnvironment } from 'testcontainers';
import { type VerdictProviders, type DeployedVerdictContract } from './common-types.js';
import { type Config, StandaloneConfig } from './config.js';
import * as api from './api.js';

let logger: Logger;

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              VERDICT — ZK Anti-Cheat on Midnight             ║
║              ───────────────────────────────────              ║
║              10-check circuit • Proof round-trip              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

const DIVIDER = '──────────────────────────────────────────────────────────────';

const WALLET_MENU = `
${DIVIDER}
  Wallet Setup
${DIVIDER}
  [1] Create a new wallet
  [2] Restore wallet from seed
  [3] Exit
${'─'.repeat(62)}
> `;

const contractMenu = () => `
${DIVIDER}
  VERDICT Actions
${DIVIDER}
  [1] Deploy verdict contract
  [2] Join an existing contract
  [3] Exit
${'─'.repeat(62)}
> `;

const verdictMenu = () => `
${DIVIDER}
  Proof Round-trip
${DIVIDER}
  [1] Start session (genesis hash)
  [2] Commit + Verify (CLEAN move)
  [3] Commit + Verify (CHEAT — teleport)
  [4] Read ledger state
  [5] Exit
${'─'.repeat(62)}
> `;

const buildWalletFromSeed = async (config: Config, rli: Interface): Promise<WalletContext> => {
  const seed = await rli.question('Enter your wallet seed: ');
  return await api.buildWalletAndWaitForFunds(config, seed);
};

const buildWallet = async (config: Config, rli: Interface): Promise<WalletContext | null> => {
  if (config instanceof StandaloneConfig) {
    return await api.buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED);
  }
  while (true) {
    const choice = await rli.question(WALLET_MENU);
    switch (choice.trim()) {
      case '1': return await api.buildFreshWallet(config);
      case '2': return await buildWalletFromSeed(config, rli);
      case '3': return null;
      default: console.log(`  Invalid choice: ${choice}`);
    }
  }
};

const deployOrJoin = async (
  providers: VerdictProviders,
  rli: Interface,
): Promise<DeployedVerdictContract | null> => {
  while (true) {
    const choice = await rli.question(contractMenu());
    switch (choice.trim()) {
      case '1':
        try {
          const contract = await api.withStatus('Deploying verdict contract', () => api.deploy(providers));
          console.log(`  Contract deployed at: ${contract.deployTxData.public.contractAddress}\n`);
          return contract;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`\n  ✗ Deploy failed: ${msg}\n`);
        }
        break;
      case '2':
        try {
          const addr = await rli.question('Enter the contract address (hex): ');
          return await api.joinContract(providers, addr);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`  ✗ Failed to join: ${msg}\n`);
        }
        break;
      case '3':
        return null;
      default:
        console.log(`  Invalid choice: ${choice}`);
    }
  }
};

const mainLoop = async (providers: VerdictProviders, walletCtx: WalletContext, rli: Interface): Promise<void> => {
  const contract = await deployOrJoin(providers, rli);
  if (contract === null) return;

  const contractAddress = contract.deployTxData.public.contractAddress;

  while (true) {
    const choice = await rli.question(verdictMenu());
    switch (choice.trim()) {
      case '1':
        try {
          await api.withStatus('Starting session (genesis hash)', () =>
            contract.callTx.startSession(new Uint8Array(32)),
          );
          console.log('  ✓ Session started.\n');
        } catch (e) {
          console.log(`  ✗ startSession failed: ${e instanceof Error ? e.message : e}\n`);
        }
        break;

      case '2':
        try {
          // First commit, then verify with a legal move
          await api.withStatus('Committing move (CLEAN)', () =>
            contract.callTx.commitMove(new Uint8Array(32)),
          );
          await api.withStatus('Verifying transition (CLEAN — legal move)', () =>
            contract.callTx.verifyTransition(
              100n,  // maxVelocity
              50n,   // maxAcceleration
              1000n, // boundX
              1000n, // boundY
              4n,    // validActionCount
              8n,    // maxActionsPerWindow
              100n,  // windowSize
              10n,   // minDiversity
              1000n, // snapThreshold
              4n,    // maxSnaps
              14n,   // maxCorrelation
              new Uint8Array(32), // enemyPosHashPublic
            ),
          );
          console.log('  ✓ Verification complete — reading ledger...\n');
          const state = await api.getVerdictLedgerState(providers, contractAddress);
          if (state) {
            console.log(`    totalChecks:  ${state.totalChecks}`);
            console.log(`    totalFlagged: ${state.totalFlagged}`);
            console.log(`    lastVerdict:  ${state.lastVerdict === 0 ? 'CLEAN' : 'FLAGGED'}\n`);
          }
        } catch (e) {
          console.log(`  ✗ CLEAN verify failed: ${e instanceof Error ? e.message : e}\n`);
        }
        break;

      case '3':
        try {
          await api.withStatus('Committing move (CHEAT)', () =>
            contract.callTx.commitMove(new Uint8Array(32)),
          );
          // Teleport cheat: move from (0,0) to (999,999) — velocity = 1998 >> 100
          // The witness provider needs to be updated to reflect this
          // For now this demonstrates the circuit path
          await api.withStatus('Verifying transition (CHEAT — teleport)', () =>
            contract.callTx.verifyTransition(
              100n,  // maxVelocity (will be exceeded)
              50n,
              1000n,
              1000n,
              4n,
              8n,
              100n,
              10n,
              1000n,
              4n,
              14n,
              new Uint8Array(32),
            ),
          );
          console.log('  ✓ Cheat verification complete — reading ledger...\n');
          const state = await api.getVerdictLedgerState(providers, contractAddress);
          if (state) {
            console.log(`    totalChecks:  ${state.totalChecks}`);
            console.log(`    totalFlagged: ${state.totalFlagged}`);
            console.log(`    lastVerdict:  ${state.lastVerdict === 0 ? 'CLEAN' : 'FLAGGED'}\n`);
          }
        } catch (e) {
          console.log(`  ✗ CHEAT verify failed: ${e instanceof Error ? e.message : e}\n`);
        }
        break;

      case '4':
        try {
          const state = await api.getVerdictLedgerState(providers, contractAddress);
          if (state) {
            console.log(`\n    totalChecks:   ${state.totalChecks}`);
            console.log(`    totalFlagged:  ${state.totalFlagged}`);
            console.log(`    lastVerdict:   ${state.lastVerdict === 0 ? 'CLEAN' : 'FLAGGED'}`);
            console.log(`    sessionActive: ${state.sessionActive}\n`);
          } else {
            console.log('  No state found.\n');
          }
        } catch (e) {
          console.log(`  ✗ Read failed: ${e instanceof Error ? e.message : e}\n`);
        }
        break;

      case '5':
        return;
      default:
        console.log(`  Invalid choice: ${choice}`);
    }
  }
};

const mapContainerPort = (env: StartedDockerComposeEnvironment, url: string, containerName: string) => {
  const mappedUrl = new URL(url);
  const container = env.getContainer(containerName);
  mappedUrl.port = String(container.getFirstMappedPort());
  return mappedUrl.toString().replace(/\/+$/, '');
};

export const run = async (config: Config, _logger: Logger, dockerEnv?: DockerComposeEnvironment): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);
  console.log(BANNER);

  const rli = createInterface({ input, output, terminal: true });
  let env: StartedDockerComposeEnvironment | undefined;

  try {
    if (dockerEnv !== undefined) {
      env = await dockerEnv.up();
      if (config instanceof StandaloneConfig) {
        config.indexer = mapContainerPort(env, config.indexer, 'verdict-indexer');
        config.indexerWS = mapContainerPort(env, config.indexerWS, 'verdict-indexer');
        config.node = mapContainerPort(env, config.node, 'verdict-node');
        config.proofServer = mapContainerPort(env, config.proofServer, 'verdict-proof-server');
      }
    }

    const walletCtx = await buildWallet(config, rli);
    if (walletCtx === null) return;

    try {
      const providers = await api.withStatus('Configuring providers', () => api.configureProviders(walletCtx, config));
      console.log('');
      await mainLoop(providers, walletCtx, rli);
    } catch (e) {
      if (e instanceof Error) {
        logger.error(`Error: ${e.message}`);
        logger.debug(`${e.stack}`);
      } else throw e;
    } finally {
      try { await walletCtx.wallet.stop(); } catch (e) { logger.error(`Error stopping wallet: ${e}`); }
    }
  } finally {
    rli.close();
    rli.removeAllListeners();
    if (env !== undefined) {
      try { await env.down(); } catch (e) { logger.error(`Error shutting down docker: ${e}`); }
    }
    logger.info('Goodbye.');
  }
};
