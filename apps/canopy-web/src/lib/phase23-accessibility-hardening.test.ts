import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { CitizenShell } from "../components/citizen-shell.js";
import { buildCitizenCanopyModel } from "./citizen-data.js";

describe("Phase 23 UX and accessibility hardening", () => {
  it("provides a skip link and stable main landmark target", () => {
    const shell = CitizenShell({ model: buildCitizenCanopyModel() }) as ReactElement<{
      readonly id?: string;
      readonly children?: unknown;
    }>;
    const children = Array.isArray(shell.props.children)
      ? shell.props.children
      : [shell.props.children];
    const skipLink = children.find(
      (child) =>
        isValidElement<{ readonly href?: string }>(child) &&
        child.props.href === "#citizen-main"
    );

    expect(shell.props.id).toBe("citizen-main");
    expect(skipLink).toBeDefined();
    expect(collectElementStrings(skipLink).join(" ")).toContain("Skip to citizen content");
  });

  it("announces review notifications with live-region semantics", () => {
    const model = buildCitizenCanopyModel({
      routePath: "/citizen/review-queue",
      selectedCommandId: "command.report.riverbend-food-concern",
      reviewAction: "reject-command"
    });
    const shell = CitizenShell({ model });
    const notificationRegion = findElementByProps(shell, {
      role: "status",
      "aria-live": "polite"
    });

    expect(notificationRegion).toBeDefined();
    expect(collectElementStrings(notificationRegion).join("\n")).toContain("Permission needed");
  });
});

function findElementByProps(node: unknown, props: Record<string, string>): ReactElement | undefined {
  if (node === null || node === undefined || typeof node === "boolean") {
    return undefined;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementByProps(child, props);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  if (!isValidElement<Record<string, unknown> & { readonly children?: unknown }>(node)) {
    return undefined;
  }

  const matches = Object.entries(props).every(([key, value]) => node.props[key] === value);

  if (matches) {
    return node;
  }

  return findElementByProps(node.props.children, props);
}

function collectElementStrings(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === "boolean") {
    return [];
  }

  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectElementStrings(child));
  }

  if (isValidElement<{ readonly children?: unknown }>(node)) {
    return collectElementStrings(node.props.children);
  }

  return [];
}
