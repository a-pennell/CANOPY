import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterResult,
  ObjectStorageAdapter,
  ObjectStoragePointer,
  ObjectStoragePutRequest
} from "@canopy/contracts-adapters";
import type { CanopyId, ContentHash, IsoDateTime, ObjectRef } from "@canopy/contracts-kernel";

export interface ProviderAdapterTrack {
  readonly id: CanopyId;
  readonly descriptor: AdapterDescriptor;
  readonly status: "planned" | "prototype";
  readonly packagePath: string;
  readonly conformanceSuiteKind: AdapterDescriptor["kind"];
  readonly productionGates: readonly CanopyId[];
}

export interface S3ObjectStorageSeedObject {
  readonly pointer: ObjectStoragePointer;
  readonly bytes: Uint8Array;
}

export interface S3ObjectStoragePrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly seedObjects?: readonly S3ObjectStorageSeedObject[];
}

export interface S3ObjectStorageSnapshotEntry {
  readonly pointer: ObjectStoragePointer;
  readonly bytes: Uint8Array;
}

export interface S3ObjectStoragePrototypeSnapshot {
  readonly objects: readonly S3ObjectStorageSnapshotEntry[];
}

export const s3ObjectStorageAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "object-storage";
} = {
  id: "adapter.provider.s3-compatible.object-storage",
  kind: "object-storage",
  name: "S3-compatible object storage adapter",
  provider: "s3-compatible",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "export", "redaction", "audit"],
  supportedObjectTypes: ["source", "evidence"],
  supportedEventTypes: []
};

export const s3ObjectStorageAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.object-storage.s3-compatible",
  descriptor: s3ObjectStorageAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/s3-object-storage",
  conformanceSuiteKind: "object-storage",
  productionGates: [
    "adapter.object-storage.object-hash-stable",
    "adapter.object-storage.namespace-isolation"
  ]
};

export function s3ObjectStorageAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: s3ObjectStorageAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the S3-compatible object-storage in-memory prototype; no S3 client is bound yet."
    ]
  };
}

export function createS3ObjectStorageAdapter(
  options: S3ObjectStoragePrototypeOptions = {}
): S3ObjectStorageAdapter {
  return new S3ObjectStorageAdapter(options);
}

export class S3ObjectStorageAdapter implements ObjectStorageAdapter {
  readonly descriptor = s3ObjectStorageAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly objects = new Map<string, Uint8Array>();
  private readonly pointers = new Map<string, ObjectStoragePointer>();

  constructor(options: S3ObjectStoragePrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const seedObject of options.seedObjects ?? []) {
      const pointer = normalizePointer(seedObject.pointer, seedObject.bytes);
      this.objects.set(storageKey(pointer), new Uint8Array(seedObject.bytes));
      this.pointers.set(storageKey(pointer), pointer);
    }
  }

  async health(): Promise<AdapterHealth> {
    return s3ObjectStorageAdapterHealth(this.now());
  }

  async putObject(
    request: ObjectStoragePutRequest
  ): Promise<AdapterResult<ObjectStoragePointer>> {
    if (request.authorityRefs.length === 0) {
      return failure("forbidden", "Object writes require authority refs.", [
        "authorityRefs"
      ]);
    }

    const pointer = normalizePointer(request.pointer, request.bytes);
    this.objects.set(storageKey(pointer), new Uint8Array(request.bytes));
    this.pointers.set(storageKey(pointer), pointer);

    return ok(pointer);
  }

  async getObject(pointer: ObjectStoragePointer): Promise<AdapterResult<Uint8Array>> {
    const bytes = this.objects.get(storageKey(pointer));

    if (bytes === undefined) {
      return failure("not_found", "Object was not found.", ["pointer"]);
    }

    return ok(new Uint8Array(bytes));
  }

  async deleteObject(
    pointer: ObjectStoragePointer,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<void>> {
    if (authorityRefs.length === 0) {
      return failure("forbidden", "Object deletion requires authority refs.", [
        "authorityRefs"
      ]);
    }

    this.objects.delete(storageKey(pointer));
    this.pointers.delete(storageKey(pointer));

    return ok(undefined);
  }

  snapshot(): S3ObjectStoragePrototypeSnapshot {
    const objects = [...this.pointers.values()]
      .sort((left, right) => compareStrings(storageKey(left), storageKey(right)))
      .map((pointer) =>
        freeze({
          pointer,
          bytes: new Uint8Array(this.objects.get(storageKey(pointer)) ?? new Uint8Array())
        })
      );

    return freeze({ objects });
  }
}

const defaultNow = (): IsoDateTime => new Date().toISOString();

function normalizePointer(
  pointer: ObjectStoragePointer,
  bytes: Uint8Array
): ObjectStoragePointer {
  return freeze(
    withoutUndefined({
      ...pointer,
      uri: pointer.uri ?? `s3://${pointer.bucket}/${pointer.key}`,
      contentHash: pointer.contentHash ?? hashBytes(bytes),
      sizeBytes: bytes.byteLength
    }) as ObjectStoragePointer
  );
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
  return {
    ok: false,
    errors: [{ code, message, path, retryable }]
  };
}

function storageKey(pointer: ObjectStoragePointer): string {
  return `${pointer.bucket}/${pointer.key}`;
}

function hashBytes(bytes: Uint8Array): ContentHash {
  return hashString([...bytes].join(","));
}

function hashString(value: string): ContentHash {
  let hash = 0;
  for (const char of value) {
    hash = (Math.imul(31, hash) + char.charCodeAt(0)) >>> 0;
  }

  return `sha256:s3-object-${hash.toString(16).padStart(8, "0")}`;
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
