/**
 * Hero logo 抠图：支持白底和绿底（Chroma-key）双模式
 *
 *   node scripts/refine-hero-cutout.mjs [src] [out]
 */
import sharp from "sharp";

const SRC = process.argv[2] ?? "public/assets/portal/yatz/yatz_hero_source.png";
const OUT = process.argv[3] ?? "public/assets/portal/yatz/yatz_hero_cutout.png";

function detectBackgroundMode(data, width, height) {
  // 采样四个角
  const corners = [
    0,
    width - 1,
    (height - 1) * width,
    height * width - 1
  ];
  let greenCount = 0;
  let whiteCount = 0;

  for (const p of corners) {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (g > 120 && g - r > 50 && g - b > 50) {
      greenCount++;
    } else if (r > 200 && g > 200 && b > 200) {
      whiteCount++;
    }
  }

  if (greenCount >= 2) return "green";
  return "white";
}

function isWhiteBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min > 225 && max - min <= 12;
}

function isGreenBackground(r, g, b) {
  return g > 120 && g - r > 50 && g - b > 50;
}

/** 绿幕去色（De-spill）：消除边缘残留的绿光/绿边 */
function despillGreen(data, width, height) {
  const n = width * height;
  const opaque = new Uint8Array(n);
  for (let p = 0; p < n; p++) opaque[p] = data[p * 4 + 3] > 0 ? 1 : 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!opaque[p]) continue;

      // 检查是否靠近边缘
      let nearEdge = false;
      for (let dy = -2; dy <= 2 && !nearEdge; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            nearEdge = true;
            break;
          }
          if (!opaque[ny * width + nx]) {
            nearEdge = true;
            break;
          }
        }
      }

      if (nearEdge) {
        const i = p * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // 如果绿色通道明显偏高，将其压低到红蓝通道的平均值，消除绿边
        const avgRB = (r + b) / 2;
        if (g > avgRB) {
          data[i + 1] = Math.round(avgRB);
        }
      }
    }
  }
}

function featherEdges(data, width, height) {
  const n = width * height;
  const alphaCopy = new Uint8Array(n);
  for (let p = 0; p < n; p++) alphaCopy[p] = data[p * 4 + 3];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (alphaCopy[p] === 0) continue;

      let transparentNeighbors = 0;
      for (const dp of [
        -1,
        1,
        -width,
        width,
        -width - 1,
        -width + 1,
        width - 1,
        width + 1,
      ]) {
        if (alphaCopy[p + dp] === 0) transparentNeighbors++;
      }
      if (transparentNeighbors > 0) {
        data[p * 4 + 3] = Math.round(255 * (1 - transparentNeighbors / 10));
      }
    }
  }
}

/** 去掉骰子下方落地阴影，避免与背景交界横线 */
function stripBottomContactShadow(data, width, height) {
  let lastWhiteY = 0;
  for (let y = 0; y < height; y++) {
    let pureWhite = 0;
    let opaque = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!data[i + 3]) continue;
      opaque++;
      if (Math.min(data[i], data[i + 1], data[i + 2]) > 238) pureWhite++;
    }
    if (pureWhite >= 10 && opaque >= 80) lastWhiteY = y;
  }

  const cutoff = lastWhiteY + 6;
  for (let y = cutoff; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[(y * width + x) * 4 + 3] = 0;
    }
  }
}

async function main() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const mode = detectBackgroundMode(data, width, height);
  console.log(`detected background mode: ${mode}`);

  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x++) {
    queue.push(x, x + (height - 1) * width);
  }
  for (let y = 0; y < height; y++) {
    queue.push(y * width, y * width + width - 1);
  }

  // 种子扩展：如果是绿幕模式，将所有“严格绿幕背景色”像素也加入队列，以便洪水填充能流入封闭的内部孔洞
  if (mode === "green") {
    for (let p = 0; p < width * height; p++) {
      const i = p * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r < 45 && g > 210 && b < 45) {
        queue.push(p);
      }
    }
  }

  while (queue.length) {
    const p = queue.pop();
    if (visited[p]) continue;
    const i = p * 4;
    
    const isBg = mode === "green" 
      ? isGreenBackground(data[i], data[i + 1], data[i + 2])
      : isWhiteBackground(data[i], data[i + 1], data[i + 2]);

    if (!isBg) continue;
    visited[p] = 1;

    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) queue.push(p - 1);
    if (x < width - 1) queue.push(p + 1);
    if (y > 0) queue.push(p - width);
    if (y < height - 1) queue.push(p + width);
  }

  for (let p = 0; p < width * height; p++) {
    if (visited[p]) data[p * 4 + 3] = 0;
  }

  if (mode === "green") {
    despillGreen(data, width, height);
  }

  featherEdges(data, width, height);
  stripBottomContactShadow(data, width, height);

  await sharp(data, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 2 })
    .png()
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log(`refined cutout -> ${OUT} (${meta.width}x${meta.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
