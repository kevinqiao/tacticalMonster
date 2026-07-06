/**
 * 从 blockblast_main_2.png 精准提取 3D 橡胶乳白底座文字和糖果 3D 宝石，
 * 采用与 solitaire 相同的 SVG 动态投影滤镜，生成 Portal 3D hero logo。
 *
 *   node scripts/slice-blockblast-logo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getVectorLogoSVG, buildSinglelineLogo, applyDropShadow } from "./blockblast-singleline-logo.mjs";

const OUT_DIR = "public/assets/portal/3d/logos";
const OUT_PNG = path.join(OUT_DIR, "block_blast-hero.png");
const OUT_SVG = path.join(OUT_DIR, "block_blast-hero.svg");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. 生成并写入采用 solitaire SVG 相同样式与滤镜的 SVG
  const svgContent = await getVectorLogoSVG();
  fs.writeFileSync(OUT_SVG, svgContent, "utf8");
  console.log(`block_blast hero logo SVG (with dynamic SVG drop shadow) -> ${OUT_SVG}`);

  // 2. 生成紧凑的无阴影 PNG 并应用烘焙投影作为 fallback PNG
  const tightBuf = await buildSinglelineLogo();
  const shadowBuf = await applyDropShadow(tightBuf);
  await sharp(shadowBuf).png().toFile(OUT_PNG);
  const pngMeta = await sharp(OUT_PNG).metadata();
  console.log(`block_blast hero logo PNG (with baked drop shadow) -> ${OUT_PNG} (${pngMeta.width}x${pngMeta.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
