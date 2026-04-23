import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DIST_ASSETS_DIR = path.join(ROOT, "dist", "assets");
const JS_EXT = ".js";
const BANNED_PATTERNS = [
  /\.\.\/src\//g,
];

function fail(message) {
  console.error(`[verify-dist-runtime-imports] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(DIST_ASSETS_DIR)) {
  fail(`Missing dist assets directory: ${DIST_ASSETS_DIR}. Run build first.`);
}

const jsFiles = fs
  .readdirSync(DIST_ASSETS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(JS_EXT))
  .map((entry) => path.join(DIST_ASSETS_DIR, entry.name));

if (jsFiles.length === 0) {
  fail(`No JS assets found in ${DIST_ASSETS_DIR}.`);
}

const offenders = [];
for (const file of jsFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(content)) {
      offenders.push({
        file: path.relative(ROOT, file),
        pattern: pattern.toString(),
      });
      break;
    }
  }
}

if (offenders.length > 0) {
  console.error("[verify-dist-runtime-imports] Found forbidden runtime import patterns in dist assets:");
  for (const offender of offenders) {
    console.error(`  - ${offender.file} (matched ${offender.pattern})`);
  }
  process.exit(1);
}

console.log("[verify-dist-runtime-imports] OK: no forbidden ../src runtime imports in dist assets.");
