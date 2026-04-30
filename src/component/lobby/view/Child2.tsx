import { PageProp } from "component/RenderApp";
import { useFooterNavIsDesktop } from "component/lobby/control/footer/FooterNavIsDesktop";
import React, { useEffect, useRef, useState } from "react";
import { useSharedValue } from "service/SharedPageDataManager";
import { preloadImages } from "util/preloadAssets";
import { getChild2CriticalAssets } from "./child2Assets";
import LandscapeContent from "./play/LandscapeContent";
import PortraitContent from "./play/PortraitContent";
import { useLobbySlideChildSwipe } from "./useLobbySlideChildSwipe";

const Child2: React.FC<PageProp> = ({ visible }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const prevShowContentRef = useRef(false);
  /** 仅随 orientation 换批次预加载：`visible<=0` 时也会在后台跑，切回本页且朝向未变时可跳过 Loading */
  const preloadGenerationRef = useRef(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const orientation = useSharedValue("lobby.layout.orientation");
  const isDesktop = useFooterNavIsDesktop();

  useLobbySlideChildSwipe(contentRef, { enabled: !isDesktop });

  useEffect(() => {
    const generation = ++preloadGenerationRef.current;
    setAssetsReady(false);
    const urls = getChild2CriticalAssets(orientation);
    preloadImages(urls).then(() => {
      if (generation !== preloadGenerationRef.current) return;
      setAssetsReady(true);
    });
  }, [orientation]);

  const showContent = visible > 0 && assetsReady;

  useEffect(() => {
    const justShown = showContent && !prevShowContentRef.current;
    prevShowContentRef.current = showContent;
    if (!justShown) return;

    // 等待一帧，确保容器尺寸和滚动高度已稳定后再复位滚动位置
    requestAnimationFrame(() => {
      const ele = contentRef.current;
      if (ele && ele.scrollHeight > ele.clientHeight && ele.scrollTop !== 0) {
        ele.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  }, [showContent]);

  return (
    <div
      ref={contentRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "white",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {visible > 0 && !assetsReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            color: "#666",
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      )}
      {showContent ? (orientation === "portrait" ? <PortraitContent /> : orientation === "landscape" ? <LandscapeContent /> : null) : null}
    </div>
  );
};

export default Child2;
