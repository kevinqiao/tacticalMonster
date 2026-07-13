#!/usr/bin/env node
/**
 * Fail the build if dist still contains bare `@/` (or other unresolved aliases).
 * Those break at runtime: "Failed to resolve module specifier '@/...'".
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "dist", "assets");

const BAD = [
  /from\s*["']@\//,
  /import\s*["']@\//,
  /from\s*["']component\//,
  /import\s*["']component\//,
  /from\s*["']host\//,
  /import\s*["']host\//,
  /from\s*["']\.\.\/src\//,
  /import\s*["']\.\.\/src\//,
];

async function listJsFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    console.error(`missing ${dir} — run vite build first`);
    process.exit(1);
  }
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".js")) out.push(path.join(dir, e.name));
  }
  return out;
}

const files = await listJsFiles(assetsDir);
const hits = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const re of BAD) {
    if (re.test(text)) {
      const m = text.match(re);
      hits.push({ file: path.relative(root, file), match: m?.[0] ?? String(re) });
      break;
    }
  }
}

if (hits.length) {
  console.error(`verify-dist-runtime-imports: ${hits.length} file(s) still have unresolved aliases:`);
  for (const h of hits.slice(0, 30)) {
    console.error(`  ${h.file}: ${h.match}`);
  }
  if (hits.length > 30) console.error(`  ... and ${hits.length - 30} more`);
  process.exit(1);
}

console.log(`verify-dist-runtime-imports: ok (${files.length} assets)`);
