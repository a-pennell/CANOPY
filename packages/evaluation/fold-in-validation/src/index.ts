import type {
  CanopyCapability,
  CanopyEvent,
  CanopyEventType,
  CanopyId,
  ObjectRef,
  SourceProject
} from "@canopy/contracts-kernel";
import { CANOPY_MINIMUM_EVENT_TYPES } from "@canopy/contracts-kernel";
import type { GoldenFixtureManifest } from "@canopy/contracts-testing";
import {
  buildAuthorityProjection,
  type AuthorityProjection
} from "@canopy/projections-authority";
import {
  buildCivicMemoryProjection,
  type CivicMemoryProjection
} from "@canopy/projections-civic-memory";
import {
  buildObjectPageProjection,
  type ObjectPageProjection
} from "@canopy/projections-object-page";
import {
  buildResourceStewardshipProjection,
  type ResourceStewardshipProjection
} from "@canopy/projections-resource-stewardship";

export type FoldInValidationStatus = "pass" | "warn" | "fail";

export type FoldInValidationRiskCode =
  | "mapping.uncovered"
  | "event.missing"
  | "event.duplicate"
  | "authority.uncovered"
  | "data_stewardship.uncovered"
  | "replay.parity"
  | "shell.leakage"
  | "ecology.uncovered"
  | "federation.unready";

export interface FoldInValidationRisk {
  readonly code: FoldInValidationRiskCode;
  readonly severity: Exclude<FoldInValidationStatus, "pass">;
  readonly message: string;
  readonly eventIds: readonly CanopyId[];
  readonly refIds: readonly CanopyId[];
}

export interface FoldInValidationSection {
  readonly status: FoldInValidationStatus;
  readonly summary: string;
  readonly risks: readonly FoldInValidationRisk[];
}

export interface MappingCoverageReport extends FoldInValidationSection {
  readonly expectedRefCount: number;
  readonly coveredRefCount: number;
  readonly sourceMappedRefCount: number;
  readonly importPlanSourceProjects: readonly SourceProject[];
  readonly missingRefIds: readonly CanopyId[];
}

export interface EventCoverageReport extends FoldInValidationSection {
  readonly expectedEventTypes: readonly CanopyEventType[];
  readonly coveredEventTypes: readonly CanopyEventType[];
  readonly missingEventTypes: readonly CanopyEventType[];
  readonly duplicateEventIds: readonly CanopyId[];
}

export interface AuthorityCoverageReport extends FoldInValidationSection {
  readonly bindingEventCount: number;
  readonly coveredBindingEventCount: number;
  readonly missingAuthorityEventIds: readonly CanopyId[];
  readonly membershipOnlyWarningEventIds: readonly CanopyId[];
}

export interface DataStewardshipCoverageReport extends FoldInValidationSection {
  readonly governedEventCount: number;
  readonly coveredGovernedEventCount: number;
  readonly uncoveredEventIds: readonly CanopyId[];
  readonly agreementRefIds: readonly CanopyId[];
}

export interface ReplayParityReport extends FoldInValidationSection {
  readonly streamEventCount: number;
  readonly projectedEventCount: number;
  readonly firstStreamEventId: CanopyId | undefined;
  readonly lastStreamEventId: CanopyId | undefined;
  readonly firstProjectedEventId: CanopyId | undefined;
  readonly lastProjectedEventId: CanopyId | undefined;
}

export interface ShellLeakageFinding {
  readonly token: string;
  readonly location: "shell-navigation" | "capability-package" | "source-capability";
  readonly value: string;
}

export interface ShellLeakageReport extends FoldInValidationSection {
  readonly findings: readonly ShellLeakageFinding[];
}

export interface EcologicalHookCoverageReport extends FoldInValidationSection {
  readonly ecologicalEventCount: number;
  readonly livingSystemScopedEventCount: number;
  readonly stewardshipResourceCount: number;
  readonly stewardshipResourcesWithHooks: readonly CanopyId[];
  readonly stewardshipResourcesMissingHooks: readonly CanopyId[];
}

export interface FederationReadinessReport extends FoldInValidationSection {
  readonly federationEventCount: number;
  readonly federationRuleRefCount: number;
  readonly exportEventCount: number;
  readonly importEventCount: number;
  readonly localMappingCount: number;
  readonly readyEventIds: readonly CanopyId[];
  readonly unreadyEventIds: readonly CanopyId[];
}

export interface FoldInValidationProjections {
  readonly civicMemory: CivicMemoryProjection;
  readonly authority: AuthorityProjection;
  readonly objectPages: readonly ObjectPageProjection[];
  readonly resourceStewardship: readonly ResourceStewardshipProjection[];
}

export interface FoldInImportPlanSummary {
  readonly sourceProject: SourceProject;
  readonly planId?: CanopyId;
  readonly localMappingIds?: readonly CanopyId[];
}

export interface FoldInShellNavigationEntry {
  readonly label: string;
  readonly href?: string;
  readonly packageName?: string;
}

export interface FoldInValidationInput {
  readonly events: readonly CanopyEvent[];
  readonly expectedRefs?: readonly ObjectRef[];
  readonly expectedEventTypes?: readonly CanopyEventType[];
  readonly objectPageRefs?: readonly ObjectRef[];
  readonly resourceRefs?: readonly ObjectRef[];
  readonly importPlans?: readonly FoldInImportPlanSummary[];
  readonly shellNavigation?: readonly FoldInShellNavigationEntry[];
  readonly capabilityPackageNames?: readonly string[];
  readonly federationRuleRefs?: readonly ObjectRef[];
  readonly canonicalMappingRefs?: readonly ObjectRef[];
  readonly localTermRefs?: readonly ObjectRef[];
}

export interface FoldInValidationReport {
  readonly status: FoldInValidationStatus;
  readonly mappingCoverage: MappingCoverageReport;
  readonly eventCoverage: EventCoverageReport;
  readonly authorityCoverage: AuthorityCoverageReport;
  readonly dataStewardshipCoverage: DataStewardshipCoverageReport;
  readonly replayParity: ReplayParityReport;
  readonly shellLeakage: ShellLeakageReport;
  readonly ecologicalHookCoverage: EcologicalHookCoverageReport;
  readonly federationReadiness: FederationReadinessReport;
  readonly unresolvedRisks: readonly FoldInValidationRisk[];
  readonly projections: FoldInValidationProjections;
}

const SOURCE_ONLY_PROJECTS = [
  "common-credit",
  "icos",
  "sensemaking",
  "stewardship"
] as const satisfies readonly SourceProject[];

const SOURCE_ONLY_TOKENS = [
  "common-credit",
  "icos",
  "sensemaking",
  "stewardship"
] as const;

const DATA_STEWARDSHIP_VISIBILITIES = [
  "commons",
  "role_restricted",
  "guardian_restricted",
  "private",
  "embargoed",
  "sealed"
] as const satisfies readonly CanopyEvent["visibility"][];

export function validateFoldIn(input: FoldInValidationInput): FoldInValidationReport {
  const events = stableEvents(input.events);
  const projections = buildProjections(events, input);
  const mappingCoverage = validateMappingCoverage(events, input);
  const eventCoverage = validateEventCoverage(events, input);
  const authorityCoverage = validateAuthorityCoverage(projections.authority);
  const dataStewardshipCoverage = validateDataStewardshipCoverage(events);
  const replayParity = validateReplayParity(events, projections.civicMemory);
  const shellLeakage = validateShellLeakage(events, input);
  const ecologicalHookCoverage = validateEcologicalHookCoverage(events, projections.resourceStewardship);
  const federationReadiness = validateFederationReadiness(events, input);
  const unresolvedRisks = [
    ...mappingCoverage.risks,
    ...eventCoverage.risks,
    ...authorityCoverage.risks,
    ...dataStewardshipCoverage.risks,
    ...replayParity.risks,
    ...shellLeakage.risks,
    ...ecologicalHookCoverage.risks,
    ...federationReadiness.risks
  ];

  return {
    status: reportStatus(unresolvedRisks),
    mappingCoverage,
    eventCoverage,
    authorityCoverage,
    dataStewardshipCoverage,
    replayParity,
    shellLeakage,
    ecologicalHookCoverage,
    federationReadiness,
    unresolvedRisks,
    projections
  };
}

export function validateGoldenFixtureFoldIn(
  manifest: GoldenFixtureManifest,
  input: Omit<FoldInValidationInput, "events" | "expectedRefs" | "expectedEventTypes" | "importPlans" | "federationRuleRefs" | "canonicalMappingRefs" | "localTermRefs"> = {}
): FoldInValidationReport {
  return validateFoldIn({
    ...input,
    events: manifest.events,
    expectedRefs: manifest.objects.map((object) => object.ref),
    expectedEventTypes: manifest.expectations.flatMap((expectation) =>
      expectation.requiredEventTypes.map((eventType) => eventType as CanopyEventType)
    ),
    importPlans: manifest.sourceProjects
      .filter((sourceProject) => sourceProject !== "canopy")
      .map((sourceProject) => ({ sourceProject })),
    federationRuleRefs: manifest.federationRuleRefs,
    canonicalMappingRefs: manifest.canonicalMappingRefs,
    localTermRefs: manifest.localTermRefs
  });
}

const buildProjections = (
  events: readonly CanopyEvent[],
  input: FoldInValidationInput
): FoldInValidationProjections => ({
  civicMemory: buildCivicMemoryProjection(events),
  authority: buildAuthorityProjection(events),
  objectPages: (input.objectPageRefs ?? []).map((objectRef) =>
    buildObjectPageProjection(objectRef, events)
  ),
  resourceStewardship: (input.resourceRefs ?? []).map((resourceRef) =>
    buildResourceStewardshipProjection(resourceRef, events)
  )
});

const validateMappingCoverage = (
  events: readonly CanopyEvent[],
  input: FoldInValidationInput
): MappingCoverageReport => {
  const expectedRefs = input.expectedRefs ?? refsFromEvents(events);
  const actualRefs = new Set([
    ...refsFromEvents(events),
    ...(input.federationRuleRefs ?? []),
    ...(input.canonicalMappingRefs ?? []),
    ...(input.localTermRefs ?? [])
  ].map((ref) => refKey(ref)));
  const missingRefIds = expectedRefs
    .filter((ref) => !actualRefs.has(refKey(ref)))
    .map((ref) => ref.id)
    .sort(compareStrings);
  const sourceMappedRefCount = expectedRefs.filter((ref) => ref.source !== undefined).length;
  const importPlanSourceProjects = uniqueSorted(
    (input.importPlans ?? []).map((plan) => plan.sourceProject)
  );
  const risks: FoldInValidationRisk[] = missingRefIds.length === 0
    ? []
    : [{
        code: "mapping.uncovered",
        severity: "fail",
        message: "Expected refs are not present in the fold-in event graph.",
        eventIds: [],
        refIds: missingRefIds
      }];

  return {
    status: sectionStatus(risks),
    summary: `${expectedRefs.length - missingRefIds.length} of ${expectedRefs.length} expected refs appear in event mappings.`,
    risks,
    expectedRefCount: expectedRefs.length,
    coveredRefCount: expectedRefs.length - missingRefIds.length,
    sourceMappedRefCount,
    importPlanSourceProjects,
    missingRefIds
  };
};

const validateEventCoverage = (
  events: readonly CanopyEvent[],
  input: FoldInValidationInput
): EventCoverageReport => {
  const expectedEventTypes = uniqueSorted(
    input.expectedEventTypes ?? CANOPY_MINIMUM_EVENT_TYPES
  );
  const coveredEventTypes = uniqueSorted(events.map((event) => event.type));
  const coveredSet = new Set(coveredEventTypes);
  const missingEventTypes = expectedEventTypes
    .filter((eventType) => !coveredSet.has(eventType))
    .sort(compareStrings);
  const duplicateEventIds = duplicateStrings(events.map((event) => event.id));
  const risks: FoldInValidationRisk[] = [
    ...(missingEventTypes.length === 0
      ? []
      : [{
          code: "event.missing" as const,
          severity: "fail" as const,
          message: `Missing event types: ${missingEventTypes.join(", ")}.`,
          eventIds: [],
          refIds: []
        }]),
    ...(duplicateEventIds.length === 0
      ? []
      : [{
          code: "event.duplicate" as const,
          severity: "fail" as const,
          message: "Event stream contains duplicate event ids.",
          eventIds: duplicateEventIds,
          refIds: []
        }])
  ];

  return {
    status: sectionStatus(risks),
    summary: `${expectedEventTypes.length - missingEventTypes.length} of ${expectedEventTypes.length} expected event types are present.`,
    risks,
    expectedEventTypes,
    coveredEventTypes,
    missingEventTypes,
    duplicateEventIds
  };
};

const validateAuthorityCoverage = (
  authority: AuthorityProjection
): AuthorityCoverageReport => {
  const missingAuthorityEventIds = authority.indicators.missingAuthorityEventIds;
  const membershipOnlyWarningEventIds = authority.indicators.membershipOnlyWarningEventIds;
  const uncoveredBindingEventIds = authority.indicators.uncoveredBindingEventIds;
  const risks: FoldInValidationRisk[] = [
    ...(uncoveredBindingEventIds.length === 0
      ? []
      : [{
          code: "authority.uncovered" as const,
          severity: "fail" as const,
          message: "Binding events must be covered by explicit non-membership authority.",
          eventIds: uncoveredBindingEventIds,
          refIds: []
        }]),
    ...(membershipOnlyWarningEventIds.length === 0
      ? []
      : [{
          code: "authority.uncovered" as const,
          severity: "warn" as const,
          message: "Some binding events only cite membership authority.",
          eventIds: membershipOnlyWarningEventIds,
          refIds: []
        }])
  ];

  return {
    status: sectionStatus(risks),
    summary: `${authority.bindingCoverage.length - uncoveredBindingEventIds.length} of ${authority.bindingCoverage.length} binding events have authority coverage.`,
    risks,
    bindingEventCount: authority.bindingCoverage.length,
    coveredBindingEventCount: authority.bindingCoverage.length - uncoveredBindingEventIds.length,
    missingAuthorityEventIds,
    membershipOnlyWarningEventIds
  };
};

const validateDataStewardshipCoverage = (
  events: readonly CanopyEvent[]
): DataStewardshipCoverageReport => {
  const governedEvents = events.filter(isGovernedDataEvent);
  const coveredEvents = governedEvents.filter(hasDataStewardshipCoverage);
  const uncoveredEventIds = governedEvents
    .filter((event) => !hasDataStewardshipCoverage(event))
    .map((event) => event.id)
    .sort(compareStrings);
  const agreementRefIds = uniqueSorted(
    governedEvents.flatMap((event) => dataStewardshipAgreementRefIds(event))
  );
  const risks: FoldInValidationRisk[] = uncoveredEventIds.length === 0
    ? []
    : [{
        code: "data_stewardship.uncovered",
        severity: "fail",
        message: "Restricted, redacted, export, or federation events need data stewardship coverage.",
        eventIds: uncoveredEventIds,
        refIds: []
      }];

  return {
    status: sectionStatus(risks),
    summary: `${coveredEvents.length} of ${governedEvents.length} governed data events have stewardship coverage.`,
    risks,
    governedEventCount: governedEvents.length,
    coveredGovernedEventCount: coveredEvents.length,
    uncoveredEventIds,
    agreementRefIds
  };
};

const validateReplayParity = (
  events: readonly CanopyEvent[],
  civicMemory: CivicMemoryProjection
): ReplayParityReport => {
  const timeline = civicMemory.timeline;
  const streamEventIds = events.map((event) => event.id);
  const projectedEventIds = timeline.map((event) => event.id);
  const duplicateEventIds = duplicateStrings(streamEventIds);
  const parityOk = arraysEqual(streamEventIds, projectedEventIds) && duplicateEventIds.length === 0;
  const risks: FoldInValidationRisk[] = parityOk
    ? []
    : [{
        code: "replay.parity",
        severity: "fail",
        message: "Civic memory projection order must match stable event replay order with unique ids.",
        eventIds: uniqueSorted([
          ...symmetricDifference(streamEventIds, projectedEventIds),
          ...duplicateEventIds
        ]),
        refIds: []
      }];

  return {
    status: sectionStatus(risks),
    summary: `${timeline.length} projected events from ${events.length} stream events.`,
    risks,
    streamEventCount: events.length,
    projectedEventCount: timeline.length,
    firstStreamEventId: streamEventIds[0],
    lastStreamEventId: streamEventIds[streamEventIds.length - 1],
    firstProjectedEventId: projectedEventIds[0],
    lastProjectedEventId: projectedEventIds[projectedEventIds.length - 1]
  };
};

const validateShellLeakage = (
  events: readonly CanopyEvent[],
  input: FoldInValidationInput
): ShellLeakageReport => {
  const shellValues = (input.shellNavigation ?? []).flatMap((entry) => [
    { location: "shell-navigation" as const, value: entry.label },
    ...(entry.href === undefined ? [] : [{ location: "shell-navigation" as const, value: entry.href }]),
    ...(entry.packageName === undefined ? [] : [{ location: "shell-navigation" as const, value: entry.packageName }])
  ]);
  const capabilityPackageValues = (input.capabilityPackageNames ?? []).map((value) => ({
    location: "capability-package" as const,
    value
  }));
  const findings = [...shellValues, ...capabilityPackageValues].flatMap(
    ({ location, value }) =>
      leakedTokens(value).map((token) => ({
        token,
        location,
        value
      }))
  );
  const risks: FoldInValidationRisk[] = findings.length === 0
    ? []
    : [{
        code: "shell.leakage",
        severity: "fail",
        message: "Source project names are allowed only in source metadata and import plans.",
        eventIds: [],
        refIds: []
      }];

  return {
    status: sectionStatus(risks),
    summary: findings.length === 0
      ? "No source project names leaked into shell navigation or capability package names."
      : `${findings.length} source project name leaks found outside source metadata/import plans.`,
    risks,
    findings
  };
};

const validateEcologicalHookCoverage = (
  events: readonly CanopyEvent[],
  resourceStewardship: readonly ResourceStewardshipProjection[]
): EcologicalHookCoverageReport => {
  const ecologicalEventCount = events.filter((event) => event.type.startsWith("ecology.")).length;
  const livingSystemScopedEventCount = events.filter((event) => event.livingSystemId !== undefined).length;
  const hasFoldInEcologicalHooks = ecologicalEventCount > 0 || livingSystemScopedEventCount > 0;
  const stewardshipResourcesMissingHooks = hasFoldInEcologicalHooks
    ? []
    : resourceStewardship
        .filter((projection) => projection.ecologicalContextIds.length === 0)
        .map((projection) => projection.resourceRef.id)
        .sort(compareStrings);
  const stewardshipResourcesWithHooks = resourceStewardship
    .map((projection) => projection.resourceRef.id)
    .filter((id) => !stewardshipResourcesMissingHooks.includes(id))
    .sort(compareStrings);
  const risks: FoldInValidationRisk[] = stewardshipResourcesMissingHooks.length === 0
    ? []
    : [{
        code: "ecology.uncovered",
        severity: "warn",
        message: "Stewardship resource projections should carry ecological or living-system hooks.",
        eventIds: [],
        refIds: stewardshipResourcesMissingHooks
      }];

  return {
    status: sectionStatus(risks),
    summary: `${stewardshipResourcesWithHooks.length} of ${resourceStewardship.length} stewardship resources have ecological hooks.`,
    risks,
    ecologicalEventCount,
    livingSystemScopedEventCount,
    stewardshipResourceCount: resourceStewardship.length,
    stewardshipResourcesWithHooks,
    stewardshipResourcesMissingHooks
  };
};

const validateFederationReadiness = (
  events: readonly CanopyEvent[],
  input: FoldInValidationInput
): FederationReadinessReport => {
  const federationEvents = events.filter((event) => event.type.startsWith("federation."));
  const exportEvents = federationEvents.filter((event) => event.type === "federation.export.created");
  const importEvents = federationEvents.filter((event) => event.type === "federation.import.received");
  const localMappingCount = (input.canonicalMappingRefs?.length ?? 0) +
    events.filter((event) => event.objectRef.type === "source" && event.objectRef.id.includes("mapping")).length;
  const federationRuleRefCount = input.federationRuleRefs?.length ?? 0;
  const unreadyEventIds = federationEvents
    .filter((event) =>
      event.authorityRefs.length === 0 ||
      (event.type === "federation.import.received" && localMappingCount === 0) ||
      (event.type === "federation.export.created" && federationRuleRefCount === 0)
    )
    .map((event) => event.id)
    .sort(compareStrings);
  const readyEventIds = federationEvents
    .map((event) => event.id)
    .filter((id) => !unreadyEventIds.includes(id))
    .sort(compareStrings);
  const risks: FoldInValidationRisk[] = unreadyEventIds.length === 0
    ? []
    : [{
        code: "federation.unready",
        severity: "fail",
        message: "Federation events need authority, local mapping coverage for imports, and federation rules for exports.",
        eventIds: unreadyEventIds,
        refIds: []
      }];

  return {
    status: sectionStatus(risks),
    summary: `${readyEventIds.length} of ${federationEvents.length} federation events are ready.`,
    risks,
    federationEventCount: federationEvents.length,
    federationRuleRefCount,
    exportEventCount: exportEvents.length,
    importEventCount: importEvents.length,
    localMappingCount,
    readyEventIds,
    unreadyEventIds
  };
};

const isGovernedDataEvent = (event: CanopyEvent): boolean =>
  DATA_STEWARDSHIP_VISIBILITIES.some((visibility) => visibility === event.visibility) ||
  event.sourceCapability === "data-stewardship" ||
  event.type.startsWith("federation.") ||
  event.type === "system.redaction.applied" ||
  event.redaction !== undefined;

const hasDataStewardshipCoverage = (event: CanopyEvent): boolean =>
  event.sourceCapability === "data-stewardship" ||
  event.visibility !== undefined ||
  event.dataState !== undefined ||
  event.authorityRefs.length > 0 ||
  event.redaction !== undefined ||
  event.authorityRefs.some((ref) => ref.type === "agreement") ||
  dataStewardshipAgreementRefIds(event).length > 0;

const dataStewardshipAgreementRefIds = (event: CanopyEvent): readonly CanopyId[] => {
  const fromPayload = [
    refIdFromUnknown(event.payload["dataStewardshipAgreementRef"]),
    refIdFromUnknown(event.payload["dataStewardshipAgreement"]),
    refIdFromUnknown(event.payload["agreementRef"]),
    refIdFromUnknown(event.payload["exportRuleRef"])
  ].filter(isDefined);
  const fromRedaction = event.redaction?.dataStewardshipAgreementRef?.id;
  const fromAuthority = event.authorityRefs
    .filter((ref) => ref.type === "agreement")
    .map((ref) => ref.id);

  return uniqueSorted([...fromPayload, ...(fromRedaction === undefined ? [] : [fromRedaction]), ...fromAuthority]);
};

const refIdFromUnknown = (value: unknown): CanopyId | undefined => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (isRecord(value) && typeof value["id"] === "string") {
    return value["id"];
  }

  return undefined;
};

const payloadString = (
  payload: Readonly<Record<string, unknown>>,
  key: string
): string | undefined => {
  const value = payload[key];

  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const refsFromEvents = (events: readonly CanopyEvent[]): readonly ObjectRef[] =>
  sortedRefs(dedupeRefs(events.flatMap((event) => [
    event.objectRef,
    event.actorRef,
    ...event.relatedRefs,
    ...event.authorityRefs,
    event.supersession?.replacementObjectRef,
    event.redaction?.dataStewardshipAgreementRef
  ].filter(isDefined))));

const stableEvents = (events: readonly CanopyEvent[]): readonly CanopyEvent[] =>
  [...events].sort((left, right) =>
    compareStrings(left.occurredAt, right.occurredAt) ||
    compareStrings(left.id, right.id)
  );

const leakedTokens = (value: string): readonly string[] => {
  const normalized = normalizeToken(value);

  return SOURCE_ONLY_TOKENS.filter((token) => normalized.includes(normalizeToken(token)));
};

const normalizeToken = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const reportStatus = (risks: readonly FoldInValidationRisk[]): FoldInValidationStatus => {
  if (risks.some((risk) => risk.severity === "fail")) {
    return "fail";
  }

  if (risks.length > 0) {
    return "warn";
  }

  return "pass";
};

const sectionStatus = (risks: readonly FoldInValidationRisk[]): FoldInValidationStatus =>
  reportStatus(risks);

const refKey = (ref: ObjectRef): string => `${ref.namespace}:${ref.type}:${ref.id}`;

const sortedRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] =>
  [...refs].sort((left, right) => compareStrings(refKey(left), refKey(right)));

const dedupeRefs = (refs: readonly ObjectRef[]): readonly ObjectRef[] => {
  const byKey = new Map<string, ObjectRef>();

  for (const ref of refs) {
    byKey.set(refKey(ref), ref);
  }

  return [...byKey.values()];
};

const sameRef = (left: ObjectRef, right: ObjectRef): boolean =>
  refKey(left) === refKey(right);

const uniqueSorted = <T extends string>(values: readonly T[]): readonly T[] =>
  [...new Set(values)].sort(compareStrings);

const duplicateStrings = (values: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates].sort(compareStrings);
};

const symmetricDifference = (
  leftValues: readonly string[],
  rightValues: readonly string[]
): readonly string[] => {
  const left = new Set(leftValues);
  const right = new Set(rightValues);

  return uniqueSorted([
    ...leftValues.filter((value) => !right.has(value)),
    ...rightValues.filter((value) => !left.has(value))
  ]);
};

const arraysEqual = (
  left: readonly string[],
  right: readonly string[]
): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right);

export const foldInSourceOnlyProjects = SOURCE_ONLY_PROJECTS;
export type FoldInSourceOnlyProject = (typeof SOURCE_ONLY_PROJECTS)[number];
export type FoldInValidationCapability = CanopyCapability;
