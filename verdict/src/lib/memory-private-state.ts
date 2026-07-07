import type { ContractAddress, SigningKey } from "@midnight-ntwrk/compact-runtime";
import type { PrivateStateId, PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";

/** In-memory private state for browser circuit calls (no LevelDB). */
export function memoryPrivateStateProvider<
  PSI extends PrivateStateId,
  PS = unknown,
>(): PrivateStateProvider<PSI, PS> {
  const states = new Map<PSI, PS>();
  const keys = new Map<ContractAddress, SigningKey>();

  return {
    async set(id, state) {
      states.set(id, state);
    },
    async get(id) {
      return states.get(id) ?? null;
    },
    async remove(id) {
      states.delete(id);
    },
    async clear() {
      states.clear();
    },
    async setSigningKey(address, signingKey) {
      keys.set(address, signingKey);
    },
    async getSigningKey(address) {
      return keys.get(address) ?? null;
    },
    async removeSigningKey(address) {
      keys.delete(address);
    },
    async clearSigningKeys() {
      keys.clear();
    },
  };
}
