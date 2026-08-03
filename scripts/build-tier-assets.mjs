// Chroma-key magenta (#FF00FF) backgrounds from generated tier-system UI assets,
// trim, resize, and emit final PNGs into public/assets/portal/3d/ui/.
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = "C:/Users/qiaoq/.cursor/projects/c-selfhome-development-projects-tacticalMonster/assets";
const OUT_DIR = path.resolve(__dirname, "../public/assets/portal/3d/ui");

/** magenta-ness: high when r & b are high and g is low */
function magentaScore(r, g, b) {
  return Math.min(r, b) - g;
}

async function keyOut(srcPath, outPath, { maxWidth = null, maxHeight = null } = {}) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const m = magentaScore(r, g, b);
    if (m >= 150) {
      data[i + 3] = 0;
    } else if (m > 60) {
      // soft edge: fade alpha and pull the magenta fringe toward neutral
      const a = Math.round(255 * (1 - (m - 60) / 90));
      data[i + 3] = Math.min(data[i + 3], a);
      const avg = Math.round((r + g + b) / 3);
      data[i] = Math.round((r + avg) / 2);
      data[i + 2] = Math.round((b + avg) / 2);
    }
  }

  let img = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).trim({ threshold: 10 });

  const trimmed = await img.png().toBuffer();
  let out = sharp(trimmed);
  const meta = await out.metadata();
  if (maxWidth || maxHeight) {
    out = out.resize({
      width: maxWidth ?? undefined,
      height: maxHeight ?? undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  await out.png().toFile(outPath);
  const fin = await sharp(outPath).metadata();
  console.log(
    `${path.basename(outPath)}  ${meta.width}x${meta.height} -> ${fin.width}x${fin.height}`
  );
}

const jobs = [
  ["gen-icon-coin.png", "icon-coin.png", { maxHeight: 128 }],
  ["gen-badge-tier-silver.png", "badge-tier-silver.png", { maxHeight: 256 }],
  ["gen-panel-tier-strip-v2.png", "panel-tier-strip.png", { maxWidth: 1200 }],
  ["gen-icon-trophy.png", "icon-trophy-gold.png", { maxHeight: 128 }],
  ["gen-btn-help.png", "btn-help.png", { maxHeight: 128 }],
  ["gen-btn-leaderboard-gold.png", "btn-leaderboard-gold.png", { maxWidth: 512 }],
  // 段位徽章底图（盾面无数字，段位罗马数字用 CSS 叠加）
  ["gen-badge-bronze.png", "badge-tier-bronze.png", { maxHeight: 256 }],
  ["gen-badge-silver.png", "badge-tier-silver-plain.png", { maxHeight: 256 }],
  ["gen-badge-gold.png", "badge-tier-gold.png", { maxHeight: 256 }],
  ["gen-badge-platinum.png", "badge-tier-platinum.png", { maxHeight: 256 }],
  ["gen-badge-diamond.png", "badge-tier-diamond.png", { maxHeight: 256 }],
  // 压缩模式卡空白底板（绿 / 紫）
  ["gen-panel-solo-compact.png", "panel-solo-compact.png", { maxWidth: 1200 }],
  ["gen-panel-arena-compact.png", "panel-arena-compact.png", { maxWidth: 1200 }],
  // 段位栏 HISTORY 按钮图标（羊皮纸卷轴）
  ["gen-icon-history-scroll.png", "icon-history-scroll.png", { maxHeight: 128 }],
  // 段位栏玩法规则入口（卷轴手册金色圆钮）
  ["gen-btn-rules-scroll.png", "btn-rules-scroll.png", { maxHeight: 128 }],
];

for (const [src, out, opts] of jobs) {
  await keyOut(path.join(SRC_DIR, src), path.join(OUT_DIR, out), opts);
}
console.log("done ->", OUT_DIR);
