import { findAncestor, normalizePageUri, parseLocation } from "@/host/util/PageUtils";
import { preloadImages } from "@/host/util/preloadAssets";
import type { PageContainer } from "host/service/PageManager";
import { useEffect, useMemo, useState } from "react";

/**
 * 给定首屏 pathname 对应的**那一棵**顶层壳（`findAncestor`）；无匹配时回退全部顶层壳。
 */
export const resolveColdBootRootShells = (
  containers: readonly PageContainer[],
  entryUri: string
): PageContainer[] => {
  const u = normalizePageUri(entryUri);
  if (!u) {
    return [...containers];
  }
  const ancestor = findAncestor([...containers], u);
  if (ancestor) {
    return [ancestor];
  }
  console.warn("[coldBoot] initial URI matches no shell; falling back to all root shells", entryUri);
  return [...containers];
};

/** 聚合各顶层壳 `bootCriticalAssetUrls`，去重；未配置则返回空数组。 */
export const collectRootBootCriticalUrls = (roots: readonly PageContainer[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of roots) {
    const urls = c.bootCriticalAssetUrls;
    if (!urls?.length) continue;
    for (const u of urls) {
      if (!u || seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
  }
  return out;
};

export type UseColdBootPreloadResult = {
  /** `bootCriticalAssetUrls` 已全部尝试加载（含列表为空视为已完成） */
  coldBootAssetsReady: boolean;
};

/**
 * 按首屏 URL 选定顶层壳子集，预加载 `bootCriticalAssetUrls`；就绪标志供 BootLoadingOverlay 等读取。
 */
export const useColdBootPreload = (pageContainers: readonly PageContainer[]): UseColdBootPreloadResult => {
  const coldBootShells = useMemo(() => {
    if (typeof window === "undefined") {
      return [...pageContainers];
    }
    const entry = parseLocation()?.uri ?? "";
    return resolveColdBootRootShells(pageContainers, entry);
  }, [pageContainers]);

  const rootBootUrls = useMemo(() => collectRootBootCriticalUrls(coldBootShells), [coldBootShells]);

  const [criticalUrlsLoaded, setCriticalUrlsLoaded] = useState(false);

  useEffect(() => {
    if (rootBootUrls.length === 0) {
      return;
    }

    setCriticalUrlsLoaded(false);
    let cancelled = false;
    void preloadImages(rootBootUrls).then(() => {
      if (!cancelled) {
        console.log("preloadImages success");
        const entry = parseLocation()?.uri ?? "";
        const to = entry.startsWith("/tactical") ? 5000 : 100;
        setTimeout(() => {
          setCriticalUrlsLoaded(true);
        }, to);
      };
    });
    return () => {
      cancelled = true;
    };
  }, [rootBootUrls]);

  const coldBootAssetsReady = rootBootUrls.length === 0 || criticalUrlsLoaded;

  return { coldBootAssetsReady };
};
