import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterPage,
  AdapterPageRequest,
  AdapterResult,
  DocumentIngestRequest,
  DocumentPointer,
  DocumentStoreAdapter
} from "@canopy/contracts-adapters";
import type { CanopyId, ContentHash, IsoDateTime } from "@canopy/contracts-kernel";

export interface ProviderAdapterTrack {
  readonly id: CanopyId;
  readonly descriptor: AdapterDescriptor;
  readonly status: "planned" | "prototype";
  readonly packagePath: string;
  readonly conformanceSuiteKind: AdapterDescriptor["kind"];
  readonly productionGates: readonly CanopyId[];
}

export interface PostgresDocumentStorePrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly seedDocuments?: readonly DocumentPointer[];
}

export interface PostgresDocumentStorePrototypeSnapshot {
  readonly documents: readonly DocumentPointer[];
}

export const postgresDocumentStoreAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "document-store";
} = {
  id: "adapter.provider.postgres.document-store",
  kind: "document-store",
  name: "Postgres document store adapter",
  provider: "postgres",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "export", "redaction", "audit"],
  supportedObjectTypes: ["source", "evidence", "decision-packet"],
  supportedEventTypes: []
};

export const postgresDocumentStoreAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.document-store.postgres",
  descriptor: postgresDocumentStoreAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/postgres-document-store",
  conformanceSuiteKind: "document-store",
  productionGates: [
    "adapter.document-store.content-hash-stable",
    "adapter.document-store.redaction-stubs"
  ]
};

export function postgresDocumentStoreAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: postgresDocumentStoreAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the Postgres document-store in-memory prototype; no Postgres client is bound yet."
    ]
  };
}

export function createPostgresDocumentStoreAdapter(
  options: PostgresDocumentStorePrototypeOptions = {}
): PostgresDocumentStoreAdapter {
  return new PostgresDocumentStoreAdapter(options);
}

export class PostgresDocumentStoreAdapter implements DocumentStoreAdapter {
  readonly descriptor = postgresDocumentStoreAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly documents = new Map<CanopyId, DocumentPointer>();

  constructor(options: PostgresDocumentStorePrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const pointer of options.seedDocuments ?? []) {
      this.documents.set(pointer.id, freeze(pointer));
    }
  }

  async health(): Promise<AdapterHealth> {
    return postgresDocumentStoreAdapterHealth(this.now());
  }

  async ingestDocument(
    request: DocumentIngestRequest
  ): Promise<AdapterResult<DocumentPointer>> {
    if (request.authorityRefs.length === 0) {
      return failure("forbidden", "Document ingestion requires authority refs.", [
        "authorityRefs"
      ]);
    }

    const content = request.bytes ?? new TextEncoder().encode(request.text ?? request.uri ?? "");
    const contentHash = hashBytes(content);
    const pointer = freeze(
      withoutUndefined({
        id: `document.${contentHash.slice("sha256:".length)}`,
        objectRef: freeze(request.objectRef),
        uri: request.uri ?? `postgres://document-store/${request.objectRef.id}`,
        format: request.format,
        contentHash,
        source: request.source,
        schemaVersion: 1
      }) as DocumentPointer
    );

    this.documents.set(pointer.id, pointer);
    return ok(pointer);
  }

  async getDocument(pointer: DocumentPointer): Promise<AdapterResult<DocumentPointer>> {
    return ok(this.documents.get(pointer.id) ?? freeze(pointer));
  }

  async searchDocuments(
    query: string,
    pageRequest?: AdapterPageRequest
  ): Promise<AdapterResult<AdapterPage<DocumentPointer>>> {
    const normalizedQuery = query.toLowerCase();
    const documents = [...this.documents.values()]
      .filter(
        (pointer) =>
          pointer.id.toLowerCase().includes(normalizedQuery) ||
          pointer.uri.toLowerCase().includes(normalizedQuery) ||
          pointer.objectRef.id.toLowerCase().includes(normalizedQuery)
      )
      .sort((left, right) => compareStrings(left.id, right.id));

    return ok(page(documents, pageRequest));
  }

  snapshot(): PostgresDocumentStorePrototypeSnapshot {
    return freeze({
      documents: [...this.documents.values()].sort((left, right) =>
        compareStrings(left.id, right.id)
      )
    });
  }
}

const defaultNow = (): IsoDateTime => new Date().toISOString();

function ok<TValue>(value: TValue): AdapterResult<TValue> {
  return { ok: true, value, errors: [] };
}

function failure<TValue>(
  code: AdapterError["code"],
  message: string,
  path: readonly string[] = [],
  retryable = false
): AdapterResult<TValue> {
  return {
    ok: false,
    errors: [{ code, message, path, retryable }]
  };
}

function page<TValue>(
  values: readonly TValue[],
  request: AdapterPageRequest = {}
): AdapterPage<TValue> {
  const start = request.cursor === undefined ? 0 : Number.parseInt(request.cursor, 10);
  const offset = Number.isFinite(start) && start >= 0 ? start : 0;
  const limit = request.limit ?? values.length;
  const items = values.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  const hasMore = nextOffset < values.length;

  return hasMore ? { items, nextCursor: String(nextOffset), hasMore } : { items, hasMore };
}

function hashBytes(bytes: Uint8Array): ContentHash {
  return hashString([...bytes].join(","));
}

function hashString(value: string): ContentHash {
  let hash = 0;
  for (const char of value) {
    hash = (Math.imul(31, hash) + char.charCodeAt(0)) >>> 0;
  }

  return `sha256:postgres-document-${hash.toString(16).padStart(8, "0")}`;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function withoutUndefined<TValue extends Record<string, unknown>>(value: TValue): TValue {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as TValue;
}

function freeze<TValue>(value: TValue): TValue {
  if (value instanceof Uint8Array) {
    return new Uint8Array(value) as TValue;
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freeze(entry))) as TValue;
  }

  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        copy[key] = freeze(entry);
      }
    }
    return Object.freeze(copy) as TValue;
  }

  return value;
}
