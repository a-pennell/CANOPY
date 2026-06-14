import type {
  AdapterAuditRecord,
  CanonicalMappingDisposition,
  CanonicalMappingRecord,
  CanonicalMappingStatus,
  EventRecord,
  JsonValue,
  OutboxDestination,
  OutboxRecord
} from "@canopy/contracts-database";
import type {
  CanopyEvent,
  CanopyId,
  IsoDateTime,
  ObjectRef
} from "@canopy/contracts-kernel";
import type { CanonicalPersistenceRuntime } from "@canopy/database-runtime";
import type {
  CanonicalMappingCandidate,
  ImportDryRunResult,
  ImportDryRunWarning
} from "@canopy/database-import-plans";
import {
  createPersistentOutbox,
  type OutboxRuntime
} from "@canopy/workflows-outbox";

export type ImportReviewDecision = "accept" | "reject" | "needs-review";

export type ImportReviewStatus =
  | "blocked"
  | "review-required"
  | "ready"
  | "rejected";

export type ImportExecutionStatus = "applied" | "no-accepted-events";

export type ImportExecutionErrorCode =
  | "dry-run-blocked"
  | "review-not-ready"
  | "accepted-event-without-mapping";

export class ImportExecutionError extends Error {
  readonly code: ImportExecutionErrorCode;

  constructor(code: ImportExecutionErrorCode, message: string) {
    super(message);
    this.name = "ImportExecutionError";
    this.code = code;
  }
}

export interface ImportReviewOptions {
  readonly defaultDecision?: ImportReviewDecision;
  readonly reviewedAt?: IsoDateTime;
  readonly reviewedByRef?: ObjectRef;
}

export interface ImportMappingReviewItem {
  readonly sourceKey: string;
  readonly candidate: CanonicalMappingCandidate;
  readonly decision: ImportReviewDecision;
  readonly warnings: readonly ImportDryRunWarning[];
}

export interface ImportEventReviewItem {
  readonly eventId: CanopyId;
  readonly event: CanopyEvent;
  readonly decision: ImportReviewDecision;
  readonly mappingSourceKey: string | undefined;
}

export interface ImportReviewSummary {
  readonly mappingCount: number;
  readonly eventCount: number;
  readonly acceptedMappingCount: number;
  readonly acceptedEventCount: number;
  readonly rejectedMappingCount: number;
  readonly rejectedEventCount: number;
  readonly unresolvedMappingCount: number;
  readonly unresolvedEventCount: number;
  readonly warningCount: number;
  readonly blockerCount: number;
  readonly prohibitedOutcomeCount: number;
}

export interface ImportReviewReport {
  readonly importPlanId: ImportDryRunResult["importPlanId"];
  readonly sourceProject: ImportDryRunResult["sourceProject"];
  readonly sourceTreatment: ImportDryRunResult["sourceTreatment"];
  readonly canonicalNamespace: ImportDryRunResult["canonicalNamespace"];
  readonly status: ImportReviewStatus;
  readonly reviewedAt?: IsoDateTime;
  readonly reviewedByRef?: ObjectRef;
  readonly summary: ImportReviewSummary;
  readonly mappingItems: readonly ImportMappingReviewItem[];
  readonly eventItems: readonly ImportEventReviewItem[];
  readonly warnings: ImportDryRunResult["warnings"];
  readonly prohibitedOutcomes: ImportDryRunResult["prohibitedOutcomes"];
}

export interface ExecuteImportInput {
  readonly dryRun: ImportDryRunResult;
  readonly runtime: CanonicalPersistenceRuntime;
  readonly review?: ImportReviewReport;
  readonly recordedAt?: IsoDateTime;
  readonly outbox?: OutboxRuntime;
  readonly enqueueProjectionRebuild?: boolean;
  readonly outboxDestination?: OutboxDestination;
  readonly writeAudit?: boolean;
}

export interface ImportExecutionResult {
  readonly status: ImportExecutionStatus;
  readonly review: ImportReviewReport;
  readonly mappingRecords: readonly CanonicalMappingRecord[];
  readonly eventRecords: readonly EventRecord[];
  readonly outboxRecords: readonly OutboxRecord[];
  readonly adapterAuditRecords: readonly AdapterAuditRecord[];
}

export function createImportReviewReport(
  dryRun: ImportDryRunResult,
  options: ImportReviewOptions = {}
): ImportReviewReport {
  const requestedDecision = options.defaultDecision ?? "needs-review";
  const defaultDecision = dryRun.status === "blocked" ? "needs-review" : requestedDecision;
  const warningsBySource = new Map<string, ImportDryRunWarning[]>();

  for (const item of dryRun.warnings) {
    if (item.source !== undefined) {
      const key = sourceKey(item.source);
      warningsBySource.set(key, [...(warningsBySource.get(key) ?? []), item]);
    }
  }

  const mappingItems = dryRun.mappingCandidates.map((candidate) => ({
    sourceKey: sourceKey(candidate.source),
    candidate,
    decision: candidate.disposition === "needs-review" ? "needs-review" : defaultDecision,
    warnings: warningsBySource.get(sourceKey(candidate.source)) ?? []
  }));
  const mappingKeyByRef = new Map(
    mappingItems.map((item) => [objectRefKey(item.candidate.canonicalRef), item.sourceKey])
  );
  const eventItems = dryRun.candidateEvents.map((event) => ({
    eventId: event.id,
    event,
    decision: defaultDecision,
    mappingSourceKey: mappingKeyByRef.get(objectRefKey(event.objectRef))
  }));
  const report = optionalReviewFields({
    importPlanId: dryRun.importPlanId,
    sourceProject: dryRun.sourceProject,
    sourceTreatment: dryRun.sourceTreatment,
    canonicalNamespace: dryRun.canonicalNamespace,
    status: "review-required" as ImportReviewStatus,
    reviewedAt: options.reviewedAt,
    reviewedByRef: options.reviewedByRef,
    summary: summarizeReview(dryRun, mappingItems, eventItems),
    mappingItems,
    eventItems,
    warnings: dryRun.warnings,
    prohibitedOutcomes: dryRun.prohibitedOutcomes
  });

  return { ...report, status: reviewStatus(dryRun, report.summary) };
}

export function executeReviewedImport(input: ExecuteImportInput): ImportExecutionResult {
  const review = input.review ?? createImportReviewReport(input.dryRun);

  if (input.dryRun.status === "blocked" || review.status === "blocked") {
    throw new ImportExecutionError(
      "dry-run-blocked",
      `Import plan ${input.dryRun.importPlanId} has blocker warnings or prohibited outcomes.`
    );
  }

  if (review.status !== "ready" && review.status !== "rejected") {
    throw new ImportExecutionError(
      "review-not-ready",
      `Import plan ${input.dryRun.importPlanId} still has unresolved review items.`
    );
  }

  const acceptedMappings = review.mappingItems.filter((item) => item.decision === "accept");
  const acceptedMappingKeys = new Set(acceptedMappings.map((item) => item.sourceKey));
  const acceptedEvents = review.eventItems.filter((item) => item.decision === "accept");
  const unbackedEvent = acceptedEvents.find(
    (item) => item.mappingSourceKey === undefined || !acceptedMappingKeys.has(item.mappingSourceKey)
  );

  if (unbackedEvent !== undefined) {
    throw new ImportExecutionError(
      "accepted-event-without-mapping",
      `Accepted import event ${unbackedEvent.eventId} has no accepted canonical mapping.`
    );
  }

  const recordedAt = input.recordedAt ?? review.reviewedAt ?? defaultRecordedAt(input.dryRun);
  const mappingRecords = acceptedMappings.map((item) =>
    input.runtime.putMapping(
      mappingRecordFromCandidate(
        item.candidate,
        optionalMappingRecordOptions({
          reviewedAt: review.reviewedAt ?? recordedAt,
          reviewedByRef: review.reviewedByRef
        })
      )
    )
  );
  const eventRecords = acceptedEvents.map((item) =>
    input.runtime.appendEvent(materializeAcceptedImportEvent(item.event), { recordedAt })
  );
  const outboxRecords =
    input.enqueueProjectionRebuild === false
      ? []
      : enqueueImportProjectionRebuilds({
          runtime: input.runtime,
          eventRecords,
          destination: input.outboxDestination ?? defaultProjectionRebuildDestination,
          recordedAt,
          ...optionalImportOutbox(input.outbox)
        });
  const adapterAuditRecords = writeImportExecutionAudits({
    runtime: input.runtime,
    dryRun: input.dryRun,
    review,
    mappingRecords,
    eventRecords,
    outboxRecords,
    recordedAt,
    ...optionalImportWriteAudit(input.writeAudit)
  });

  return {
    status: eventRecords.length > 0 ? "applied" : "no-accepted-events",
    review,
    mappingRecords,
    eventRecords,
    outboxRecords,
    adapterAuditRecords
  };
}

export function materializeAcceptedImportEvent(candidate: CanopyEvent): CanopyEvent {
  return {
    ...candidate,
    id: acceptedEventId(candidate.id),
    payload: {
      ...candidate.payload,
      dryRun: false,
      importedFromCandidateEventId: candidate.id
    }
  };
}

function mappingRecordFromCandidate(
  candidate: CanonicalMappingCandidate,
  options: {
    readonly reviewedAt: IsoDateTime;
    readonly reviewedByRef?: ObjectRef;
  }
): CanonicalMappingRecord {
  return optionalMappingFields({
    id: `mapping.import.${sourceKey(candidate.source)}`,
    kind: "canonical-mapping",
    schemaVersion: 1,
    createdAt: options.reviewedAt,
    updatedAt: options.reviewedAt,
    source: optionalSourceKey({
      sourceProject: candidate.source.sourceProject,
      sourceEntity: candidate.source.sourceEntity,
      sourceId: candidate.source.sourceId,
      sourceVersion: candidate.source.sourceVersion
    }),
    sourcePointer: candidate.source,
    canonicalRef: candidate.canonicalRef,
    canonicalType: candidate.canonicalType,
    disposition: mappingDisposition(candidate),
    status: "approved" as CanonicalMappingStatus,
    confidence: confidenceScore(candidate),
    mappedByRef: options.reviewedByRef,
    authorityRefs: [],
    evidenceRefs: [],
    reviewedAt: options.reviewedAt
  });
}

function mappingDisposition(candidate: CanonicalMappingCandidate): CanonicalMappingDisposition {
  if (candidate.disposition === "alias") {
    return "alias";
  }

  if (candidate.disposition === "needs-review") {
    return "blocked";
  }

  return "canonical";
}

function confidenceScore(candidate: CanonicalMappingCandidate): number {
  if (candidate.confidence === "high") {
    return 0.95;
  }

  if (candidate.confidence === "medium") {
    return 0.7;
  }

  return 0.4;
}

function summarizeReview(
  dryRun: ImportDryRunResult,
  mappingItems: readonly ImportMappingReviewItem[],
  eventItems: readonly ImportEventReviewItem[]
): ImportReviewSummary {
  return {
    mappingCount: mappingItems.length,
    eventCount: eventItems.length,
    acceptedMappingCount: mappingItems.filter((item) => item.decision === "accept").length,
    acceptedEventCount: eventItems.filter((item) => item.decision === "accept").length,
    rejectedMappingCount: mappingItems.filter((item) => item.decision === "reject").length,
    rejectedEventCount: eventItems.filter((item) => item.decision === "reject").length,
    unresolvedMappingCount: mappingItems.filter((item) => item.decision === "needs-review").length,
    unresolvedEventCount: eventItems.filter((item) => item.decision === "needs-review").length,
    warningCount: dryRun.warnings.length,
    blockerCount: dryRun.warnings.filter((item) => item.severity === "blocker").length,
    prohibitedOutcomeCount: dryRun.prohibitedOutcomes.length
  };
}

function reviewStatus(
  dryRun: ImportDryRunResult,
  summary: ImportReviewSummary
): ImportReviewStatus {
  if (
    dryRun.status === "blocked" ||
    summary.blockerCount > 0 ||
    summary.prohibitedOutcomeCount > 0
  ) {
    return "blocked";
  }

  if (summary.unresolvedMappingCount > 0 || summary.unresolvedEventCount > 0) {
    return "review-required";
  }

  if (summary.acceptedMappingCount === 0 && summary.acceptedEventCount === 0) {
    return "rejected";
  }

  return "ready";
}

function acceptedEventId(candidateEventId: CanopyId): CanopyId {
  if (candidateEventId.startsWith("event.import-dry-run.")) {
    return candidateEventId.replace("event.import-dry-run.", "event.import.");
  }

  return `event.import.${candidateEventId}`;
}

function defaultRecordedAt(dryRun: ImportDryRunResult): IsoDateTime {
  return dryRun.candidateEvents[0]?.occurredAt ?? "1970-01-01T00:00:00.000Z";
}

function optionalImportOutbox(
  outbox: OutboxRuntime | undefined
): { readonly outbox?: OutboxRuntime } {
  return outbox === undefined ? {} : { outbox };
}

function optionalImportWriteAudit(
  writeAudit: boolean | undefined
): { readonly writeAudit?: boolean } {
  return writeAudit === undefined ? {} : { writeAudit };
}

const defaultProjectionRebuildDestination: OutboxDestination = {
  kind: "workflow",
  name: "projection-rebuild"
};

function enqueueImportProjectionRebuilds(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly outbox?: OutboxRuntime;
  readonly eventRecords: readonly EventRecord[];
  readonly destination: OutboxDestination;
  readonly recordedAt: IsoDateTime;
}): readonly OutboxRecord[] {
  const outbox = input.outbox ?? createPersistentOutbox({ runtime: input.runtime });

  return input.eventRecords.map((record) =>
    outbox.enqueue({
      eventId: record.eventId,
      eventType: record.eventType,
      destination: input.destination,
      payload: {
        eventId: record.eventId,
        eventType: record.eventType,
        source: "import-execution"
      },
      dedupeKey: `import:${record.eventId}:projection-rebuild`,
      createdAt: input.recordedAt
    })
  );
}

function writeImportExecutionAudits(input: {
  readonly runtime: CanonicalPersistenceRuntime;
  readonly dryRun: ImportDryRunResult;
  readonly review: ImportReviewReport;
  readonly mappingRecords: readonly CanonicalMappingRecord[];
  readonly eventRecords: readonly EventRecord[];
  readonly outboxRecords: readonly OutboxRecord[];
  readonly recordedAt: IsoDateTime;
  readonly writeAudit?: boolean;
}): readonly AdapterAuditRecord[] {
  const audit = importExecutionAuditRecord(input);

  return input.writeAudit === false ? [audit] : [input.runtime.putAdapterAudit(audit)];
}

function importExecutionAuditRecord(input: {
  readonly dryRun: ImportDryRunResult;
  readonly review: ImportReviewReport;
  readonly mappingRecords: readonly CanonicalMappingRecord[];
  readonly eventRecords: readonly EventRecord[];
  readonly outboxRecords: readonly OutboxRecord[];
  readonly recordedAt: IsoDateTime;
}): AdapterAuditRecord {
  return {
    id: `adapter-audit.import.${input.dryRun.importPlanId}.${input.recordedAt}`,
    kind: "adapter-audit",
    schemaVersion: 1,
    createdAt: input.recordedAt,
    adapterName: `import.${input.dryRun.sourceProject}`,
    direction: "migration",
    operation: "import.execute-reviewed",
    status: input.eventRecords.length > 0 ? "succeeded" : "skipped",
    startedAt: input.recordedAt,
    completedAt: input.recordedAt,
    eventIds: input.eventRecords.map((record) => record.eventId),
    outboxIds: input.outboxRecords.map((record) => record.id),
    warnings: input.review.warnings.map((warning) => warning.code),
    errors: [],
    metadata: importExecutionAuditMetadata(input)
  };
}

function importExecutionAuditMetadata(input: {
  readonly dryRun: ImportDryRunResult;
  readonly review: ImportReviewReport;
  readonly mappingRecords: readonly CanonicalMappingRecord[];
  readonly eventRecords: readonly EventRecord[];
  readonly outboxRecords: readonly OutboxRecord[];
}): JsonValue {
  return {
    importPlanId: input.dryRun.importPlanId,
    sourceProject: input.dryRun.sourceProject,
    sourceTreatment: input.dryRun.sourceTreatment,
    reviewStatus: input.review.status,
    mappingRecordIds: input.mappingRecords.map((record) => record.id),
    eventRecordIds: input.eventRecords.map((record) => record.id),
    outboxRecordIds: input.outboxRecords.map((record) => record.id)
  };
}

function sourceKey(source: {
  readonly sourceProject: string;
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly sourceVersion?: string;
}): string {
  return [
    slug(source.sourceProject),
    slug(source.sourceEntity),
    slug(source.sourceId),
    source.sourceVersion === undefined ? undefined : slug(source.sourceVersion)
  ]
    .filter((item): item is string => item !== undefined)
    .join(".");
}

function objectRefKey(ref: ObjectRef): string {
  return `${ref.namespace}:${ref.type}:${ref.id}`;
}

function slug(value: string): string {
  const slugged = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slugged.length > 0 ? slugged : "unknown";
}

function optionalReviewFields(
  report: Omit<ImportReviewReport, "reviewedAt" | "reviewedByRef"> & {
    readonly reviewedAt: IsoDateTime | undefined;
    readonly reviewedByRef: ObjectRef | undefined;
  }
): ImportReviewReport {
  const optional: {
    reviewedAt?: IsoDateTime;
    reviewedByRef?: ObjectRef;
  } = {};

  if (report.reviewedAt !== undefined) {
    optional.reviewedAt = report.reviewedAt;
  }

  if (report.reviewedByRef !== undefined) {
    optional.reviewedByRef = report.reviewedByRef;
  }

  return {
    importPlanId: report.importPlanId,
    sourceProject: report.sourceProject,
    sourceTreatment: report.sourceTreatment,
    canonicalNamespace: report.canonicalNamespace,
    status: report.status,
    summary: report.summary,
    mappingItems: report.mappingItems,
    eventItems: report.eventItems,
    warnings: report.warnings,
    prohibitedOutcomes: report.prohibitedOutcomes,
    ...optional
  };
}

function optionalMappingRecordOptions(options: {
  readonly reviewedAt: IsoDateTime;
  readonly reviewedByRef: ObjectRef | undefined;
}): {
  readonly reviewedAt: IsoDateTime;
  readonly reviewedByRef?: ObjectRef;
} {
  if (options.reviewedByRef === undefined) {
    return { reviewedAt: options.reviewedAt };
  }

  return {
    reviewedAt: options.reviewedAt,
    reviewedByRef: options.reviewedByRef
  };
}

function optionalSourceKey(source: {
  readonly sourceProject: CanonicalMappingRecord["source"]["sourceProject"];
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly sourceVersion: string | undefined;
}): CanonicalMappingRecord["source"] {
  if (source.sourceVersion === undefined) {
    return {
      sourceProject: source.sourceProject,
      sourceEntity: source.sourceEntity,
      sourceId: source.sourceId
    };
  }

  return {
    sourceProject: source.sourceProject,
    sourceEntity: source.sourceEntity,
    sourceId: source.sourceId,
    sourceVersion: source.sourceVersion
  };
}

function optionalMappingFields(
  record: Omit<
    CanonicalMappingRecord,
    "confidence" | "sourcePointer" | "mappedByRef" | "reviewedAt" | "updatedAt"
  > & {
    readonly confidence: number | undefined;
    readonly sourcePointer: CanonicalMappingRecord["sourcePointer"] | undefined;
    readonly mappedByRef: ObjectRef | undefined;
    readonly reviewedAt: IsoDateTime | undefined;
    readonly updatedAt: IsoDateTime | undefined;
  }
): CanonicalMappingRecord {
  const optional: {
    confidence?: number;
    sourcePointer?: NonNullable<CanonicalMappingRecord["sourcePointer"]>;
    mappedByRef?: ObjectRef;
    reviewedAt?: IsoDateTime;
    updatedAt?: IsoDateTime;
  } = {};

  if (record.sourcePointer !== undefined) {
    optional.sourcePointer = record.sourcePointer;
  }

  if (record.confidence !== undefined) {
    optional.confidence = record.confidence;
  }

  if (record.mappedByRef !== undefined) {
    optional.mappedByRef = record.mappedByRef;
  }

  if (record.reviewedAt !== undefined) {
    optional.reviewedAt = record.reviewedAt;
  }

  if (record.updatedAt !== undefined) {
    optional.updatedAt = record.updatedAt;
  }

  return {
    id: record.id,
    kind: record.kind,
    schemaVersion: record.schemaVersion,
    createdAt: record.createdAt,
    source: record.source,
    canonicalRef: record.canonicalRef,
    canonicalType: record.canonicalType,
    disposition: record.disposition,
    status: record.status,
    authorityRefs: record.authorityRefs,
    evidenceRefs: record.evidenceRefs,
    ...optional
  };
}
