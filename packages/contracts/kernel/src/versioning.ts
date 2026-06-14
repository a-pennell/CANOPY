export interface ContractVersion {
  readonly name: string;
  readonly version: string;
}

export interface VersionedContract {
  readonly schemaVersion: string;
}

export interface ValidationIssue {
  readonly path: readonly string[];
  readonly code: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

export function ok(): ValidationResult {
  return { ok: true, issues: [] };
}

export function validationError(issue: ValidationIssue): ValidationResult {
  return { ok: false, issues: [issue] };
}
