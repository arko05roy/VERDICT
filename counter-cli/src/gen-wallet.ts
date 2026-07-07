/** Print a fresh Preprod wallet seed + faucet address. No deploy, no waiting. */
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { HDWallet, Roles, generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { Buffer } from 'buffer';

setNetworkId('preprod');

const seed = toHex(Buffer.from(generateRandomSeed()));
const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
if (hdWallet.type !== 'seedOk') throw new Error('HDWallet init failed');
const derived = hdWallet.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0);
if (derived.type !== 'keysDerived') throw new Error('key derivation failed');
hdWallet.hdWallet.clear();

const address = createKeystore(derived.keys[Roles.NightExternal], getNetworkId()).getBech32Address();

console.log('\n════════════════════════════════════════');
console.log('  VERDICT Preprod Wallet (new)');
console.log('════════════════════════════════════════');
console.log(`\n  Faucet address (send tNight here):`);
console.log(`  ${address}\n`);
console.log(`  Faucet: https://faucet.preprod.midnight.network/\n`);
console.log(`  SEED (save this — needed for deploy):`);
console.log(`  ${seed}\n`);
console.log('  After funding, deploy:');
console.log(`  cd counter-cli && SEED=${seed} npm run deploy:preprod\n`);
console.log('════════════════════════════════════════\n');
