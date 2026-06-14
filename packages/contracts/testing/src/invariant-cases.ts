import type {
  CanopyId,
  CanopyCapability,
  ObjectRef
} from "@canopy/contracts-kernel";
import { goldenFixtureRefs } from "./golden-fixtures";

export type InvariantCaseKind =
  | "identity-account-separation"
  | "membership-authority-separation"
  | "ledger-account-auth-account-separation"
  | "use-right-scope"
  | "event-append-rules"
  | "ai-non-authority";

export type InvariantSeverity = "must" | "should";

export type InvariantFixtureRole =
  | "actor"
  | "identity-account"
  | "ledger-account"
  | "membership"
  | "authority-source"
  | "target"
  | "event"
  | "use-right"
  | "ai-output"
  | "decision";

export interface InvariantFixtureRef {
  readonly role: InvariantFixtureRole;
  readonly ref: ObjectRef;
}

export interface InvariantExpectation {
  readonly id: CanopyId;
  readonly description: string;
  readonly mustPass: boolean;
  readonly failureCode: string;
}

export interface InvariantCaseDefinition {
  readonly id: CanopyId;
  readonly kind: InvariantCaseKind;
  readonly title: string;
  readonly severity: InvariantSeverity;
  readonly capability?: CanopyCapability;
  readonly fixtureRefs: readonly InvariantFixtureRef[];
  readonly preconditions: readonly string[];
  readonly action: string;
  readonly expectations: readonly InvariantExpectation[];
  readonly prohibitedOutcomes: readonly string[];
}

export const lockedInvariantCases = [
  {
    id: "invariant.identity-account-separation",
    kind: "identity-account-separation",
    title: "Person and authentication account remain distinct",
    severity: "must",
    capability: "identity-authority",
    fixtureRefs: [
      {
        role: "actor",
        ref: goldenFixtureRefs.personMira
      },
      {
        role: "identity-account",
        ref: goldenFixtureRefs.accountMiraLogin
      }
    ],
    preconditions: [
      "A person fixture has at least one linked identity account.",
      "The person ref and account ref are separate canonical refs."
    ],
    action: "Resolve authority for an actor through person, account, and membership refs.",
    expectations: [
      {
        id: "expect.identity.account-not-person",
        description: "An account ref is never accepted as the person ref.",
        mustPass: true,
        failureCode: "IDENTITY_ACCOUNT_COLLAPSED"
      }
    ],
    prohibitedOutcomes: [
      "A permission check grants authority from an authentication account alone."
    ]
  },
  {
    id: "invariant.membership-authority-separation",
    kind: "membership-authority-separation",
    title: "Membership alone is not decision authority",
    severity: "must",
    capability: "identity-authority",
    fixtureRefs: [
      {
        role: "actor",
        ref: goldenFixtureRefs.personMira
      },
      {
        role: "membership",
        ref: goldenFixtureRefs.membershipMiraWatershed
      },
      {
        role: "authority-source",
        ref: goldenFixtureRefs.mandateWatershedSteward
      },
      {
        role: "decision",
        ref: goldenFixtureRefs.decisionUseRight
      }
    ],
    preconditions: [
      "A person has active membership in an organization.",
      "No role assignment, mandate, delegation, policy, agreement, use right, or emergency authority is present."
    ],
    action: "Attempt a binding decision, allocation, delegation, or use-right grant.",
    expectations: [
      {
        id: "expect.membership.no-implicit-authority",
        description: "The action is denied without explicit authority refs.",
        mustPass: true,
        failureCode: "MEMBERSHIP_TREATED_AS_AUTHORITY"
      }
    ],
    prohibitedOutcomes: [
      "A binding action is recorded with only membership as authority."
    ]
  },
  {
    id: "invariant.ledger-account-auth-account-separation",
    kind: "ledger-account-auth-account-separation",
    title: "Ledger accounts are not authentication accounts",
    severity: "must",
    capability: "allocation-accounting",
    fixtureRefs: [
      {
        role: "ledger-account",
        ref: goldenFixtureRefs.ledgerAccountCommons
      },
      {
        role: "identity-account",
        ref: goldenFixtureRefs.accountMiraLogin
      },
      {
        role: "event",
        ref: goldenFixtureRefs.ledgerEntryAllocation
      }
    ],
    preconditions: [
      "A ledger account fixture exists for accounting.",
      "An identity account fixture exists for authentication."
    ],
    action: "Post and resolve a ledger entry that references an account.",
    expectations: [
      {
        id: "expect.ledger.account-not-auth",
        description: "Ledger entry lines reference ledger accounts only.",
        mustPass: true,
        failureCode: "LEDGER_ACCOUNT_COLLAPSED_WITH_AUTH_ACCOUNT"
      }
    ],
    prohibitedOutcomes: [
      "A ledger line posts to an identity account ref.",
      "A login account balance is used as accounting state."
    ]
  },
  {
    id: "invariant.use-right-scope",
    kind: "use-right-scope",
    title: "Use rights are scoped, revocable, and authority-backed",
    severity: "must",
    capability: "stewardship",
    fixtureRefs: [
      {
        role: "actor",
        ref: goldenFixtureRefs.personMira
      },
      {
        role: "target",
        ref: goldenFixtureRefs.resourceNorthPasture
      },
      {
        role: "use-right",
        ref: goldenFixtureRefs.useRightNorthPasture
      },
      {
        role: "authority-source",
        ref: goldenFixtureRefs.mandateWatershedSteward
      }
    ],
    preconditions: [
      "A resource fixture and holder fixture exist.",
      "A use right fixture is proposed or active."
    ],
    action: "Validate or grant the use right.",
    expectations: [
      {
        id: "expect.use-right.scope",
        description: "The use right declares holder, resource, permissions, conditions, authority refs, review path, and term.",
        mustPass: true,
        failureCode: "USE_RIGHT_SCOPE_INCOMPLETE"
      }
    ],
    prohibitedOutcomes: [
      "A use right is granted without authority refs.",
      "A use right has no revocation or review path."
    ]
  },
  {
    id: "invariant.event-append-rules",
    kind: "event-append-rules",
    title: "Civic memory is append-only",
    severity: "must",
    capability: "civic-memory",
    fixtureRefs: [
      {
        role: "event",
        ref: goldenFixtureRefs.originalSensitiveEvidenceEvent
      },
      {
        role: "event",
        ref: goldenFixtureRefs.redactionEvent
      },
      {
        role: "authority-source",
        ref: goldenFixtureRefs.policyExport
      }
    ],
    preconditions: [
      "A canonical event fixture exists.",
      "A correction, redaction, reversal, or supersession is requested."
    ],
    action: "Apply the change to civic memory.",
    expectations: [
      {
        id: "expect.event.append-only",
        description: "The original event remains intact and a new event records the change.",
        mustPass: true,
        failureCode: "EVENT_MUTATED_IN_PLACE"
      }
    ],
    prohibitedOutcomes: [
      "An event row is updated in place.",
      "An event row is deleted without a continuity-preserving redaction stub."
    ]
  },
  {
    id: "invariant.ai-non-authority",
    kind: "ai-non-authority",
    title: "AI and model outputs are evidence, not authority",
    severity: "must",
    capability: "claims-evidence",
    fixtureRefs: [
      {
        role: "ai-output",
        ref: goldenFixtureRefs.modelOutputFlowRisk
      },
      {
        role: "target",
        ref: goldenFixtureRefs.claimFlowNeed
      },
      {
        role: "decision",
        ref: goldenFixtureRefs.decisionUseRight
      },
      {
        role: "authority-source",
        ref: goldenFixtureRefs.mandateWatershedSteward
      }
    ],
    preconditions: [
      "An AI-generated claim or model output fixture exists.",
      "No human review or authority source is attached."
    ],
    action: "Attempt to record a binding decision, allocation, use-right grant, data disclosure, mandate, delegation, or federation change.",
    expectations: [
      {
        id: "expect.ai.no-binding-authority",
        description: "The action is denied because machine output cannot be authority.",
        mustPass: true,
        failureCode: "AI_TREATED_AS_AUTHORITY"
      }
    ],
    prohibitedOutcomes: [
      "AI output marks its own claim accepted.",
      "Model output records or authorizes a binding decision."
    ]
  }
] as const satisfies readonly InvariantCaseDefinition[];
