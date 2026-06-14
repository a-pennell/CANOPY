import type { ReactNode } from "react";
import type { CanopyWebModel } from "../lib/canopy-data";

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
        <nav className="navList">
          {model.session.navigation.routes.slice(0, 10).map((route) => (
            <a
              href={`#${route.id}`}
              key={route.id}
              className={route.status === "current" ? "navItem active" : "navItem"}
            >
              <span>{route.label}</span>
              <small>{route.surfaceKind}</small>
            </a>
          ))}
        </nav>
        <div className="railFooter">
          <span>Generated</span>
          <strong>{formatTime(model.generatedAt)}</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Runtime-backed seed</p>
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
          <Metric label="Canonical objects" value={operations.counts.objectRefs} detail="object refs" />
          <Metric label="Events" value={operations.counts.events} detail={`${snapshot.civicMemory.timeline.length} in shell stream`} />
          <Metric label="Mappings" value={operations.counts.mappings} detail={`${importTotals.mappings} imported`} />
          <Metric label="Audits" value={operations.counts.adapterAudits} detail={`${operations.adapterAuditReview.unresolvedAuditIds.length} unresolved`} />
        </section>

        <section className="mainGrid">
          <Panel title="Projection Ledger" kicker="freshness trace" className="spanTwo">
            <div className="ledger">
              {snapshot.projectionReads.map((read) => (
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

          <Panel title="Import Review" kicker="folded source bundles">
            <div className="bundleList">
              {model.imports.map((item) => (
                <div className="bundle" key={item.bundle.bundleId}>
                  <div>
                    <strong>{item.bundle.sourceProject}</strong>
                    <span>{item.bundle.recordCount} records across {item.bundle.fileCount} files</span>
                  </div>
                  <small>{item.execution.status}</small>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Active Screen" kicker={model.session.screen.route.surfaceKind}>
            <pre className="screenText">{model.session.screen.text}</pre>
          </Panel>

          <Panel title="Claim & Evidence" kicker="sensemaking">
            <div className="stack">
              <Metric label="Claims" value={snapshot.surfaces.claimEvidence.counts.claims} detail="claim refs" compact />
              <Metric label="Evidence" value={snapshot.surfaces.claimEvidence.counts.evidence} detail="evidence refs" compact />
              <Metric label="Contests" value={snapshot.surfaces.claimEvidence.counts.contests} detail="open challenge traces" compact />
            </div>
          </Panel>

          <Panel title="Stewardship" kicker="use-right lifecycle">
            {snapshot.surfaces.resourceStewardship === undefined ? (
              <p className="muted">No selected resource stewardship surface.</p>
            ) : (
              <div className="stack">
                <p className="objectLine">{formatRef(snapshot.surfaces.resourceStewardship.resourceRef)}</p>
                <Metric label="Use rights" value={snapshot.surfaces.resourceStewardship.useRights.length} detail="rights in scope" compact />
                <Metric label="Authority refs" value={snapshot.surfaces.resourceStewardship.authorityRefs.length} detail="governance backing" compact />
              </div>
            )}
          </Panel>

          <Panel title="Federation" kicker="export and receive posture">
            {snapshot.surfaces.federationExportState === undefined ? (
              <p className="muted">Federation export state is not active for this selected object.</p>
            ) : (
              <div className="stack">
                <StatusPill label="state" tone="toneInfo">{snapshot.surfaces.federationExportState.status}</StatusPill>
                <Metric label="Included events" value={snapshot.surfaces.federationExportState.includedEventIds.length} detail="federated event ids" compact />
                <Metric label="Mappings" value={snapshot.surfaces.federationExportState.localMappingIds.length} detail="local mapping ids" compact />
              </div>
            )}
          </Panel>

          <Panel title="Operations" kicker="operator loop" className="spanTwo">
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

function Panel({
  children,
  className,
  kicker,
  title
}: Readonly<{
  children: ReactNode;
  className?: string;
  kicker: string;
  title: string;
}>) {
  return (
    <article className={className === undefined ? "panel" : `panel ${className}`}>
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

function StatusPill({
  children,
  label,
  tone
}: Readonly<{
  children: ReactNode;
  label: string;
  tone: "toneGood" | "toneWarn" | "toneBad" | "toneInfo";
}>) {
  return (
    <span className={`pill ${tone}`} aria-label={`${label}: ${children}`}>
      {children}
    </span>
  );
}

function formatRef(ref: { readonly namespace: string; readonly type: string; readonly id: string }) {
  return `${ref.type}:${ref.id}`;
}

function formatTime(value: string): string {
  return value.replace("T", " ").replace(".000Z", "Z");
}
