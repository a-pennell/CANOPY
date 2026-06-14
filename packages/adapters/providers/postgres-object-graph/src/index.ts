import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterResult,
  ObjectGraphAdapter,
  ObjectGraphQuery,
  ObjectGraphSnapshot,
  ObjectRelationshipWrite
} from "@canopy/contracts-adapters";
import type { CanopyId, IsoDateTime, ObjectRef, RelationshipRef } from "@canopy/contracts-kernel";

export interface ProviderAdapterTrack {
  readonly id: CanopyId;
  readonly descriptor: AdapterDescriptor;
  readonly status: "planned" | "prototype";
  readonly packagePath: string;
  readonly conformanceSuiteKind: AdapterDescriptor["kind"];
  readonly productionGates: readonly CanopyId[];
}

export interface PostgresObjectGraphPrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly seedRelationships?: readonly RelationshipRef[];
}

export interface PostgresObjectGraphPrototypeSnapshot {
  readonly relationships: readonly RelationshipRef[];
}

export const postgresObjectGraphAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "object-graph";
} = {
  id: "adapter.provider.postgres.object-graph",
  kind: "object-graph",
  name: "Postgres object graph adapter",
  provider: "postgres",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "search", "audit"],
  supportedObjectTypes: [],
  supportedEventTypes: []
};

export const postgresObjectGraphAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.object-graph.postgres",
  descriptor: postgresObjectGraphAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/postgres-object-graph",
  conformanceSuiteKind: "object-graph",
  productionGates: [
    "adapter.object-graph.relationship-direction-preserved",
    "adapter.object-graph.lifecycle-filtering"
  ]
};

export function postgresObjectGraphAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: postgresObjectGraphAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the Postgres object-graph in-memory prototype; no Postgres graph tables are bound yet."
    ]
  };
}

export function createPostgresObjectGraphAdapter(
  options: PostgresObjectGraphPrototypeOptions = {}
): PostgresObjectGraphAdapter {
  return new PostgresObjectGraphAdapter(options);
}

export class PostgresObjectGraphAdapter implements ObjectGraphAdapter {
  readonly descriptor = postgresObjectGraphAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly relationships: RelationshipRef[] = [];

  constructor(options: PostgresObjectGraphPrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;
    this.relationships.push(...(options.seedRelationships ?? []).map(cloneRelationship));
  }

  async health(): Promise<AdapterHealth> {
    return postgresObjectGraphAdapterHealth(this.now());
  }

  async putRelationship(
    write: ObjectRelationshipWrite
  ): Promise<AdapterResult<RelationshipRef>> {
    if (write.authorityRefs.length === 0) {
      return failure("forbidden", "Object graph writes require authority refs.", [
        "authorityRefs"
      ]);
    }

    const relationship = cloneRelationship(write.relationship);
    const existingIndex = this.relationships.findIndex(
      (candidate) => relationshipKey(candidate) === relationshipKey(relationship)
    );
    if (existingIndex >= 0) {
      this.relationships[existingIndex] = relationship;
    } else {
      this.relationships.push(relationship);
    }

    return ok(relationship);
  }

  async queryGraph(query: ObjectGraphQuery): Promise<AdapterResult<ObjectGraphSnapshot>> {
    const maxDepth = query.maxDepth ?? 1;
    const seen = new Map<string, ObjectRef>([[refKey(query.rootRef), cloneRef(query.rootRef)]]);
    const selected = new Map<string, RelationshipRef>();
    let frontier = [query.rootRef];

    for (let depth = 0; depth < maxDepth; depth += 1) {
      const next: ObjectRef[] = [];

      for (const root of frontier) {
        for (const relationship of this.relationships) {
          const outgoing = query.includeOutgoing && sameRef(relationship.from, root);
          const incoming = query.includeIncoming && sameRef(relationship.to, root);
          const kindMatches =
            query.relationshipKinds === undefined ||
            query.relationshipKinds.includes(relationship.kind);

          if (!kindMatches || (!outgoing && !incoming)) {
            continue;
          }

          const other = outgoing ? relationship.to : relationship.from;
          if (other.lifecycleStatus === "redacted") {
            continue;
          }

          selected.set(relationshipKey(relationship), relationship);
          if (!seen.has(refKey(other))) {
            seen.set(refKey(other), cloneRef(other));
            next.push(other);
          }
        }
      }

      frontier = next;
    }

    return ok({
      rootRef: cloneRef(query.rootRef),
      objectRefs: [...seen.values()].filter((ref) => ref.lifecycleStatus !== "redacted"),
      relationships: [...selected.values()].filter(
        (relationship) =>
          relationship.from.lifecycleStatus !== "redacted" &&
          relationship.to.lifecycleStatus !== "redacted"
      ),
      builtAt: this.now()
    });
  }

  snapshot(): PostgresObjectGraphPrototypeSnapshot {
    return freeze({
      relationships: [...this.relationships].sort((left, right) =>
        compareStrings(relationshipKey(left), relationshipKey(right))
      )
    });
  }
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

function relationshipKey(relationship: RelationshipRef): string {
  return `${refKey(relationship.from)}>${relationship.kind}>${refKey(relationship.to)}`;
}

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}:${ref.lifecycleStatus}`;
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function cloneRelationship(relationship: RelationshipRef): RelationshipRef {
  return freeze({
    ...(withoutUndefined({
      ...relationship,
      from: cloneRef(relationship.from),
      to: cloneRef(relationship.to),
      assertedBy:
        relationship.assertedBy === undefined ? undefined : cloneRef(relationship.assertedBy),
      validFrom: relationship.validFrom,
      validUntil: relationship.validUntil
    }) as RelationshipRef)
  });
}

function cloneRef(ref: ObjectRef): ObjectRef {
  return freeze({
    ...(withoutUndefined({
      ...ref,
      source: ref.source === undefined ? undefined : { ...ref.source },
      supersedes: ref.supersedes === undefined ? undefined : [...ref.supersedes]
    }) as ObjectRef)
  });
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
  return Object.freeze(value);
}
