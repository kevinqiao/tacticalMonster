import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const mockup = process.argv[2] ?? "public/assets/solitaire_main.png";

/** 效果图中央 UI 列（不含左右风景）— 1536×1024 */
export const UI_FRAME = {
  left: 468,
  top: 0,
  width: 600,
  height: 1024,
};

/**
 * 相对 UI_FRAME 的 UI 元素切片（不含全屏背景）。
 * 坐标由 ui_frame 颜色/区域检测校准 — 运行 probe 可在 scripts/slice-calibration/ 预览。
 */
export const SLICES = {
  btn_shop_gold_3d: { x: 2, y: 32, w: 168, h: 50 },
  solitaire_fanning_cards: { x: 108, y: 14, w: 384, h: 94 },
  solitaire_header_title: { x: 20, y: 105, w: 558, h: 95 },
  icon_target_3d: { x: 52, y: 352, w: 120, h: 76 },
  icon_swords_3d: { x: 356, y: 348, w: 88, h: 88 },
  btn_challenge_green_3d: { x: 48, y: 450, w: 232, h: 36 },
  btn_compete_pink_3d: { x: 318, y: 462, w: 236, h: 34 },
  bg_history_parchment_3d: { x: 10, y: 655, w: 580, h: 335 },
};

function toAbs(box) {
  return {
    left: UI_FRAME.left + box.x,
    top: UI_FRAME.top + box.y,
    width: box.w,
    height: box.h,
  };
}

async function writeSlices(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const [name, box] of Object.entries(SLICES)) {
    const region = toAbs(box);
    await sharp(mockup).extract(region).png().toFile(path.join(targetDir, `${name}.png`));
    console.log(`  ${name}.png  @ ${region.left},${region.top}  ${region.width}x${region.height}`);
  }
}

async function writeProbes() {
  const outDir = "scripts/slice-calibration";
  fs.mkdirSync(outDir, { recursive: true });
  await sharp(mockup).extract(UI_FRAME).png().toFile(path.join(outDir, "ui_frame.png"));
  console.log("ui_frame -> scripts/slice-calibration/ui_frame.png");
  for (const [name, box] of Object.entries(SLICES)) {
    const region = toAbs(box);
    await sharp(mockup).extract(region).png().toFile(path.join(outDir, `probe_${name}.png`));
  }
}

const mode = process.argv[3] ?? "probe";
if (mode === "write") {
  const targets = process.argv[4]
    ? [process.argv[4]]
    : ["scripts/slice-calibration"];
  for (const dir of targets) {
    console.log("\n->", dir);
    await writeSlices(dir);
  }
} else if (mode === "write-all") {
  console.warn("write-all 仅写入 scripts/slice-calibration（勿把合成图切片用于线上 UI）");
  await writeSlices("scripts/slice-calibration");
} else {
  await writeProbes();
}
