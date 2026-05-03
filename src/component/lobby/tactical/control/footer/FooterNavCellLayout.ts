/**
 * 热区几何来自 **assets/FooterNavCells.svg**（`id="footer-nav-cell-0"` … `"-5"` 的 `<path d>`）。
 *
 * 程序侧集成：`FooterNavControl` 用 `?raw` 读入 SVG，`parseFooterNavCellPathDs` 提取 `d`。
 *
 * 与底图 PNG 的同步（二选一）：
 * - 改 **scripts/lobbyNavShape.mjs** 后运行：`node scripts/write-lobby-nav-cells-svg.mjs` 再运行 gen PNG 脚本；
 * - 美术 **直接替换** `FooterNavCells.svg` 时，请同时从同一稿导出 **nav-bar-bg.png / nav-hover-sprite.png** 覆盖 assets（否则不必跑 gen）。
 */
export const NAV_VIEWBOX_W = 480;
export const NAV_VIEWBOX_H = 44;
export const NAV_VIEWBOX = `0 0 ${NAV_VIEWBOX_W} ${NAV_VIEWBOX_H}` as const;

/** 仅用于文字条占位（与列宽大致一致）；触摸热区与 WIDTH_PCT 对齐占满整格 */
export const WIDTH_PCT = [14, 12, 20, 18, 16, 20] as const;

/** 与 WIDTH_PCT 列对齐、铺满 viewBox 高度的矩形 path（替代美术多边形，触摸命中/GSAP hover 顶满格） */
export function footerNavCellRectPathD(cellIndex: number): string {
  if (cellIndex < 0 || cellIndex >= WIDTH_PCT.length) {
    throw new Error(
      `[FooterNavCellLayout] footerNavCellRectPathD: invalid cellIndex ${cellIndex}`
    );
  }
  const x =
    (WIDTH_PCT.slice(0, cellIndex).reduce((a, b) => a + b, 0) / 100) *
    NAV_VIEWBOX_W;
  const w = (WIDTH_PCT[cellIndex] / 100) * NAV_VIEWBOX_W;
  const h = NAV_VIEWBOX_H;
  return `M ${x} 0 L ${x + w} 0 L ${x + w} ${h} L ${x} ${h} Z`;
}

const NAV_CELL_COUNT = 6;
const CELL_ID = (i: number) => `footer-nav-cell-${i}`;

/**
 * 从美术导出的 SVG 字符串解析 6 条 path 的 `d`（不依赖 DOM，SSR 安全）。
 * 支持 `id` 与 `d` 在同一 `<path>` 上任意顺序。
 */
export function parseFooterNavCellPathDs(svgMarkup: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < NAV_CELL_COUNT; i++) {
    out.push(extractPathDFromSvg(svgMarkup, CELL_ID(i)));
  }
  return out;
}

function extractPathDFromSvg(svg: string, id: string): string {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reIdFirst = new RegExp(
    `<path\\b[^>]*\\bid=["']${esc}["'][^>]*\\bd=["']([^"']+)["']`,
    "i"
  );
  const reDFirst = new RegExp(
    `<path\\b[^>]*\\bd=["']([^"']+)["'][^>]*\\bid=["']${esc}["']`,
    "i"
  );
  const m1 = svg.match(reIdFirst);
  if (m1) return m1[1];
  const m2 = svg.match(reDFirst);
  if (m2) return m2[1];
  throw new Error(
    `[FooterNavCellLayout] 缺少 <path id="${id}"> 或无法解析 d（请检查 FooterNavCells.svg）`
  );
}
