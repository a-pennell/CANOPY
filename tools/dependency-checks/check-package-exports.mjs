import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const packageRoots = [
  join(process.cwd(), "packages", "contracts"),
  join(process.cwd(), "packages", "kernel"),
  join(process.cwd(), "packages", "capabilities"),
  join(process.cwd(), "packages", "projections"),
  join(process.cwd(), "packages", "ui"),
  join(process.cwd(), "packages", "evaluation")
];

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

const missing = [];
for (const root of packageRoots) {
  if (!exists(root)) continue;
  for (const entry of readdirSync(root)) {
    const packageDir = join(root, entry);
    if (!statSync(packageDir).isDirectory()) continue;
    const indexFile = join(packageDir, "src", "index.ts");
    const packageFile = join(packageDir, "package.json");
    if (!exists(indexFile)) missing.push(`${relative(process.cwd(), indexFile)} missing`);
    if (!exists(packageFile)) missing.push(`${relative(process.cwd(), packageFile)} missing`);
  }
}

if (missing.length > 0) {
  console.error("Package export check failed:");
  console.error(missing.join("\n"));
  process.exit(1);
}

console.log("Package export check passed.");
