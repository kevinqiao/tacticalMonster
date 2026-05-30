/**
 * 生成建筑解锁叠层占位 PNG（与母图同尺寸，透明底）
 * 运行: node scripts/generate-town-building-overlays.mjs
 */
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const illusDir = path.join(
  root,
  "src/component/lobby/casual/view/town/assets/illustration"
);
const outDir = path.join(illusDir, "overlays");
const basePath = path.join(illusDir, "casual_village_s1.png");

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

function rectPx(h, W, H) {
  return {
    x: h.x * W,
    y: h.y * H,
    w: h.w * W,
    h: h.h * H,
    cx: (h.x + h.w / 2) * W,
    cy: (h.y + h.h / 2) * H,
  };
}

function landmarkBody(buildingId, r) {
  const { x, y, w, h, cx, cy } = r;
  switch (buildingId) {
    case "town_square":
      return `
        <ellipse cx="${cx}" cy="${cy + h * 0.15}" rx="${w * 0.42}" ry="${h * 0.2}" fill="#8a9098" opacity="0.85"/>
        <ellipse cx="${cx}" cy="${cy + h * 0.05}" rx="${w * 0.28}" ry="${h * 0.12}" fill="#4a9ee8" opacity="0.75"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${w * 0.12}" ry="${h * 0.08}" fill="#7ec8f8" opacity="0.9"/>
      `;
    case "champion_plaza":
      return `
        <rect x="${cx - w * 0.08}" y="${cy + h * 0.35}" width="${w * 0.16}" height="${h * 0.45}" fill="#6a5030" rx="3"/>
        <circle cx="${cx}" cy="${cy + h * 0.22}" r="${w * 0.14}" fill="#ffd84a" stroke="#c9a020" stroke-width="3"/>
        <polygon points="${cx},${cy + h * 0.02} ${cx + w * 0.1},${cy + h * 0.18} ${cx + w * 0.16},${cy + h * 0.18} ${cx + w * 0.11},${cy + h * 0.28} ${cx + w * 0.14},${cy + h * 0.42} ${cx},${cy + h * 0.32} ${cx - w * 0.14},${cy + h * 0.42} ${cx - w * 0.11},${cy + h * 0.28} ${cx - w * 0.16},${cy + h * 0.18} ${cx - w * 0.1},${cy + h * 0.18}" fill="#e8a820"/>
      `;
    case "arena":
      return `
        <ellipse cx="${cx}" cy="${cy + h * 0.35}" rx="${w * 0.46}" ry="${h * 0.28}" fill="#7a6a58" opacity="0.9"/>
        <ellipse cx="${cx}" cy="${cy + h * 0.32}" rx="${w * 0.38}" ry="${h * 0.2}" fill="#a08060" opacity="0.5"/>
        <path d="M ${cx - w * 0.35} ${cy + h * 0.55} A ${w * 0.35} ${h * 0.25} 0 0 1 ${cx + w * 0.35} ${cy + h * 0.55}" fill="none" stroke="#d4a060" stroke-width="5"/>
        <rect x="${cx - w * 0.12}" y="${cy + h * 0.45}" width="${w * 0.24}" height="${h * 0.2}" fill="#4a3828" rx="4"/>
        <polygon points="${cx - w * 0.06},${cy + h * 0.08} ${cx + w * 0.06},${cy + h * 0.08} ${cx},${cy + h * 0.02}" fill="#c84820"/>
      `;
    case "game_museum":
      return `
        <rect x="${x + w * 0.08}" y="${y + h * 0.15}" width="${w * 0.84}" height="${h * 0.75}" fill="#5a6a78" rx="6" stroke="#3a4858" stroke-width="2"/>
        <rect x="${x + w * 0.15}" y="${y + h * 0.22}" width="${w * 0.7}" height="${h * 0.12}" fill="#48b8ff" rx="3"/>
        <text x="${cx}" y="${y + h * 0.32}" text-anchor="middle" font-family="Arial" font-size="${w * 0.12}" font-weight="bold" fill="#fff">MUSEUM</text>
        <circle cx="${x + w * 0.2}" cy="${y + h * 0.55}" r="${w * 0.06}" fill="#ffe566"/>
        <circle cx="${x + w * 0.5}" cy="${y + h * 0.58}" r="${w * 0.06}" fill="#ff88aa"/>
        <circle cx="${x + w * 0.78}" cy="${y + h * 0.52}" r="${w * 0.06}" fill="#88ddff"/>
      `;
    case "legend_hall":
      return `
        <rect x="${cx - w * 0.12}" y="${y + h * 0.2}" width="${w * 0.24}" height="${h * 0.7}" fill="#3a2858" rx="4"/>
        <polygon points="${cx},${y + h * 0.05} ${cx + w * 0.2},${y + h * 0.35} ${cx - w * 0.2},${y + h * 0.35}" fill="#6a40a8"/>
        <polygon points="${cx},${y + h * 0.12} ${cx + w * 0.12},${y + h * 0.32} ${cx - w * 0.12},${y + h * 0.32}" fill="#c080ff" opacity="0.9"/>
        <circle cx="${cx}" cy="${y + h * 0.48}" r="${w * 0.1}" fill="#e8c0ff" opacity="0.85"/>
      `;
    case "honor_gallery":
      return `
        <rect x="${x}" y="${y + h * 0.25}" width="${w}" height="${h * 0.65}" fill="#6a5040" rx="4"/>
        <rect x="${x + w * 0.1}" y="${y + h * 0.35}" width="${w * 0.15}" height="${h * 0.45}" fill="#ffd84a" opacity="0.8"/>
        <rect x="${x + w * 0.32}" y="${y + h * 0.35}" width="${w * 0.15}" height="${h * 0.45}" fill="#c0c0c8" opacity="0.8"/>
        <rect x="${x + w * 0.54}" y="${y + h * 0.35}" width="${w * 0.15}" height="${h * 0.45}" fill="#cd7f32" opacity="0.8"/>
      `;
    case "streak_monument":
      return `
        <rect x="${cx - w * 0.2}" y="${cy}" width="${w * 0.4}" height="${h * 0.85}" fill="#7a7a88" rx="6"/>
        <polygon points="${cx},${y + h * 0.08} ${cx + w * 0.22},${y + h * 0.55} ${cx - w * 0.22},${y + h * 0.55}" fill="#ff9040"/>
        <text x="${cx}" y="${cy + h * 0.35}" text-anchor="middle" font-family="Arial" font-size="${w * 0.2}" font-weight="bold" fill="#fff">10</text>
      `;
    case "season_archive":
      return `
        <rect x="${x + w * 0.1}" y="${y + h * 0.3}" width="${w * 0.8}" height="${h * 0.55}" fill="#5a4030" rx="5" stroke="#3a2818" stroke-width="2"/>
        <rect x="${x + w * 0.2}" y="${y + h * 0.15}" width="${w * 0.6}" height="${h * 0.2}" fill="#8b5a30" rx="3"/>
        <circle cx="${x + w * 0.3}" cy="${y + h * 0.5}" r="${w * 0.08}" fill="#ff6f4f"/>
        <circle cx="${x + w * 0.5}" cy="${y + h * 0.52}" r="${w * 0.08}" fill="#48b8ff"/>
        <circle cx="${x + w * 0.7}" cy="${y + h * 0.48}" r="${w * 0.08}" fill="#7ec850"/>
      `;
    case "rival_hall":
      return `
        <rect x="${x}" y="${y + h * 0.2}" width="${w}" height="${h * 0.7}" fill="#4a5868" rx="4"/>
        <circle cx="${x + w * 0.25}" cy="${cy}" r="${w * 0.12}" fill="#88aacc"/>
        <circle cx="${x + w * 0.5}" cy="${cy - h * 0.05}" r="${w * 0.14}" fill="#ffd84a"/>
        <circle cx="${x + w * 0.75}" cy="${cy}" r="${w * 0.11}" fill="#cc8866"/>
      `;
    case "battle_board":
      return `
        <rect x="${cx - w * 0.35}" y="${cy - h * 0.1}" width="${w * 0.7}" height="${h * 0.75}" fill="#5a4030" rx="4"/>
        <rect x="${cx - w * 0.28}" y="${cy}" width="${w * 0.56}" height="${h * 0.5}" fill="#f0e8d0" rx="2" stroke="#8a7040" stroke-width="2"/>
        <line x1="${cx - w * 0.2}" y1="${cy + h * 0.12}" x2="${cx + w * 0.2}" y2="${cy + h * 0.12}" stroke="#8a7040" stroke-width="2"/>
        <line x1="${cx - w * 0.2}" y1="${cy + h * 0.28}" x2="${cx + w * 0.15}" y2="${cy + h * 0.28}" stroke="#8a7040" stroke-width="2"/>
      `;
    case "visitor_log":
      return `
        <rect x="${x}" y="${y + h * 0.15}" width="${w}" height="${h * 0.75}" fill="#6a6878" rx="3"/>
        <rect x="${x + w * 0.1}" y="${y + h * 0.25}" width="${w * 0.8}" height="${h * 0.55}" fill="#e8e4f0" rx="2"/>
        <circle cx="${x + w * 0.25}" cy="${y + h * 0.42}" r="${w * 0.06}" fill="#88bbff"/>
        <circle cx="${x + w * 0.5}" cy="${y + h * 0.48}" r="${w * 0.06}" fill="#ffaa88"/>
        <circle cx="${x + w * 0.72}" cy="${y + h * 0.4}" r="${w * 0.06}" fill="#a8dd88"/>
      `;
    case "skin_exhibition":
      return `
        <rect x="${x}" y="${y + h * 0.35}" width="${w}" height="${h * 0.55}" fill="#5a4868" rx="4"/>
        <path d="M ${x} ${y + h * 0.38} Q ${cx} ${y + h * 0.2} ${x + w} ${y + h * 0.38} L ${x + w} ${y + h * 0.55} Q ${cx} ${y + h * 0.75} ${x} ${y + h * 0.55} Z" fill="#88ddff" opacity="0.85"/>
        <rect x="${x + w * 0.2}" y="${y + h * 0.45}" width="${w * 0.25}" height="${h * 0.25}" fill="#ff88cc" rx="2"/>
        <rect x="${x + w * 0.55}" y="${y + h * 0.42}" width="${w * 0.25}" height="${h * 0.28}" fill="#ffe566" rx="2"/>
      `;
    default:
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ff00ff" opacity="0.4"/>`;
  }
}

function overlaySvg(W, H, hotspot) {
  const r = rectPx(hotspot, W, H);
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${landmarkBody(hotspot.buildingId, r)}
  </svg>`;
}

fs.mkdirSync(outDir, { recursive: true });
const meta = await sharp(basePath).metadata();
const W = meta.width ?? 1024;
const H = meta.height ?? 1024;

for (const h of HOTSPOTS) {
  const svg = overlaySvg(W, H, h);
  const out = path.join(outDir, `${h.buildingId}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(out);
}

console.log(`Done. ${HOTSPOTS.length} overlays at ${W}x${H}`);
