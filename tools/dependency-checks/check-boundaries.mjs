import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const contractsRoot = join(process.cwd(), "packages", "contracts");
const forbiddenImportPatterns = [
  /from\s+["'](?:@canopy\/)?(?:apps|kernel|capabilities|projections|database|workflows|ui|adapters|legacy)\b/,
  /from\s+["'](?:react|next|vue|svelte|@prisma|drizzle-orm|typeorm|sequelize|mongoose|redis|bullmq|pg|mysql2|sqlite3|firebase|supabase|@clerk|next-auth)\b/,
  /import\s+["'](?:react|next|vue|svelte|@prisma|drizzle-orm|typeorm|sequelize|mongoose|redis|bullmq|pg|mysql2|sqlite3|firebase|supabase|@clerk|next-auth)\b/
];

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
    } else if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      files.push(path);
    }
  }
  return files;
}

if (!exists(contractsRoot)) {
  console.log("No contracts directory found; skipping boundary check.");
  process.exit(0);
}

const violations = [];
for (const file of walk(contractsRoot)) {
  const content = readFileSync(file, "utf8");
  for (const pattern of forbiddenImportPatterns) {
    if (pattern.test(content)) {
      violations.push(relative(process.cwd(), file));
      break;
    }
  }
}

if (violations.length > 0) {
  console.error("Contract dependency boundary violations:");
  console.error([...new Set(violations)].join("\n"));
  process.exit(1);
}

console.log("Contract dependency boundary check passed.");
