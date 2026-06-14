import type { AdapterDescriptor } from "@canopy/contracts-adapters";
import type {
  CanopyId,
  ContentHash,
  IsoDateTime,
  LocalSourcePointer,
  ObjectRef,
  ValidationIssue
} from "@canopy/contracts-kernel";
import type { AdapterCapabilityGroup, AdapterKind } from "./adapter-kinds.js";

export type ConformanceInvariantLevel = "must" | "should";

export type ConformanceCaseIntent =
  | "identity"
  | "permission"
  | "create"
  | "read"
  | "update"
  | "delete"
  | "append"
  | "query"
  | "search"
  | "sync"
  | "import"
  | "export"
  | "redact"
  | "observe";

export interface AdapterHarnessMarker {
  readonly descriptor: AdapterDescriptor;
}

export interface AdapterConformanceFixture {
  readonly id: CanopyId;
  readonly role: string;
  readonly ref?: ObjectRef;
  readonly source?: LocalSourcePointer;
  readonly contentHash?: ContentHash;
  readonly value?: Readonly<Record<string, unknown>>;
}

export interface AdapterInvariantDefinition {
  readonly id: CanopyId;
  readonly level: ConformanceInvariantLevel;
  readonly title: string;
  readonly rationale: string;
  readonly intents: readonly ConformanceCaseIntent[];
  readonly fixtureRoles: readonly string[];
  readonly failureCode: string;
}

export interface AdapterConformanceCase {
  readonly id: CanopyId;
  readonly invariantId: CanopyId;
  readonly title: string;
  readonly intent: ConformanceCaseIntent;
  readonly fixtures: readonly AdapterConformanceFixture[];
  readonly expectedBehavior: string;
}

export interface AdapterConformanceSuite {
  readonly kind: AdapterKind;
  readonly capabilityGroups: readonly AdapterCapabilityGroup[];
  readonly invariants: readonly AdapterInvariantDefinition[];
  readonly cases: readonly AdapterConformanceCase[];
}

export interface AdapterUnderTest {
  readonly id: string;
  readonly kind: AdapterKind;
  readonly contractVersion?: string;
  readonly evaluatedAt?: IsoDateTime;
}

export interface AdapterCaseResult {
  readonly caseId: CanopyId;
  readonly invariantId: CanopyId;
  readonly passed: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly evidence?: Readonly<Record<string, unknown>>;
}

export interface AdapterSuiteResult {
  readonly adapter: AdapterUnderTest;
  readonly suiteKind: AdapterKind;
  readonly passed: boolean;
  readonly results: readonly AdapterCaseResult[];
}

export interface AdapterConformanceRunner {
  readonly evaluate: (
    adapter: AdapterUnderTest,
    conformanceCase: AdapterConformanceCase
  ) => AdapterCaseResult | Promise<AdapterCaseResult>;
}

export function defineAdapterInvariant(
  invariant: AdapterInvariantDefinition
): AdapterInvariantDefinition {
  return invariant;
}

export function defineAdapterCase(
  conformanceCase: AdapterConformanceCase
): AdapterConformanceCase {
  return conformanceCase;
}

export function defineAdapterConformanceSuite(
  suite: AdapterConformanceSuite
): AdapterConformanceSuite {
  assertUnique("invariant", suite.invariants.map((invariant) => invariant.id));
  assertUnique("case", suite.cases.map((conformanceCase) => conformanceCase.id));

  const invariantIds = new Set(suite.invariants.map((invariant) => invariant.id));
  for (const conformanceCase of suite.cases) {
    if (!invariantIds.has(conformanceCase.invariantId)) {
      throw new Error(
        `Case ${conformanceCase.id} references unknown invariant ${conformanceCase.invariantId}`
      );
    }
  }

  return suite;
}

export async function runAdapterConformanceSuite(
  suite: AdapterConformanceSuite,
  adapter: AdapterUnderTest,
  runner: AdapterConformanceRunner
): Promise<AdapterSuiteResult> {
  if (adapter.kind !== suite.kind) {
    return {
      adapter,
      suiteKind: suite.kind,
      passed: false,
      results: [
        {
          caseId: `case.${suite.kind}.kind-match`,
          invariantId: `adapter.${suite.kind}.kind-match`,
          passed: false,
          issues: [
            {
              path: ["adapter", "kind"],
              code: "ADAPTER_KIND_MISMATCH",
              message: `Adapter kind ${adapter.kind} cannot run ${suite.kind} conformance.`
            }
          ]
        }
      ]
    };
  }

  const results = [];
  for (const conformanceCase of suite.cases) {
    results.push(await runner.evaluate(adapter, conformanceCase));
  }

  return {
    adapter,
    suiteKind: suite.kind,
    passed: results.every((result) => result.passed),
    results
  };
}

function assertUnique(label: string, values: readonly string[]): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate ${label} ids: ${[...new Set(duplicates)].join(", ")}`);
  }
}
