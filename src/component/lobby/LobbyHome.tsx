import { PageProp } from "component/RenderApp";
import React, { useEffect, useRef } from "react";
import { useSharedPageData } from "service/SharedPageDataManager";
import type { MapDimension } from "../battle/games/tacticalMonster/service/TeamDeployManager";
import { calculateMapDimension } from "../battle/games/tacticalMonster/utils/coordinateUtils";
import LobbyNavControl from "./control/LobbyNavControl";
import "./style.css";

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

const LobbyHome: React.FC<PageProp> = ({ visible }) => {
  const headRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const { setShared } = useSharedPageData();
  const lastPublishedRef = useRef<{
    map: MapDimension | null;
    lobby: { width: number; height: number } | null;
    head: { width: number; height: number } | null;
    foot: { width: number; height: number } | null;
    content: { width: number; height: number } | null;
  } | null>(null);

  useEffect(() => {
    const ele = footerRef.current?.closest<HTMLElement>('[data-container-name="lobby"]');
    if (!ele) return;

    const updateDimension = () => {
      console.log("updateRatio");
      const lobbyDimension = ele.getBoundingClientRect();
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
    const observer = new ResizeObserver(updateDimension);
    observer.observe(ele);
    return () => {
      observer.disconnect();
      lastPublishedRef.current = null;
      setShared("lobby.layout.portrait", null);
      setShared("lobby.map.dimension", null);
      setShared("lobby.dimension", null);
      setShared("lobby.head.dimension", null);
      setShared("lobby.footer.dimension", null);
      setShared("lobby.content.dimension", null);
    };
  }, [setShared]);

  /** 与 RenderApp 中 lobby 子页先于 LobbyHome 配合：顶/底条在后渲染，叠在子页之上；中间无额外层 */
  const stripH = "8%";
  return (
    <>
      <div
        id="header"
        ref={headRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: stripH,
          zIndex: 100,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          pointerEvents: "none",
        }}
      />
      <div
        id="footer"
        ref={footerRef}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: stripH,
          zIndex: 100,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          pointerEvents: "auto",
        }}
      >
        <LobbyNavControl />
      </div>
    </>
  );

};

export default LobbyHome;
