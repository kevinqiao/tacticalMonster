#!/usr/bin/env node
/**
 * Compress CrazyGames solitaire lobby art under public/assets/portal.
 *
 * - Opaque PNG → WebP (q80)
 * - Alpha PNG → WebP (q80, alpha q85), max width 1200
 * - SVG with embedded raster → WebP (display-sized), max width 900
 *
 * Writes sibling `.webp` files; does not delete sources (pack prune strips them).
 *
 * Usage:
 *   node scripts/platform/compress-crazygames-portal-art.mjs
 *   node scripts/platform/compress-crazygames-portal-art.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dryRun = process.argv.includes("--dry-run");

const TARGET_DIRS = [
  "public/assets/portal/solitaire",
  "public/assets/portal/3d/ui",
];

const EXTRA_FILES = ["public/assets/portal/portal_bg_9x16.png"];

/** Max encode width by relative path suffix (under public/assets/). */
const MAX_WIDTH_BY_SUFFIX = [
  { suffix: "solitaire/hero/", maxWidth: 900 },
  { suffix: "solitaire/buttons/", maxWidth: 800 },
  { suffix: "solitaire/panels/", maxWidth: 900 },
  { suffix: "solitaire/backgrounds/bg-", maxWidth: 1536 },
  { suffix: "solitaire/backgrounds/mode_", maxWidth: 900 },
  { suffix: "3d/ui/panel-", maxWidth: 1000 },
  { suffix: "3d/ui/", maxWidth: 512 },
];

function resolveMaxWidth(relPosix) {
  for (const rule of MAX_WIDTH_BY_SUFFIX) {
    if (relPosix.includes(rule.suffix)) return rule.maxWidth;
  }
  return 1200;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function extractEmbeddedRaster(svgText) {
  const m = svgText.match(/data:image\/([a-zA-Z0-9+]+);base64,([A-Za-z0-9+/=]+)/);
  if (!m) return null;
  return { type: m[1], buffer: Buffer.from(m[2], "base64") };
}

async function encodeWebp(input, outPath, { maxWidth, hasAlphaHint }) {
  let pipeline = sharp(input).rotate();
  const meta = await sharp(input).metadata();
  const hasAlpha = hasAlphaHint ?? Boolean(meta.hasAlpha);
  const width = meta.width ?? 0;
  if (width > maxWidth) {
    pipeline = pipeline.resize({
      width: maxWidth,
      withoutEnlargement: true,
    });
  }
  if (hasAlpha) {
    pipeline = pipeline.webp({ quality: 80, alphaQuality: 85, effort: 6 });
  } else {
    pipeline = pipeline.webp({ quality: 80, effort: 6 });
  }
  if (dryRun) {
    const { data } = await pipeline.toBuffer({ resolveWithObject: true });
    return data.length;
  }
  await pipeline.toFile(outPath);
  return fs.statSync(outPath).size;
}

async function compressOne(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (ext !== ".png" && ext !== ".svg") return null;

  const rel = path.relative(root, absPath).split(path.sep).join("/");
  const outPath = absPath.replace(/\.(png|svg)$/i, ".webp");
  const maxWidth = resolveMaxWidth(rel.replace(/^public\/assets\//, ""));

  let input = absPath;
  let before = fs.statSync(absPath).size;
  let hasAlphaHint;

  if (ext === ".svg") {
    const svgText = fs.readFileSync(absPath, "utf8");
    const embedded = extractEmbeddedRaster(svgText);
    if (!embedded) {
      return { rel, skipped: "svg-without-raster", before, after: before };
    }
    input = embedded.buffer;
    before = Math.max(before, embedded.buffer.length);
    hasAlphaHint = true;
  }

  const after = await encodeWebp(input, outPath, { maxWidth, hasAlphaHint });
  return {
    rel,
    out: path.relative(root, outPath).split(path.sep).join("/"),
    before,
    after,
    maxWidth,
  };
}

function collectTargets() {
  const files = [];
  for (const relDir of TARGET_DIRS) {
    files.push(...walkFiles(path.join(root, relDir)));
  }
  for (const rel of EXTRA_FILES) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) files.push(p);
  }
  const all = files.filter((p) => /\.(png|svg)$/i.test(p));
  // Prefer SVG→WebP over PNG when both share a stem (e.g. hero-title.svg vs .png).
  const byStem = new Map();
  for (const p of all) {
    const stem = p.replace(/\.(png|svg)$/i, "").toLowerCase();
    const ext = path.extname(p).toLowerCase();
    const prev = byStem.get(stem);
    if (!prev) {
      byStem.set(stem, p);
      continue;
    }
    const prevExt = path.extname(prev).toLowerCase();
    if (ext === ".svg" && prevExt === ".png") byStem.set(stem, p);
  }
  return [...byStem.values()].sort((a, b) => a.localeCompare(b));
}

console.log(`== Compress CrazyGames portal art${dryRun ? " (dry-run)" : ""} ==`);

const targets = collectTargets();
let beforeTotal = 0;
let afterTotal = 0;
let wrote = 0;
let skipped = 0;

for (const file of targets) {
  const result = await compressOne(file);
  if (!result) continue;
  if (result.skipped) {
    skipped += 1;
    console.log(`  skip ${result.rel} (${result.skipped})`);
    continue;
  }
  beforeTotal += result.before;
  afterTotal += result.after;
  wrote += 1;
  const pct = result.before ? ((result.after / result.before) * 100).toFixed(1) : "?";
  console.log(
    `  ${result.rel} → ${path.basename(result.out)}  ` +
      `${(result.before / 1024).toFixed(0)}KB → ${(result.after / 1024).toFixed(0)}KB (${pct}%)` +
      `  maxW=${result.maxWidth}`
  );
}

console.log(
  `\n  files: ${wrote} written, ${skipped} skipped` +
    `\n  size:  ${(beforeTotal / (1024 * 1024)).toFixed(2)} MB → ${(afterTotal / (1024 * 1024)).toFixed(2)} MB` +
    ` (−${((beforeTotal - afterTotal) / (1024 * 1024)).toFixed(2)} MB)`
);
if (dryRun) {
  console.log("  dry-run: no files written");
}
