import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterResult,
  VectorAdapter,
  VectorEmbedding,
  VectorSearchHit,
  VectorSearchQuery
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

export interface PgvectorVectorPrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly seedEmbeddings?: readonly VectorEmbedding[];
}

export interface PgvectorVectorPrototypeSnapshot {
  readonly embeddings: readonly VectorEmbedding[];
}

export const pgvectorVectorAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "vector";
} = {
  id: "adapter.provider.pgvector.vector",
  kind: "vector",
  name: "pgvector vector adapter",
  provider: "pgvector",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "search", "redaction", "audit"],
  supportedObjectTypes: ["claim", "evidence", "source", "model"],
  supportedEventTypes: []
};

export const pgvectorVectorAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.vector.pgvector",
  descriptor: pgvectorVectorAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/pgvector-vector",
  conformanceSuiteKind: "vector",
  productionGates: [
    "adapter.vector.source-ref-preserved",
    "adapter.vector.stewardship-filtering"
  ]
};

export function pgvectorVectorAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: pgvectorVectorAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the pgvector in-memory prototype; no Postgres pgvector index is bound yet."
    ]
  };
}

export function createPgvectorVectorAdapter(
  options: PgvectorVectorPrototypeOptions = {}
): PgvectorVectorAdapter {
  return new PgvectorVectorAdapter(options);
}

export class PgvectorVectorAdapter implements VectorAdapter {
  readonly descriptor = pgvectorVectorAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly embeddings = new Map<CanopyId, VectorEmbedding>();

  constructor(options: PgvectorVectorPrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const embedding of options.seedEmbeddings ?? []) {
      this.embeddings.set(embedding.id, cloneEmbedding(embedding));
    }
  }

  async health(): Promise<AdapterHealth> {
    return pgvectorVectorAdapterHealth(this.now());
  }

  async upsertEmbedding(
    embedding: VectorEmbedding,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<VectorEmbedding>> {
    if (authorityRefs.length === 0) {
      return failure("forbidden", "Vector embedding writes require authority refs.", [
        "authorityRefs"
      ]);
    }
    if (embedding.values.length !== embedding.dimensions) {
      return failure("validation_failed", "Embedding dimensions do not match values.", [
        "dimensions"
      ]);
    }

    const stored = cloneEmbedding(embedding);
    this.embeddings.set(stored.id, stored);
    return ok(stored);
  }

  async search(
    query: VectorSearchQuery
  ): Promise<AdapterResult<readonly VectorSearchHit[]>> {
    if (query.vector.length !== query.dimensions) {
      return failure("validation_failed", "Search vector dimensions do not match values.", [
        "dimensions"
      ]);
    }

    const hits = [...this.embeddings.values()]
      .filter((embedding) => embedding.dimensions === query.dimensions)
      .filter(
        (embedding) =>
          query.objectTypes === undefined || query.objectTypes.includes(embedding.objectRef.type)
      )
      .map((embedding) => freeze({ embedding, score: cosine(query.vector, embedding.values) }))
      .filter((hit) => query.minScore === undefined || hit.score >= query.minScore)
      .sort(
        (left, right) =>
          right.score - left.score || compareStrings(left.embedding.id, right.embedding.id)
      )
      .slice(0, query.limit);

    return ok(hits);
  }

  snapshot(): PgvectorVectorPrototypeSnapshot {
    return freeze({
      embeddings: [...this.embeddings.values()].sort((left, right) =>
        compareStrings(left.id, right.id)
      )
    });
  }
}

function cosine(left: readonly number[], right: readonly number[]): number {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
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

function cloneEmbedding(embedding: VectorEmbedding): VectorEmbedding {
  return freeze({
    ...(withoutUndefined({
      ...embedding,
      objectRef: cloneRef(embedding.objectRef),
      modelRef: embedding.modelRef === undefined ? undefined : cloneRef(embedding.modelRef)
    }) as Omit<VectorEmbedding, "values">),
    values: [...embedding.values]
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
