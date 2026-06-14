import { describe, expect, it } from "vitest";
import { defaultImportReviewDisposition } from "./index.js";

describe("ui contracts", () => {
  it("defaults import review dispositions from dry-run risk", () => {
    expect(
      defaultImportReviewDisposition({
        status: "pass",
        candidateDisposition: "create",
        confidence: "high"
      })
    ).toBe("accept");
    expect(
      defaultImportReviewDisposition({
        status: "warn",
        candidateDisposition: "alias",
        confidence: "medium"
      })
    ).toBe("defer");
    expect(
      defaultImportReviewDisposition({
        status: "pass",
        candidateDisposition: "needs-review",
        confidence: "high"
      })
    ).toBe("needs-review");
    expect(
      defaultImportReviewDisposition({
        status: "blocked",
        candidateDisposition: "create",
        confidence: "high"
      })
    ).toBe("reject");
  });
});
