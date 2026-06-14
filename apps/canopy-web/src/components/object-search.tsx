"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  CanopyWebObjectRefRecord,
  CanopyWebScopePreset
} from "../lib/canopy-data";

export function ObjectSearch({
  objectRefs,
  scopePreset
}: {
  readonly objectRefs: readonly CanopyWebObjectRefRecord[];
  readonly scopePreset: CanopyWebScopePreset;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      objectRefs
        .filter((record) =>
          normalizedQuery.length === 0
            ? true
            : `${record.objectType} ${record.objectId}`.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, 8),
    [normalizedQuery, objectRefs]
  );

  return (
    <div className="searchBlock" aria-label="Object search">
      <label htmlFor="object-search">Object search</label>
      <input
        id="object-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="resource, decision, claim..."
        value={query}
      />
      <div className="searchResults" aria-live="polite">
        {filtered.map((record) => (
          <Link
            href={withScope(`/objects/${record.objectType}/${encodeURIComponent(record.objectId)}`, scopePreset)}
            key={`${record.ref.namespace}:${record.objectType}:${record.objectId}`}
            className="searchResult"
          >
            <span>{record.objectType}</span>
            <strong>{displayRef(record.objectId, record.objectType)}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}

function withScope(href: string, scopePreset: CanopyWebScopePreset): string {
  return `${href}?scope=${scopePreset}`;
}

function displayRef(id: string, type: string): string {
  return `${type}:${id.split(".").at(-1) ?? id}`;
}
