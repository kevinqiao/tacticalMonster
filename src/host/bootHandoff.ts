/** Portal 大厅首屏绘制完成时派发，供 BootLoadingOverlay 与主页交叉淡出。 */
export const PORTAL_BOOT_PAINTED = "portal-boot-painted";

export function markPortalBootPainted(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PORTAL_BOOT_PAINTED));
}

export function isPortalBootRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path.startsWith("/portal") && !path.startsWith("/portal/preview");
}
