import React from "react";
import { CanopyDashboard } from "../components/canopy-dashboard";
import {
  getCanopyWebModel,
  type CanopyWebScopePreset
} from "../lib/canopy-data";

export async function CanopyPage({
  routeSegments = [],
  searchParams
}: {
  readonly routeSegments?: readonly string[];
  readonly searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | undefined;
}) {
  const params = (await searchParams) ?? {};
  const model = getCanopyWebModel({
    routePath: routePathFromSegments(routeSegments),
    scopePreset: scopePresetFromParams(params.scope)
  });

  return <CanopyDashboard model={model} />;
}

function routePathFromSegments(routeSegments: readonly string[]): string {
  return routeSegments.length === 0 ? "/scope" : `/${routeSegments.join("/")}`;
}

function scopePresetFromParams(
  value: string | string[] | undefined
): CanopyWebScopePreset {
  const scope = Array.isArray(value) ? value[0] : value;

  return scope === "all" || scope === "resource" || scope === "riverbend"
    ? scope
    : "riverbend";
}
