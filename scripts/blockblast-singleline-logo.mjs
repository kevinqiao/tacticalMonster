/**
 * BLOCK BLAST 单行 hero logo。
 *
 * 源图 blockblast_hero_source.png 由 AI 以 solitaire hero-title.png 为风格参考生成
 * （相同的黄金泡泡 3D 字 + 乳白橡胶底座 + 糖果 3D 方块），
 * 经 scripts/cutout-blockblast-hero.mjs 洪水填充抠图得到透明底 cutout。
 */
import sharp from "sharp";

const CUTOUT = "public/assets/portal/blockblast/blockblast_hero_cutout.png";

/**
 * 返回透明底单行 logo 的 PNG buffer。
 * @returns {Promise<Buffer>}
 */
export async function buildSinglelineLogo() {
  return sharp(CUTOUT).png().toBuffer();
}

/**
 * 生成与 solitaire hero-title.svg 相同结构的 SVG 包装
 * （相同的 feDropShadow 滤镜参数：dy=4, blur stdDeviation=2, opacity=0.25）。
 * @returns {Promise<string>}
 */
export async function getVectorLogoSVG() {
  const pngBuf = await buildSinglelineLogo();
  const meta = await sharp(pngBuf).metadata();
  const pngW = meta.width ?? 1507;
  const pngH = meta.height ?? 648;

  const svgW = pngW + 8;
  const svgH = pngH + 8;
  const scaleX = (1 / pngW).toFixed(9);
  const scaleY = (1 / pngH).toFixed(9);
  const base64Png = pngBuf.toString("base64");

  return `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g filter="url(#filter0_d_blockblast)">
<rect x="4" width="${pngW}" height="${pngH}" fill="url(#pattern0_blockblast)" shape-rendering="crispEdges"/>
</g>
<defs>
<filter id="filter0_d_blockblast" x="0" y="0" width="${svgW}" height="${svgH}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_blockblast"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_blockblast" result="shape"/>
</filter>
<pattern id="pattern0_blockblast" patternContentUnits="objectBoundingBox" width="1" height="1">
<use xlink:href="#image0_blockblast" transform="scale(${scaleX} ${scaleY})"/>
</pattern>
<image id="image0_blockblast" width="${pngW}" height="${pngH}" preserveAspectRatio="none" xlink:href="data:image/png;base64,${base64Png}"/>
</defs>
</svg>
`;
}

/**
 * 源图已自带渲染光影，无需再烘焙投影。
 * @param {Buffer} imgBuf
 * @returns {Promise<Buffer>}
 */
export async function applyDropShadow(imgBuf) {
  return imgBuf;
}
