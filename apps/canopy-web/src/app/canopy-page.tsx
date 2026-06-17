import React from "react";
import { CanopyDashboard } from "../components/canopy-dashboard";
import { CitizenShell } from "../components/citizen-shell";
import {
  getCanopyWebModel,
  type CanopyWebScopePreset
} from "../lib/canopy-data";
import { buildCitizenCanopyModel } from "../lib/citizen-data";

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
  const routePath = routePathFromSegments(routeSegments);

  if (isCitizenRoute(routeSegments)) {
    return (
      <CitizenShell
        model={buildCitizenCanopyModel({
          activeContextId: contextIdFromParams(params.context),
          activeRole: roleFromParams(params.role),
          audienceMode: audienceModeFromParams(params.mode),
          selectedNeedId: singleParam(params.need),
          selectedOfferId: singleParam(params.offer),
          selectedPublicRecordId: singleParam(params.record),
          selectedCommandId: singleParam(params.command),
          workflowStep: singleParam(params.step),
          routePath
        })}
      />
    );
  }

  const model = getCanopyWebModel({
    routePath,
    scopePreset: scopePresetFromParams(params.scope)
  });

  return <CanopyDashboard model={model} />;
}

function routePathFromSegments(routeSegments: readonly string[]): string {
  return routeSegments.length === 0 ? "/scope" : `/${routeSegments.join("/")}`;
}

function isCitizenRoute(routeSegments: readonly string[]): boolean {
  return routeSegments[0] === "citizen";
}

function contextIdFromParams(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function roleFromParams(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function audienceModeFromParams(value: string | string[] | undefined): "participant" | "public" {
  const mode = Array.isArray(value) ? value[0] : value;

  return mode === "public" ? "public" : "participant";
}

function scopePresetFromParams(
  value: string | string[] | undefined
): CanopyWebScopePreset {
  const scope = Array.isArray(value) ? value[0] : value;

  return scope === "all" || scope === "resource" || scope === "riverbend"
    ? scope
    : "riverbend";
}
