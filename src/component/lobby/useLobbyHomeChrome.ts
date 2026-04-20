import type { MapDimension } from "@/component/battle/games/tacticalMonster/service/TeamDeployManager";
import { calculateMapDimension } from "@/component/battle/games/tacticalMonster/utils/coordinateUtils";
import type { SharedPageDataSchema } from "@/service/SharedPageDataManager";
import { useLayoutEffect, useRef, type RefObject } from "react";

const DIM_EPS = 0.5;

function approxSameWH(
  a: { width: number; height: number },
  b: { width: number; height: number }
): boolean {
  return (
    Math.abs(a.width - b.width) < DIM_EPS && Math.abs(a.height - b.height) < DIM_EPS
  );
}

function approxSameMap(a: MapDimension, b: MapDimension): boolean {
  return (
    approxSameWH(
      { width: a.containerWidth, height: a.containerHeight },
      { width: b.containerWidth, height: b.containerHeight }
    ) &&
    Math.abs(a.width - b.width) < DIM_EPS &&
    Math.abs(a.height - b.height) < DIM_EPS &&
    Math.abs(a.hexWidth - b.hexWidth) < DIM_EPS &&
    Math.abs(a.hexHeight - b.hexHeight) < DIM_EPS &&
    a.isPortrait === b.isPortrait &&
    a.cols === b.cols &&
    a.rows === b.rows
  );
}

type SetShared = <K extends keyof SharedPageDataSchema>(
  key: K,
  value: SharedPageDataSchema[K]
) => void;

/**
 * 大厅顶/底在 portal 到 body 后，持续发布尺寸到 SharedPageData。
 * 纯简化方案下底栏固定由 CSS `position: fixed; bottom: 0` 管理，不依赖 visualViewport。
 */
export function useLobbyHomeChrome(
  headRef: RefObject<HTMLDivElement | null>,
  footerRef: RefObject<HTMLDivElement | null>,
  setShared: SetShared
): void {
  const lastPublishedRef = useRef<{
    map: MapDimension | null;
    lobby: { width: number; height: number } | null;
    head: { width: number; height: number } | null;
    foot: { width: number; height: number } | null;
    content: { width: number; height: number } | null;
  } | null>(null);

  useLayoutEffect(() => {
    const lobbyEl = document.querySelector<HTMLElement>(
      '[data-container-name="lobby"]'
    );
    if (!lobbyEl) return;

    let cancelled = false;
    const updateDimension = () => {
      if (cancelled) return;
      const lobbyDimension = lobbyEl.getBoundingClientRect();
      const lobbyWH = { width: lobbyDimension.width, height: lobbyDimension.height };
      const mapDimension = calculateMapDimension(lobbyDimension.width, lobbyDimension.height);
      const headDimension = headRef.current?.getBoundingClientRect();
      const footerDimension = footerRef.current?.getBoundingClientRect();
      let contentDimension: { width: number; height: number } | null = null;
      if (headDimension && footerDimension) {
        const h = Math.max(0, footerDimension.top - headDimension.bottom);
        contentDimension = { width: lobbyDimension.width, height: h };
      }
      const headWH = headDimension
        ? { width: headDimension.width, height: headDimension.height }
        : null;
      const footWH = footerDimension
        ? { width: footerDimension.width, height: footerDimension.height }
        : null;

      const last = lastPublishedRef.current;
      const unchanged =
        last != null &&
        last.map != null &&
        approxSameMap(last.map, mapDimension) &&
        last.lobby != null &&
        approxSameWH(last.lobby, lobbyWH) &&
        ((last.head == null && headWH == null) ||
          (last.head != null && headWH != null && approxSameWH(last.head, headWH))) &&
        ((last.foot == null && footWH == null) ||
          (last.foot != null && footWH != null && approxSameWH(last.foot, footWH))) &&
        ((last.content == null && contentDimension == null) ||
          (last.content != null &&
            contentDimension != null &&
            approxSameWH(last.content, contentDimension)));

      if (unchanged) return;

      lastPublishedRef.current = {
        map: mapDimension,
        lobby: lobbyWH,
        head: headWH,
        foot: footWH,
        content: contentDimension,
      };
      setShared("lobby.layout.portrait", mapDimension?.isPortrait ?? false);
      setShared("lobby.map.dimension", mapDimension);
      setShared("lobby.dimension", lobbyWH);
      setShared("lobby.head.dimension", headWH);
      setShared("lobby.footer.dimension", footWH);
      setShared("lobby.content.dimension", contentDimension);
    };

    updateDimension();
    const ro = new ResizeObserver(updateDimension);
    ro.observe(lobbyEl);

    return () => {
      cancelled = true;
      ro.disconnect();
      lastPublishedRef.current = null;
    };
  }, [setShared, headRef, footerRef]);
}
