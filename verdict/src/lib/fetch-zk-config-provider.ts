import {
  ZKConfigProvider,
  createProverKey,
  createVerifierKey,
  createZKIR,
  type ProverKey,
  type VerifierKey,
  type ZKIR,
} from "@midnight-ntwrk/midnight-js-types";

const KEY_DIR = "keys";
const ZKIR_DIR = "zkir";
const PROVER_EXT = ".prover";
const VERIFIER_EXT = ".verifier";
const ZKIR_EXT = ".bzkir";

/** ponytail: fetches zk artifacts over HTTP — same layout as NodeZkConfigProvider */
export class FetchZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  constructor(private readonly baseUrl: string) {
    super();
  }

  private async readFile(subDir: string, circuitId: string, ext: string): Promise<Uint8Array> {
    const url = `${this.baseUrl}/${subDir}/${circuitId}${ext}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ZK artifact not found: ${url}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  getProverKey(circuitId: K): Promise<ProverKey> {
    return this.readFile(KEY_DIR, circuitId, PROVER_EXT).then(createProverKey);
  }

  getVerifierKey(circuitId: K): Promise<VerifierKey> {
    return this.readFile(KEY_DIR, circuitId, VERIFIER_EXT).then(createVerifierKey);
  }

  getZKIR(circuitId: K): Promise<ZKIR> {
    return this.readFile(ZKIR_DIR, circuitId, ZKIR_EXT).then(createZKIR);
  }
}
