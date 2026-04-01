export interface VCLCheckUsage {
  checkId: string;
  params: Record<string, string>;
  line: number;
}

export interface VCLDocument {
  version: string;
  checks: VCLCheckUsage[];
}

export interface VCLError {
  line: number;
  message: string;
}

export type VCLParseResult =
  | { ok: true; document: VCLDocument }
  | { ok: false; errors: VCLError[] };

// New config-based output (no Compact code generation)
export interface VCLCompiledConfig {
  verifierVersion: string;
  enableMask: bigint;
  enabledChecks: string[];
  checkCount: number;
  params: Record<string, string>;
}

export type VCLConfigResult =
  | { ok: true; config: VCLCompiledConfig }
  | { ok: false; error: string };
