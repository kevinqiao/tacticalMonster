/**
 * 基于 casual_village_s1_base 母图，导出 Pass 四档完整效果图（与 TownIllustrationMap CSS 一致）
 * 运行: node scripts/render-casual-village-pass-tiers.mjs
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const illusDir = path.join(
  root,
  "src/component/lobby/casual/view/town/assets/illustration"
);
const input = path.join(illusDir, "casual_village_s1_base.png.png");

const W = 1376;
const H = 944;

const TIERS = [
  {
    id: "env",
    file: "casual_village_s1_pass_env.png",
    passLabel: "Pass Lv.1 · 环境层 env",
    bp: "env",
    fx: [],
  },
  {
    id: "accent",
    file: "casual_village_s1_pass_accent.png",
    passLabel: "Pass Lv.10 · 点缀层 accent（含 env）",
    bp: "accent",
    fx: ["accent"],
  },
  {
    id: "facade",
    file: "casual_village_s1_pass_facade.png",
    passLabel: "Pass Lv.25 · 外墙层 facade（含 env+accent）",
    bp: "facade",
    fx: ["accent", "facade"],
  },
  {
    id: "full",
    file: "casual_village_s1_pass_full.png",
    passLabel: "Pass Lv.40 · 完整层 full（四档全开）",
    bp: "full",
    fx: ["accent", "facade", "full"],
  },
];

/** s1-midnight-sky · standard（与 townIllustrationTheme.ts 一致） */
const SKY = {
  env: [
    [0, "#6a9ec8"],
    [0.38, "#94bdd8"],
    [0.72, "#a8c890"],
    [1, "#5a9438"],
  ],
  accent: [
    [0, "#4db8ff"],
    [0.22, "#8ad0ff"],
    [0.52, "#ffe680"],
    [0.82, "#9ad85a"],
    [1, "#4a9e28"],
  ],
  facade: [
    [0, "#3898e8"],
    [0.25, "#70c0f8"],
    [0.55, "#ffc860"],
    [0.85, "#78c848"],
    [1, "#3d8820"],
  ],
  full: [
    [0, "#281858"],
    [0.25, "#e85038"],
    [0.48, "#f0c030"],
    [0.78, "#78b838"],
    [1, "#306818"],
  ],
};

const GROUND_ALPHA = {
  env: 0.2,
  accent: 0.28,
  facade: 0.22,
  full: 0.38,
};

const BASE_FILTER = {
  env: { saturation: 0.88, brightness: 0.94 },
  accent: { saturation: 1.12, brightness: 1.06 },
  facade: { saturation: 1.22, brightness: 1.08 },
  full: { saturation: 1.42, brightness: 1.14 },
};

function linearGradientSvg(w, h, stops, id) {
  const stopEls = stops
    .map(([offset, color]) => `<stop offset="${offset * 100}%" stop-color="${color}"/>`)
    .join("");
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stopEls}</linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#${id})"/>
  </svg>`;
}

function groundSvg(w, h, layer) {
  const a = GROUND_ALPHA[layer];
  const boost = 1;
  let inner;
  if (layer === "accent") {
    inner = `rgba(255, 200, 60, ${a * boost})`;
  } else if (layer === "facade") {
    inner = `rgba(80, 180, 255, ${a * boost})`;
  } else if (layer === "full") {
    inner = `rgba(255, 140, 40, ${a * boost})`;
  } else {
    inner = `rgba(70, 130, 45, ${a * boost})`;
  }
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="50%" cy="88%" rx="95%" ry="75%">
        <stop offset="0%" stop-color="${inner}"/>
        <stop offset="68%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
}

function accentFxSvg(w, h) {
  const bulbs = [9, 19, 29, 39, 50, 61, 71, 81, 91]
    .map(
      (x, i) =>
        `<ellipse cx="${(x / 100) * w}" cy="${(i % 2 === 0 ? 14.5 : 13) / 100 * h}" rx="5" ry="7" fill="#ffe566" opacity="0.85"/>`
    )
    .join("");
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,210,90,0.22)"/>
        <stop offset="32%" stop-color="rgba(255,210,90,0)"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#a1)" style="mix-blend-mode:screen"/>
    <line x1="${0.06 * w}" y1="${0.115 * h}" x2="${0.94 * w}" y2="${0.115 * h}"
      stroke="rgba(70,45,20,0.55)" stroke-width="2"/>
    ${bulbs}
  </svg>`;
}

function facadeFxSvg(w, h) {
  const cx = w / 2;
  const cy = h * 0.53;
  const rx = w * 0.42;
  const ry = h * 0.27;
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="f1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(60,140,255,0.42)"/>
        <stop offset="38%" stop-color="rgba(60,140,255,0)"/>
        <stop offset="52%" stop-color="rgba(255,150,70,0)"/>
        <stop offset="100%" stop-color="rgba(255,150,70,0.38)"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#f1)" opacity="0.95"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none"
      stroke="rgba(120,200,255,0.55)" stroke-width="2" stroke-dasharray="12 8"/>
  </svg>`;
}

function fullFxSvg(w, h) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="r1" cx="50%" cy="40%" rx="70%" ry="50%">
        <stop offset="0%" stop-color="rgba(255,220,100,0.55)"/>
        <stop offset="65%" stop-color="transparent"/>
      </radialGradient>
      <radialGradient id="r2" cx="50%" cy="100%" rx="100%" ry="90%">
        <stop offset="0%" stop-color="rgba(60,20,100,0.55)"/>
        <stop offset="55%" stop-color="transparent"/>
      </radialGradient>
      <linearGradient id="r3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(120,60,200,0.2)"/>
        <stop offset="30%" stop-color="transparent"/>
        <stop offset="100%" stop-color="rgba(255,160,40,0.25)"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#r1)"/>
    <rect width="100%" height="100%" fill="url(#r2)"/>
    <rect width="100%" height="100%" fill="url(#r3)"/>
    <text x="50%" y="12%" text-anchor="middle" font-size="28" letter-spacing="24"
      fill="rgba(255,245,200,0.9)" font-family="serif">✦ ✦ ✦</text>
  </svg>`;
}

function titleBadgeSvg(w, label, tierId) {
  const colors = {
    env: { bg: "rgba(0,0,0,0.65)", border: "rgba(200,210,220,0.8)" },
    accent: { bg: "rgba(180,120,20,0.85)", border: "#ffe566" },
    facade: { bg: "rgba(30,100,180,0.85)", border: "#8ad4ff" },
    full: { bg: "rgba(200,72,32,0.9)", border: "#ffd84a" },
  };
  const c = colors[tierId];
  return `<svg width="${w}" height="80" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="12" width="${label.length * 18 + 40}" height="52" rx="10"
      fill="${c.bg}" stroke="${c.border}" stroke-width="2"/>
    <text x="36" y="46" font-family="Microsoft YaHei, sans-serif" font-size="22"
      font-weight="700" fill="#fff">${label}</text>
  </svg>`;
}

const FX_BLEND = {
  accent: "screen",
  facade: "overlay",
  full: "overlay",
};

async function svgToPng(svg, w, h) {
  return sharp(Buffer.from(svg)).resize(w, h).png().toBuffer();
}

async function applyBaseFilter(buf, layer) {
  const f = BASE_FILTER[layer];
  return sharp(buf)
    .modulate({ brightness: f.brightness, saturation: f.saturation })
    .png()
    .toBuffer();
}

async function renderTier(tier) {
  const skyBuf = await svgToPng(linearGradientSvg(W, H, SKY[tier.bp], `sky-${tier.id}`), W, H);
  const baseRaw = await sharp(input).resize(W, H, { fit: "cover" }).png().toBuffer();
  const baseFiltered = await applyBaseFilter(baseRaw, tier.bp);

  const composites = [{ input: baseFiltered, top: 0, left: 0 }];

  for (const fx of tier.fx) {
    let fxSvg;
    if (fx === "accent") fxSvg = accentFxSvg(W, H);
    else if (fx === "facade") fxSvg = facadeFxSvg(W, H);
    else fxSvg = fullFxSvg(W, H);
    const fxBuf = await svgToPng(fxSvg, W, H);
    composites.push({ input: fxBuf, top: 0, left: 0, blend: FX_BLEND[fx] });
  }

  const groundBuf = await svgToPng(groundSvg(W, H, tier.bp), W, H);
  composites.push({ input: groundBuf, top: 0, left: 0, blend: "over" });

  const badgeBuf = await sharp(Buffer.from(titleBadgeSvg(W, tier.passLabel, tier.id)))
    .png()
    .toBuffer();
  composites.push({ input: badgeBuf, top: 0, left: 0 });

  const outPath = path.join(illusDir, tier.file);
  await sharp(skyBuf).composite(composites).png().toFile(outPath);
  console.log(outPath);
}

for (const tier of TIERS) {
  await renderTier(tier);
}

console.log("Done: 4 Pass tier previews (1376×944)");
