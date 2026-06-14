"use client";

import { useState } from "react";
import type { CanopyWebMutationPreview } from "../lib/canopy-data";
import { KeyValue, StatusPill, Timeline, displayRef } from "./primitives";

export function CommandPreview({
  preview
}: {
  readonly preview: CanopyWebMutationPreview;
}) {
  const [boundary, setBoundary] = useState<"preview" | "cancelled" | "confirmed">("preview");

  return (
    <div className="mutationPreview" data-boundary={boundary}>
      <div className="mutationHeader">
        <div>
          <span>{preview.commandLabel}</span>
          <strong>{preview.title}</strong>
          <small>{preview.summary}</small>
        </div>
        <StatusPill
          label="boundary"
          tone={boundary === "confirmed" ? "toneGood" : boundary === "cancelled" ? "toneBad" : "toneWarn"}
        >
          {boundary}
        </StatusPill>
      </div>

      <div className="mutationGrid">
        <KeyValue label="Proposed event" value={preview.proposedEvent.type} />
        <KeyValue label="Object" value={displayRef(preview.proposedEvent.objectRef)} />
        <KeyValue label="Authority check" value={preview.authorityCheck.summary} />
        <KeyValue label="Outbox effect" value={preview.outboxEffect.summary} />
        <KeyValue label="Projection impact" value={preview.projectionImpact.summary} />
        <KeyValue label="Persistence" value={preview.persistenceBoundary} />
      </div>

      <Timeline entries={[preview.proposedEvent]} />

      <div className="mutationActions" aria-label="Command preview boundary">
        <button
          className="secondaryAction"
          disabled={boundary === "cancelled"}
          onClick={() => setBoundary("cancelled")}
          type="button"
        >
          Cancel preview
        </button>
        <button
          className="primaryAction"
          disabled={boundary === "confirmed"}
          onClick={() => setBoundary("confirmed")}
          type="button"
        >
          Confirm preview
        </button>
      </div>
    </div>
  );
}
