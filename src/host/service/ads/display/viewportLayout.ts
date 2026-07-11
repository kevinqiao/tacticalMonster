/** PC 侧栏 gutter 与游戏 stage 几何计算（与 Portal 1440 设计稿 contain 缩放一致）。 */

export const PORTAL_MIN_GUTTER_WIDTH_PX = 120;
export const PORTAL_DESKTOP_MIN_WIDTH_PX = 1024;

export type ViewportGutterRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ViewportLayout = {
  designWidth: number;
  designHeight: number;
  scale: number;
  stageRect: ViewportGutterRect;
  gutters: {
    left: ViewportGutterRect | null;
    right: ViewportGutterRect | null;
    top: ViewportGutterRect | null;
    bottom: ViewportGutterRect | null;
  };
  orientation: "landscape" | "portrait";
  platform: "desktop" | "mobile";
};

export function computePortalViewportLayout(args: {
  windowWidth: number;
  windowHeight: number;
  designWidth?: number;
  designHeight?: number;
  portrait?: boolean;
}): ViewportLayout {
  const portrait =
    args.portrait ?? args.windowWidth / Math.max(args.windowHeight, 1) < 132 / 182;
  const designWidth = args.designWidth ?? 1440;
  const designHeight = args.designHeight ?? (portrait ? 2560 : 1080);

  const scaleX = args.windowWidth / designWidth;
  const scaleY = args.windowHeight / designHeight;
  const scale = Math.min(scaleX, scaleY);

  const stageW = designWidth * scale;
  const stageH = designHeight * scale;
  const stageX = (args.windowWidth - stageW) / 2;
  const stageY = (args.windowHeight - stageH) / 2;

  const platform =
    args.windowWidth >= PORTAL_DESKTOP_MIN_WIDTH_PX && !portrait ? "desktop" : "mobile";

  const leftW = stageX;
  const rightW = args.windowWidth - stageX - stageW;
  const topH = stageY;
  const bottomH = args.windowHeight - stageY - stageH;

  const gutterOk = (w: number) => platform === "desktop" && w >= PORTAL_MIN_GUTTER_WIDTH_PX;

  return {
    designWidth,
    designHeight,
    scale,
    stageRect: { x: stageX, y: stageY, w: stageW, h: stageH },
    gutters: {
      left: gutterOk(leftW) ? { x: 0, y: 0, w: leftW, h: args.windowHeight } : null,
      right: gutterOk(rightW)
        ? { x: stageX + stageW, y: 0, w: rightW, h: args.windowHeight }
        : null,
      top: topH >= PORTAL_MIN_GUTTER_WIDTH_PX ? { x: 0, y: 0, w: args.windowWidth, h: topH } : null,
      bottom:
        bottomH >= PORTAL_MIN_GUTTER_WIDTH_PX
          ? { x: 0, y: stageY + stageH, w: args.windowWidth, h: bottomH }
          : null,
    },
    orientation: portrait ? "portrait" : "landscape",
    platform,
  };
}
