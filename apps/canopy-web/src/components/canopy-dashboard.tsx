import Link from "next/link";
import type { CanopyWebModel, CanopyWebWorkspace } from "../lib/canopy-data";
import { CommandPreview } from "./command-preview";
import { ObjectSearch } from "./object-search";
import {
  EmptyLine,
  KeyValue,
  Metric,
  ObjectRefLink,
  Panel,
  StatusPill,
  Timeline,
  displayRef,
  formatRef,
  formatTime
} from "./primitives";
import { ScopeSwitcher } from "./scope-switcher";

const readinessTone = {
  ready: "toneGood",
  attention: "toneWarn",
  blocked: "toneBad"
} as const;

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
          <ScopeSwitcher options={model.scopeOptions} />
        </div>

        <nav className="navList" aria-label="Phase 5 workspaces">
          {model.routeMap.map((route) => (
            <Link
              href={routeHref(route.href, model.scopePreset)}
              key={route.id}
              className={route.active ? "navItem active" : "navItem"}
            >
              <span>{route.label}</span>
              <small>{route.href}</small>
            </Link>
          ))}
        </nav>

        <ObjectSearch objectRefs={model.objectRefs} scopePreset={model.scopePreset} />

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
            {model.attentionQueues.length === 0 ? (
              <EmptyLine>Attention is clear for the current seed.</EmptyLine>
            ) : (
              <div className="attentionQueues">
                {model.attentionQueues.map((item) => (
                  <Link
                    href={routeHref(item.route, model.scopePreset)}
                    className="attentionQueue"
                    key={item.id}
                  >
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.nextAction}</span>
                    </div>
                    <StatusPill label="events" tone={item.tone}>{item.count}</StatusPill>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Command Preview" kicker="permission-aware shell grammar" className="spanTwo">
            <div className="commandGrid">
              {model.commandPreviews.map((preview) => (
                <div className="commandTile" key={preview.command}>
                  <span>{model.session.prompt} {preview.command}</span>
                  <strong>{displayText(preview.message)}</strong>
                  <small>{preview.screen.route.surfaceKind} / {preview.status}</small>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Riverbend Pathway" kicker="observe to federate" className="spanTwo">
            <div className="pathway">
              {model.pathway.map((step) => (
                <Link href={routeHref(step.href, model.scopePreset)} className="pathStep" key={step.label}>
                  <span>{step.label}</span>
                  <strong>{formatRef(step.ref)}</strong>
                  <small>{step.detail}</small>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Map / Graph / List" kicker="one object query model" className="spanTwo">
            <div className="triad">
              <div className="mapPane" aria-label="Scoped map preview">
                <span>Mill Creek</span>
                <strong>{model.relationshipGraph.nodes.length}</strong>
                <small>object nodes in scope</small>
              </div>
              <div className="graphPane" aria-label="Relationship graph preview">
                {model.relationshipGraph.edges.slice(0, 8).map((edge) => (
                  <div className="graphEdge" key={`${edge.from}-${edge.to}-${edge.label}`}>
                    <span>{labelForNode(model, edge.from)}</span>
                    <strong>{edge.label}</strong>
                    <span>{labelForNode(model, edge.to)}</span>
                  </div>
                ))}
              </div>
              <div className="objectListPane" aria-label="Object list preview">
                {model.objectRefs.slice(0, 10).map((record) => (
                  <ObjectRefLink
                    refValue={record.ref}
                    scopePreset={model.scopePreset}
                    key={`${record.objectType}-${record.objectId}`}
                  >
                    <span>{record.objectType}</span>
                    <strong>{displayRef(record.ref)}</strong>
                  </ObjectRefLink>
                ))}
              </div>
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
            <DataStewardshipReview model={model} />
          </Panel>

          {model.workspaces.map((workspace) => (
            <WorkspacePanel key={workspace.id} model={model} workspace={workspace} />
          ))}

          <Panel title="Command Detail" kicker="mutation preview contract" className="spanTwo">
            <CommandPreview preview={model.mutationPreview} />
          </Panel>

          <Panel title="Permission Explanation" kicker="authority, appeal, memory result" className="spanTwo">
            <div className="permissionGrid">
              <KeyValue label="Command" value={model.permissionExplanation.commandLabel} />
              <KeyValue label="Authority source" value={model.permissionExplanation.authoritySource} />
              <KeyValue label="Denial reason" value={model.permissionExplanation.denialReason ?? "none"} />
              <KeyValue label="Appeal path" value={model.permissionExplanation.appealPath} />
              <KeyValue label="Visibility effect" value={model.permissionExplanation.visibilityEffect} />
              <KeyValue label="Civic memory event" value={model.permissionExplanation.civicMemoryEvent} />
              <KeyValue label="Claims/evidence touched" value={String(model.permissionExplanation.claimsEvidenceTouched)} />
              <KeyValue label="Federation impact" value={model.permissionExplanation.federationImpact} />
            </div>
          </Panel>

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
        <pre className="screenText">{displayText(workspace.session.screen.text)}</pre>
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
            <small>{displayText(objectPage.summary ?? formatRef(objectPage.objectRef))}</small>
          </div>
          <StatusPill label="projection" tone="toneGood">{objectPage.projectionRead.freshness}</StatusPill>
        </div>
        <div className="refGrid">
          <KeyValue label="Related refs" value={String(objectPage.relatedRefs.length)} />
          <KeyValue label="Authority refs" value={String(objectPage.authorityRefs.length)} />
          <KeyValue label="Capabilities" value={objectPage.sourceCapabilities.map(formatCapability).join(", ")} />
        </div>
        <div className="sectionGrid" aria-label="Universal object page sections">
          {model.objectPageSections.map((section) => (
            <Link
              href={routeHref(section.route, model.scopePreset)}
              className={`sectionCard ${section.status}`}
              key={section.id}
            >
              <span>{section.status}</span>
              <strong>{section.title}</strong>
              <small>{section.summary}</small>
            </Link>
          ))}
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
            <small>{displayText(packet.rationale ?? "No rationale recorded in this seed.")}</small>
          </div>
          <StatusPill label="outcome" tone={packet.outcome === undefined ? "toneWarn" : "toneGood"}>
            {packet.outcome ?? "pending"}
          </StatusPill>
        </div>
        <div className="refGrid">
          <KeyValue label="Claims" value={String(packet.claimRefs.length)} />
          <KeyValue label="Evidence" value={String(packet.evidenceRefs.length)} />
          <KeyValue label="Authority refs" value={String(packet.authorityRefs.length)} />
          <KeyValue label="Care outcomes" value={String(packet.stewardshipOutcomes.length)} />
        </div>
        <Timeline entries={packet.timeline.slice(0, 6)} />
      </div>
    );
  }

  if (workspace.id === "resource-care") {
    const stewardship = surfaces.resourceStewardship;

    return stewardship === undefined ? (
      <EmptyLine>Select a resource object to hydrate resource care state.</EmptyLine>
    ) : (
      <div className="stack">
        <div className="objectHeader">
          <div>
            <span>{stewardship.resourceKind ?? "resource"}</span>
            <strong>{stewardship.title ?? displayRef(stewardship.resourceRef)}</strong>
            <small>{displayText(stewardship.summary ?? formatRef(stewardship.resourceRef))}</small>
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
                <span>{displayText(claim.summary ?? claim.status)}</span>
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
                <span>{displayText(candidate.rationale)}</span>
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
    const review = model.federationReview;

    return state === undefined || review === undefined ? (
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
        <div className="reviewGrid">
          <KeyValue label="Content hash" value={review.contentHash} />
          <KeyValue label="Local mappings" value={String(review.localMappingCount)} />
          <KeyValue label="Data agreements" value={String(review.dataStewardshipAgreementCount)} />
          <KeyValue label="Redaction posture" value={review.redactionSummary} />
        </div>
        <div className="list">
          {(review.readinessWarnings.length === 0 ? ["ready: no export warnings"] : review.readinessWarnings).map((warning) => (
            <div className="listRow" key={warning}>
              <div>
                <strong>Readiness</strong>
                <span>{warning}</span>
              </div>
              <StatusPill label="warning" tone={review.readinessWarnings.length === 0 ? "toneGood" : "toneWarn"}>
                {review.readinessWarnings.length === 0 ? "ready" : "review"}
              </StatusPill>
            </div>
          ))}
        </div>
        <div className="eventTrail">
          {review.eventTrail.map((eventId) => (
            <span key={eventId}>{eventId}</span>
          ))}
        </div>
      </div>
    );
  }

  return <pre className="screenText">{displayText(workspace.session.screen.text)}</pre>;
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

function DataStewardshipReview({ model }: { readonly model: CanopyWebModel }) {
  const review = model.dataStewardshipReview;

  return (
    <div className="stack">
      <div className="reviewGrid">
        <KeyValue label="Visibility states" value={formatRows(review.visibilityStates)} />
        <KeyValue label="Data states" value={formatRows(review.dataStates)} />
        <KeyValue label="Redactions" value={review.redactionSummary} />
        <KeyValue label="Consent posture" value={review.consentPosture} />
      </div>
      <div className="reviewGrid">
        <KeyValue label="Retention" value={review.retentionPosture} />
        <KeyValue label="Restricted evidence" value={review.restrictedEvidence} />
        <KeyValue label="Export restriction" value={review.exportRestriction} />
      </div>
    </div>
  );
}

function formatRows(rows: readonly { readonly label: string; readonly value: number }[]): string {
  return rows.map((row) => `${row.label}: ${row.value}`).join(", ");
}

function displayText(value: string): string {
  return value
    .replaceAll("CommonCredit", "allocation/accounting")
    .replaceAll("ICOS", "governance coordination")
    .replaceAll("Sensemaking", "claims/evidence");
}

function formatCapability(value: string): string {
  return displayText(value)
    .replaceAll("common-credit", "allocation-accounting")
    .replaceAll("icos", "governance-coordination")
    .replaceAll("sensemaking", "claims-evidence");
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

function routeHref(href: string, scopePreset: string): string {
  return `${href}?scope=${scopePreset}`;
}

function labelForNode(model: CanopyWebModel, nodeId: string): string {
  return model.relationshipGraph.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}
