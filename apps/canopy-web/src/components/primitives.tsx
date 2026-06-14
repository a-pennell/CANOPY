import type { ReactNode } from "react";
import Link from "next/link";

export type PrimitiveTone = "toneGood" | "toneWarn" | "toneBad" | "toneInfo";

export interface ObjectRefLike {
  readonly namespace?: string;
  readonly type: string;
  readonly id: string;
}

export function Panel({
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

export function Metric({
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

export function StatusPill({
  children,
  label,
  tone
}: Readonly<{
  children: ReactNode;
  label: string;
  tone: PrimitiveTone;
}>) {
  return (
    <span className={`pill ${tone}`} aria-label={`${label}: ${children}`}>
      {children}
    </span>
  );
}

export function Timeline({
  entries
}: {
  readonly entries: readonly {
    readonly id: string;
    readonly type: string;
    readonly occurredAt: string;
    readonly objectRef: ObjectRefLike;
  }[];
}) {
  return (
    <div className="timeline">
      {entries.map((entry) => (
        <div className="timelineRow" key={entry.id}>
          <span>{formatTime(entry.occurredAt)}</span>
          <strong>{entry.type}</strong>
          <small>{displayRef(entry.objectRef)}</small>
        </div>
      ))}
    </div>
  );
}

export function ObjectRefLink({
  children,
  className,
  refValue,
  scopePreset
}: Readonly<{
  children?: ReactNode;
  className?: string | undefined;
  refValue: ObjectRefLike;
  scopePreset: string;
}>) {
  return (
    <Link
      href={`${objectRoute(refValue)}?scope=${scopePreset}`}
      className={className}
    >
      {children ?? (
        <>
          <span>{refValue.type}</span>
          <strong>{displayRef(refValue)}</strong>
        </>
      )}
    </Link>
  );
}

export function KeyValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="keyValue">
      <span>{label}</span>
      <strong>{value || "none"}</strong>
    </div>
  );
}

export function EmptyLine({ children }: { readonly children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

export function displayRef(ref: ObjectRefLike) {
  return `${ref.type}:${ref.id.split(".").at(-1) ?? ref.id}`;
}

export function formatRef(ref: ObjectRefLike) {
  return displayRef(ref);
}

export function formatTime(value: string): string {
  return value.replace("T", " ").replace(".000Z", "Z");
}

export function objectRoute(ref: ObjectRefLike | undefined): string {
  return ref === undefined ? "/objects" : `/objects/${ref.type}/${encodeURIComponent(ref.id)}`;
}
