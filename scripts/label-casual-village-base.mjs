/**
 * 在 casual_village_s1_base 母图上标注 12 个建筑中文名（校准参考图）
 * 运行: node scripts/label-casual-village-base.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const input = path.join(
  root,
  "src/component/lobby/casual/view/town/assets/illustration/casual_village_s1_base.png.png"
);
const output = path.join(
  root,
  "src/component/lobby/casual/view/town/assets/illustration/casual_village_s1_base_labeled.png"
);

/**
 * ax/ay = 建筑锚点（热区中心，0–1）
 * lx/ly = 文字标签位置（0–1），用引出线连到锚点
 */
const LABELS = [
  { id: "season_archive", name: "赛季档案室", ax: 0.14, ay: 0.26, lx: 0.12, ly: 0.07 },
  { id: "champion_plaza", name: "冠军广场", ax: 0.5, ay: 0.28, lx: 0.5, ly: 0.09 },
  { id: "legend_hall", name: "传奇殿堂", ax: 0.88, ay: 0.15, lx: 0.86, ly: 0.05 },
  { id: "honor_gallery", name: "荣誉长廊", ax: 0.74, ay: 0.3, lx: 0.8, ly: 0.11 },
  { id: "battle_board", name: "赛事公告板", ax: 0.5, ay: 0.44, lx: 0.64, ly: 0.36 },
  { id: "town_square", name: "Town广场", ax: 0.48, ay: 0.52, lx: 0.34, ly: 0.5 },
  { id: "rival_hall", name: "对手名人堂", ax: 0.36, ay: 0.4, lx: 0.24, ly: 0.3 },
  { id: "game_museum", name: "游戏博物馆", ax: 0.15, ay: 0.52, lx: 0.06, ly: 0.4 },
  { id: "visitor_log", name: "访客留言墙", ax: 0.92, ay: 0.5, lx: 0.96, ly: 0.34, offMap: true },
  { id: "skin_exhibition", name: "皮肤展览馆", ax: 0.47, ay: 0.74, lx: 0.32, ly: 0.7 },
  { id: "streak_monument", name: "连胜纪念碑", ax: 0.22, ay: 0.8, lx: 0.08, ly: 0.74 },
  { id: "arena", name: "竞技场", ax: 0.84, ay: 0.76, lx: 0.92, ly: 0.64 },
];

const meta = await sharp(input).metadata();
const w = meta.width ?? 1024;
const h = meta.height ?? 1024;
const fontSize = Math.max(17, Math.round(w / 56));
const subSize = Math.max(11, Math.round(fontSize * 0.62));

function pct(x, y) {
  return { x: Math.round(x * w), y: Math.round(y * h) };
}

const labelBlocks = LABELS.map((l) => {
  const anchor = pct(l.ax, l.ay);
  const label = pct(l.lx, l.ly);
  const padX = 8;
  const padY = 5;
  const boxW = l.name.length * fontSize * 0.9 + padX * 2;
  const boxH = fontSize + subSize + padY * 2 + 4;
  const rx = label.x - boxW / 2;
  const ry = label.y - boxH / 2;
  const stroke = l.offMap ? "#ff9f43" : "#ffd84a";
  const textY = ry + padY + fontSize * 0.85;
  const subY = textY + subSize + 2;
  const lineEndY = ry + boxH;

  return `
  <g>
    <line x1="${label.x}" y1="${lineEndY}" x2="${anchor.x}" y2="${anchor.y}"
      stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
    <circle cx="${anchor.x}" cy="${anchor.y}" r="7" fill="${stroke}" stroke="#1a1208" stroke-width="1.5"/>
    <circle cx="${anchor.x}" cy="${anchor.y}" r="3" fill="#fff"/>
    <rect x="${rx}" y="${ry}" width="${boxW}" height="${boxH}" rx="7"
      fill="rgba(0,0,0,0.78)" stroke="${stroke}" stroke-width="2"
      ${l.offMap ? 'stroke-dasharray="7 4"' : ""}/>
    <text x="${label.x}" y="${textY}" text-anchor="middle"
      font-family="Microsoft YaHei, SimHei, PingFang SC, sans-serif"
      font-size="${fontSize}" font-weight="700" fill="#fff">${l.name}</text>
    <text x="${label.x}" y="${subY}" text-anchor="middle"
      font-family="Consolas, monospace" font-size="${subSize}" fill="#ccc">${l.id}</text>
  </g>`;
}).join("");

const titleSize = Math.round(w / 36);
const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${w}" height="52" fill="rgba(0,0,0,0.55)"/>
  <text x="${w / 2}" y="34" text-anchor="middle"
    font-family="Microsoft YaHei, sans-serif" font-size="${titleSize}" font-weight="700"
    fill="#ffe566">CasualTown S1 · 12 建筑名称标注</text>
  ${labelBlocks}
</svg>`;

await sharp(input)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png()
  .toFile(output);

console.log(`已生成: ${output} (${w}×${h})`);
