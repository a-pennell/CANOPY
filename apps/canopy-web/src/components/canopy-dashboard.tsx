import type { ReactNode } from "react";
import type { CanopyWebModel, CanopyWebWorkspace } from "../lib/canopy-data";

const readinessTone = {
  ready: "toneGood",
  attention: "toneWarn",
  blocked: "toneBad"
} as const;

type Tone = "toneGood" | "toneWarn" | "toneBad" | "toneInfo";

export function CanopyDashboard({ model }: { readonly model: CanopyWebModel }) {
  const snapshot = model.persistedShell.snapshot;
  const operations = model.operations;
  const importTotals = model.imports.reduce(
    (totals, item) => ({
      mappings: totals.mappings + item.execution.mappingRecords.length,
      events: totals.events + item.execution.eventRecords.length,
      outbox: totals.outbox + item.execution.outboxRecords.length
    }),
    { mappings: 0, events: 0, outbox: 0 }
  );
  const visibilityCounts = countsBy(
    snapshot.surfaces.civicMemoryStream.timeline.map((entry) => entry.visibility ?? "unspecified")
  );
  const dataStateCounts = countsBy(
    snapshot.surfaces.civicMemoryStream.timeline.map((entry) => entry.dataState ?? "unspecified")
  );

  return (
    <main className="shell">
      <aside className="rail" aria-label="Canopy navigation">
        <div className="brandBlock">
          <div className="brandMark" aria-hidden="true">C</div>
          <div>
            <p className="eyebrow">Canopy</p>
            <h1>Commons Shell</h1>
          </div>
        </div>

        <div className="scopeControl" aria-label="Current scope">
          <span>Scope</span>
          <strong>{snapshot.scope.label}</strong>
          <small>{formatScopeRef(snapshot.scope.scope.commonsRef)}</small>
        </div>

        <nav className="navList" aria-label="Phase 5 workspaces">
          {model.workspaces.map((workspace) => (
            <a href={`#${workspace.id}`} key={workspace.id} className="navItem">
              <span>{workspace.title}</span>
              <small>{workspace.session.navigation.activePath}</small>
            </a>
          ))}
        </nav>

        <div className="searchBlock" aria-label="Object search">
          <label htmlFor="object-search">Object search</label>
          <input id="object-search" readOnly value="resource, decision, claim..." />
          <div className="searchResults">
            {model.objectRefs.slice(0, 6).map((record) => (
              <a
                href={`#${workspaceIdForRef(record.ref)}`}
                key={formatRef(record.ref)}
                className="searchResult"
              >
                <span>{record.objectType}</span>
                <strong>{displayRef(record.ref)}</strong>
              </a>
            ))}
          </div>
        </div>

        <div className="railFooter">
          <span>Generated</span>
          <strong>{formatTime(model.generatedAt)}</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Runtime-backed operating surface</p>
            <h2>{snapshot.scope.label}</h2>
          </div>
          <div className="statusStrip">
            <StatusPill label="Operations" tone={readinessTone[operations.readiness]}>
              {operations.readiness}
            </StatusPill>
            <StatusPill label="Outbox" tone="toneGood">
              {operations.outbox.drainStatus}
            </StatusPill>
            <StatusPill label="Projection states" tone="toneInfo">
              {operations.projections.currentStateIds.length}/{operations.projections.expectedProjectionNames.length}
            </StatusPill>
          </div>
        </header>

        <section className="metricGrid" aria-label="Runtime counts">
          <Metric label="Objects" value={operations.counts.objectRefs} detail="canonical refs" />
          <Metric label="Events" value={operations.counts.events} detail={`${snapshot.surfaces.civicMemoryStream.timeline.length} visible in shell`} />
          <Metric label="Mappings" value={operations.counts.mappings} detail={`${importTotals.mappings} imported`} />
          <Metric label="Surfaces" value={model.workspaces.length} detail="phase 5 workspaces" />
        </section>

        <section className="mainGrid" aria-label="Phase 5 shell">
          <Panel title="Attention Inbox" kicker="review queue">
            {snapshot.attention.length === 0 ? (
              <EmptyLine>Attention is clear for the current seed.</EmptyLine>
            ) : (
              <div className="list">
                {snapshot.attention.map((item) => (
                  <div className="listRow" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.kind}</span>
                    </div>
                    <StatusPill label="events" tone="toneWarn">{item.eventIds.length}</StatusPill>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Command Preview" kicker="permission-aware shell grammar" className="spanTwo">
            <div className="commandGrid">
              {model.commandPreviews.map((preview) => (
                <div className="commandTile" key={preview.command}>
                  <span>{model.session.prompt} {preview.command}</span>
                  <strong>{preview.message}</strong>
                  <small>{preview.screen.route.surfaceKind} / {preview.status}</small>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Projection Ledger" kicker="read freshness" className="spanTwo">
            <div className="ledger">
              {snapshot.projectionReads.slice(0, 12).map((read) => (
                <div className="ledgerRow" key={`${read.kind}-${read.projectionName}-${read.documentId ?? "live"}`}>
                  <div>
                    <strong>{read.projectionName}</strong>
                    <span>{read.targetRef === undefined ? "whole projection" : formatRef(read.targetRef)}</span>
                  </div>
                  <StatusPill label="freshness" tone={read.freshness === "current" ? "toneGood" : "toneWarn"}>
                    {read.freshness}
                  </StatusPill>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Data Stewardship" kicker="visibility, retention, redaction">
            <div className="stack">
              <KeyValue label="Visibility states" value={formatCounts(visibilityCounts)} />
              <KeyValue label="Data states" value={formatCounts(dataStateCounts)} />
              <KeyValue
                label="Redactions"
                value={String(snapshot.surfaces.federationExportState?.redactionSummary?.redactionCount ?? 0)}
              />
              <KeyValue
                label="Agreements"
                value={String(snapshot.surfaces.federationExportState?.dataStewardshipAgreementRefs.length ?? 0)}
              />
            </div>
          </Panel>

          {model.workspaces.map((workspace) => (
            <WorkspacePanel key={workspace.id} model={model} workspace={workspace} />
          ))}

          <Panel title="Operations Loop" kicker="operator report" className="spanTwo">
            <div className="opsGrid">
              <Metric label="Findings" value={operations.findings.length} detail={operations.findings[0] ?? "clear"} compact />
              <Metric label="Failed imports" value={operations.failedImportRemediation.total} detail="remediation queue" compact />
              <Metric label="Outbox total" value={operations.outbox.total} detail={`${operations.outbox.byStatus.acknowledged ?? 0} acknowledged`} compact />
              <Metric label="Materialized docs" value={model.materializedDocuments.length} detail="projection documents" compact />
            </div>
          </Panel>
        </section>
      </section>
    </main>
  );
}

function WorkspacePanel({
  model,
  workspace
}: {
  readonly model: CanopyWebModel;
  readonly workspace: CanopyWebWorkspace;
}) {
  const route = workspace.session.screen.route;

  return (
    <Panel
      title={workspace.title}
      kicker={`${route.surfaceKind} / ${workspace.session.navigation.activePath}`}
      className={workspace.id === "federation" ? undefined : "spanTwo"}
      id={workspace.id}
    >
      <p className="intentLine">{workspace.intent}</p>
      {renderWorkspaceSurface(model, workspace)}
    </Panel>
  );
}

function renderWorkspaceSurface(model: CanopyWebModel, workspace: CanopyWebWorkspace) {
  const snapshot = workspace.session.snapshot;
  const surfaces = snapshot.surfaces;

  if (workspace.id === "scope") {
    return (
      <div className="splitSurface">
        <div className="stack">
          <KeyValue label="Active mode" value={snapshot.activeMode} />
          <KeyValue label="Available modes" value={snapshot.availableModes.join(", ")} />
          <KeyValue label="Commands" value={String(snapshot.commands.length)} />
          <KeyValue label="Legacy primary routes" value={String(snapshot.legacyProjectNavigation.length)} />
        </div>
        <pre className="screenText">{workspace.session.screen.text}</pre>
      </div>
    );
  }

  if (workspace.id === "objects") {
    const objectPage = surfaces.objectPage;

    return objectPage === undefined ? (
      <EmptyLine>No selected object page is hydrated.</EmptyLine>
    ) : (
      <div className="objectPage">
        <div className="objectHeader">
          <div>
            <span>{objectPage.objectRef.type}</span>
            <strong>{objectPage.title ?? displayRef(objectPage.objectRef)}</strong>
            <small>{objectPage.summary ?? formatRef(objectPage.objectRef)}</small>
          </div>
          <StatusPill label="projection" tone="toneGood">{objectPage.projectionRead.freshness}</StatusPill>
        </div>
        <div className="refGrid">
          <KeyValue label="Related refs" value={String(objectPage.relatedRefs.length)} />
          <KeyValue label="Authority refs" value={String(objectPage.authorityRefs.length)} />
          <KeyValue label="Capabilities" value={objectPage.sourceCapabilities.join(", ")} />
        </div>
        <Timeline entries={objectPage.timeline.slice(0, 6)} />
      </div>
    );
  }

  if (workspace.id === "memory") {
    return (
      <div className="splitSurface">
        <div className="stack">
          {surfaces.civicMemoryStream.namespaceCounts.map((count) => (
            <KeyValue key={count.namespace} label={count.namespace} value={String(count.count)} />
          ))}
        </div>
        <Timeline entries={surfaces.civicMemoryStream.timeline.slice(0, 10)} />
      </div>
    );
  }

  if (workspace.id === "decisions") {
    const packet = surfaces.decisionPacket;

    return packet === undefined ? (
      <EmptyLine>Select a decision object to hydrate a decision packet.</EmptyLine>
    ) : (
      <div className="stack">
        <div className="objectHeader">
          <div>
            <span>decision packet</span>
            <strong>{displayRef(packet.decisionRef)}</strong>
            <small>{packet.rationale ?? "No rationale recorded in this seed."}</small>
          </div>
          <StatusPill label="outcome" tone={packet.outcome === undefined ? "toneWarn" : "toneGood"}>
            {packet.outcome ?? "pending"}
          </StatusPill>
        </div>
        <div className="refGrid">
          <KeyValue label="Claims" value={String(packet.claimRefs.length)} />
          <KeyValue label="Evidence" value={String(packet.evidenceRefs.length)} />
          <KeyValue label="Authority refs" value={String(packet.authorityRefs.length)} />
          <KeyValue label="Stewardship outcomes" value={String(packet.stewardshipOutcomes.length)} />
        </div>
        <Timeline entries={packet.timeline.slice(0, 6)} />
      </div>
    );
  }

  if (workspace.id === "stewardship") {
    const stewardship = surfaces.resourceStewardship;

    return stewardship === undefined ? (
      <EmptyLine>Select a resource object to hydrate stewardship state.</EmptyLine>
    ) : (
      <div className="stack">
        <div className="objectHeader">
          <div>
            <span>{stewardship.resourceKind ?? "resource"}</span>
            <strong>{stewardship.title ?? displayRef(stewardship.resourceRef)}</strong>
            <small>{stewardship.summary ?? formatRef(stewardship.resourceRef)}</small>
          </div>
          <StatusPill label="rights" tone="toneInfo">{stewardship.useRights.length}</StatusPill>
        </div>
        <div className="list">
          {stewardship.useRights.map((right) => (
            <div className="listRow" key={formatRef(right.useRightRef)}>
              <div>
                <strong>{right.state} use right</strong>
                <span>{right.permissions.join(", ") || "permission pending"}</span>
              </div>
              <small>{right.holderRef === undefined ? "unknown holder" : formatRef(right.holderRef)}</small>
            </div>
          ))}
        </div>
        <div className="refGrid">
          <KeyValue label="Ecological context" value={String(stewardship.ecologicalContextIds.length)} />
          <KeyValue label="Context events" value={String(stewardship.contextEvents.length)} />
          <KeyValue label="Authority refs" value={String(stewardship.authorityRefs.length)} />
        </div>
      </div>
    );
  }

  if (workspace.id === "claims") {
    return (
      <div className="splitSurface">
        <div className="stack">
          <Metric label="Claims" value={surfaces.claimEvidence.counts.claims} detail="reviewable assertions" compact />
          <Metric label="Evidence" value={surfaces.claimEvidence.counts.evidence} detail="supporting records" compact />
          <Metric label="AI/model outputs" value={surfaces.claimEvidence.counts.aiNonAuthorityIndicators} detail="non-authoritative" compact />
        </div>
        <div className="list">
          {surfaces.claimEvidence.claims.map((claim) => (
            <div className="listRow" key={formatRef(claim.claimRef)}>
              <div>
                <strong>{claim.title ?? displayRef(claim.claimRef)}</strong>
                <span>{claim.summary ?? claim.status}</span>
              </div>
              <StatusPill label="status" tone="toneInfo">{claim.status}</StatusPill>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (workspace.id === "imports") {
    const review = surfaces.importReview;

    return review === undefined ? (
      <EmptyLine>No import review is active for this shell state.</EmptyLine>
    ) : (
      <div className="stack">
        <div className="refGrid">
          <KeyValue label="Candidates" value={String(review.candidates.length)} />
          <KeyValue label="Warnings" value={String(review.warnings.length)} />
          <KeyValue label="Candidate events" value={String(review.candidateEventIds.length)} />
        </div>
        <div className="list">
          {review.candidates.slice(0, 8).map((candidate) => (
            <div className="listRow" key={candidate.id}>
              <div>
                <strong>{candidate.canonicalType}: {displayRef(candidate.canonicalRef)}</strong>
                <span>{candidate.rationale}</span>
              </div>
              <StatusPill label="disposition" tone={candidate.reviewDisposition === "accept" ? "toneGood" : "toneWarn"}>
                {candidate.reviewDisposition}
              </StatusPill>
            </div>
          ))}
        </div>
        <div className="bundleList">
          {model.imports.map((item, index) => (
            <div className="bundle" key={item.bundle.bundleId}>
              <div>
                <strong>Folded source {index + 1}</strong>
                <span>{item.bundle.recordCount} records across {item.bundle.fileCount} files</span>
              </div>
              <small>{item.execution.status}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (workspace.id === "federation") {
    const state = surfaces.federationExportState;

    return state === undefined ? (
      <EmptyLine>No federation export state is visible.</EmptyLine>
    ) : (
      <div className="stack">
        <div className="objectHeader">
          <div>
            <span>{state.format} export</span>
            <strong>{state.envelopeId}</strong>
            <small>{state.contentHash}</small>
          </div>
          <StatusPill label="status" tone={state.status === "ready" ? "toneGood" : "toneWarn"}>
            {state.status}
          </StatusPill>
        </div>
        <div className="refGrid">
          <KeyValue label="Events" value={String(state.includedEventIds.length)} />
          <KeyValue label="Objects" value={String(state.includedObjectRefs.length)} />
          <KeyValue label="Mappings" value={String(state.localMappingIds.length)} />
          <KeyValue label="Warnings" value={String(state.readinessWarnings.length)} />
        </div>
      </div>
    );
  }

  return <pre className="screenText">{workspace.session.screen.text}</pre>;
}

function Timeline({ entries }: { readonly entries: readonly { readonly id: string; readonly type: string; readonly occurredAt: string; readonly objectRef: { readonly namespace: string; readonly type: string; readonly id: string } }[] }) {
  return (
    <div className="timeline">
      {entries.map((entry) => (
        <div className="timelineRow" key={entry.id}>
          <span>{formatTime(entry.occurredAt)}</span>
          <strong>{entry.type}</strong>
          <small>{formatRef(entry.objectRef)}</small>
        </div>
      ))}
    </div>
  );
}

function Panel({
  children,
  className,
  id,
  kicker,
  title
}: Readonly<{
  children: ReactNode;
  className?: string | undefined;
  id?: string | undefined;
  kicker: string;
  title: string;
}>) {
  return (
    <article className={className === undefined ? "panel" : `panel ${className}`} id={id}>
      <header className="panelHeader">
        <p className="eyebrow">{kicker}</p>
        <h3>{title}</h3>
      </header>
      {children}
    </article>
  );
}

function Metric({
  compact = false,
  detail,
  label,
  value
}: Readonly<{
  compact?: boolean;
  detail: string;
  label: string;
  value: number;
}>) {
  return (
    <div className={compact ? "metric compact" : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function KeyValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="keyValue">
      <span>{label}</span>
      <strong>{value || "none"}</strong>
    </div>
  );
}

function StatusPill({
  children,
  label,
  tone
}: Readonly<{
  children: ReactNode;
  label: string;
  tone: Tone;
}>) {
  return (
    <span className={`pill ${tone}`} aria-label={`${label}: ${children}`}>
      {children}
    </span>
  );
}

function EmptyLine({ children }: { readonly children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

function countsBy(values: readonly string[]): Readonly<Record<string, number>> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function formatCounts(counts: Readonly<Record<string, number>>): string {
  return Object.entries(counts)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function workspaceIdForRef(ref: { readonly type: string }): string {
  if (ref.type === "decision") return "decisions";
  if (ref.type === "resource" || ref.type === "use-right") return "stewardship";
  if (ref.type === "claim" || ref.type === "evidence") return "claims";
  return "objects";
}

function formatRef(ref: { readonly namespace: string; readonly type: string; readonly id: string }) {
  return displayRef(ref);
}

function displayRef(ref: { readonly type: string; readonly id: string }) {
  return `${ref.type}:${ref.id.split(".").at(-1) ?? ref.id}`;
}

function formatScopeRef(value: unknown): string {
  if (value === undefined) {
    return "all seeded scopes";
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "id" in value &&
    typeof value.type === "string" &&
    typeof value.id === "string"
  ) {
    return `${value.type}:${value.id}`;
  }

  return String(value);
}

function formatTime(value: string): string {
  return value.replace("T", " ").replace(".000Z", "Z");
}
