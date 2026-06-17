import { describe, expect, it } from "vitest";
import {
  createInMemoryCitizenCommandProvider,
  createNeedOfferMatchCommandInput,
  createPersistentCitizenCommandProvider,
  createReportConcernCommandInput,
  createMemoryCitizenCommandRepository,
  type CitizenCommandProvider
} from "./citizen-command-provider.js";

describe("Phase 16 command persistence provider", () => {
  it("runs the command provider behavior against memory and persistent providers", () => {
    const providers: readonly CitizenCommandProvider[] = [
      createInMemoryCitizenCommandProvider(),
      createPersistentCitizenCommandProvider({
        repository: createMemoryCitizenCommandRepository(),
        now: () => "2026-06-17T16:00:00.000Z"
      })
    ];

    for (const provider of providers) {
      const draft = provider.saveDraft(createReportConcernCommandInput());
      const submitted = provider.submitCommand(draft.id);
      const review = provider.moveToReview(draft.id);
      const commands = provider.listCommands();

      expect(submitted.status).toBe("submitted");
      expect(review.status).toBe("needs-review");
      expect(commands).toEqual([
        expect.objectContaining({
          id: draft.id,
          status: "needs-review",
          civicMemoryEffect: "Creates a public concern record for review"
        })
      ]);
    }
  });

  it("persists canonical command storage shape with payload, timestamps, and history", () => {
    const repository = createMemoryCitizenCommandRepository();
    const provider = createPersistentCitizenCommandProvider({
      repository,
      now: () => "2026-06-17T16:00:00.000Z"
    });

    const draft = provider.saveDraft(
      createNeedOfferMatchCommandInput({
        needLabel: "Cooling center meal support",
        offerLabel: "Volunteer cold storage"
      })
    );
    provider.submitCommand(draft.id);

    expect(repository.list()).toEqual([
      expect.objectContaining({
        commandId: "command.match.generated-need-offer",
        commandType: "match",
        status: "submitted",
        createdAt: "2026-06-17T16:00:00.000Z",
        updatedAt: "2026-06-17T16:00:00.000Z",
        payload: expect.objectContaining({
          label: "Match Cooling center meal support with Volunteer cold storage",
          contextLabel: "Riverbend Food Commons",
          visibility: "role-restricted"
        }),
        statusHistory: [
          {
            status: "draft",
            changedAt: "2026-06-17T16:00:00.000Z"
          },
          {
            status: "submitted",
            changedAt: "2026-06-17T16:00:00.000Z"
          }
        ]
      })
    ]);
  });

  it("hydrates provider records from canonical command storage records", () => {
    const repository = createMemoryCitizenCommandRepository();
    const provider = createPersistentCitizenCommandProvider({
      repository,
      now: () => "2026-06-17T16:00:00.000Z"
    });

    const command = provider.saveDraft(createReportConcernCommandInput());
    provider.cancelCommand(command.id);

    const rehydrated = createPersistentCitizenCommandProvider({
      repository,
      now: () => "2026-06-17T16:05:00.000Z"
    });

    expect(rehydrated.listCommands()).toEqual([
      expect.objectContaining({
        id: "command.report.generated-neighborhood-concern",
        status: "cancelled",
        reviewOwner: "Riverbend neighborhood reviewers",
        route: "/citizen/review-queue?command=command.report.generated-neighborhood-concern"
      })
    ]);
  });
});
