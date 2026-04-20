/**
 * 程序化几何：用于 gen-lobby-nav-bar / gen-hover PNG 与 write-lobby-nav-cells-svg。
 * 热区运行时以 assets/lobby-nav-cells.svg 为准；改形状请同步或让美术导出 SVG+PNG。
 */
export const W = 480;
export const H = 44;
export const COLS = 6;

export const WIDTH_PCT = [14, 12, 20, 18, 16, 20];

/** 与 navCellLayout buildNavSeams / SEAM_TILT_AT_TOP_PX 一致 */
export const SEAM_TILT_AT_TOP_PX = [-11, 9, -13, 10, -9];

export const NAV_CELLS = [
  { leftShoulderYPct: 22, rightShoulderYPct: 24, peakXPct: 40 },
  { leftShoulderYPct: 18, rightShoulderYPct: 20, peakXPct: 48 },
  { leftShoulderYPct: 20, rightShoulderYPct: 22, peakXPct: 52 },
  { leftShoulderYPct: 16, rightShoulderYPct: 18, peakXPct: 50 },
  { leftShoulderYPct: 24, rightShoulderYPct: 22, peakXPct: 45 },
  { leftShoulderYPct: 20, rightShoulderYPct: 21, peakXPct: 55 },
];

function cumBottomPx(k) {
  let s = 0;
  for (let i = 0; i < k; i++) {
    s += (WIDTH_PCT[i] / 100) * W;
  }
  return s;
}

function buildNavSeams() {
  const seams = [];
  seams.push({ xTop: 0, xBottom: 0 });
  for (let k = 1; k <= 5; k++) {
    const xBottom = cumBottomPx(k);
    const xTop = xBottom + SEAM_TILT_AT_TOP_PX[k - 1];
    seams.push({ xTop, xBottom });
  }
  seams.push({ xTop: W, xBottom: W });
  return seams;
}

const NAV_SEAMS = buildNavSeams();

function seamXAtY(seam, y) {
  return seam.xTop + ((seam.xBottom - seam.xTop) * y) / H;
}

function cellVertices(i) {
  const cell = NAV_CELLS[i];
  const L = NAV_SEAMS[i];
  const R = NAV_SEAMS[i + 1];
  const yL = (cell.leftShoulderYPct / 100) * H;
  const yR = (cell.rightShoulderYPct / 100) * H;
  const xL0 = seamXAtY(L, 0);
  const xR0 = seamXAtY(R, 0);
  const xPeak = xL0 + (cell.peakXPct / 100) * (xR0 - xL0);
  return [
    [seamXAtY(L, H), H],
    [seamXAtY(L, yL), yL],
    [xPeak, 0],
    [seamXAtY(R, yR), yR],
    [seamXAtY(R, H), H],
  ];
}

/** 与 lobby-nav-cells.svg 中 path 一致；供 write-lobby-nav-cells-svg.mjs 使用 */
export function navCellPathD(i) {
  const pts = cellVertices(i);
  const [p0, ...rest] = pts;
  return `M ${p0[0]} ${p0[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} Z`;
}

/** 射线法，顶点顺序与 navCellVertices 一致 */
export function pointInPolygon(px, py, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect =
      (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInCell(px, py, i) {
  return pointInPolygon(px, py, cellVertices(i));
}

export function onBar(x, y) {
  for (let i = 0; i < COLS; i++) {
    if (pointInCell(x, y, i)) return true;
  }
  return false;
}

/** 含 (x,y) 的格；缝上取较大索引，与 SVG 后绘 path 一致 */
export function colFromXY(x, y) {
  for (let c = COLS - 1; c >= 0; c--) {
    if (pointInCell(x, y, c)) return c;
  }
  return COLS - 1;
}

/** @deprecated 斜缝下列宽随高度变化；新代码请用 colFromXY */
export function colFromX(x) {
  return colFromXY(x, H * 0.5);
}
