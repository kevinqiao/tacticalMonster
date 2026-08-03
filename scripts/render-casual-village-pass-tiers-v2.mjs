/**
 * Render Pass tier visuals from casual_village_s1_base.png + casualVillageDecorLayout.json
 *
 * Usage:
 *   node scripts/render-casual-village-pass-tiers-v2.mjs
 */
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { propsASvg, propsBSvg, propsCSvg } from "./casual-village-decor-svg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const illusDir = path.join(
  root,
  "src/component/lobby/casual/view/town/assets/illustration"
);
const layoutPath = path.join(
  root,
  "src/component/lobby/casual/view/town/casualVillageDecorLayout.json"
);
const input = path.join(illusDir, "casual_village_s1_base.png");

const layout = JSON.parse(fs.readFileSync(layoutPath, "utf8"));

const TIERS = [
  {
    id: "env",
    file: "casual_village_s1_pass_env_v2.png",
    label: "Pass Lv.1 · env",
    modulate: { brightness: 0.95, saturation: 0.92 },
    fx: [],
  },
  {
    id: "accent",
    file: "casual_village_s1_pass_accent_v2.png",
    label: "Pass Lv.10 · accent",
    modulate: { brightness: 1.06, saturation: 1.12 },
    fx: ["accent", "propsA"],
  },
  {
    id: "facade",
    file: "casual_village_s1_pass_facade_v2.png",
    label: "Pass Lv.25 · facade",
    modulate: { brightness: 1.1, saturation: 1.22 },
    fx: ["accent", "propsA", "facade", "propsB"],
  },
  {
    id: "full",
    file: "casual_village_s1_pass_full_v2.png",
    label: "Pass Lv.40 · full",
    modulate: { brightness: 1.14, saturation: 1.34 },
    fx: ["accent", "propsA", "facade", "propsB", "full", "propsC"],
  },
];

function svgWrap(w, h, body) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function accentSvg(w, h) {
  return svgWrap(
    w,
    h,
    `
  <defs>
    <linearGradient id="aTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,210,90,0.3)"/>
      <stop offset="35%" stop-color="rgba(255,210,90,0)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#aTop)"/>
  <path d="M ${0.08 * w} ${0.15 * h} Q ${0.5 * w} ${0.11 * h} ${0.92 * w} ${0.15 * h}" stroke="rgba(85,55,20,0.65)" stroke-width="2.5" fill="none"/>
  <path d="M ${0.1 * w} ${0.205 * h} Q ${0.5 * w} ${0.165 * h} ${0.9 * w} ${0.205 * h}" stroke="rgba(85,55,20,0.55)" stroke-width="2" fill="none"/>
  ${[0.14, 0.22, 0.31, 0.4, 0.5, 0.6, 0.69, 0.78, 0.86]
    .map(
      (x, i) =>
        `<circle cx="${x * w}" cy="${(i % 2 ? 0.17 : 0.15) * h}" r="${Math.max(
          3,
          w * 0.006
        )}" fill="${i % 2 ? "#ffd34f" : "#fff3b0"}"/>`
    )
    .join("")}
  `
  );
}

function facadeSvg(w, h) {
  return svgWrap(
    w,
    h,
    `
  <defs>
    <linearGradient id="fMix" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(70,150,255,0.38)"/>
      <stop offset="38%" stop-color="rgba(70,150,255,0)"/>
      <stop offset="62%" stop-color="rgba(255,160,80,0)"/>
      <stop offset="100%" stop-color="rgba(255,160,80,0.32)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#fMix)"/>
  <ellipse cx="${0.5 * w}" cy="${0.56 * h}" rx="${0.42 * w}" ry="${0.27 * h}" fill="none" stroke="rgba(130,210,255,0.72)" stroke-width="2.2" stroke-dasharray="10 8"/>
  <ellipse cx="${0.52 * w}" cy="${0.58 * h}" rx="${0.32 * w}" ry="${0.21 * h}" fill="none" stroke="rgba(255,208,128,0.5)" stroke-width="1.8" stroke-dasharray="7 7"/>
  `
  );
}

function fullSvg(w, h) {
  return svgWrap(
    w,
    h,
    `
  <defs>
    <radialGradient id="sunCore" cx="50%" cy="40%" r="62%">
      <stop offset="0%" stop-color="rgba(255,223,120,0.58)"/>
      <stop offset="75%" stop-color="rgba(255,223,120,0)"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="100%" r="80%">
      <stop offset="0%" stop-color="rgba(90,25,140,0.45)"/>
      <stop offset="65%" stop-color="rgba(90,25,140,0)"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#sunCore)"/>
  <rect width="100%" height="100%" fill="url(#vignette)"/>
  <text x="${0.5 * w}" y="${0.12 * h}" text-anchor="middle" font-size="${Math.round(
      w * 0.034
    )}" font-family="serif" fill="rgba(255,245,190,0.95)" letter-spacing="${Math.round(
      w * 0.015
    )}">✦ ✦ ✦</text>
  `
  );
}

function titleSvg(w, label, tierId) {
  const styles = {
    env: { bg: "rgba(35,40,50,0.82)", border: "#9eb4c9" },
    accent: { bg: "rgba(170,110,22,0.86)", border: "#ffe06f" },
    facade: { bg: "rgba(36,95,165,0.88)", border: "#91d4ff" },
    full: { bg: "rgba(182,62,20,0.9)", border: "#ffd06a" },
  };
  const s = styles[tierId];
  const boxW = Math.max(220, label.length * 14 + 44);
  return svgWrap(
    w,
    72,
    `
  <rect x="14" y="10" width="${boxW}" height="46" rx="10" fill="${s.bg}" stroke="${s.border}" stroke-width="2"/>
  <text x="30" y="40" font-family="Microsoft YaHei, sans-serif" font-size="21" font-weight="700" fill="#fff">${label}</text>
  `
  );
}

async function toPngBuffer(svg, w, h) {
  return sharp(Buffer.from(svg)).resize(w, h).png().toBuffer();
}

function getFxBuffer(w, h, fxName, decor) {
  if (fxName === "accent") return toPngBuffer(accentSvg(w, h), w, h);
  if (fxName === "facade") return toPngBuffer(facadeSvg(w, h), w, h);
  if (fxName === "full") return toPngBuffer(fullSvg(w, h), w, h);
  if (fxName === "propsA") return sharp(Buffer.from(propsASvg(w, h, decor))).png().toBuffer();
  if (fxName === "propsB") return sharp(Buffer.from(propsBSvg(w, h, decor))).png().toBuffer();
  return sharp(Buffer.from(propsCSvg(w, h, decor))).png().toBuffer();
}

const meta = await sharp(input).metadata();
const width = meta.width;
const height = meta.height;
if (!width || !height) {
  throw new Error("Cannot read image dimensions.");
}

for (const tier of TIERS) {
  const base = await sharp(input).modulate(tier.modulate).png().toBuffer();
  const composites = [{ input: base, top: 0, left: 0 }];

  for (const fxName of tier.fx) {
    const fxBuf = await getFxBuffer(width, height, fxName, layout);
    composites.push({
      input: fxBuf,
      top: 0,
      left: 0,
      blend: fxName.startsWith("props") ? "over" : fxName === "accent" ? "screen" : "overlay",
    });
  }

  const title = await sharp(Buffer.from(titleSvg(width, tier.label, tier.id))).png().toBuffer();
  composites.push({ input: title, top: 0, left: 0, blend: "over" });

  const out = path.join(illusDir, tier.file);
  await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(out);
}

console.log(`Done. Layout: ${layoutPath}`);
console.log(`Size: ${width}x${height}`);
