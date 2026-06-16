import type { CanopyId, IsoDateTime } from "@canopy/contracts-kernel";
import {
  adapterProviderTargets,
  candidateProviderTargets,
  createPhase10ProviderDeploymentReadinessReport,
  legacyProviderTargets,
  phase10ProviderDeploymentRequirements,
  referenceProviderTargets,
  type AdapterProviderTarget,
  type AdapterProviderTargetRole,
  type AdapterProviderTargetStatus,
  type Phase10ProviderDeploymentReadinessReport
} from "@canopy/evaluation-adapter-conformance";
import {
  canonicalSqlReadinessTables,
  createMigrationHealthReport,
  createProviderMigrationReadinessEvidence,
  providerMigrationTracks,
  type MigrationHealthReport,
  type ProviderMigrationReadinessEvidence,
  type ProviderMigrationTrackDescriptor,
  type ProviderMigrationTrackStatus
} from "@canopy/database-migrations";
import type {
  CanopyOperationalReadinessCheckStatus,
  CanopyOperationsReadiness,
  CanopyOperationsReport
} from "@canopy/workflows-operations";

export type CanopyEcosystemHardeningReadiness =
  | "ready"
  | "attention"
  | "blocked";

export type CanopyEcosystemHardeningGateStatus =
  | CanopyEcosystemHardeningReadiness
  | "not-observed";

export type CanopyEcosystemHardeningGateArea =
  | "providers"
  | "migrations"
  | "operations"
  | "deployment"
  | "privacy"
  | "auditability";

export interface CanopyEcosystemHardeningGate {
  readonly id: CanopyId;
  readonly area: CanopyEcosystemHardeningGateArea;
  readonly status: CanopyEcosystemHardeningGateStatus;
  readonly message: string;
  readonly evidenceIds: readonly CanopyId[];
  readonly blockers: readonly string[];
  readonly nextActions: readonly string[];
}

export interface CanopyEcosystemProviderHardeningSummary {
  readonly totalTargets: number;
  readonly byRole: Readonly<Record<AdapterProviderTargetRole, number>>;
  readonly byStatus: Readonly<Record<AdapterProviderTargetStatus, number>>;
  readonly implementedReferenceTargetIds: readonly CanopyId[];
  readonly plannedCandidateTargetIds: readonly CanopyId[];
  readonly prototypeCandidateTargetIds: readonly CanopyId[];
  readonly pendingLegacySourceTargetIds: readonly CanopyId[];
  readonly productionBlockingTargetIds: readonly CanopyId[];
}

export interface CanopyEcosystemMigrationHardeningSummary {
  readonly health: MigrationHealthReport;
  readonly readinessEvidence: ProviderMigrationReadinessEvidence;
  readonly providerTrackStatuses: Readonly<Record<ProviderMigrationTrackStatus, number>>;
  readonly readinessTables: readonly string[];
  readonly productionTrackIds: readonly string[];
  readonly externalProviderTrackIds: readonly string[];
}

export interface CanopyEcosystemOperationsHardeningSummary {
  readonly observed: boolean;
  readonly readiness: CanopyOperationsReadiness | "not-observed";
  readonly generatedAt?: IsoDateTime;
  readonly findingCount: number;
  readonly blockedReadinessCheckIds: readonly string[];
  readonly attentionReadinessCheckIds: readonly string[];
}

export type CanopyVerificationStatus =
  | "passed"
  | "failed"
  | "not-observed";

export interface CanopyVerificationEvidence {
  readonly id: CanopyId;
  readonly command: string;
  readonly status: CanopyVerificationStatus;
  readonly checkedAt?: IsoDateTime;
  readonly notes?: string;
}

export interface CanopyEcosystemDeploymentHardeningSummary {
  readonly requiredCommands: readonly CanopyVerificationEvidence[];
  readonly providerDeployment: Phase10ProviderDeploymentReadinessReport;
  readonly passedCommandIds: readonly CanopyId[];
  readonly failedCommandIds: readonly CanopyId[];
  readonly unobservedCommandIds: readonly CanopyId[];
}

export interface CanopyEcosystemHardeningReport {
  readonly phase: "phase-10";
  readonly generatedAt: IsoDateTime;
  readonly readiness: CanopyEcosystemHardeningReadiness;
  readonly gates: readonly CanopyEcosystemHardeningGate[];
  readonly providers: CanopyEcosystemProviderHardeningSummary;
  readonly migrations: CanopyEcosystemMigrationHardeningSummary;
  readonly operations: CanopyEcosystemOperationsHardeningSummary;
  readonly deployment: CanopyEcosystemDeploymentHardeningSummary;
  readonly blockers: readonly string[];
  readonly nextActions: readonly string[];
}

export interface BuildCanopyEcosystemHardeningReportInput {
  readonly generatedAt: IsoDateTime;
  readonly providerTargets?: readonly AdapterProviderTarget[];
  readonly migrationHealth?: MigrationHealthReport;
  readonly migrationReadinessEvidence?: ProviderMigrationReadinessEvidence;
  readonly providerTracks?: readonly ProviderMigrationTrackDescriptor[];
  readonly operationsReport?: Pick<
    CanopyOperationsReport,
    "generatedAt" | "readiness" | "readinessChecks" | "findings"
  >;
  readonly verificationEvidence?: readonly CanopyVerificationEvidence[];
  readonly satisfiedProviderProductionGateIds?: readonly CanopyId[];
  readonly availableDeploymentEnvironment?: readonly string[];
}

export const requiredPhase10VerificationCommands = [
  verificationCommand(
    "verification.phase10.full-check",
    "npm run check"
  ),
  verificationCommand(
    "verification.phase10.database-check",
    "npm run check:db"
  ),
  verificationCommand(
    "verification.phase10.web-check",
    "npm --workspace @canopy/web run check"
  )
] satisfies readonly CanopyVerificationEvidence[];

export function buildCanopyEcosystemHardeningReport(
  input: BuildCanopyEcosystemHardeningReportInput
): CanopyEcosystemHardeningReport {
  const providerTargets = input.providerTargets ?? adapterProviderTargets;
  const providerTracks = input.providerTracks ?? providerMigrationTracks;
  const migrationHealth = input.migrationHealth ?? createMigrationHealthReport();
  const providerSummary = summarizeProviders(providerTargets);
  const migrationSummary = summarizeMigrations({
    health: migrationHealth,
    providerTracks,
    readinessEvidence:
      input.migrationReadinessEvidence ??
      createProviderMigrationReadinessEvidence({
        healthReport: migrationHealth,
        providerTracks
      })
  });
  const operationsSummary = summarizeOperations(input.operationsReport);
  const deploymentSummary = summarizeDeployment({
    generatedAt: input.generatedAt,
    providerTargets,
    migrationReadinessEvidence: migrationSummary.readinessEvidence,
    ...optionalVerificationEvidence(input.verificationEvidence),
    ...optionalSatisfiedProviderProductionGateIds(
      input.satisfiedProviderProductionGateIds
    ),
    ...optionalAvailableDeploymentEnvironment(input.availableDeploymentEnvironment)
  });
  const gates = [
    providerCatalogGate(providerSummary),
    providerBindingGate(providerSummary),
    legacySourceGate(providerSummary),
    migrationManifestGate(migrationSummary),
    operationsGate(operationsSummary),
    deploymentGate(deploymentSummary),
    providerDeploymentGate(deploymentSummary.providerDeployment),
    privacyRedactionGate(providerTargets),
    auditabilityGate(providerTargets, migrationSummary)
  ] satisfies readonly CanopyEcosystemHardeningGate[];
  const blockers = gates.flatMap((gate) => gate.blockers);

  return {
    phase: "phase-10",
    generatedAt: input.generatedAt,
    readiness: readinessForGates(gates),
    gates,
    providers: providerSummary,
    migrations: migrationSummary,
    operations: operationsSummary,
    deployment: deploymentSummary,
    blockers,
    nextActions: stableUnique(gates.flatMap((gate) => gate.nextActions))
  };
}

function summarizeProviders(
  targets: readonly AdapterProviderTarget[]
): CanopyEcosystemProviderHardeningSummary {
  const references = targets.filter((target) => target.role === "reference-implementation");
  const candidates = targets.filter((target) => target.role === "candidate-provider");
  const legacySources = targets.filter((target) => target.role === "legacy-fold-in-source");
  const plannedCandidates = candidates.filter((target) => target.status === "planned");
  const prototypeCandidates = candidates.filter((target) => target.status === "prototype");
  const pendingLegacySources = legacySources.filter(
    (target) => target.status !== "implemented"
  );

  return {
    totalTargets: targets.length,
    byRole: countProviderRoles(targets),
    byStatus: countProviderStatuses(targets),
    implementedReferenceTargetIds: references
      .filter((target) => target.status === "implemented")
      .map((target) => target.id),
    plannedCandidateTargetIds: plannedCandidates.map((target) => target.id),
    prototypeCandidateTargetIds: prototypeCandidates.map((target) => target.id),
    pendingLegacySourceTargetIds: pendingLegacySources.map((target) => target.id),
    productionBlockingTargetIds: [
      ...plannedCandidates,
      ...candidates.filter((target) => target.status === "deferred"),
      ...pendingLegacySources
    ].map((target) => target.id)
  };
}

function summarizeMigrations(input: {
  readonly health: MigrationHealthReport;
  readonly providerTracks: readonly ProviderMigrationTrackDescriptor[];
  readonly readinessEvidence: ProviderMigrationReadinessEvidence;
}): CanopyEcosystemMigrationHardeningSummary {
  return {
    health: input.health,
    readinessEvidence: input.readinessEvidence,
    providerTrackStatuses: countProviderTrackStatuses(input.providerTracks),
    readinessTables: canonicalSqlReadinessTables,
    productionTrackIds: input.providerTracks
      .filter((track) => track.status === "ready-for-prototype")
      .map((track) => track.id),
    externalProviderTrackIds: input.providerTracks
      .filter((track) => track.status === "external-provider-intent")
      .map((track) => track.id)
  };
}

function summarizeOperations(
  report: BuildCanopyEcosystemHardeningReportInput["operationsReport"]
): CanopyEcosystemOperationsHardeningSummary {
  if (report === undefined) {
    return {
      observed: false,
      readiness: "not-observed",
      findingCount: 0,
      blockedReadinessCheckIds: [],
      attentionReadinessCheckIds: []
    };
  }

  const checks = Object.values(report.readinessChecks);
  return {
    observed: true,
    readiness: report.readiness,
    generatedAt: report.generatedAt,
    findingCount: report.findings.length,
    blockedReadinessCheckIds: checksForStatus(checks, "blocked"),
    attentionReadinessCheckIds: checksForStatus(checks, "attention")
  };
}

function summarizeDeployment(
  input: {
    readonly generatedAt: IsoDateTime;
    readonly providerTargets: readonly AdapterProviderTarget[];
    readonly migrationReadinessEvidence: ProviderMigrationReadinessEvidence;
    readonly verificationEvidence?: readonly CanopyVerificationEvidence[];
    readonly satisfiedProviderProductionGateIds?: readonly CanopyId[];
    readonly availableDeploymentEnvironment?: readonly string[];
  }
): CanopyEcosystemDeploymentHardeningSummary {
  const observedById = new Map(
    (input.verificationEvidence ?? []).map((item) => [item.id, item])
  );
  const requiredCommands = requiredPhase10VerificationCommands.map(
    (command) => observedById.get(command.id) ?? command
  );
  const providerDeployment = createPhase10ProviderDeploymentReadinessReport({
    generatedAt: input.generatedAt,
    providerTargets: input.providerTargets,
    migrationReadiness: input.migrationReadinessEvidence,
    ...optionalSatisfiedProductionGateIds(input.satisfiedProviderProductionGateIds),
    ...optionalAvailableEnvironment(input.availableDeploymentEnvironment)
  });

  return {
    requiredCommands,
    providerDeployment,
    passedCommandIds: requiredCommands
      .filter((command) => command.status === "passed")
      .map((command) => command.id),
    failedCommandIds: requiredCommands
      .filter((command) => command.status === "failed")
      .map((command) => command.id),
    unobservedCommandIds: requiredCommands
      .filter((command) => command.status === "not-observed")
      .map((command) => command.id)
  };
}

function providerCatalogGate(
  summary: CanopyEcosystemProviderHardeningSummary
): CanopyEcosystemHardeningGate {
  const missingReferenceCount =
    referenceProviderTargets.length - summary.implementedReferenceTargetIds.length;
  return {
    id: "hardening.providers.catalog",
    area: "providers",
    status: missingReferenceCount === 0 ? "ready" : "blocked",
    message:
      missingReferenceCount === 0
        ? "Every adapter kind has an implemented in-memory reference target."
        : "One or more adapter reference targets are missing.",
    evidenceIds: summary.implementedReferenceTargetIds,
    blockers:
      missingReferenceCount === 0
        ? []
        : [`${missingReferenceCount} reference adapter targets are not implemented.`],
    nextActions:
      missingReferenceCount === 0
        ? []
        : ["Restore reference adapter targets for every adapter kind."]
  };
}

function providerBindingGate(
  summary: CanopyEcosystemProviderHardeningSummary
): CanopyEcosystemHardeningGate {
  const blockerCount = summary.plannedCandidateTargetIds.length;
  const attentionCount = summary.prototypeCandidateTargetIds.length;
  return {
    id: "hardening.providers.production-binding",
    area: "providers",
    status: blockerCount > 0 ? "blocked" : attentionCount > 0 ? "attention" : "ready",
    message:
      blockerCount > 0
        ? "Production provider binding still has planned candidate adapters."
        : attentionCount > 0
          ? "Candidate adapters are prototyped and need production binding evidence."
          : "Candidate provider adapters are implemented for production binding.",
    evidenceIds: [
      ...summary.plannedCandidateTargetIds,
      ...summary.prototypeCandidateTargetIds
    ],
    blockers: summary.plannedCandidateTargetIds.map(
      (id) => `${id} is still planned.`
    ),
    nextActions:
      blockerCount > 0
        ? ["Promote planned Postgres persistence and event-store targets into provider packages."]
        : attentionCount > 0
          ? ["Attach production credential, migration, and conformance evidence to prototype provider targets."]
          : []
  };
}

function legacySourceGate(
  summary: CanopyEcosystemProviderHardeningSummary
): CanopyEcosystemHardeningGate {
  return {
    id: "hardening.providers.legacy-source-bridges",
    area: "providers",
    status:
      summary.pendingLegacySourceTargetIds.length === 0 ? "ready" : "attention",
    message:
      summary.pendingLegacySourceTargetIds.length === 0
        ? "Legacy fold-in source adapters are implemented."
        : "Legacy fold-in source adapters still need migration evidence before final decommission.",
    evidenceIds: summary.pendingLegacySourceTargetIds,
    blockers: [],
    nextActions:
      summary.pendingLegacySourceTargetIds.length === 0
        ? []
        : ["Implement or explicitly retire CommonCredit, ICOS, Sensemaking, and Stewardship source adapters."]
  };
}

function migrationManifestGate(
  summary: CanopyEcosystemMigrationHardeningSummary
): CanopyEcosystemHardeningGate {
  const notReady = summary.readinessEvidence.status !== "ready";
  return {
    id: "hardening.migrations.canonical-runtime-shape",
    area: "migrations",
    status: summary.health.status === "pass" && !notReady ? "ready" : "attention",
    message:
      summary.health.status === "pass" && !notReady
        ? "Canonical migration homes, provider tracks, and readiness evidence are declared."
        : "Canonical migration manifest has warnings.",
    evidenceIds: [
      ...summary.productionTrackIds.map((id) => `migration-track.${id}`),
      ...summary.readinessTables.map((table) => `migration-table.${table}`)
    ],
    blockers: [],
    nextActions: [
      ...summary.health.issues.map((issue) => issue.message),
      ...summary.readinessEvidence.missingTables.map(
        (table) => `Migration readiness is missing ${table}.`
      )
    ]
  };
}

function operationsGate(
  summary: CanopyEcosystemOperationsHardeningSummary
): CanopyEcosystemHardeningGate {
  return {
    id: "hardening.operations.runtime-readiness",
    area: "operations",
    status: summary.readiness,
    message: summary.observed
      ? `Operations report is ${summary.readiness}.`
      : "No operations report has been attached to this hardening evaluation.",
    evidenceIds: [
      ...summary.blockedReadinessCheckIds.map((id) => `operations.${id}`),
      ...summary.attentionReadinessCheckIds.map((id) => `operations.${id}`)
    ],
    blockers:
      summary.readiness === "blocked"
        ? summary.blockedReadinessCheckIds.map((id) => `${id} is blocked.`)
        : [],
    nextActions:
      summary.observed && summary.readiness === "ready"
        ? []
        : ["Run and attach a current Canopy operations report with replay, projection, outbox, adapter audit, and federation checks."]
  };
}

function deploymentGate(
  summary: CanopyEcosystemDeploymentHardeningSummary
): CanopyEcosystemHardeningGate {
  return {
    id: "hardening.deployment.verification-evidence",
    area: "deployment",
    status:
      summary.failedCommandIds.length > 0
        ? "blocked"
        : summary.unobservedCommandIds.length > 0
          ? "not-observed"
          : "ready",
    message:
      summary.failedCommandIds.length > 0
        ? "One or more Phase 10 verification commands failed."
        : summary.unobservedCommandIds.length > 0
          ? "Phase 10 verification commands have not all been observed."
          : "Phase 10 verification commands passed.",
    evidenceIds: [
      ...summary.passedCommandIds,
      ...summary.failedCommandIds,
      ...summary.unobservedCommandIds
    ],
    blockers: summary.failedCommandIds.map((id) => `${id} failed.`),
    nextActions:
      summary.failedCommandIds.length > 0 || summary.unobservedCommandIds.length > 0
        ? ["Attach fresh npm run check, database check, and web check evidence before production promotion."]
        : []
  };
}

function providerDeploymentGate(
  report: Phase10ProviderDeploymentReadinessReport
): CanopyEcosystemHardeningGate {
  return {
    id: "hardening.deployment.provider-release-readiness",
    area: "deployment",
    status: report.status,
    message:
      report.status === "ready"
        ? "Provider deployment readiness gates are satisfied."
        : "Provider deployment readiness gates still block release.",
    evidenceIds: [
      report.id,
      ...phase10ProviderDeploymentRequirements.map((requirement) => requirement.id)
    ],
    blockers: report.releaseBlockers,
    nextActions: report.nextActions
  };
}

function privacyRedactionGate(
  targets: readonly AdapterProviderTarget[]
): CanopyEcosystemHardeningGate {
  const redactionTargets = targets.filter((target) =>
    target.requiredBeforeProductionUse.some((gate) => gate.includes("redaction"))
  );
  return {
    id: "hardening.privacy.redaction-respect",
    area: "privacy",
    status: redactionTargets.length === 0 ? "attention" : "ready",
    message:
      redactionTargets.length === 0
        ? "No provider targets explicitly name redaction gates."
        : "Provider target contracts include redaction-sensitive production gates.",
    evidenceIds: redactionTargets.map((target) => target.id),
    blockers: [],
    nextActions:
      redactionTargets.length === 0
        ? ["Add redaction-respect gates to storage, document, and federation provider targets."]
        : []
  };
}

function auditabilityGate(
  targets: readonly AdapterProviderTarget[],
  migrations: CanopyEcosystemMigrationHardeningSummary
): CanopyEcosystemHardeningGate {
  const targetsWithoutAudit = targets.filter(
    (target) => !target.requiredBeforeProductionUse.includes("adapter.audit-records-written")
  );
  const hasAuditTable = migrations.readinessTables.includes("canopy_adapter_audit");
  const blocked = targetsWithoutAudit.length > 0 || !hasAuditTable;
  return {
    id: "hardening.auditability.adapter-audit-chain",
    area: "auditability",
    status: blocked ? "blocked" : "ready",
    message: blocked
      ? "Adapter audit evidence is incomplete."
      : "Adapter targets and canonical migration tables preserve audit evidence.",
    evidenceIds: [
      ...targets.map((target) => target.id),
      "migration-table.canopy_adapter_audit"
    ],
    blockers: [
      ...targetsWithoutAudit.map((target) => `${target.id} lacks adapter audit gate.`),
      ...(hasAuditTable ? [] : ["canopy_adapter_audit readiness table is missing."])
    ],
    nextActions: blocked
      ? ["Restore adapter audit production gates and canonical adapter audit migration readiness."]
      : []
  };
}

function readinessForGates(
  gates: readonly CanopyEcosystemHardeningGate[]
): CanopyEcosystemHardeningReadiness {
  if (gates.some((gate) => gate.status === "blocked")) {
    return "blocked";
  }
  if (gates.some((gate) => gate.status !== "ready")) {
    return "attention";
  }
  return "ready";
}

function checksForStatus(
  checks: readonly { readonly id: string; readonly status: CanopyOperationalReadinessCheckStatus }[],
  status: CanopyOperationalReadinessCheckStatus
): readonly string[] {
  return checks
    .filter((check) => check.status === status)
    .map((check) => check.id);
}

function countProviderRoles(
  targets: readonly AdapterProviderTarget[]
): Readonly<Record<AdapterProviderTargetRole, number>> {
  return {
    "reference-implementation": targets.filter(
      (target) => target.role === "reference-implementation"
    ).length,
    "candidate-provider": targets.filter(
      (target) => target.role === "candidate-provider"
    ).length,
    "legacy-fold-in-source": targets.filter(
      (target) => target.role === "legacy-fold-in-source"
    ).length
  };
}

function countProviderStatuses(
  targets: readonly AdapterProviderTarget[]
): Readonly<Record<AdapterProviderTargetStatus, number>> {
  return {
    implemented: targets.filter((target) => target.status === "implemented").length,
    planned: targets.filter((target) => target.status === "planned").length,
    prototype: targets.filter((target) => target.status === "prototype").length,
    deferred: targets.filter((target) => target.status === "deferred").length
  };
}

function countProviderTrackStatuses(
  tracks: readonly ProviderMigrationTrackDescriptor[]
): Readonly<Record<ProviderMigrationTrackStatus, number>> {
  return {
    intent: tracks.filter((track) => track.status === "intent").length,
    "ready-for-prototype": tracks.filter(
      (track) => track.status === "ready-for-prototype"
    ).length,
    "external-provider-intent": tracks.filter(
      (track) => track.status === "external-provider-intent"
    ).length
  };
}

function verificationCommand(
  id: CanopyId,
  command: string
): CanopyVerificationEvidence {
  return {
    id,
    command,
    status: "not-observed"
  };
}

function stableUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function optionalVerificationEvidence(
  evidence: readonly CanopyVerificationEvidence[] | undefined
): { readonly verificationEvidence: readonly CanopyVerificationEvidence[] } | {} {
  return evidence === undefined ? {} : { verificationEvidence: evidence };
}

function optionalSatisfiedProviderProductionGateIds(
  gateIds: readonly CanopyId[] | undefined
): { readonly satisfiedProviderProductionGateIds: readonly CanopyId[] } | {} {
  return gateIds === undefined
    ? {}
    : { satisfiedProviderProductionGateIds: gateIds };
}

function optionalAvailableDeploymentEnvironment(
  environment: readonly string[] | undefined
): { readonly availableDeploymentEnvironment: readonly string[] } | {} {
  return environment === undefined
    ? {}
    : { availableDeploymentEnvironment: environment };
}

function optionalSatisfiedProductionGateIds(
  gateIds: readonly CanopyId[] | undefined
): { readonly satisfiedProductionGateIds: readonly CanopyId[] } | {} {
  return gateIds === undefined ? {} : { satisfiedProductionGateIds: gateIds };
}

function optionalAvailableEnvironment(
  environment: readonly string[] | undefined
): { readonly availableEnvironment: readonly string[] } | {} {
  return environment === undefined ? {} : { availableEnvironment: environment };
}

export {
  adapterProviderTargets,
  candidateProviderTargets,
  legacyProviderTargets,
  referenceProviderTargets
};
