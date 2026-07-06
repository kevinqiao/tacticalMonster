/**
 * 基于 blockblast_main_2.png 生成完整效果图：
 * - 用逐行采样的天空色整块填充旧 logo 区域（带羽化边缘），彻底清除旧 logo
 * - 顶部叠加新的单行 BLOCK BLAST hero logo（AI 参考 solitaire 风格生成）
 *
 *   node scripts/compose-blockblast-mockup.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { buildSinglelineLogo } from "./blockblast-singleline-logo.mjs";

const SRC = "public/assets/portal/blockblast/blockblast_main_2.png";
const OUT = "public/assets/portal/blockblast/blockblast_main_2_singleline.png";

const PAGE = { width: 1536, height: 1024 };

// 旧 logo 完整覆盖区（含文字两行 + 糖果方块）
const CORE = { x0: 405, x1: 1132, y0: 0, y1: 305 };
// 羽化带宽度
const FEATHER = 32;
// 每行天空取样列（紧贴清除区左侧的干净天空）
const SAMPLE = { x0: 340, x1: 396 };

async function clearOldLogo() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const out = Buffer.from(data);

  const yEnd = Math.min(CORE.y1 + FEATHER, height - 1);
  const xStart = Math.max(CORE.x0 - FEATHER, 0);
  const xEnd = Math.min(CORE.x1 + FEATHER, width - 1);

  for (let y = 0; y <= yEnd; y++) {
    // 每行取样天空平均色
    let r = 0, g = 0, b = 0, n = 0;
    for (let sx = SAMPLE.x0; sx <= SAMPLE.x1; sx++) {
      const j = (y * width + sx) * 4;
      r += data[j];
      g += data[j + 1];
      b += data[j + 2];
      n++;
    }
    r /= n; g /= n; b /= n;

    for (let x = xStart; x <= xEnd; x++) {
      // 权重：核心区完全替换，羽化带线性过渡
      let w = 1;
      if (x < CORE.x0) w = Math.min(w, (x - xStart) / FEATHER);
      if (x > CORE.x1) w = Math.min(w, (xEnd - x) / FEATHER);
      if (y > CORE.y1) w = Math.min(w, (yEnd - y) / FEATHER);
      if (w <= 0) continue;

      const i = (y * width + x) * 4;
      out[i] = Math.round(data[i] * (1 - w) + r * w);
      out[i + 1] = Math.round(data[i + 1] * (1 - w) + g * w);
      out[i + 2] = Math.round(data[i + 2] * (1 - w) + b * w);
      out[i + 3] = 255;
    }
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const [baseBuf, logoBuf] = await Promise.all([clearOldLogo(), buildSinglelineLogo()]);

  const logoMeta = await sharp(logoBuf).metadata();
  const lw = logoMeta.width ?? 1507;
  const lh = logoMeta.height ?? 648;

  // 与原 logo 视觉分量匹配的宽度
  const targetW = 640;
  const scale = targetW / lw;
  const logoW = Math.round(lw * scale);
  const logoH = Math.round(lh * scale);
  const logoLeft = Math.round((PAGE.width - logoW) / 2);
  const logoTop = 14;

  const logoScaled = await sharp(logoBuf)
    .resize(logoW, logoH, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  await sharp(baseBuf)
    .composite([{ input: logoScaled, left: logoLeft, top: logoTop }])
    .png()
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log(`blockblast full mockup -> ${OUT} (${meta.width}x${meta.height})`);
  console.log(`logo placed at (${logoLeft}, ${logoTop}) size ${logoW}x${logoH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
