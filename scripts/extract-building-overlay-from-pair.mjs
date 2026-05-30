/**
 * 从 MJ 擦除前后的 before/after 图差分提取建筑 overlay。
 * - RGB 始终来自 before（避免 after 草坪色污染）
 * - Alpha 来自 |before - after|，可选限制在 hotspot 矩形内
 *
 * 单栋:
 *   node scripts/extract-building-overlay-from-pair.mjs \
 *     --before src/.../illustration/raw/pairs/arena_before.png \
 *     --after src/.../illustration/raw/pairs/arena_after.png \
 *     --building-id arena
 *
 * 批量（目录内 {id}_before.png + {id}_after.png）:
 *   node scripts/extract-building-overlay-from-pair.mjs --batch-pairs
 *   node scripts/extract-building-overlay-from-pair.mjs --pairs-dir src/.../illustration/raw/pairs
 *
 * 整图有房 vs empty，按热区拆 12 栋:
 *   node scripts/extract-building-overlay-from-pair.mjs --split-all-hotspots \
 *     --before src/.../casual_village_s1_base.png \
 *     --after src/.../casual_village_s1_base_empty.png
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const illusDir = path.join(
  root,
  "src/component/lobby/casual/view/town/assets/illustration"
);
const defaultOutDir = path.join(illusDir, "overlays");
const defaultRawDir = path.join(illusDir, "raw");
const defaultPairsDir = path.join(defaultRawDir, "pairs");
const defaultWipDir = path.join(defaultRawDir, "wip");

/** 与 townIllustrationConfig.ts hotspots 同步 */
const HOTSPOTS = [
  { buildingId: "town_square", x: 0.35, y: 0.29, w: 0.3, h: 0.25 },
  { buildingId: "champion_plaza", x: 0.39, y: 0.06, w: 0.22, h: 0.2 },
  { buildingId: "honor_gallery", x: 0.33, y: 0.1, w: 0.34, h: 0.14 },
  { buildingId: "streak_monument", x: 0.04, y: 0.04, w: 0.15, h: 0.19 },
  { buildingId: "battle_board", x: 0.2, y: 0.14, w: 0.13, h: 0.17 },
  { buildingId: "legend_hall", x: 0.06, y: 0.36, w: 0.19, h: 0.21 },
  { buildingId: "season_archive", x: 0.14, y: 0.58, w: 0.22, h: 0.24 },
  { buildingId: "rival_hall", x: 0.2, y: 0.5, w: 0.14, h: 0.14 },
  { buildingId: "game_museum", x: 0.55, y: 0.3, w: 0.24, h: 0.28 },
  { buildingId: "arena", x: 0.62, y: 0.52, w: 0.34, h: 0.38 },
  { buildingId: "visitor_log", x: 0.72, y: 0.15, w: 0.12, h: 0.1 },
  { buildingId: "skin_exhibition", x: 0.58, y: 0.38, w: 0.14, h: 0.12 },
];

function parseArgs(argv) {
  const opts = {
    before: null,
    after: null,
    out: null,
    outDir: defaultOutDir,
    buildingId: null,
    pairsDir: null,
    splitAllHotspots: false,
    threshold: 28,
    shrink: 1,
    grow: 3,
    hotspotOnly: true,
    hotspotShrink: 0.02,
    outputMode: "full",
    minAlpha: 8,
    manifest: null,
    writeManifest: false,
    batchPairs: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--before") opts.before = next, i++;
    else if (a === "--after") opts.after = next, i++;
    else if (a === "--out") opts.out = next, i++;
    else if (a === "--out-dir") opts.outDir = next, i++;
    else if (a === "--building-id") opts.buildingId = next, i++;
    else if (a === "--pairs-dir") opts.pairsDir = next, i++;
    else if (a === "--batch-pairs") opts.batchPairs = true;
    else if (a === "--split-all-hotspots") opts.splitAllHotspots = true;
    else if (a === "--threshold") opts.threshold = Number(next), i++;
    else if (a === "--shrink") opts.shrink = Number(next), i++;
    else if (a === "--grow") opts.grow = Number(next), i++;
    else if (a === "--hotspot-shrink") opts.hotspotShrink = Number(next), i++;
    else if (a === "--no-hotspot-only") opts.hotspotOnly = false;
    else if (a === "--output-mode") opts.outputMode = next, i++;
    else if (a === "--manifest") opts.manifest = next, i++;
    else if (a === "--write-manifest") opts.writeManifest = true;
    else if (a === "--help") opts.help = true;
  }
  if (opts.manifest) opts.writeManifest = true;
  return opts;
}

function usage() {
  console.log(`
Paths (defaults under assets/illustration/):
  raw/pairs/   MJ {buildingId}_before.png + {buildingId}_after.png
  raw/wip/     optional erase progress backups
  overlays/    script output PNG + overlay-manifest.json

Usage:
  Single pair:
    node scripts/extract-building-overlay-from-pair.mjs \\
      --before src/component/lobby/casual/view/town/assets/illustration/raw/pairs/arena_before.png \\
      --after src/component/lobby/casual/view/town/assets/illustration/raw/pairs/arena_after.png \\
      --building-id arena

  Batch pairs ({id}_before.png + {id}_after.png in raw/pairs/):
    node scripts/extract-building-overlay-from-pair.mjs --batch-pairs

  Split full base vs empty by hotspots:
    node scripts/extract-building-overlay-from-pair.mjs --split-all-hotspots \\
      --before src/component/lobby/casual/view/town/assets/illustration/casual_village_s1_base.png \\
      --after src/component/lobby/casual/view/town/assets/illustration/casual_village_s1_base_empty.png

Options:
  --batch-pairs     use default raw/pairs (same as --pairs-dir .../raw/pairs)
  --pairs-dir PATH  custom pairs directory
  --threshold N     diff threshold 0-255 (default 28)
  --shrink N        erode alpha px (trim grass fringe, default 1)
  --grow N          dilate alpha px (restore roof/feet, default 3)
  --hotspot-shrink  inset hotspot ratio per side (default 0.02)
  --no-hotspot-only diff on full canvas
  --output-mode full|crop   full=1024 canvas, crop=tight bbox
  --out-dir PATH    default overlays/
  --write-manifest  write overlay-manifest.json (batch / split-all default on)
  --manifest PATH   manifest output path (implies --write-manifest)
`);
}

function normRect(x, y, w, h, W, H) {
  return {
    x: Math.round((x / W) * 10000) / 10000,
    y: Math.round((y / H) * 10000) / 10000,
    w: Math.round((w / W) * 10000) / 10000,
    h: Math.round((h / H) * 10000) / 10000,
  };
}

function writeManifestFile(manifestPath, payload) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`manifest → ${manifestPath}`);
}

function resolvePath(p) {
  if (!p) return p;
  return path.isAbsolute(p) ? p : path.join(root, p);
}

function hotspotRect(h, W, H, insetRatio) {
  const ix = h.w * insetRatio;
  const iy = h.h * insetRatio;
  const x = Math.max(0, Math.floor((h.x + ix) * W));
  const y = Math.max(0, Math.floor((h.y + iy) * H));
  const x2 = Math.min(W, Math.ceil((h.x + h.w - ix) * W));
  const y2 = Math.min(H, Math.ceil((h.y + h.h - iy) * H));
  return { x, y, w: Math.max(1, x2 - x), h: Math.max(1, y2 - y) };
}

function pixelDiff(r1, g1, b1, r2, g2, b2) {
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}

function morphAlpha(alpha, w, h, shrink, grow) {
  let a = alpha.slice();
  const erode = (src, r) => {
    if (r <= 0) return src;
    const dst = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i] === 0) continue;
        let ok = true;
        for (let dy = -r; dy <= r && ok; dy++) {
          for (let dx = -r; dx <= r && ok; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || src[ny * w + nx] === 0) ok = false;
          }
        }
        if (ok) dst[i] = src[i];
      }
    }
    return dst;
  };
  const dilate = (src, r) => {
    if (r <= 0) return src;
    const dst = src.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i] === 0) continue;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h) dst[ny * w + nx] = src[i];
          }
        }
      }
    }
    return dst;
  };
  a = erode(a, shrink);
  a = dilate(a, grow);
  return a;
}

function inRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

async function loadRgba(filePath, W, H) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .resize(W, H, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`Expected RGBA: ${filePath}`);
  return data;
}

async function extractOverlay({
  beforePath,
  afterPath,
  buildingId,
  outPath,
  threshold,
  shrink,
  grow,
  hotspotOnly,
  hotspotShrink,
  outputMode,
  minAlpha,
  hotspot,
}) {
  const imgMeta = await sharp(beforePath).metadata();
  const W = imgMeta.width ?? 1024;
  const H = imgMeta.height ?? 1024;

  const before = await loadRgba(beforePath, W, H);
  const after = await loadRgba(afterPath, W, H);

  const rect = hotspot
    ? hotspotRect(hotspot, W, H, hotspotShrink)
    : { x: 0, y: 0, w: W, h: H };

  const alpha = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (hotspotOnly && hotspot && !inRect(x, y, rect)) continue;

      const d = pixelDiff(
        before[i],
        before[i + 1],
        before[i + 2],
        after[i],
        after[i + 1],
        after[i + 2]
      );
      if (d >= threshold) alpha[y * W + x] = 255;
    }
  }

  const morphed = morphAlpha(alpha, W, H, shrink, grow);
  const out = Buffer.alloc(W * H * 4);

  let minX = W;
  let minY = H;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const pi = y * W + x;
      const oi = pi * 4;
      const a = morphed[pi];
      if (a < minAlpha) continue;
      out[oi] = before[oi];
      out[oi + 1] = before[oi + 1];
      out[oi + 2] = before[oi + 2];
      out[oi + 3] = a;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  let pipeline = sharp(out, { raw: { width: W, height: H, channels: 4 } });

  if (outputMode === "crop" && maxX >= minX && maxY >= minY) {
    const pad = 2;
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    const width = Math.min(W - left, maxX - minX + 1 + pad * 2);
    const height = Math.min(H - top, maxY - minY + 1 + pad * 2);
    pipeline = pipeline.extract({ left, top, width, height });
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await pipeline.png().toFile(outPath);

  const visible = morphed.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
  const hasBbox = maxX >= minX && maxY >= minY;
  const bboxW = hasBbox ? maxX - minX + 1 : 0;
  const bboxH = hasBbox ? maxY - minY + 1 : 0;

  const meta = {
    buildingId: buildingId ?? path.basename(outPath, ".png"),
    overlayFile: path.basename(outPath),
    canvas: { width: W, height: H },
    visiblePixels: visible,
    /** townIllustrationConfig 中配置的热区（0–1） */
    hotspotConfig: hotspot
      ? { x: hotspot.x, y: hotspot.y, w: hotspot.w, h: hotspot.h }
      : null,
    /** 差分时实际使用的像素矩形（含 hotspot-shrink） */
    hotspotDiffRectPx: hotspot ? { x: rect.x, y: rect.y, w: rect.w, h: rect.h } : null,
    hotspotDiffRect: hotspot
      ? normRect(rect.x, rect.y, rect.w, rect.h, W, H)
      : null,
    /** 从 alpha 检测到的建筑紧包围盒（可用于校准 hotspot） */
    detectedBboxPx: hasBbox
      ? { x: minX, y: minY, w: bboxW, h: bboxH }
      : null,
    detectedBbox: hasBbox ? normRect(minX, minY, bboxW, bboxH, W, H) : null,
    detectedCenter: hasBbox
      ? {
          x: Math.round(((minX + maxX + 1) / 2 / W) * 10000) / 10000,
          y: Math.round(((minY + maxY + 1) / 2 / H) * 10000) / 10000,
        }
      : null,
  };

  console.log(
    `[${meta.buildingId}] ${outPath} (${visible} px, hotspot ${hotspotOnly && hotspot ? "on" : "off"})`
  );
  if (meta.detectedBbox) {
    console.log(
      `  detected bbox (0-1): x=${meta.detectedBbox.x} y=${meta.detectedBbox.y} w=${meta.detectedBbox.w} h=${meta.detectedBbox.h}`
    );
  }

  return meta;
}

async function runSingle(opts) {
  const beforePath = resolvePath(opts.before);
  const afterPath = resolvePath(opts.after);
  if (!beforePath || !afterPath) throw new Error("Need --before and --after");
  if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
    throw new Error("before/after file not found");
  }

  const buildingId = opts.buildingId ?? path.basename(beforePath, path.extname(beforePath)).replace(/_before$/, "");
  const outPath = resolvePath(opts.out ?? path.join(opts.outDir, `${buildingId}.png`));
  const hotspot = HOTSPOTS.find((h) => h.buildingId === buildingId);

  const meta = await extractOverlay({
    beforePath,
    afterPath,
    buildingId,
    outPath,
    threshold: opts.threshold,
    shrink: opts.shrink,
    grow: opts.grow,
    hotspotOnly: opts.hotspotOnly,
    hotspotShrink: opts.hotspotShrink,
    outputMode: opts.outputMode,
    minAlpha: opts.minAlpha,
    hotspot,
  });

  if (opts.writeManifest) {
    const manifestPath = resolvePath(
      opts.manifest ?? path.join(opts.outDir, "overlay-manifest.json")
    );
    writeManifestFile(manifestPath, {
      generatedAt: new Date().toISOString(),
      before: beforePath,
      after: afterPath,
      buildings: [meta],
    });
  }
}

async function runPairsDir(opts) {
  const dir = resolvePath(opts.pairsDir);
  if (!fs.existsSync(dir)) throw new Error(`pairs-dir not found: ${dir}`);

  const files = fs.readdirSync(dir);
  const ids = new Set();
  for (const f of files) {
    const m = f.match(/^(.+)_before\.(png|jpg|jpeg|webp)$/i);
    if (m) ids.add(m[1]);
  }
  if (ids.size === 0) throw new Error(`No *_before.png in ${dir}`);

  const buildings = [];
  for (const id of [...ids].sort()) {
    const bPath = path.join(dir, `${id}_before.png`);
    const aPath = path.join(dir, `${id}_after.png`);
    if (!fs.existsSync(aPath)) {
      console.warn(`skip ${id}: missing after`);
      continue;
    }
    const meta = await extractOverlay({
      beforePath: bPath,
      afterPath: aPath,
      buildingId: id,
      outPath: path.join(resolvePath(opts.outDir), `${id}.png`),
      threshold: opts.threshold,
      shrink: opts.shrink,
      grow: opts.grow,
      hotspotOnly: opts.hotspotOnly,
      hotspotShrink: opts.hotspotShrink,
      outputMode: opts.outputMode,
      minAlpha: opts.minAlpha,
      hotspot: HOTSPOTS.find((h) => h.buildingId === id),
    });
    buildings.push(meta);
  }

  if (buildings.length) {
    const manifestPath = resolvePath(
      opts.manifest ?? path.join(opts.outDir, "overlay-manifest.json")
    );
    writeManifestFile(manifestPath, {
      generatedAt: new Date().toISOString(),
      pairsDir: dir,
      buildings,
    });
  }
}

async function runSplitAll(opts) {
  const beforePath = resolvePath(opts.before);
  const afterPath = resolvePath(opts.after);
  if (!beforePath || !afterPath) throw new Error("Need --before and --after");

  opts.writeManifest = opts.writeManifest || opts.splitAllHotspots;

  const buildings = [];
  for (const hotspot of HOTSPOTS) {
    const meta = await extractOverlay({
      beforePath,
      afterPath,
      buildingId: hotspot.buildingId,
      outPath: path.join(resolvePath(opts.outDir), `${hotspot.buildingId}.png`),
      threshold: opts.threshold,
      shrink: opts.shrink,
      grow: opts.grow,
      hotspotOnly: true,
      hotspotShrink: opts.hotspotShrink,
      outputMode: opts.outputMode,
      minAlpha: opts.minAlpha,
      hotspot,
    });
    buildings.push(meta);
  }

  if (opts.writeManifest) {
    const manifestPath = resolvePath(
      opts.manifest ?? path.join(opts.outDir, "overlay-manifest.json")
    );
    writeManifestFile(manifestPath, {
      generatedAt: new Date().toISOString(),
      before: beforePath,
      after: afterPath,
      buildings,
    });
  }
}

const opts = parseArgs(process.argv);
if (opts.help) {
  usage();
  process.exit(0);
}

try {
  if (opts.splitAllHotspots) await runSplitAll(opts);
  else if (opts.batchPairs || opts.pairsDir) {
    opts.pairsDir = opts.pairsDir ?? defaultPairsDir;
    await runPairsDir(opts);
  } else await runSingle(opts);
} catch (e) {
  console.error(e.message ?? e);
  usage();
  process.exit(1);
}
