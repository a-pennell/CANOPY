import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterPage,
  AdapterPageRequest,
  AdapterResult,
  GeoQuery,
  GeoShape,
  GeospatialAdapter
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

export interface PostgisGeospatialPrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly seedShapes?: readonly GeoShape[];
}

export interface PostgisGeospatialPrototypeSnapshot {
  readonly shapes: readonly GeoShape[];
}

export const postgisGeospatialAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "geospatial";
} = {
  id: "adapter.provider.postgis.geospatial",
  kind: "geospatial",
  name: "PostGIS geospatial adapter",
  provider: "postgis",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["read", "write", "search", "audit"],
  supportedObjectTypes: ["place", "commons", "living-system", "resource"],
  supportedEventTypes: []
};

export const postgisGeospatialAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.geospatial.postgis",
  descriptor: postgisGeospatialAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/postgis-geospatial",
  conformanceSuiteKind: "geospatial",
  productionGates: [
    "adapter.geospatial.place-scope-query",
    "adapter.geospatial.geometry-round-trip"
  ]
};

export function postgisGeospatialAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: postgisGeospatialAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the PostGIS geospatial in-memory prototype; no PostGIS connection is bound yet."
    ]
  };
}

export function createPostgisGeospatialAdapter(
  options: PostgisGeospatialPrototypeOptions = {}
): PostgisGeospatialAdapter {
  return new PostgisGeospatialAdapter(options);
}

export class PostgisGeospatialAdapter implements GeospatialAdapter {
  readonly descriptor = postgisGeospatialAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly shapes = new Map<CanopyId, GeoShape>();

  constructor(options: PostgisGeospatialPrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const shape of options.seedShapes ?? []) {
      this.shapes.set(shape.id, cloneShape(shape));
    }
  }

  async health(): Promise<AdapterHealth> {
    return postgisGeospatialAdapterHealth(this.now());
  }

  async putShape(
    shape: GeoShape,
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<GeoShape>> {
    if (authorityRefs.length === 0) {
      return failure("forbidden", "Geospatial shape writes require authority refs.", [
        "authorityRefs"
      ]);
    }

    const stored = cloneShape(shape);
    this.shapes.set(stored.id, stored);
    return ok(stored);
  }

  async queryShapes(query: GeoQuery): Promise<AdapterResult<AdapterPage<GeoShape>>> {
    const anchor = query.near ?? query.within ?? query.intersects;
    const items = [...this.shapes.values()]
      .filter(
        (shape) =>
          query.objectTypes === undefined || query.objectTypes.includes(shape.objectRef.type)
      )
      .filter((shape) => anchor === undefined || shapeMatchesAnchor(shape, anchor))
      .sort((left, right) => compareStrings(left.id, right.id));

    return ok(page(items, query.page));
  }

  snapshot(): PostgisGeospatialPrototypeSnapshot {
    return freeze({
      shapes: [...this.shapes.values()].sort((left, right) =>
        compareStrings(left.id, right.id)
      )
    });
  }
}

function shapeMatchesAnchor(shape: GeoShape, anchor: GeoShape): boolean {
  return (
    shape.id === anchor.id ||
    sameRef(shape.objectRef, anchor.objectRef) ||
    stableStringify(shape.coordinates) === stableStringify(anchor.coordinates)
  );
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

function cloneShape(shape: GeoShape): GeoShape {
  return freeze({
    ...(withoutUndefined({
      ...shape,
      objectRef: cloneRef(shape.objectRef),
      source: shape.source === undefined ? undefined : { ...shape.source }
    }) as Omit<GeoShape, "coordinates">),
    coordinates: JSON.parse(JSON.stringify(shape.coordinates)) as unknown
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

function refKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}:${ref.lifecycleStatus}`;
}

function sameRef(left: ObjectRef, right: ObjectRef): boolean {
  return refKey(left) === refKey(right);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
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
