/**
 * 把透明底 logo cutout 打包成 Portal 3D hero 资产：
 * - public/assets/portal/3d/logos/<name>-hero.svg（solitaire hero-title.svg 同款结构与投影滤镜）
 * - public/assets/portal/3d/logos/<name>-hero.png（高清透明底备份）
 *
 *   node scripts/build-hero-logo.mjs <cutout.png> <name>
 *   e.g. node scripts/build-hero-logo.mjs public/assets/portal/match3/match_master_hero_cutout.png match_3
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CUTOUT = process.argv[2];
const NAME = process.argv[3];

if (!CUTOUT || !NAME) {
  console.error("usage: node scripts/build-hero-logo.mjs <cutout.png> <name>");
  process.exit(1);
}

const OUT_DIR = "public/assets/portal/3d/logos";

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pngBuf = await sharp(CUTOUT).png().toBuffer();
  const meta = await sharp(pngBuf).metadata();
  const pngW = meta.width;
  const pngH = meta.height;

  const outPng = path.join(OUT_DIR, `${NAME}-hero.png`);
  await sharp(pngBuf).png().toFile(outPng);
  console.log(`${NAME} hero logo PNG -> ${outPng} (${pngW}x${pngH})`);

  const svgW = pngW + 8;
  const svgH = pngH + 8;
  const scaleX = (1 / pngW).toFixed(9);
  const scaleY = (1 / pngH).toFixed(9);
  const base64Png = pngBuf.toString("base64");

  const svgContent = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g filter="url(#filter0_d_${NAME})">
<rect x="4" width="${pngW}" height="${pngH}" fill="url(#pattern0_${NAME})"/>
</g>
<defs>
<filter id="filter0_d_${NAME}" x="0" y="0" width="${svgW}" height="${svgH}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_${NAME}"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_${NAME}" result="shape"/>
</filter>
<pattern id="pattern0_${NAME}" patternContentUnits="objectBoundingBox" width="1" height="1">
<use xlink:href="#image0_${NAME}" transform="scale(${scaleX} ${scaleY})"/>
</pattern>
<image id="image0_${NAME}" width="${pngW}" height="${pngH}" preserveAspectRatio="none" xlink:href="data:image/png;base64,${base64Png}"/>
</defs>
</svg>
`;

  const outSvg = path.join(OUT_DIR, `${NAME}-hero.svg`);
  fs.writeFileSync(outSvg, svgContent, "utf8");
  console.log(`${NAME} hero logo SVG -> ${outSvg} (${svgW}x${svgH})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
