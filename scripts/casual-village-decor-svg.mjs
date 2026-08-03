/** 村景 Pass 装饰物 — 精细 SVG 绘制（供 render / 编辑器参考） */

export function decorDefs() {
  return `
  <defs>
    <filter id="glowWarm" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowSoft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="poleWood" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4a3018"/>
      <stop offset="45%" stop-color="#8f6535"/>
      <stop offset="100%" stop-color="#4a3018"/>
    </linearGradient>
    <linearGradient id="bannerSheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="winWarm" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8d8"/>
      <stop offset="100%" stop-color="#ffb84a"/>
    </linearGradient>
    <linearGradient id="lanternGlass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff9c8"/>
      <stop offset="100%" stop-color="#ffc040"/>
    </linearGradient>
  </defs>`;
}

/** 卡通旗帜：杆 + 飘动旗面 + 顶饰 + 底座 */
export function flagMarkup(w, h, f) {
  const px = f.x * w;
  const yb = f.yBase * h;
  const yt = f.yTop * h;
  const poleH = yb - yt;
  const fw = w * 0.065;
  const fh = poleH * 0.55;
  const wave = fw * 0.12;
  const finialR = Math.max(4, w * 0.008);
  const baseW = w * 0.022;
  const fill = f.fill || "#ff6f4f";
  const stroke = f.stroke || "#cc5040";
  const dark = shadeColor(fill, -0.25);

  return `
  <g>
    <ellipse cx="${px}" cy="${yb + h * 0.008}" rx="${baseW}" ry="${h * 0.006}" fill="#6a6a72" stroke="#4a4a52" stroke-width="1"/>
    <ellipse cx="${px}" cy="${yb + h * 0.005}" rx="${baseW * 0.7}" ry="${h * 0.004}" fill="#8a8a94"/>
    <rect x="${px - w * 0.004}" y="${yt}" width="${w * 0.008}" height="${poleH}" fill="url(#poleWood)" rx="1"/>
    <circle cx="${px}" cy="${yt - finialR * 0.3}" r="${finialR}" fill="#ffd84a" stroke="#c9a020" stroke-width="1"/>
    <circle cx="${px}" cy="${yt - finialR * 0.3}" r="${finialR * 0.45}" fill="#fff6c8" opacity="0.7"/>
    <path d="M ${px} ${yt + fh * 0.15}
      C ${px + fw * 0.35} ${yt + fh * 0.05}, ${px + fw + wave} ${yt + fh * 0.35}, ${px + fw + wave} ${yt + fh * 0.55}
      C ${px + fw} ${yt + fh * 0.78}, ${px + fw * 0.4} ${yt + fh * 0.95}, ${px} ${yt + fh}
      Z"
      fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M ${px + fw * 0.15} ${yt + fh * 0.2} L ${px + fw * 0.85} ${yt + fh * 0.75} L ${px + fw * 0.5} ${yt + fh * 0.88} Z"
      fill="url(#bannerSheen)" opacity="0.85"/>
    <path d="M ${px} ${yt + fh * 0.2} L ${px} ${yt + fh}" stroke="${dark}" stroke-width="1.5" opacity="0.35"/>
  </g>`;
}

function shadeColor(hex, amt) {
  const n = hex.replace("#", "");
  if (n.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) * (1 + amt)));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) * (1 + amt)));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) * (1 + amt)));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** 石砌花坛 + 多朵小花 */
export function flowerBedMarkup(w, h, fl) {
  const cx = fl.x * w;
  const cy = fl.y * h;
  const rx = (fl.rx || 0.035) * w * 1.35;
  const ry = (fl.ry || 0.02) * h * 1.5;
  const petal = fl.fill || "#ff6f6f";
  const soil = "#5a4030";
  const stone = "#9a9aa8";

  const blooms = [
    [0, -ry * 0.35, 1],
    [-rx * 0.45, ry * 0.1, 0.85],
    [rx * 0.4, ry * 0.05, 0.9],
    [-rx * 0.15, ry * 0.35, 0.75],
    [rx * 0.2, ry * 0.3, 0.8],
  ];

  const flowers = blooms
    .map(([dx, dy, sc]) => {
      const r = rx * 0.22 * sc;
      const bx = cx + dx;
      const by = cy + dy;
      const petals = [0, 72, 144, 216, 288]
        .map(
          (deg) =>
            `<ellipse cx="${bx + Math.cos((deg * Math.PI) / 180) * r * 0.9}" cy="${by + Math.sin((deg * Math.PI) / 180) * r * 0.7}" rx="${r * 0.55}" ry="${r * 0.4}" fill="${petal}" opacity="0.92"/>`
        )
        .join("");
      return `${petals}<circle cx="${bx}" cy="${by}" r="${r * 0.35}" fill="#ffe566"/>`;
    })
    .join("");

  return `
  <g>
    <ellipse cx="${cx}" cy="${cy + ry * 0.15}" rx="${rx * 1.05}" ry="${ry * 0.95}" fill="${stone}" stroke="#787888" stroke-width="1.5"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.88}" ry="${ry * 0.72}" fill="${soil}"/>
    <ellipse cx="${cx}" cy="${cy - ry * 0.2}" rx="${rx * 0.75}" ry="${ry * 0.35}" fill="#6b5040" opacity="0.5"/>
    ${flowers}
    <ellipse cx="${cx - rx * 0.5}" cy="${cy + ry * 0.5}" rx="${rx * 0.12}" ry="${ry * 0.2}" fill="#4a8a38" opacity="0.7"/>
    <ellipse cx="${cx + rx * 0.45}" cy="${cy + ry * 0.45}" rx="${rx * 0.1}" ry="${ry * 0.18}" fill="#4a8a38" opacity="0.7"/>
  </g>`;
}

/** 条纹遮阳棚 + 支架 */
export function awningMarkup(w, h, a) {
  const x = a.x * w;
  const y = a.y * h;
  const aw = a.w * w;
  const ah = a.h * h * 2.2;
  const main = a.fill || "rgba(255,180,70,0.9)";
  const dark = "rgba(0,0,0,0.15)";
  const stripes = 5;
  let stripeSvg = "";
  const stripeAlt = main.startsWith("#") ? shadeColor(main, -0.12) : "rgba(200,130,40,0.85)";
  for (let i = 0; i < stripes; i++) {
    const sx = x + (aw / stripes) * i;
    const c = i % 2 === 0 ? main : stripeAlt;
    stripeSvg += `<rect x="${sx}" y="${y}" width="${aw / stripes}" height="${ah}" fill="${c}" opacity="0.95"/>`;
  }
  const scallops = 6;
  let scallopPath = `M ${x} ${y + ah}`;
  for (let i = 0; i <= scallops; i++) {
    const sx = x + (aw / scallops) * i;
    scallopPath += ` Q ${sx + aw / scallops / 2} ${y + ah + ah * 0.35} ${sx + aw / scallops} ${y + ah}`;
  }
  scallopPath += ` L ${x + aw} ${y} L ${x} ${y} Z`;

  return `
  <g>
    <path d="M ${x + aw * 0.1} ${y + ah * 0.15} L ${x} ${y + ah * 0.5} L ${x + aw * 0.08} ${y + ah * 0.55}" fill="#5a4030" stroke="#3a2818" stroke-width="0.8"/>
    <path d="M ${x + aw * 0.9} ${y + ah * 0.15} L ${x + aw} ${y + ah * 0.5} L ${x + aw * 0.92} ${y + ah * 0.55}" fill="#5a4030" stroke="#3a2818" stroke-width="0.8"/>
    <path d="${scallopPath}" fill="${main}" stroke="#8a6030" stroke-width="1"/>
    ${stripeSvg}
    <path d="${scallopPath}" fill="none" stroke="${dark}" stroke-width="1" opacity="0.4"/>
    <rect x="${x}" y="${y + ah}" width="${aw}" height="${ah * 0.12}" fill="${dark}" opacity="0.25"/>
  </g>`;
}

/** 木框暖光窗 */
export function windowMarkup(w, h, win) {
  const x = win.x * w;
  const y = win.y * h;
  const ww = win.w * w;
  const wh = win.h * h;
  const frame = 2.5;
  const innerX = x + frame;
  const innerY = y + frame;
  const innerW = ww - frame * 2;
  const innerH = wh - frame * 2;

  return `
  <g filter="url(#glowWarm)">
    <rect x="${x - 3}" y="${y - 3}" width="${ww + 6}" height="${wh + 6}" rx="3" fill="rgba(255,200,80,0.25)"/>
    <rect x="${x}" y="${y}" width="${ww}" height="${wh}" rx="2" fill="#3a2818" stroke="#2a1810" stroke-width="1"/>
    <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="1" fill="url(#winWarm)"/>
    <line x1="${x + ww / 2}" y1="${innerY}" x2="${x + ww / 2}" y2="${innerY + innerH}" stroke="#5a4028" stroke-width="1.2" opacity="0.6"/>
    <line x1="${innerX}" y1="${y + wh / 2}" x2="${innerX + innerW}" y2="${y + wh / 2}" stroke="#5a4028" stroke-width="1.2" opacity="0.6"/>
    <rect x="${innerX + 1}" y="${innerY + 1}" width="${innerW * 0.35}" height="${innerH * 0.3}" fill="#fff" opacity="0.2" rx="1"/>
  </g>`;
}

/** 欧式路灯 */
export function streetLightMarkup(w, h, l) {
  const px = l.x * w;
  const yb = l.yBase * h;
  const yt = l.yTop * h;
  const poleW = w * 0.006;
  const arm = w * 0.028;
  const lanternW = w * 0.022;
  const lanternH = h * 0.035;
  const ly = yt + lanternH * 0.3;

  return `
  <g>
    <ellipse cx="${px}" cy="${yb}" rx="${w * 0.018}" ry="${h * 0.008}" fill="#4a4a52"/>
    <ellipse cx="${px}" cy="${yb - h * 0.003}" rx="${w * 0.012}" ry="${h * 0.005}" fill="#6a6a74"/>
    <rect x="${px - poleW / 2}" y="${yt}" width="${poleW}" height="${yb - yt}" fill="url(#poleWood)" rx="1"/>
    <path d="M ${px} ${yt + h * 0.02} Q ${px + arm * 0.5} ${yt} ${px + arm} ${yt + h * 0.015}" stroke="#5a4030" stroke-width="2.2" fill="none"/>
    <rect x="${px + arm - lanternW / 2}" y="${ly}" width="${lanternW}" height="${lanternH}" rx="2" fill="#2a2830" stroke="#1a1820" stroke-width="1"/>
    <rect x="${px + arm - lanternW * 0.38}" y="${ly + lanternH * 0.15}" width="${lanternW * 0.76}" height="${lanternH * 0.65}" rx="1" fill="url(#lanternGlass)" filter="url(#glowSoft)"/>
    <ellipse cx="${px + arm}" cy="${ly + lanternH + h * 0.01}" rx="${lanternW * 1.2}" ry="${h * 0.008}" fill="rgba(255,220,100,0.35)"/>
    <ellipse cx="${px + arm}" cy="${yb}" rx="${w * 0.04}" ry="${h * 0.012}" fill="rgba(255,230,140,0.2)"/>
  </g>`;
}

/** 路口石台 + 徽章柱 */
export function emblemMarkup(w, h, em) {
  const cx = em.x * w;
  const cy = em.y * h;
  const r = em.r * w;

  return `
  <g filter="url(#glowSoft)">
    <ellipse cx="${cx}" cy="${cy + r * 0.5}" rx="${r * 1.5}" ry="${r * 0.45}" fill="rgba(0,0,0,0.2)"/>
    <ellipse cx="${cx}" cy="${cy + r * 0.35}" rx="${r * 1.15}" ry="${r * 0.35}" fill="#8a8a98" stroke="#6a6a78" stroke-width="1.5"/>
    <ellipse cx="${cx}" cy="${cy + r * 0.2}" rx="${r * 0.95}" ry="${r * 0.28}" fill="#a8a8b4"/>
    <rect x="${cx - r * 0.15}" y="${cy - r * 1.1}" width="${r * 0.3}" height="${r * 0.9}" fill="url(#poleWood)" rx="2"/>
    <circle cx="${cx}" cy="${cy - r * 0.75}" r="${r * 0.85}" fill="rgba(255,214,106,0.9)" stroke="rgba(255,245,180,0.95)" stroke-width="2"/>
    <polygon points="${cx},${cy - r * 1.15} ${cx + r * 0.3},${cy - r * 0.72} ${cx + r * 0.82},${cy - r * 0.72} ${cx + r * 0.38},${cy - r * 0.42} ${cx + r * 0.52},${cy - r * 0.05} ${cx},${cy - r * 0.35} ${cx - r * 0.52},${cy - r * 0.05} ${cx - r * 0.38},${cy - r * 0.42} ${cx - r * 0.82},${cy - r * 0.72} ${cx - r * 0.3},${cy - r * 0.72}" fill="#b76900" stroke="#8a4e00" stroke-width="0.8"/>
  </g>`;
}

/** 彩带（弧形飘带） */
export function ribbonMarkup(w, h, rb, i) {
  const stroke = i === 0 ? "#e85050" : "#48a8e8";
  const fill = i === 0 ? "rgba(255,100,100,0.35)" : "rgba(100,180,255,0.3)";
  const y = rb.y * h;
  const yCtrl = (rb.y - 0.04) * h;
  return `
  <path d="M ${0.18 * w} ${y} Q ${0.5 * w} ${yCtrl} ${0.82 * w} ${y}"
    stroke="${stroke}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M ${0.2 * w} ${y + h * 0.012} Q ${0.5 * w} ${yCtrl + h * 0.008} ${0.8 * w} ${y + h * 0.01}"
    stroke="${stroke}" stroke-width="2" fill="none" opacity="0.5"/>
  <path d="M ${0.22 * w} ${y} Q ${0.5 * w} ${yCtrl - h * 0.01} ${0.78 * w} ${y} L ${0.78 * w} ${y + h * 0.018} Q ${0.5 * w} ${yCtrl + h * 0.015} ${0.22 * w} ${y + h * 0.015} Z"
    fill="${fill}"/>
  `;
}

export function propsASvg(w, h, decor) {
  const flags = decor.flags.map((f) => flagMarkup(w, h, f)).join("");
  const flowers = decor.flowers.map((fl) => flowerBedMarkup(w, h, fl)).join("");
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${decorDefs()}${flags}${flowers}</svg>`;
}

export function propsBSvg(w, h, decor) {
  const awnings = decor.awnings.map((a) => awningMarkup(w, h, a)).join("");
  const windows = decor.windows.map((win) => windowMarkup(w, h, win)).join("");
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${decorDefs()}${awnings}${windows}</svg>`;
}

export function propsCSvg(w, h, decor) {
  const ft = decor.fullTier;
  const emblem = emblemMarkup(w, h, ft.emblem);
  const lights = ft.streetLights.map((l) => streetLightMarkup(w, h, l)).join("");
  const ribbons = ft.ribbons.map((rb, i) => ribbonMarkup(w, h, rb, i)).join("");
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${decorDefs()}${emblem}${lights}${ribbons}</svg>`;
}
