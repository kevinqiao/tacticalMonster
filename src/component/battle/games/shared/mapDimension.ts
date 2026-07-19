/**
 * Shared map layout metrics for lobby chrome + tactical deploy.
 * Kept outside `tacticalMonster/` so the app shell can type-check without
 * pulling the `modal-app` / Three.js chunk into the entry graph.
 */
export interface MapDimension {
  containerWidth: number;
  containerHeight: number;
  width: number;
  height: number;
  hexHeight: number;
  hexWidth: number;
  /** 是否竖屏 */
  isPortrait: boolean;
  /** 列数（横屏8，竖屏7） */
  cols: number;
  /** 行数（横屏7，竖屏8） */
  rows: number;
  topOffset?: number;
  leftOffset?: number;
  zoom?: number;
}
