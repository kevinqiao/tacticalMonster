import { PageProp } from "host/RenderApp";
import React, { useRef } from "react";
import { useSharedPageData } from "host/service/SharedPageDataManager";
import CasualFooterNavControl from "./control/CasualFooterNavControl";
import CasualHeadNavControl from "./control/CasualHeadNavControl";
import "./style.css";
import { LOBBY_CHROME_STRIP_HEIGHT_CSS } from "../lobbyChromeStrip";
import { useCasualLobbyChrome } from "./useCasualLobbyChrome";

const LOBBY_CHROME_Z = 1000;
/**
 * 顶栏 / 底栏与 tactical `LobbyHome` 同构（HUD + slide 测量）；数据键为 `casualLobby.*`。
 */
const STRIP_H = LOBBY_CHROME_STRIP_HEIGHT_CSS;

const CasualHome: React.FC<PageProp> = () => {
  const headRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const { setShared } = useSharedPageData();
  useCasualLobbyChrome(headRef, footerRef, setShared);

  return (
    <>
      <div
        id="header"
        ref={headRef}
        data-casual-chrome="header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          maxWidth: "100vw",
          height: STRIP_H,
          zIndex: LOBBY_CHROME_Z,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      >
        <CasualHeadNavControl />
      </div>
      <div
        id="footer"
        ref={footerRef}
        data-casual-chrome="footer"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          maxWidth: "100vw",
          height: STRIP_H,
          margin: 0,
          boxSizing: "border-box",
          zIndex: LOBBY_CHROME_Z,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          pointerEvents: "auto",
          overflow: "visible",
          paddingBottom: 0,
        }}
      >
        <CasualFooterNavControl />
      </div>
    </>
  );
};

export default CasualHome;
