/**
 * One-off: writes src/component/lobby/control/assets/nav-button-bg.png
 * Run: node scripts/gen-lobby-nav-button-png.mjs
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../src/component/lobby/control/assets/nav-button-bg.png");

const W = 96;
const H = 40;
const R = 10;

function insideRoundRect(x, y, w, h, r) {
  if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r * r;
  if (x >= w - r && y < r) return (x - (w - r)) ** 2 + (y - r) ** 2 <= r * r;
  if (x < r && y >= h - r) return (x - r) ** 2 + (y - (h - r)) ** 2 <= r * r;
  if (x >= w - r && y >= h - r) return (x - (w - r)) ** 2 + (y - (h - r)) ** 2 <= r * r;
  return x >= 0 && x < w && y >= 0 && y < h;
}

const pr = 106;
const pg = 90;
const pb = 205;

const rgba = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (insideRoundRect(x, y, W, H, R)) {
      rgba[i] = pr;
      rgba[i + 1] = pg;
      rgba[i + 2] = pb;
      rgba[i + 3] = 255;
    } else {
      rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0;
    }
  }
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const raw = Buffer.alloc(H * (1 + W * 4));
let o = 0;
for (let y = 0; y < H; y++) {
  raw[o++] = 0;
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    raw[o++] = rgba[i];
    raw[o++] = rgba[i + 1];
    raw[o++] = rgba[i + 2];
    raw[o++] = rgba[i + 3];
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, png);
console.log("wrote", outPath);
