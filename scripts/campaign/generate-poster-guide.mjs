#!/usr/bin/env node
/**
 * Generate campaign poster design guide PDF.
 * Usage: node scripts/campaign/generate-poster-guide.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_PATH = path.join(
  ROOT,
  "src/component/lobby/campaign/assets/poster-guide.pdf",
);

const FONT_CANDIDATES = [
  "C:/Windows/Fonts/simhei.ttf",
  "C:/Windows/Fonts/msyh.ttf",
  "C:/Windows/Fonts/simsun.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
];

function findFont() {
  for (const candidate of FONT_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("No CJK font found for PDF generation.");
}

function sectionTitle(doc, title) {
  doc.moveDown(0.4);
  const y = doc.y;
  doc.save();
  doc.rect(50, y, 495, 22).fill("#2563eb");
  doc.fillColor("#ffffff").fontSize(13).text(`  ${title}`, 50, y + 5, { width: 495 });
  doc.restore();
  doc.fillColor("#111111");
  doc.moveDown(1.2);
}

function body(doc, text, opts = {}) {
  doc.fontSize(opts.size ?? 10).text(text, { lineGap: 3, ...opts });
  doc.moveDown(0.2);
}

function bullet(doc, text) {
  doc.fontSize(10).text(`• ${text}`, { indent: 8, lineGap: 3 });
}

function monoBox(doc, title, lines) {
  if (title) {
    doc.fontSize(10).fillColor("#111").text(title, { lineGap: 2 });
    doc.moveDown(0.2);
  }
  const startY = doc.y;
  const lineH = 11;
  const boxH = lines.length * lineH + 14;
  doc.save();
  doc.rect(50, startY, 495, boxH).fill("#f8fafc");
  doc.restore();
  doc.font("Courier").fontSize(8.5).fillColor("#1e293b");
  let y = startY + 8;
  for (const line of lines) {
    doc.text(line, 58, y, { lineBreak: false });
    y += lineH;
  }
  doc.font("CJK").fillColor("#111");
  doc.y = startY + boxH + 8;
}

function build() {
  const fontPath = findFont();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(OUT_PATH);
  doc.pipe(stream);

  doc.registerFont("CJK", fontPath);
  doc.font("CJK");

  doc.fontSize(18).text("活动海报设计指南", { lineGap: 4 });
  doc
    .fontSize(10)
    .fillColor("#555")
    .text("Campaign Landing Poster Guide · 横竖各一张 · tacticalMonster", { lineGap: 2 });
  doc.fillColor("#111").moveDown(0.6);

  sectionTitle(doc, "1. 交付物");
  bullet(doc, "poster-portrait.jpg — 竖屏背景，比例 9:16（如 1080×1920 或 1170×2532）");
  bullet(doc, "poster-landscape.jpg — 横屏背景，比例 16:9（如 1920×1080）");
  bullet(doc, "同一活动、同一视觉主题，两种独立构图（不要只裁一张）");
  body(
    doc,
    "页面对应：竖屏用 bg-mobile，横屏用 bg-desktop；通过 picture + object-fit: cover 全屏铺满。",
  );

  sectionTitle(doc, "2. 页面 UI 占用（必留安全区）");
  monoBox(doc, "竖屏安全区示意（1080×1920 基准）：", [
    "+-----------------------------+",
    "|  顶栏安全区  ~60-120px       |  商家名、登录",
    "|                             |",
    "|      ★ 主视觉安全区 ★        |  角色/产品/主标题",
    "|      （画面中心 60-70%）      |",
    "|                             |",
    "|  底栏安全区  ~200-300px      |  活动栏 150px + 按钮",
    "+-----------------------------+",
    "     左右各约 5-8% 可能被 cover 裁切",
  ]);
  body(doc, "横屏（1920×1080）：顶栏约 80px，底栏约 200px；主体水平居中，可略偏左。");

  sectionTitle(doc, "3. object-fit: cover 裁切规则");
  bullet(doc, "等比放大图片直到铺满视口，多出的部分裁掉，不变形。");
  bullet(doc, "默认 object-position: center — 以图片中心为锚点裁切。");
  bullet(doc, "视口比图片更扁 → 裁左右；视口比图片更高 → 裁上下。");
  bullet(doc, "非标比例（4:3、19.5:9）只是多裁一点边。");
  body(doc, "设计原则：主体放在画面中心安全框内，四边当出血。");

  sectionTitle(doc, "4. 海报上放什么 / 不放什么");
  doc.fontSize(10).text("可放在海报上：", { underline: true });
  doc.moveDown(0.15);
  bullet(doc, "品牌 / 产品 / 角色主视觉");
  bullet(doc, "可选：活动主标题或一句 slogan（须在主视觉区内）");
  doc.moveDown(0.3);
  doc.fontSize(10).text("不要放在海报上（由活动栏 UI 展示）：", { underline: true });
  doc.moveDown(0.15);
  bullet(doc, "活动时间、倒计时、奖励规则、已领 x/y、按钮文案");
  body(doc, "避免与透明底栏白字重复或被遮挡。");

  sectionTitle(doc, "5. 竖屏 vs 横屏构图");
  monoBox(doc, "同一主题，两种构图：", [
    "竖屏 9:16              横屏 16:9",
    "   +---+                +----------------+",
    "   | 脸 |                |  脸 + 场景横向  |",
    "   | 身 |                |                |",
    "   +---+                +----------------+",
  ]);
  bullet(doc, "竖屏：主体纵向居中或略偏上");
  bullet(doc, "横屏：主体横向展开，居中或略偏左");
  bullet(doc, "顶/底 15-20% 做 UI 友好层：略暗、低细节、少纹理");

  doc.addPage();

  sectionTitle(doc, "6. 色彩与可读性");
  bullet(doc, "活动栏为透明底 + 白字 + 深色描边；底区避免纯白/高对比条纹。");
  bullet(doc, "中间主视觉可饱和；上下略压暗便于 UI 阅读。");
  bullet(doc, "导出 sRGB JPG，质量 82-85%，单张建议 < 500KB。");

  sectionTitle(doc, "7. 导出尺寸速查");
  const tableTop = doc.y + 4;
  const cols = [120, 70, 150, 100];
  const headers = ["用途", "比例", "推荐像素", "文件名"];
  doc.fontSize(9);
  let x = 50;
  headers.forEach((h, i) => {
    doc.rect(x, tableTop, cols[i], 18).fillAndStroke("#e5e7eb", "#cbd5e1");
    doc.fillColor("#111").text(h, x + 4, tableTop + 5, { width: cols[i] - 8, lineBreak: false });
    x += cols[i];
  });
  const rows = [
    ["竖屏背景", "9:16", "1080×1920", "bg-mobile"],
    ["横屏背景", "16:9", "1920×1080", "bg-desktop"],
  ];
  rows.forEach((row, ri) => {
    let rx = 50;
    const ry = tableTop + 18 + ri * 18;
    row.forEach((cell, ci) => {
      doc.rect(rx, ry, cols[ci], 18).stroke("#cbd5e1");
      doc.fillColor("#111").text(cell, rx + 4, ry + 5, { width: cols[ci] - 8, lineBreak: false });
      rx += cols[ci];
    });
  });
  doc.y = tableTop + 18 + rows.length * 18 + 12;
  doc.font("CJK");

  sectionTitle(doc, "8. 上线前验收清单");
  [
    "iPhone 竖屏 390×844 — 主体完整、底栏白字清晰",
    "iPhone 横屏 844×390 — 主体未被裁没",
    "平板横屏 1024×768 — 构图正常",
    "横屏宽 < 1000px — 活动栏内容正常",
    "竖横两张风格统一，不是同图硬裁",
  ].forEach((item) => bullet(doc, item));

  sectionTitle(doc, "9. 可选扩展");
  bullet(doc, "商家后台配置 posterPortraitUrl / posterLandscapeUrl");
  bullet(doc, "按活动配置 object-position（如 center 35%）微调裁切焦点");

  doc.moveDown(1);
  doc
    .fontSize(9)
    .fillColor("#777")
    .text(`Generated for tacticalMonster · ${path.relative(ROOT, OUT_PATH).replace(/\\/g, "/")}`);

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => {
      console.log(`Wrote ${OUT_PATH}`);
      resolve(undefined);
    });
    stream.on("error", reject);
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
