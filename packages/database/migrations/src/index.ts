export type MigrationSubject =
  | "objectRefs"
  | "canonicalMappings"
  | "events"
  | "outbox"
  | "projectionState"
  | "adapterAudit"
  | "appendOnlyEnforcement";

export type MigrationProviderTrack = "sql" | "prisma" | "drizzle";

export type ProviderMigrationTrackId =
  | MigrationProviderTrack
  | "postgres"
  | "postgis"
  | "pgvector"
  | "timescaledb"
  | "s3-compatible";

export type ProviderMigrationTrackStatus =
  | "intent"
  | "ready-for-prototype"
  | "external-provider-intent";

export type MigrationHome = {
  readonly subject: MigrationSubject;
  readonly title: string;
  readonly description: string;
  readonly appendOnly: boolean;
};

export type MigrationArtifact = {
  readonly providerTrack: ProviderMigrationTrackId;
  readonly path: string;
  readonly role: string;
};

export type ProviderMigrationTrackDescriptor = {
  readonly id: ProviderMigrationTrackId;
  readonly title: string;
  readonly status: ProviderMigrationTrackStatus;
  readonly description: string;
  readonly canonicalSubjects: readonly MigrationSubject[];
  readonly artifactPaths: readonly string[];
  readonly providerSdkCoupling: "forbidden-in-this-package";
};

export type MigrationHealthIssue = {
  readonly code:
    | "missing-canonical-home"
    | "missing-provider-track"
    | "missing-append-only-policy"
    | "provider-sdk-coupling";
  readonly message: string;
};

export type MigrationHealthReport = {
  readonly status: "pass" | "warn";
  readonly canonicalHomeCount: number;
  readonly providerTrackCount: number;
  readonly appendOnlySubjects: readonly MigrationSubject[];
  readonly issues: readonly MigrationHealthIssue[];
};

export interface ProviderMigrationReadinessEvidence {
  readonly id: string;
  readonly status: "ready" | "not-ready";
  readonly providerTracks: readonly ProviderMigrationTrackId[];
  readonly readinessTables: readonly string[];
  readonly missingTables: readonly string[];
  readonly issueCodes: readonly string[];
}

export interface MigrationRunnerClient {
  query(text: string, params?: readonly unknown[]): Promise<unknown>;
}

export interface MigrationRunnerArtifact {
  readonly id: string;
  readonly providerTrack: ProviderMigrationTrackId;
  readonly path: string;
  readonly sql: string;
  readonly subjects: readonly MigrationSubject[];
  readonly appendOnlySubjects: readonly MigrationSubject[];
}

export interface MigrationRunnerPlan {
  readonly id: string;
  readonly providerTrack: ProviderMigrationTrackId;
  readonly artifact: MigrationRunnerArtifact;
  readonly statements: readonly string[];
  readonly readinessTables: readonly string[];
}

export interface MigrationRunnerAuditRecord {
  readonly id: string;
  readonly providerTrack: ProviderMigrationTrackId;
  readonly artifactPath: string;
  readonly status: "planned" | "applied" | "failed" | "ready" | "not-ready";
  readonly checkedAt: string;
  readonly statementCount: number;
  readonly missingTables: readonly string[];
  readonly errors: readonly string[];
}

export interface MigrationRunnerResult {
  readonly plan: MigrationRunnerPlan;
  readonly audit: MigrationRunnerAuditRecord;
}

export const canonicalMigrationHomes: readonly MigrationHome[] = [
  {
    subject: "objectRefs",
    title: "Object refs",
    description:
      "Durable references for civic objects, source objects, projections, events, and adapter artifacts.",
    appendOnly: false,
  },
  {
    subject: "canonicalMappings",
    title: "Canonical mappings",
    description:
      "Stable mappings from local or external identifiers to canonical Canopy object refs.",
    appendOnly: false,
  },
  {
    subject: "events",
    title: "Events",
    description:
      "Append-only domain event records with causal metadata and schema versioning.",
    appendOnly: true,
  },
  {
    subject: "outbox",
    title: "Outbox",
    description: "Pending integration messages derived from committed events.",
    appendOnly: true,
  },
  {
    subject: "projectionState",
    title: "Projection state",
    description: "Replay cursors, projector checkpoints, and rebuild metadata.",
    appendOnly: false,
  },
  {
    subject: "adapterAudit",
    title: "Adapter audit",
    description:
      "Adapter reads, writes, transforms, and external synchronization evidence.",
    appendOnly: true,
  },
  {
    subject: "appendOnlyEnforcement",
    title: "Append-only enforcement",
    description:
      "Constraints, triggers, policies, or operational controls that prevent mutation of historical facts.",
    appendOnly: true,
  },
] as const;

export const migrationArtifacts: readonly MigrationArtifact[] = [
  {
    providerTrack: "sql",
    path: "sql/0000_canonical_homes.sql",
    role: "Portable DDL intent and provider-track templates for canonical migration homes.",
  },
  {
    providerTrack: "prisma",
    path: "prisma/schema.prisma",
    role: "Prisma-shaped model placeholders with provider selection deferred.",
  },
  {
    providerTrack: "drizzle",
    path: "drizzle/schema.ts",
    role: "Drizzle-shaped table placeholders with provider imports deferred.",
  },
  {
    providerTrack: "postgres",
    path: "sql/0000_canonical_homes.sql",
    role: "Postgres provider-track intent for canonical tables, indexes, and append-only triggers.",
  },
  {
    providerTrack: "postgis",
    path: "sql/0000_canonical_homes.sql",
    role: "PostGIS provider-track intent for object refs, spatial projections, and adapter audit evidence.",
  },
  {
    providerTrack: "pgvector",
    path: "sql/0000_canonical_homes.sql",
    role: "pgvector provider-track intent for vector projection metadata and adapter audit evidence.",
  },
  {
    providerTrack: "timescaledb",
    path: "sql/0000_canonical_homes.sql",
    role: "TimescaleDB provider-track intent for time-series projections, event ordering, and adapter audit evidence.",
  },
  {
    providerTrack: "s3-compatible",
    path: "sql/0000_canonical_homes.sql",
    role: "S3-compatible object storage intent through canonical refs, mappings, and adapter audit rows.",
  },
] as const;

export const requiredMigrationSubjects = canonicalMigrationHomes.map(
  (home) => home.subject,
);

export const appendOnlySubjects = canonicalMigrationHomes
  .filter((home) => home.appendOnly)
  .map((home) => home.subject);

export const providerMigrationTracks: readonly ProviderMigrationTrackDescriptor[] =
  [
    {
      id: "sql",
      title: "Portable SQL intent",
      status: "intent",
      description:
        "Provider-neutral table, index, constraint, and append-only enforcement intent.",
      canonicalSubjects: requiredMigrationSubjects,
      artifactPaths: ["sql/0000_canonical_homes.sql"],
      providerSdkCoupling: "forbidden-in-this-package",
    },
    {
      id: "prisma",
      title: "Prisma-shaped schema",
      status: "intent",
      description:
        "Model placeholders for teams that later choose Prisma in a provider package.",
      canonicalSubjects: requiredMigrationSubjects,
      artifactPaths: ["prisma/schema.prisma"],
      providerSdkCoupling: "forbidden-in-this-package",
    },
    {
      id: "drizzle",
      title: "Drizzle-shaped schema",
      status: "intent",
      description:
        "Table descriptors for teams that later choose Drizzle in a provider package.",
      canonicalSubjects: requiredMigrationSubjects,
      artifactPaths: ["drizzle/schema.ts"],
      providerSdkCoupling: "forbidden-in-this-package",
    },
    {
      id: "postgres",
      title: "Postgres canonical runtime",
      status: "ready-for-prototype",
      description:
        "Primary relational provider track for canonical refs, events, outbox, projections, mappings, and audit.",
      canonicalSubjects: requiredMigrationSubjects,
      artifactPaths: ["sql/0000_canonical_homes.sql"],
      providerSdkCoupling: "forbidden-in-this-package",
    },
    {
      id: "postgis",
      title: "PostGIS geospatial runtime",
      status: "ready-for-prototype",
      description:
        "Spatial extension track for object refs, canonical mappings, projection state, and adapter audit evidence.",
      canonicalSubjects: [
        "objectRefs",
        "canonicalMappings",
        "projectionState",
        "adapterAudit",
      ],
      artifactPaths: ["sql/0000_canonical_homes.sql"],
      providerSdkCoupling: "forbidden-in-this-package",
    },
    {
      id: "pgvector",
      title: "pgvector semantic index runtime",
      status: "ready-for-prototype",
      description:
        "Vector extension track for projection metadata, source mappings, and adapter audit evidence.",
      canonicalSubjects: [
        "objectRefs",
        "canonicalMappings",
        "projectionState",
        "adapterAudit",
      ],
      artifactPaths: ["sql/0000_canonical_homes.sql"],
      providerSdkCoupling: "forbidden-in-this-package",
    },
    {
      id: "timescaledb",
      title: "TimescaleDB time-series runtime",
      status: "ready-for-prototype",
      description:
        "Time-series extension track for ordered observations, window projections, and adapter audit evidence.",
      canonicalSubjects: [
        "objectRefs",
        "events",
        "projectionState",
        "adapterAudit",
      ],
      artifactPaths: ["sql/0000_canonical_homes.sql"],
      providerSdkCoupling: "forbidden-in-this-package",
    },
    {
      id: "s3-compatible",
      title: "S3-compatible document and object storage",
      status: "external-provider-intent",
      description:
        "External object storage track represented canonically by object refs, mappings, and adapter audit rows.",
      canonicalSubjects: ["objectRefs", "canonicalMappings", "adapterAudit"],
      artifactPaths: ["sql/0000_canonical_homes.sql"],
      providerSdkCoupling: "forbidden-in-this-package",
    },
  ] as const;

export const requiredProviderMigrationTracks: readonly ProviderMigrationTrackId[] =
  [
    "sql",
    "prisma",
    "drizzle",
    "postgres",
    "postgis",
    "pgvector",
    "timescaledb",
    "s3-compatible",
  ];

export const forbiddenProviderSdkSpecifiers = [
  "pg",
  "postgres",
  "drizzle-orm",
  "prisma",
  "@prisma/client",
  "@neondatabase/serverless",
  "@aws-sdk/client-s3",
  "aws-sdk",
] as const;

export const canonicalSqlReadinessTables = [
  "canopy_object_refs",
  "canopy_canonical_mappings",
  "canopy_events",
  "canopy_outbox",
  "canopy_projection_state",
  "canopy_adapter_audit",
] as const;

export const findForbiddenProviderSdkCoupling = (
  specifiers: readonly string[],
): readonly string[] =>
  specifiers.filter((specifier) =>
    forbiddenProviderSdkSpecifiers.includes(
      specifier as (typeof forbiddenProviderSdkSpecifiers)[number],
    ),
  );

export const createMigrationHealthReport = (input?: {
  readonly providerTracks?: readonly ProviderMigrationTrackDescriptor[];
  readonly homes?: readonly MigrationHome[];
  readonly appendOnlyPolicies?: readonly MigrationSubject[];
  readonly dependencySpecifiers?: readonly string[];
}): MigrationHealthReport => {
  const homes = input?.homes ?? canonicalMigrationHomes;
  const providerTracks = input?.providerTracks ?? providerMigrationTracks;
  const appendOnlyPolicies = input?.appendOnlyPolicies ?? appendOnlySubjects;
  const dependencySpecifiers = input?.dependencySpecifiers ?? [];

  const homeSubjects = new Set(homes.map((home) => home.subject));
  const trackIds = new Set(providerTracks.map((track) => track.id));
  const appendOnlyPolicySubjects = new Set(appendOnlyPolicies);
  const issues: MigrationHealthIssue[] = [];

  for (const subject of requiredMigrationSubjects) {
    if (!homeSubjects.has(subject)) {
      issues.push({
        code: "missing-canonical-home",
        message: `Missing canonical migration home for ${subject}.`,
      });
    }
  }

  for (const track of requiredProviderMigrationTracks) {
    if (!trackIds.has(track)) {
      issues.push({
        code: "missing-provider-track",
        message: `Missing provider migration track ${track}.`,
      });
    }
  }

  for (const subject of appendOnlySubjects) {
    if (!appendOnlyPolicySubjects.has(subject)) {
      issues.push({
        code: "missing-append-only-policy",
        message: `Missing append-only migration policy for ${subject}.`,
      });
    }
  }

  for (const specifier of findForbiddenProviderSdkCoupling(dependencySpecifiers)) {
    issues.push({
      code: "provider-sdk-coupling",
      message: `Provider SDK ${specifier} must stay out of @canopy/database-migrations.`,
    });
  }

  return {
    status: issues.length === 0 ? "pass" : "warn",
    canonicalHomeCount: homes.length,
    providerTrackCount: providerTracks.length,
    appendOnlySubjects,
    issues,
  };
};

export const createProviderMigrationReadinessEvidence = (input?: {
  readonly healthReport?: MigrationHealthReport;
  readonly providerTracks?: readonly ProviderMigrationTrackDescriptor[];
  readonly readinessTables?: readonly string[];
  readonly missingTables?: readonly string[];
}): ProviderMigrationReadinessEvidence => {
  const healthReport = input?.healthReport ?? createMigrationHealthReport();
  const providerTracks = input?.providerTracks ?? providerMigrationTracks;
  const missingTables = input?.missingTables ?? [];
  const issueCodes = healthReport.issues.map((issue) => issue.code);

  return {
    id: "migration.provider-readiness",
    status:
      healthReport.status === "pass" &&
      missingTables.length === 0 &&
      issueCodes.length === 0
        ? "ready"
        : "not-ready",
    providerTracks: providerTracks.map((track) => track.id),
    readinessTables: input?.readinessTables ?? canonicalSqlReadinessTables,
    missingTables,
    issueCodes,
  };
};

export const createCanonicalSqlMigrationArtifact = (
  sql: string,
): MigrationRunnerArtifact => ({
  id: "migration.canopy.canonical.0000",
  providerTrack: "postgres",
  path: "sql/0000_canonical_homes.sql",
  sql,
  subjects: requiredMigrationSubjects,
  appendOnlySubjects,
});

export const createMigrationRunnerPlan = (
  artifact: MigrationRunnerArtifact,
): MigrationRunnerPlan => ({
  id: `${artifact.id}.plan`,
  providerTrack: artifact.providerTrack,
  artifact,
  statements: splitSqlStatements(artifact.sql),
  readinessTables: canonicalSqlReadinessTables,
});

export const checkMigrationReadiness = async (
  client: MigrationRunnerClient,
  tables: readonly string[] = canonicalSqlReadinessTables,
): Promise<readonly string[]> => {
  const missingTables: string[] = [];

  for (const table of tables) {
    const result = await client.query("SELECT to_regclass($1) AS table_name", [table]);
    if (firstResultValue(result) !== table) {
      missingTables.push(table);
    }
  }

  return missingTables;
};

export const applyMigrationRunnerPlan = async (
  client: MigrationRunnerClient,
  plan: MigrationRunnerPlan,
  options: {
    readonly now?: () => string;
    readonly useTransaction?: boolean;
  } = {},
): Promise<MigrationRunnerResult> => {
  const now = options.now ?? (() => new Date().toISOString());
  const useTransaction = options.useTransaction ?? true;

  if (useTransaction) {
    await client.query("BEGIN");
  }

  try {
    for (const statement of plan.statements) {
      await client.query(statement);
    }

    if (useTransaction) {
      await client.query("COMMIT");
    }
  } catch (error) {
    if (useTransaction) {
      await client.query("ROLLBACK");
    }

    return {
      plan,
      audit: {
        id: `${plan.id}.audit.failed`,
        providerTrack: plan.providerTrack,
        artifactPath: plan.artifact.path,
        status: "failed",
        checkedAt: now(),
        statementCount: plan.statements.length,
        missingTables: [],
        errors: [error instanceof Error ? error.message : String(error)],
      },
    };
  }

  const missingTables = await checkMigrationReadiness(client, plan.readinessTables);
  return {
    plan,
    audit: {
      id: `${plan.id}.audit.${missingTables.length === 0 ? "ready" : "not-ready"}`,
      providerTrack: plan.providerTrack,
      artifactPath: plan.artifact.path,
      status: missingTables.length === 0 ? "ready" : "not-ready",
      checkedAt: now(),
      statementCount: plan.statements.length,
      missingTables,
      errors: [],
    },
  };
};

function splitSqlStatements(sql: string): readonly string[] {
  const statements: string[] = [];
  let current = "";
  let inDollarQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (char === "$" && next === "$") {
      inDollarQuote = !inDollarQuote;
      current += "$$";
      index += 1;
      continue;
    }

    current += char;

    if (char === ";" && !inDollarQuote) {
      const statement = current.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      current = "";
    }
  }

  const trailing = current.trim();
  return trailing.length === 0 ? statements : [...statements, trailing];
}

function firstResultValue(result: unknown): unknown {
  const rows =
    typeof result === "object" && result !== null && "rows" in result
      ? (result as { readonly rows?: readonly unknown[] }).rows
      : undefined;
  const firstRow = rows?.[0];
  if (typeof firstRow !== "object" || firstRow === null) {
    return undefined;
  }
  return Object.values(firstRow as Record<string, unknown>)[0];
}
