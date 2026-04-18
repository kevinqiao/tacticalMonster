import { PageProp } from "component/RenderApp";
import React, { useEffect, useRef, useState } from "react";
import { useSharedValue } from "service/SharedPageDataManager";
import { preloadImages } from "util/preloadAssets";
import { child2CriticalAssets } from "./child2Assets";
import LandscapeContent from "./play/LandscapeContent";
import PortraitContent from "./play/PortraitContent";


const Child2: React.FC<PageProp> = ({ visible }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const prevShowContentRef = useRef(false);
  const loadTokenRef = useRef(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const isPortrait = useSharedValue("lobby.layout.portrait");

  useEffect(() => {
    if (visible <= 0) {
      loadTokenRef.current += 1;
      setAssetsReady(false);
      return;
    }

    const token = ++loadTokenRef.current;
    setAssetsReady(false);
    preloadImages(child2CriticalAssets).then(() => {
      if (token !== loadTokenRef.current) return;
      setAssetsReady(true);
    });
  }, [visible, isPortrait]);

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

  return (<div
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
    {showContent ? (isPortrait ? <PortraitContent /> : <LandscapeContent />) : null}
  </div>
  )
};
export default Child2;
