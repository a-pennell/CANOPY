import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ignoredDirs = new Set([".git", ".next", "node_modules", "dist", "coverage"]);
const checkedExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml"
]);

function extensionOf(filePath) {
  const dot = filePath.lastIndexOf(".");
  return dot === -1 ? "" : filePath.slice(dot);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
    } else if (checkedExtensions.has(extensionOf(path))) {
      files.push(path);
    }
  }
  return files;
}

const offenders = [];
for (const file of walk(process.cwd())) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/[^\x00-\x7F]/.test(line)) {
      offenders.push(`${file}:${index + 1}`);
    }
  });
}

if (offenders.length > 0) {
  console.error("Non-ASCII characters found:");
  console.error(offenders.join("\n"));
  process.exit(1);
}

console.log("ASCII check passed.");
