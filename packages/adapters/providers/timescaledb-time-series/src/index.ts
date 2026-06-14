import type {
  AdapterDescriptor,
  AdapterError,
  AdapterHealth,
  AdapterPage,
  AdapterPageRequest,
  AdapterResult,
  TimeSeriesAdapter,
  TimeSeriesPoint,
  TimeSeriesQuery
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

export interface TimescaleTimeSeriesPrototypeOptions {
  readonly now?: () => IsoDateTime;
  readonly seedPoints?: readonly TimeSeriesPoint[];
}

export interface TimescaleTimeSeriesPrototypeSnapshot {
  readonly points: readonly TimeSeriesPoint[];
}

export const timescaleTimeSeriesAdapterDescriptor: AdapterDescriptor & {
  readonly kind: "time-series";
} = {
  id: "adapter.provider.timescaledb.time-series",
  kind: "time-series",
  name: "TimescaleDB time-series adapter",
  provider: "timescaledb",
  version: "0.0.0",
  schemaVersion: 1,
  capabilities: ["append", "read", "search", "replay", "audit"],
  supportedObjectTypes: ["indicator", "threshold", "model", "flow"],
  supportedEventTypes: []
};

export const timescaleTimeSeriesAdapterTrack: ProviderAdapterTrack = {
  id: "adapter-target.time-series.timescaledb",
  descriptor: timescaleTimeSeriesAdapterDescriptor,
  status: "prototype",
  packagePath: "packages/adapters/providers/timescaledb-time-series",
  conformanceSuiteKind: "time-series",
  productionGates: [
    "adapter.time-series.observation-order-stable",
    "adapter.time-series.window-boundaries-inclusive"
  ]
};

export function timescaleTimeSeriesAdapterHealth(checkedAt: IsoDateTime): AdapterHealth {
  return {
    adapterId: timescaleTimeSeriesAdapterDescriptor.id,
    status: "healthy",
    checkedAt,
    warnings: [
      "Using the TimescaleDB time-series in-memory prototype; no hypertable connection is bound yet."
    ]
  };
}

export function createTimescaleTimeSeriesAdapter(
  options: TimescaleTimeSeriesPrototypeOptions = {}
): TimescaleTimeSeriesAdapter {
  return new TimescaleTimeSeriesAdapter(options);
}

export class TimescaleTimeSeriesAdapter implements TimeSeriesAdapter {
  readonly descriptor = timescaleTimeSeriesAdapterDescriptor;
  private readonly now: () => IsoDateTime;
  private readonly points: TimeSeriesPoint[] = [];

  constructor(options: TimescaleTimeSeriesPrototypeOptions = {}) {
    this.now = options.now ?? defaultNow;
    this.points.push(...(options.seedPoints ?? []).map(clonePoint));
  }

  async health(): Promise<AdapterHealth> {
    return timescaleTimeSeriesAdapterHealth(this.now());
  }

  async appendPoints(
    points: readonly TimeSeriesPoint[],
    authorityRefs: readonly ObjectRef[]
  ): Promise<AdapterResult<readonly TimeSeriesPoint[]>> {
    if (authorityRefs.length === 0) {
      return failure("forbidden", "Time-series appends require authority refs.", [
        "authorityRefs"
      ]);
    }

    const stored = points.map(clonePoint);
    this.points.push(...stored);
    return ok(stored);
  }

  async queryPoints(
    query: TimeSeriesQuery
  ): Promise<AdapterResult<AdapterPage<TimeSeriesPoint>>> {
    const objectRefKeys = query.objectRefs?.map(refKey);
    const items = this.points
      .filter((point) => query.seriesIds === undefined || query.seriesIds.includes(point.seriesId))
      .filter(
        (point) => objectRefKeys === undefined || objectRefKeys.includes(refKey(point.objectRef))
      )
      .filter(
        (point) => query.measuredAfter === undefined || point.measuredAt >= query.measuredAfter
      )
      .filter(
        (point) => query.measuredBefore === undefined || point.measuredAt <= query.measuredBefore
      )
      .sort(
        (left, right) =>
          compareStrings(left.measuredAt, right.measuredAt) ||
          compareStrings(left.seriesId, right.seriesId) ||
          compareStrings(refKey(left.objectRef), refKey(right.objectRef))
      );

    return ok(page(items, query.page));
  }

  snapshot(): TimescaleTimeSeriesPrototypeSnapshot {
    return freeze({
      points: [...this.points].sort(
        (left, right) =>
          compareStrings(left.measuredAt, right.measuredAt) ||
          compareStrings(left.seriesId, right.seriesId)
      )
    });
  }
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

function clonePoint(point: TimeSeriesPoint): TimeSeriesPoint {
  return freeze({
    ...(withoutUndefined({
      ...point,
      objectRef: cloneRef(point.objectRef),
      source: point.source === undefined ? undefined : { ...point.source }
    }) as TimeSeriesPoint)
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
