import criticalPlaceholderA from "./assets/critical-placeholder-a.svg";
import criticalPlaceholderB from "./assets/critical-placeholder-b.svg";

export type Child2OrientationKey = "portrait" | "landscape";

/**
 * 按横竖屏拆分的首屏关键图；可替换为各自 UI 资源。
 * 若有横竖共用图，可抽到 common 再在 getChild2CriticalAssets 里拼接。
 */
const PORTRAIT: string[] = [criticalPlaceholderA, criticalPlaceholderB];
const LANDSCAPE: string[] = [criticalPlaceholderA, criticalPlaceholderB];

const BY_ORIENTATION: Record<Child2OrientationKey, string[]> = {
  portrait: PORTRAIT,
  landscape: LANDSCAPE,
};

/** 与 useAuthAnimate 等一致：共享层尚未写入时用视口推断 */
function inferOrientationFallback(): Child2OrientationKey {
  if (typeof window === "undefined") return "landscape";
  return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
}

/**
 * @param o `lobby.layout.orientation` 可能尚未就绪，用 fallback 避免 preload 无键
 */
export function getChild2CriticalAssets(
  o: Child2OrientationKey | null | undefined
): string[] {
  const key =
    o === "portrait" || o === "landscape" ? o : inferOrientationFallback();
  return BY_ORIENTATION[key];
}
