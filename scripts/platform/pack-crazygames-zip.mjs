#!/usr/bin/env node
/**
 * Build + prepare CrazyGames upload folder with relative asset paths.
 *
 * CrazyGames rejects root-absolute URLs (`/assets/...`) — see technical requirements.
 * This pack builds with VITE_BASE=./ and rewrites remaining `/assets/` refs to `./assets/`.
 *
 * After copy, prunes static art not needed for the CG entry
 * `/gc/crazygames/solitaire` (keeps portal/solitaire + portal/3d/ui + needed JS/CSS),
 * drops PNG/SVG originals when a sibling `.webp` exists (from compress step),
 * and strips audio/_src, other-game audio, marketing hashed images, unused lazy chunks.
 *
 * Upload: drag contents of releases/crazygames-upload/ (NOT the .zip).
 *
 * Usage:
 *   npm run crazygames:pack
 *   node scripts/platform/pack-crazygames-zip.mjs --prune-only   # prune existing upload dir
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const distDir = path.join(root, "dist");
const outDir = path.join(root, "releases");
const uploadDir = path.join(outDir, "crazygames-upload");
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const zipPath = path.join(outDir, `crazygames-${stamp}.zip`);
const pruneOnly = process.argv.includes("--prune-only");

const TEXT_EXT = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".svg",
  ".txt",
  ".map",
  ".mjs",
  ".cjs",
]);

/**
 * Paths relative to upload root. Safe to delete for CrazyGames solitaire-only pack.
 * Do not list Vite hashed chunks under assets/*.js|css — those stay.
 */
const CG_SOLITAIRE_PRUNE_PATHS = [
  // Other portal games / unused hero logos (~45MB)
  "assets/portal/blockblast",
  "assets/portal/match3",
  "assets/portal/tower_arena",
  "assets/portal/yatz",
  "assets/portal/3d/logos",
  "assets/portal/brainwar",
  // Unused portal root art (boot uses solitaire/backgrounds/*.webp)
  "assets/portal/portal_bg_16x9.png",
  "assets/portal/portal_bg_9x16.png",
  "assets/portal/portal_bg_9x16.webp",
  "assets/portal/main_bg.png",
  "assets/portal/mode-solo-frame.png",
  "assets/portal/mode_arena_frame.png",
  "assets/portal/Image.svg",
  "assets/portal/icon-sword.png",
  "assets/portal/icon-target.png",
  // Tactical / casual / marketing art at assets root (~17MB)
  "assets/ludo",
  "assets/monster_cat",
  "assets/match3.png",
  "assets/portal_bg_16x9.png",
  "assets/portal_bg_9x16.png",
  "assets/solitaire_main.png",
  "assets/solitaire_main_1440w.png",
  "assets/solitaire_ui_column.png",
  "assets/assets_candy.png",
  "assets/avatar.png",
  "assets/boy.png",
  "assets/dollar.svg",
  "assets/gems.png",
  "assets/ground.png",
  "assets/headshot.jpg",
  "assets/hero_baboon.png",
  "assets/hero_elephant.png",
  "assets/hero_rhino.png",
  "assets/obstacle1.png",
  "assets/obstacle2.png",
  "assets/obstacle3.png",
  "assets/trophy.png",
  // Audio: keep solitaire + common; drop sources and other games
  "audio/_src",
  "audio/blockblast",
  "audio/match3",
  // Avatar pack unused on CG solitaire entry
  "avatars",
  // Dev / non-game public trees
  "doc",
  "www",
  "portal-static",
  "resources",
  "timer",
  "data",
  "iframe-test.html",
  "portal-solitaire-test.html",
  "telegram_index.html",
  "promotion.txt",
];

/**
 * Vite hashed *media* under assets/ only (never prune JS/CSS by name —
 * PortalGamePage statically imports some "Casual*" shared chunks).
 */
const CG_ASSETS_MEDIA_PRUNE_RES = [
  /^casual_village/i,
  /^bg-desktop-/i,
  /^bg-mobile-/i,
  /^arena_before-/i,
  /^arena_after-/i,
  /^arena-/i,
  /^tournamentitem\./i,
  /^poster-guide-/i,
];

/** ESM import/from targets. */
const ASSET_IMPORT_RE =
  /(?:from\s*|import\s*\(\s*|import\s*)["'](\.\/[^"']+)["']/g;
/**
 * Vite also lists lazy-chunk CSS/JS in `__vite__mapDeps` string arrays
 * (not as import statements). Missing those CSS files →
 * "Unable to preload CSS" and PortalGamePage never mounts.
 */
const ASSET_STRING_RE = /["'](\.\/[A-Za-z0-9_.@-]+\.(?:js|css|mjs))["']/g;
/**
 * `import x from "./foo.css?url"` compiles to
 * `new URL("foo-HASH.css", import.meta.url)` — no `./` prefix.
 */
const ASSET_NEW_URL_RE =
  /new URL\(\s*["']([^"']+\.(?:js|css|mjs))["']\s*,\s*import\.meta\.url\s*\)/g;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyTree(src, dest, { skipMap = true } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipMap && entry.name.endsWith(".map")) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to, { skipMap });
    else fs.copyFileSync(from, to);
  }
}

function folderStats(dir) {
  let bytes = 0;
  let files = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else {
        files += 1;
        bytes += fs.statSync(p).size;
      }
    }
  };
  walk(dir);
  return { files, mb: bytes / (1024 * 1024) };
}

function pathBytes(target) {
  if (!fs.existsSync(target)) return 0;
  const st = fs.statSync(target);
  if (!st.isDirectory()) return st.size;
  return folderStats(target).mb * 1024 * 1024;
}

/** Drop Vite hashed marketing images/PDF only (not JS/CSS). */
function pruneHashedMediaByName(dir) {
  const assetsDir = path.join(dir, "assets");
  let removedBytes = 0;
  let removedEntries = 0;
  if (!fs.existsSync(assetsDir)) return { removedBytes, removedEntries };
  for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const base = entry.name;
    if (!/\.(png|jpe?g|webp|gif|svg|pdf)$/i.test(base)) continue;
    if (!CG_ASSETS_MEDIA_PRUNE_RES.some((re) => re.test(base))) continue;
    const p = path.join(assetsDir, base);
    removedBytes += pathBytes(p);
    fs.unlinkSync(p);
    removedEntries += 1;
  }
  return { removedBytes, removedEntries };
}

function collectAssetImportTargets(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const out = new Set();
  for (const re of [ASSET_IMPORT_RE, ASSET_STRING_RE, ASSET_NEW_URL_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      out.add(path.basename(m[1].split("?")[0]));
    }
  }
  return [...out];
}

/** `Foo-abc123.js` → keep any on-disk `Foo-*.css` (Vite CSS code-split sibling). */
function siblingCssNames(assetsDir, jsName) {
  const m = jsName.match(/^(.+)-[A-Za-z0-9_-]+\.js$/);
  if (!m) return [];
  const prefix = `${m[1]}-`;
  return fs
    .readdirSync(assetsDir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".css"));
}

/**
 * Keep JS/CSS reachable from index.html entry graph; drop unused lazy chunks.
 * Avoids name-based false positives (e.g. Casual* shared by Portal).
 */
function pruneUnreachableHashedModules(dir) {
  const assetsDir = path.join(dir, "assets");
  const indexPath = path.join(dir, "index.html");
  let removedBytes = 0;
  let removedEntries = 0;
  if (!fs.existsSync(assetsDir) || !fs.existsSync(indexPath)) {
    return { removedBytes, removedEntries };
  }

  const keep = new Set();
  const queue = [];
  const html = fs.readFileSync(indexPath, "utf8");
  for (const m of html.matchAll(/(?:src|href)=["']\.\/assets\/([^"']+)["']/g)) {
    const name = m[1].split("?")[0];
    if (!keep.has(name)) {
      keep.add(name);
      queue.push(name);
    }
  }

  while (queue.length > 0) {
    const name = queue.pop();
    if (!/\.(js|css|mjs)$/i.test(name)) continue;
    const fp = path.join(assetsDir, name);
    if (!fs.existsSync(fp)) continue;
    for (const dep of collectAssetImportTargets(fp)) {
      if (keep.has(dep)) continue;
      keep.add(dep);
      queue.push(dep);
    }
    if (/\.js$/i.test(name)) {
      for (const css of siblingCssNames(assetsDir, name)) {
        if (keep.has(css)) continue;
        keep.add(css);
        queue.push(css);
      }
    }
  }

  const missing = [];
  for (const name of keep) {
    if (!/\.(js|css|mjs)$/i.test(name)) continue;
    if (!fs.existsSync(path.join(assetsDir, name))) missing.push(name);
  }
  if (missing.length) {
    fail(
      `CrazyGames pack closure missing ${missing.length} asset(s):\n  ` +
        missing.slice(0, 30).join("\n  ")
    );
  }

  for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const base = entry.name;
    if (!/\.(js|css|mjs|map)$/i.test(base)) continue;
    const bare = base.replace(/\.map$/i, "");
    if (keep.has(base) || keep.has(bare)) continue;
    const p = path.join(assetsDir, base);
    removedBytes += pathBytes(p);
    fs.unlinkSync(p);
    removedEntries += 1;
  }
  return { removedBytes, removedEntries };
}

/** Strip static assets not required for /portal/crazygames/solitaire. */
function pruneCrazyGamesSolitaireAssets(dir) {
  let removedBytes = 0;
  let removedEntries = 0;
  for (const rel of CG_SOLITAIRE_PRUNE_PATHS) {
    const target = path.join(dir, rel);
    if (!fs.existsSync(target)) continue;
    removedBytes += pathBytes(target);
    rmrf(target);
    removedEntries += 1;
  }
  const media = pruneHashedMediaByName(dir);
  removedBytes += media.removedBytes;
  removedEntries += media.removedEntries;
  const unreachable = pruneUnreachableHashedModules(dir);
  removedBytes += unreachable.removedBytes;
  removedEntries += unreachable.removedEntries;
  const superseded = pruneSupersededPortalRasters(dir);
  removedBytes += superseded.removedBytes;
  removedEntries += superseded.removedEntries;
  return {
    removedEntries,
    removedMb: removedBytes / (1024 * 1024),
  };
}

/**
 * Drop PNG/SVG sources under portal/solitaire + portal/3d/ui when `.webp` exists.
 * Runtime and CSS point at WebP after compress-crazygames-portal-art.
 */
function pruneSupersededPortalRasters(dir) {
  const roots = [
    path.join(dir, "assets/portal/solitaire"),
    path.join(dir, "assets/portal/3d/ui"),
  ];
  let removedBytes = 0;
  let removedEntries = 0;
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(png|svg)$/i.test(entry.name)) continue;
      const webp = p.replace(/\.(png|svg)$/i, ".webp");
      if (!fs.existsSync(webp)) continue;
      removedBytes += pathBytes(p);
      fs.unlinkSync(p);
      removedEntries += 1;
    }
  };
  for (const r of roots) walk(r);
  return { removedBytes, removedEntries };
}

/** Rewrite root-absolute public asset URLs for CrazyGames CDN. */
function rewriteAbsoluteAssetPaths(dir) {
  let rewritten = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(p);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXT.has(ext)) continue;
      const before = fs.readFileSync(p, "utf8");
      let after = before;
      after = after.replace(/<base\s+href=["']\/["']\s*\/?>/gi, '<base href="./" />');
      // Root-absolute public URLs → relative (CG hosts under /game/version/)
      after = after.replace(/(^|[^.\w])\/assets\//g, "$1./assets/");
      after = after.replace(/(^|[^.\w])\/icons\//g, "$1./icons/");
      after = after.replace(/(^|[^.\w])\/logo192\.png/g, "$1./logo192.png");
      after = after.replace(/(^|[^.\w])\/favicon\.ico/g, "$1./favicon.ico");
      after = after.replace(/(^|[^.\w])\/manifest\.json/g, "$1./manifest.json");
      if (after !== before) {
        fs.writeFileSync(p, after, "utf8");
        rewritten += 1;
      }
    }
  };
  walk(dir);
  return rewritten;
}

function assertRelativeEntry() {
  const indexPath = path.join(uploadDir, "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  if (!html.includes("index.html") && !fs.existsSync(indexPath)) {
    fail("Missing index.html");
  }
  if (/src=["']\/assets\//.test(html) || /href=["']\/assets\//.test(html)) {
    fail("index.html still has root-absolute /assets/ URLs after rewrite");
  }
  if (!/\.\/assets\//.test(html)) {
    fail("index.html has no ./assets/ references — build may have failed");
  }
  if (/<base\s+href=["']\/["']/i.test(html)) {
    fail('index.html still has <base href="/" />');
  }
}

console.log("== CrazyGames pack ==");

if (pruneOnly) {
  if (!fs.existsSync(path.join(uploadDir, "index.html"))) {
    fail(`--prune-only requires existing ${uploadDir}`);
  }
  console.log("  prune-only: skipping vite build");
} else {
  console.log("  compressing portal lobby art → WebP...");
  execSync("node scripts/platform/compress-crazygames-portal-art.mjs", {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });

  console.log(
    "  building with VITE_BASE=./ (Clerk off, mock rewarded ads on)..."
  );
  // CrazyGames: embed JWT only (no Clerk). Prefer mock rewarded ads while CG
  // inventory is unreliable — backend must allow channel `dev` (PORTAL_AD_REPLAY_MOCK).
  execSync("npx vite build", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_BASE: "./",
      VITE_DISABLE_CLERK: "1",
      VITE_AD_REPLAY_MOCK: "1",
      VITE_CLERK_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      REACT_APP_CLERK_PUBLISHABLE_KEY: "",
      CLERK_PUBLISHABLE_KEY: "",
    },
    shell: true,
    windowsHide: true,
  });

  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    fail("Missing dist/index.html after build.");
  }

  fs.mkdirSync(outDir, { recursive: true });
  rmrf(uploadDir);
  copyTree(distDir, uploadDir, { skipMap: true });
}

const before = folderStats(uploadDir);
const pruned = pruneCrazyGamesSolitaireAssets(uploadDir);
console.log(
  `  pruned solitaire-only: ${pruned.removedEntries} paths, −${pruned.removedMb.toFixed(2)} MB`
);

const rewritten = rewriteAbsoluteAssetPaths(uploadDir);
assertRelativeEntry();

const stats = folderStats(uploadDir);
console.log("  folder:", uploadDir);
console.log(
  `  size:   ${stats.mb.toFixed(2)} MB / ${stats.files} files` +
    ` (was ${before.mb.toFixed(2)} MB / ${before.files} files)`
);
if (!pruneOnly) {
  console.log(`  rewrote absolute /assets/ in ${rewritten} text files`);
}

try {
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (process.platform === "win32") {
    const src = path.join(uploadDir, "*").replace(/'/g, "''");
    const dest = zipPath.replace(/'/g, "''");
    execSync(`Compress-Archive -Path '${src}' -DestinationPath '${dest}' -Force`, {
      shell: "powershell",
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    execSync(`zip -r "${zipPath}" .`, { cwd: uploadDir, stdio: "ignore" });
  }
  console.log(`  backup zip (do NOT upload to CG): ${zipPath}`);
} catch {
  console.log("  backup zip: skipped (optional)");
}

console.log(`
HOW TO UPLOAD (CrazyGames rejects .zip and absolute /assets paths):
  1. Open:  ${uploadDir}
  2. Select EVERYTHING inside (Ctrl+A) — must include the assets/ folder
  3. Drag into the Developer Portal upload zone
  4. Confirm preview Network tab loads ./assets/*.js (not 404)

Entry path: /gc/crazygames/solitaire
Kept static art: assets/portal/solitaire/*.webp, assets/portal/3d/ui/*.webp
Also pruned: audio/_src, other-game audio, brainwar art, marketing images,
unreachable lazy JS/CSS (keeps PortalGamePage import closure)
`);

if (process.platform === "win32" && !pruneOnly) {
  try {
    execSync(`explorer "${uploadDir}"`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}
