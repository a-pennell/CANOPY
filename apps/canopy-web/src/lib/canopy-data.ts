import type {
  CanopyShellSession,
  PersistedCanopyShellSnapshotResult
} from "@canopy/app-shell";
import {
  buildPersistedCanopyShellSession,
  buildPersistedCanopyShellSnapshot
} from "@canopy/app-shell";
import {
  foldedSourceSampleExportBundles,
  type SampleExportBundle
} from "@canopy/database-import-plans";
import {
  createInMemoryCanonicalPersistence,
  type CanonicalPersistenceRuntime
} from "@canopy/database-runtime";
import {
  executeSampleExportBundleImports,
  type SampleExportBundleImportExecutionResult
} from "@canopy/workflows-import-execution";
import {
  buildCanopyOperationsReport,
  type CanopyOperationsReport
} from "@canopy/workflows-operations";
import {
  createInMemoryMaterializedProjectionStore,
  queryMaterializedProjections,
  type MaterializedProjectionDocument
} from "@canopy/workflows-projection-rebuild";

export interface CanopyWebModel {
  readonly generatedAt: string;
  readonly runtime: CanonicalPersistenceRuntime;
  readonly imports: readonly SampleExportBundleImportExecutionResult[];
  readonly persistedShell: PersistedCanopyShellSnapshotResult;
  readonly session: CanopyShellSession;
  readonly operations: CanopyOperationsReport;
  readonly materializedDocuments: readonly MaterializedProjectionDocument[];
  readonly bundles: readonly SampleExportBundle[];
}

const generatedAt = "2026-06-14T12:00:00.000Z";

export function getCanopyWebModel(): CanopyWebModel {
  const runtime = createInMemoryCanonicalPersistence({ now: () => generatedAt });
  const materializedProjectionStore = createInMemoryMaterializedProjectionStore();
  const imports = executeSampleExportBundleImports({
    bundles: foldedSourceSampleExportBundles,
    runtime,
    recordedAt: generatedAt,
    projectionRebuildOptions: {
      rebuiltAt: generatedAt,
      materializedProjections: materializedProjectionStore
    }
  });
  const selectedObjectRef =
    imports[0]?.execution.mappingRecords[0]?.canonicalRef ??
    imports[0]?.execution.eventRecords[0]?.objectRef;
  const scope = {
    label: "Canopy Commons Seed",
    scope: {
      commonsRef: "commons.canopy.seed"
    }
  };
  const persistedShell = buildPersistedCanopyShellSnapshot({
    runtime,
    scope,
    activeMode: "objects",
    rebuiltAt: generatedAt,
    ...optionalSelectedObjectRef(selectedObjectRef),
    materializedProjectionStore,
    persistProjectionState: false
  });
  const session = buildPersistedCanopyShellSession({
    runtime,
    scope,
    activeMode: "objects",
    rebuiltAt: generatedAt,
    ...optionalSelectedObjectRef(selectedObjectRef),
    materializedProjectionStore,
    persistProjectionState: false
  }).session;
  const operations = buildCanopyOperationsReport({
    runtime,
    generatedAt,
    shell: persistedShell
  });
  const materializedDocuments = queryMaterializedProjections(materializedProjectionStore).items;

  return {
    generatedAt,
    runtime,
    imports,
    persistedShell,
    session,
    operations,
    materializedDocuments,
    bundles: foldedSourceSampleExportBundles
  };
}

function optionalSelectedObjectRef<TRef>(
  selectedObjectRef: TRef | undefined
): { readonly selectedObjectRef?: TRef } {
  return selectedObjectRef === undefined ? {} : { selectedObjectRef };
}
