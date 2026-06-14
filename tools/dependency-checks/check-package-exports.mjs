import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const packageRoots = [
  join(process.cwd(), "packages", "contracts"),
  join(process.cwd(), "packages", "kernel"),
  join(process.cwd(), "packages", "capabilities"),
  join(process.cwd(), "packages", "projections"),
  join(process.cwd(), "packages", "adapters", "reference"),
  join(process.cwd(), "packages", "adapters", "providers"),
  join(process.cwd(), "packages", "database"),
  join(process.cwd(), "packages", "workflows"),
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
const invalid = [];
for (const root of packageRoots) {
  if (!exists(root)) continue;
  for (const entry of readdirSync(root)) {
    const packageDir = join(root, entry);
    if (!statSync(packageDir).isDirectory()) continue;
    const indexFile = join(packageDir, "src", "index.ts");
    const packageFile = join(packageDir, "package.json");
    if (!exists(indexFile)) missing.push(`${relative(process.cwd(), indexFile)} missing`);
    if (!exists(packageFile)) {
      missing.push(`${relative(process.cwd(), packageFile)} missing`);
      continue;
    }

    const manifest = JSON.parse(readFileSync(packageFile, "utf8"));
    const packagePath = relative(process.cwd(), packageFile);
    if (manifest.main !== "./src/index.ts") {
      invalid.push(`${packagePath} main must be ./src/index.ts`);
    }
    if (manifest.exports?.["."] !== "./src/index.ts") {
      invalid.push(`${packagePath} exports["."] must be ./src/index.ts`);
    }
  }
}

if (missing.length > 0 || invalid.length > 0) {
  console.error("Package export check failed:");
  console.error([...missing, ...invalid].join("\n"));
  process.exit(1);
}

console.log("Package export check passed.");
