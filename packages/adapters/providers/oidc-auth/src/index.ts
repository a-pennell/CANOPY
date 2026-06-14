import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterResult,
  AuthAdapter,
  AuthSessionPrincipal,
  LinkAuthAccountRequest,
  ResolveAuthSessionRequest
} from "@canopy/contracts-adapters";
import type { CanopyId, IsoDateTime, ObjectRef } from "@canopy/contracts-kernel";

export interface ProviderAdapterTrack {
  readonly id: CanopyId;
  readonly descriptor: AdapterDescriptor;
  readonly status: "planned" | "prototype";
  readonly packagePath: string;
  readonly conformanceSuiteKind: AdapterDescriptor["kind"];
  readonly productionGates: readonly CanopyId[];
}

export interface OidcAuthPrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly issuer?: string;
  readonly seedAccounts?: readonly OidcLinkedAccount[];
}

export interface OidcLinkedAccount {
  readonly accountRef: ObjectRef;
  readonly personRef: ObjectRef;
  readonly provider: string;
  readonly providerSubject: string;
  readonly handle: string;
  readonly authorityRefs: readonly ObjectRef[];
  readonly linkedAt: IsoDateTime;
  readonly revokedAt?: IsoDateTime;
}

export interface OidcAuthPrototypeSnapshot {
  readonly issuer: string;
  readonly accounts: readonly OidcLinkedAccount[];
}

export const oidcAuthAdapterDescriptor: AdapterDescriptor & { readonly kind: "auth" } = {
  id: "adapter.provider.oidc.auth",
  kind: "auth",
  name: "OIDC auth adapter",
  provider: "oidc",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "audit"],
  supportedObjectTypes: ["account", "person", "role"],
  supportedEventTypes: ["identity.account.linked", "identity.session.revoked"]
};

export const oidcAuthAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.auth.oidc",
  descriptor: oidcAuthAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/oidc-auth",
  conformanceSuiteKind: "auth",
  productionGates: [
    "adapter.auth.subject-account-separation",
    "adapter.auth.permission-trace-required"
  ]
};

export function oidcAuthAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: oidcAuthAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the OIDC auth in-memory prototype; no external issuer or JWKS verification is bound yet."
    ]
  };
}

export function createOidcAuthAdapter(
  options: OidcAuthPrototypeOptions = {}
): OidcAuthAdapter {
  return new OidcAuthAdapter(options);
}

export class OidcAuthAdapter implements AuthAdapter {
  readonly descriptor = oidcAuthAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly issuer: string;
  private readonly accountsBySubject = new Map<string, OidcLinkedAccount>();
  private readonly accountsByRef = new Map<string, OidcLinkedAccount>();

  constructor(options: OidcAuthPrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;
    this.issuer = options.issuer ?? "https://issuer.canopy.local";

    for (const account of options.seedAccounts ?? []) {
      this.store(account);
    }
  }

  async health(): Promise<AdapterHealth> {
    return oidcAuthAdapterHealth(this.now());
  }

  async resolveSession(
    request: ResolveAuthSessionRequest
  ): Promise<AdapterResult<AuthSessionPrincipal>> {
    const subject = request.providerSubject ?? request.tokenHint ?? request.providerSessionId;
    if (subject === undefined) {
      return failure("unauthorized", "OIDC session resolution requires a subject hint.", [
        "providerSubject"
      ]);
    }

    const linked = this.accountsBySubject.get(subject);
    if (linked === undefined || linked.revokedAt !== undefined) {
      return failure("not_found", `No active OIDC account is linked for ${subject}.`, [
        "providerSubject"
      ]);
    }

    return ok({
      accountRef: cloneRef(linked.accountRef),
      personRef: cloneRef(linked.personRef),
      membershipRefs: linked.authorityRefs.map((ref, index) =>
        authorityTraceRef("membership", linked, ref, index)
      ),
      roleAssignmentRefs: linked.authorityRefs.map((ref, index) =>
        authorityTraceRef("role-assignment", linked, ref, index)
      )
    });
  }

  async linkAccount(
    request: LinkAuthAccountRequest
  ): Promise<AdapterResult<ObjectRef>> {
    if (request.authorityRefs.length === 0) {
      return failure("forbidden", "Linking OIDC accounts requires authority refs.", [
        "authorityRefs"
      ]);
    }

    const existing = this.accountsBySubject.get(request.providerSubject);
    if (existing !== undefined && existing.revokedAt === undefined) {
      return ok(cloneRef(existing.accountRef));
    }

    const account: OidcLinkedAccount = freeze({
      accountRef: freeze({
        id: `account.oidc.${request.provider}.${request.providerSubject}`,
        type: "account",
        namespace: "canopy.provider.oidc",
        lifecycleStatus: "active"
      }),
      personRef: cloneRef(request.personRef),
      provider: request.provider,
      providerSubject: request.providerSubject,
      handle: request.handle,
      authorityRefs: request.authorityRefs.map(cloneRef),
      linkedAt: this.now()
    });

    this.store(account);
    return ok(cloneRef(account.accountRef));
  }

  async revokeSession(
    accountRef: ObjectRef,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>> {
    if (authorityRefs.length === 0) {
      return failure("forbidden", "Revoking OIDC sessions requires authority refs.", [
        "authorityRefs"
      ]);
    }

    const linked = this.accountsByRef.get(refKey(accountRef));
    if (linked === undefined) {
      return failure("not_found", `OIDC account ${accountRef.id} was not found.`, [
        "accountRef"
      ]);
    }

    this.store(freeze({ ...linked, revokedAt: this.now() }));
    return ok(undefined);
  }

  snapshot(): OidcAuthPrototypeSnapshot {
    return freeze({
      issuer: this.issuer,
      accounts: [...this.accountsByRef.values()].sort((left, right) =>
        compareStrings(left.accountRef.id, right.accountRef.id)
      )
    });
  }

  private store(account: OidcLinkedAccount): void {
    const frozen = freeze({
      ...account,
      accountRef: cloneRef(account.accountRef),
      personRef: cloneRef(account.personRef),
      authorityRefs: account.authorityRefs.map(cloneRef)
    });
    this.accountsBySubject.set(frozen.providerSubject, frozen);
    this.accountsByRef.set(refKey(frozen.accountRef), frozen);
  }
}

function authorityTraceRef(
  kind: "membership" | "role-assignment",
  account: OidcLinkedAccount,
  authorityRef: ObjectRef,
  index: number
): ObjectRef {
  return freeze({
    id: `${kind}.oidc.${account.providerSubject}.${index}.${authorityRef.id}`,
    type: "role",
    namespace: "canopy.provider.oidc",
    lifecycleStatus: authorityRef.lifecycleStatus
  });
}

function ok<TValue>(value: TValue): AdapterResult<TValue> {
  return { ok: true, value, errors: [] };
}

function failure<TValue>(
  code: AdapterError["code"],
  message: string,
  path: readonly string[] = [],
  retryable = false
): AdapterResult<TValue> {
  return { ok: false, errors: [{ code, message, path, retryable }] };
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}:${ref.lifecycleStatus}`;
}

function cloneRef(ref: ObjectRef): ObjectRef {
  return freeze(
    withoutUndefined({
      ...ref,
      source: ref.source === undefined ? undefined : { ...ref.source },
      supersedes: ref.supersedes === undefined ? undefined : [...ref.supersedes]
    }) as ObjectRef
  );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function defaultNow(): IsoDateTime {
  return new Date().toISOString();
}

function withoutUndefined<TValue extends Readonly<Record<string, unknown>>>(
  value: TValue
): TValue {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as TValue;
}

function freeze<TValue>(value: TValue): TValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freeze(entry))) as TValue;
  }

  if (value !== null && typeof value === "object") {
    return Object.freeze(value);
  }

  return value;
}
