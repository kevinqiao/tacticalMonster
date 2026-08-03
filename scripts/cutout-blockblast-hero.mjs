/**
 * 从生成的白底 Logo 图中抠出透明底 Logo：
 * - 使用从图像边缘开始的洪水填充（flood fill），只移除与边缘连通的白色背景，
 *   完整保留 Logo 内部的乳白色橡胶底座
 * - 对边缘做羽化，避免锯齿
 *
 *   node scripts/cutout-blockblast-hero.mjs [src] [out]
 */
import sharp from "sharp";

const SRC = process.argv[2] ?? "public/assets/portal/blockblast/blockblast_hero_source.png";
const OUT = process.argv[3] ?? "public/assets/portal/blockblast/blockblast_hero_cutout.png";

// 背景为纯白/浅灰的中性色：r≈g≈b 且很亮
function isBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min > 225 && max - min <= 12;
}

async function main() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const visited = new Uint8Array(width * height);
  const queue = [];

  // 从四条边所有背景像素开始洪水填充
  for (let x = 0; x < width; x++) {
    queue.push(x, x + (height - 1) * width);
  }
  for (let y = 0; y < height; y++) {
    queue.push(y * width, y * width + width - 1);
  }

  while (queue.length) {
    const p = queue.pop();
    if (visited[p]) continue;
    const i = p * 4;
    if (!isBackground(data[i], data[i + 1], data[i + 2])) continue;
    visited[p] = 1;

    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) queue.push(p - 1);
    if (x < width - 1) queue.push(p + 1);
    if (y > 0) queue.push(p - width);
    if (y < height - 1) queue.push(p + width);
  }

  // 把背景像素设为透明
  for (let p = 0; p < width * height; p++) {
    if (visited[p]) data[p * 4 + 3] = 0;
  }

  // 边缘羽化：与透明背景相邻的前景像素，按邻域透明数量降低 alpha
  const alphaCopy = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) alphaCopy[p] = data[p * 4 + 3];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (alphaCopy[p] === 0) continue;
      let transparentNeighbors = 0;
      for (const dp of [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1]) {
        if (alphaCopy[p + dp] === 0) transparentNeighbors++;
      }
      if (transparentNeighbors > 0) {
        data[p * 4 + 3] = Math.round(255 * (1 - transparentNeighbors / 10));
      }
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 2 })
    .png()
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log(`cutout -> ${OUT} (${meta.width}x${meta.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
