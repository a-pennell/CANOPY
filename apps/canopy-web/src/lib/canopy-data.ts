import type {
  CanopyShellMode,
  CanopyShellSession,
  PersistedCanopyShellCommandExecution,
  PersistedCanopyShellSnapshotResult
} from "@canopy/app-shell";
import {
  buildPersistedCanopyShellSession,
  buildPersistedCanopyShellSnapshot,
  executePersistedCanopyShellCommand
} from "@canopy/app-shell";
import type { ObjectRef } from "@canopy/contracts-kernel";
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
  readonly objectRefs: readonly CanopyWebObjectRefRecord[];
  readonly persistedShell: PersistedCanopyShellSnapshotResult;
  readonly session: CanopyShellSession;
  readonly workspaces: readonly CanopyWebWorkspace[];
  readonly commandPreviews: readonly PersistedCanopyShellCommandExecution[];
  readonly operations: CanopyOperationsReport;
  readonly materializedDocuments: readonly MaterializedProjectionDocument[];
  readonly bundles: readonly SampleExportBundle[];
}

export interface CanopyWebWorkspace {
  readonly id: string;
  readonly title: string;
  readonly intent: string;
  readonly session: CanopyShellSession;
}

export interface CanopyWebObjectRefRecord {
  readonly objectId: string;
  readonly objectType: ObjectRef["type"];
  readonly ref: ObjectRef;
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
  const materializedDocuments = queryMaterializedProjections(materializedProjectionStore).items;
  const objectRefs = runtime.queryObjectRefs().items.map((record) => ({
    objectId: record.objectId,
    objectType: record.objectType,
    ref: record.ref
  }));
  const selectedObjectRef =
    findRef(objectRefs, "resource") ??
    imports[0]?.execution.mappingRecords[0]?.canonicalRef ??
    imports[0]?.execution.eventRecords[0]?.objectRef;
  const decisionRef = findRef(objectRefs, "decision");
  const resourceRef = findRef(objectRefs, "resource");
  const claimRef = findRef(objectRefs, "claim");
  const scope = {
    label: "Canopy Commons Seed",
    scope: {}
  };
  const persistedShell = buildPersistedCanopyShellSnapshot({
    runtime,
    scope,
    activeMode: "objects",
    rebuiltAt: generatedAt,
    ...optionalSelectedObjectRef(selectedObjectRef),
    materializedProjections: materializedDocuments,
    ...optionalImportDryRun(imports[0]?.dryRun),
    persistProjectionState: false
  });
  const session = buildWorkspaceSession({
    runtime,
    scope,
    route: "/objects",
    activeMode: "objects",
    selectedObjectRef,
    materializedDocuments,
    importDryRun: imports[0]?.dryRun
  });
  const workspaces = [
    workspace({
      id: "scope",
      title: "Scope Frame",
      intent: "Place, modes, attention, and route grammar stay visible before any capability work.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/scope",
        activeMode: "scope",
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    }),
    workspace({
      id: "objects",
      title: "Universal Object Page",
      intent: "A selected resource hydrates through object-page projection rather than a legacy page.",
      session
    }),
    workspace({
      id: "memory",
      title: "Civic Memory",
      intent: "Append-only events are readable as shared memory, with visibility and data state intact.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/memory",
        activeMode: "memory",
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    }),
    workspace({
      id: "decisions",
      title: "Decision Packet",
      intent: "Governance is shown as authority, claims, evidence, outcomes, and event trail.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/decisions",
        activeMode: "decisions",
        selectedObjectRef: decisionRef,
        materializedDocuments,
        importDryRun: imports[1]?.dryRun ?? imports[0]?.dryRun
      })
    }),
    workspace({
      id: "stewardship",
      title: "Stewardship Surface",
      intent: "Resources, use rights, ecological context, and authority are one object-centered surface.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/stewardship",
        activeMode: "stewardship",
        selectedObjectRef: resourceRef,
        materializedDocuments,
        importDryRun: imports[3]?.dryRun ?? imports[0]?.dryRun
      })
    }),
    workspace({
      id: "claims",
      title: "Claims & Evidence",
      intent: "Evidence supports claims without becoming authority, and AI/model output remains legible.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/claims-evidence",
        activeMode: "objects",
        selectedObjectRef: claimRef,
        materializedDocuments,
        importDryRun: imports[2]?.dryRun ?? imports[0]?.dryRun
      })
    }),
    workspace({
      id: "imports",
      title: "Fold-In Review",
      intent: "Source records are reviewed through canonical mappings, not old product navigation.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/imports",
        activeMode: "objects",
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    }),
    workspace({
      id: "federation",
      title: "Federation & Export",
      intent: "Export readiness shows event scope, mappings, stewardship agreements, and redaction posture.",
      session: buildWorkspaceSession({
        runtime,
        scope,
        route: "/federation",
        activeMode: "federation",
        materializedDocuments,
        importDryRun: imports[0]?.dryRun
      })
    })
  ];
  const commandPreviews = ["scope", "objects", "memory", "decisions", "stewardship", "federation"].map(
    (command) =>
      executePersistedCanopyShellCommand({
        runtime,
        scope,
        command,
        rebuiltAt: generatedAt,
        ...optionalSelectedObjectRef(selectedObjectRef),
        materializedProjections: materializedDocuments,
        ...optionalImportDryRun(imports[0]?.dryRun),
        persistProjectionState: false
      })
  );
  const operations = buildCanopyOperationsReport({
    runtime,
    generatedAt,
    shell: persistedShell
  });

  return {
    generatedAt,
    runtime,
    imports,
    objectRefs,
    persistedShell,
    session,
    workspaces,
    commandPreviews,
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

function buildWorkspaceSession(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly scope: {
    readonly label: string;
  readonly scope: {
      readonly commonsRef?: string;
    };
  };
  readonly route: string;
  readonly activeMode: CanopyShellMode;
  readonly selectedObjectRef?: ObjectRef | undefined;
  readonly materializedDocuments: readonly MaterializedProjectionDocument[];
  readonly importDryRun?: SampleExportBundleImportExecutionResult["dryRun"] | undefined;
}): CanopyShellSession {
  return buildPersistedCanopyShellSession({
    runtime: input.runtime,
    scope: input.scope,
    route: input.route,
    activeMode: input.activeMode,
    rebuiltAt: generatedAt,
    ...optionalSelectedObjectRef(input.selectedObjectRef),
    materializedProjections: input.materializedDocuments,
    ...optionalImportDryRun(input.importDryRun),
    persistProjectionState: false
  }).session;
}

function workspace(input: CanopyWebWorkspace): CanopyWebWorkspace {
  return input;
}

function findRef(
  objectRefs: readonly CanopyWebObjectRefRecord[],
  type: ObjectRef["type"]
): ObjectRef | undefined {
  return objectRefs.find((record) => record.objectType === type)?.ref;
}

function optionalImportDryRun(
  importDryRun: SampleExportBundleImportExecutionResult["dryRun"] | undefined
): { readonly importDryRun?: SampleExportBundleImportExecutionResult["dryRun"] } {
  return importDryRun === undefined ? {} : { importDryRun };
}
