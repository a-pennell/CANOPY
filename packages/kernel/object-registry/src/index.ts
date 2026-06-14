import type {
  CanopyId,
  IsoDateTime,
  LocalSourcePointer,
  ObjectRef
} from "@canopy/contracts-kernel";

export type ObjectRegistryErrorCode =
  | "object-ref-conflict"
  | "source-mapping-conflict"
  | "unknown-object-ref";

export class ObjectRegistryError extends Error {
  readonly code: ObjectRegistryErrorCode;

  constructor(code: ObjectRegistryErrorCode, message: string) {
    super(message);
    this.name = "ObjectRegistryError";
    this.code = code;
  }
}

export interface SourceSupersessionMetadata {
  readonly supersededAt?: IsoDateTime;
  readonly reason?: string;
  readonly assertedByRef?: ObjectRef;
}

export interface SourceMappingSupersession
  extends SourceSupersessionMetadata {
  readonly previousRef: ObjectRef;
  readonly supersededByRef: ObjectRef;
}

export interface SourceMapping {
  readonly source: LocalSourcePointer;
  readonly ref: ObjectRef;
  readonly supersession?: SourceMappingSupersession;
}

export interface ObjectRegistrySnapshot {
  readonly refs: readonly ObjectRef[];
  readonly sourceMappings: readonly SourceMapping[];
}

export interface ObjectRegistry {
  register(ref: ObjectRef): ObjectRef;
  resolve(refOrId: ObjectRef | CanopyId): ObjectRef | undefined;
  require(refOrId: ObjectRef | CanopyId): ObjectRef;
  mapSource(
    source: LocalSourcePointer,
    ref: ObjectRef,
    supersession?: SourceSupersessionMetadata
  ): SourceMapping;
  resolveSource(source: LocalSourcePointer): ObjectRef | undefined;
  getSourceMapping(source: LocalSourcePointer): SourceMapping | undefined;
  listRefs(): readonly ObjectRef[];
  listSourceMappings(): readonly SourceMapping[];
  snapshot(): ObjectRegistrySnapshot;
}

export interface CreateObjectRegistryOptions {
  readonly refs?: readonly ObjectRef[];
  readonly sourceMappings?: readonly SourceMapping[];
}

export function createObjectRegistry(
  options: CreateObjectRegistryOptions = {}
): ObjectRegistry {
  return new InMemoryObjectRegistry(options);
}

export class InMemoryObjectRegistry implements ObjectRegistry {
  private readonly refsById = new Map<CanopyId, ObjectRef>();
  private readonly sourceMappingsByKey = new Map<string, SourceMapping>();

  constructor(options: CreateObjectRegistryOptions = {}) {
    for (const ref of options.refs ?? []) {
      this.register(ref);
    }

    for (const mapping of options.sourceMappings ?? []) {
      this.mapSource(mapping.source, mapping.ref, mapping.supersession);
    }
  }

  register(ref: ObjectRef): ObjectRef {
    const existing = this.refsById.get(ref.id);
    if (existing !== undefined) {
      if (!sameObjectRef(existing, ref)) {
        throw new ObjectRegistryError(
          "object-ref-conflict",
          `ObjectRef ${ref.id} is already registered with different structure.`
        );
      }

      return existing;
    }

    const canonical = freezeObjectRef(cloneObjectRef(ref));
    this.refsById.set(canonical.id, canonical);
    return canonical;
  }

  resolve(refOrId: ObjectRef | CanopyId): ObjectRef | undefined {
    const id = typeof refOrId === "string" ? refOrId : refOrId.id;
    return this.refsById.get(id);
  }

  require(refOrId: ObjectRef | CanopyId): ObjectRef {
    const ref = this.resolve(refOrId);
    if (ref === undefined) {
      const id = typeof refOrId === "string" ? refOrId : refOrId.id;
      throw new ObjectRegistryError(
        "unknown-object-ref",
        `ObjectRef ${id} is not registered.`
      );
    }

    return ref;
  }

  mapSource(
    source: LocalSourcePointer,
    ref: ObjectRef,
    supersession?: SourceSupersessionMetadata
  ): SourceMapping {
    const canonical = this.register(ref);
    const key = sourcePointerKey(source);
    const existing = this.sourceMappingsByKey.get(key);

    if (existing !== undefined) {
      if (existing.ref.id === canonical.id) {
        return existing;
      }

      if (supersession === undefined) {
        throw new ObjectRegistryError(
          "source-mapping-conflict",
          `Source mapping ${key} already resolves to ${existing.ref.id}.`
        );
      }
    }

    const mapping = freezeSourceMapping(
      buildSourceMapping(source, canonical, existing?.ref, supersession)
    );
    this.sourceMappingsByKey.set(key, mapping);
    return mapping;
  }

  resolveSource(source: LocalSourcePointer): ObjectRef | undefined {
    return this.getSourceMapping(source)?.ref;
  }

  getSourceMapping(source: LocalSourcePointer): SourceMapping | undefined {
    return this.sourceMappingsByKey.get(sourcePointerKey(source));
  }

  listRefs(): readonly ObjectRef[] {
    return [...this.refsById.values()];
  }

  listSourceMappings(): readonly SourceMapping[] {
    return [...this.sourceMappingsByKey.values()];
  }

  snapshot(): ObjectRegistrySnapshot {
    return {
      refs: this.listRefs(),
      sourceMappings: this.listSourceMappings()
    };
  }
}

function buildSourceMapping(
  source: LocalSourcePointer,
  ref: ObjectRef,
  previousRef?: ObjectRef,
  supersession?: SourceSupersessionMetadata
): SourceMapping {
  const clonedSource = freezeSourcePointer(cloneSourcePointer(source));

  if (previousRef === undefined || supersession === undefined) {
    return {
      source: clonedSource,
      ref
    };
  }

  return {
    source: clonedSource,
    ref,
    supersession: freezeSupersession({
      ...copySupersessionMetadata(supersession),
      previousRef,
      supersededByRef: ref
    })
  };
}

function copySupersessionMetadata(
  supersession: SourceSupersessionMetadata
): SourceSupersessionMetadata {
  const copy: {
    supersededAt?: IsoDateTime;
    reason?: string;
    assertedByRef?: ObjectRef;
  } = {};

  if (supersession.supersededAt !== undefined) {
    copy.supersededAt = supersession.supersededAt;
  }

  if (supersession.reason !== undefined) {
    copy.reason = supersession.reason;
  }

  if (supersession.assertedByRef !== undefined) {
    copy.assertedByRef = freezeObjectRef(
      cloneObjectRef(supersession.assertedByRef)
    );
  }

  return copy;
}

function sameObjectRef(left: ObjectRef, right: ObjectRef): boolean {
  return stableObjectRefJson(left) === stableObjectRefJson(right);
}

function stableObjectRefJson(ref: ObjectRef): string {
  return JSON.stringify({
    id: ref.id,
    type: ref.type,
    namespace: ref.namespace,
    lifecycleStatus: ref.lifecycleStatus,
    source: ref.source === undefined ? null : sourcePointerForJson(ref.source),
    supersedes: ref.supersedes === undefined ? null : [...ref.supersedes]
  });
}

function sourcePointerKey(source: LocalSourcePointer): string {
  return JSON.stringify(sourcePointerForJson(source));
}

function sourcePointerForJson(source: LocalSourcePointer): {
  sourceProject: LocalSourcePointer["sourceProject"];
  sourceEntity: string;
  sourceId: string;
  sourceVersion: string | null;
  importedAt: IsoDateTime | null;
} {
  return {
    sourceProject: source.sourceProject,
    sourceEntity: source.sourceEntity,
    sourceId: source.sourceId,
    sourceVersion: source.sourceVersion ?? null,
    importedAt: source.importedAt ?? null
  };
}

function cloneObjectRef(ref: ObjectRef): ObjectRef {
  const copy: {
    id: CanopyId;
    type: ObjectRef["type"];
    namespace: string;
    lifecycleStatus: ObjectRef["lifecycleStatus"];
    source?: LocalSourcePointer;
    supersedes?: readonly CanopyId[];
  } = {
    id: ref.id,
    type: ref.type,
    namespace: ref.namespace,
    lifecycleStatus: ref.lifecycleStatus
  };

  if (ref.source !== undefined) {
    copy.source = cloneSourcePointer(ref.source);
  }

  if (ref.supersedes !== undefined) {
    copy.supersedes = [...ref.supersedes];
  }

  return copy;
}

function cloneSourcePointer(source: LocalSourcePointer): LocalSourcePointer {
  const copy: {
    sourceProject: LocalSourcePointer["sourceProject"];
    sourceEntity: string;
    sourceId: string;
    sourceVersion?: string;
    importedAt?: IsoDateTime;
  } = {
    sourceProject: source.sourceProject,
    sourceEntity: source.sourceEntity,
    sourceId: source.sourceId
  };

  if (source.sourceVersion !== undefined) {
    copy.sourceVersion = source.sourceVersion;
  }

  if (source.importedAt !== undefined) {
    copy.importedAt = source.importedAt;
  }

  return copy;
}

function freezeObjectRef(ref: ObjectRef): ObjectRef {
  if (ref.source !== undefined) {
    Object.freeze(ref.source);
  }

  if (ref.supersedes !== undefined) {
    Object.freeze(ref.supersedes);
  }

  return Object.freeze(ref);
}

function freezeSourcePointer(source: LocalSourcePointer): LocalSourcePointer {
  return Object.freeze(source);
}

function freezeSupersession(
  supersession: SourceMappingSupersession
): SourceMappingSupersession {
  if (supersession.assertedByRef !== undefined) {
    freezeObjectRef(supersession.assertedByRef);
  }

  return Object.freeze(supersession);
}

function freezeSourceMapping(mapping: SourceMapping): SourceMapping {
  if (mapping.supersession !== undefined) {
    freezeSupersession(mapping.supersession);
  }

  return Object.freeze(mapping);
}
