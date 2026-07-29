#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = path.join(root, "releases/crazygames-upload");
const assets = path.join(dir, "assets");
const IMPORT_RE = /(?:from\s*|import\s*\(\s*|import\s*)["'](\.\/[^"']+)["']/g;
const STRING_RE = /["'](\.\/[A-Za-z0-9_.@-]+\.(?:js|css|mjs))["']/g;
const NEW_URL_RE =
  /new URL\(\s*["']([^"']+\.(?:js|css|mjs))["']\s*,\s*import\.meta\.url\s*\)/g;

function deps(file) {
  const t = fs.readFileSync(file, "utf8");
  const o = new Set();
  for (const re of [IMPORT_RE, STRING_RE, NEW_URL_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t))) o.add(path.basename(m[1].split("?")[0]));
  }
  return [...o];
}

function siblingCss(jsName) {
  const m = jsName.match(/^(.+)-[A-Za-z0-9_-]+\.js$/);
  if (!m) return [];
  const prefix = `${m[1]}-`;
  return fs
    .readdirSync(assets)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".css"));
}

const keep = new Set();
const q = [];
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
for (const m of html.matchAll(/(?:src|href)=["']\.\/assets\/([^"']+)["']/g)) {
  const n = m[1].split("?")[0];
  keep.add(n);
  q.push(n);
}
while (q.length) {
  const n = q.pop();
  const fp = path.join(assets, n);
  if (!fs.existsSync(fp) || !/\.(js|css|mjs)$/i.test(n)) continue;
  for (const d of deps(fp)) {
    if (!keep.has(d)) {
      keep.add(d);
      q.push(d);
    }
  }
  if (/\.js$/i.test(n)) {
    for (const css of siblingCss(n)) {
      if (!keep.has(css)) {
        keep.add(css);
        q.push(css);
      }
    }
  }
}

const broken = [];
for (const n of keep) {
  if (!/\.(js|css|mjs)$/i.test(n)) continue;
  const fp = path.join(assets, n);
  if (!fs.existsSync(fp)) {
    broken.push(`MISSING keep ${n}`);
    continue;
  }
  for (const d of deps(fp)) {
    if (!fs.existsSync(path.join(assets, d))) broken.push(`${n} -> ${d}`);
  }
}

console.log("keep", keep.size);
console.log("broken edges", broken.length);
if (broken.length) console.log(broken.slice(0, 80).join("\n"));
console.log("--- portal critical present? ---");
for (const re of [
  /^PortalGamePage-/,
  /^PortalGame3DShadowHost-/,
  /^PlaySolitaireSolo-/,
  /^SolitaireWatchOverlay-/,
  /^CasualAdReplayVideoIcon-/,
  /^ManualSettleConfirmOverlay-.*\.js$/,
  /^ManualSettleConfirmOverlay-.*\.css$/,
  /^portal-[A-Za-z0-9_-]+\.css$/,
  /^portal_3d-[A-Za-z0-9_-]+\.css$/,
  /^portal_3d_modal-[A-Za-z0-9_-]+\.css$/,
  /^solitaire-figma-[A-Za-z0-9_-]+\.css$/,
  /^casualEconomyUi-/,
  /^useAwaitOpenCasual/,
  /^three-vendor-/,
]) {
  const hit = fs.readdirSync(assets).find((f) => re.test(f));
  console.log(String(re), hit || "MISSING");
}

if (broken.length) process.exit(1);
