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
