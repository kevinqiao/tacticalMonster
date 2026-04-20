import { PageProp } from "component/RenderApp";
import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { useSharedPageData } from "service/SharedPageDataManager";
import LobbyNavControl from "./control/LobbyNavControl";
import "./style.css";
import { useLobbyHomeChrome } from "./useLobbyHomeChrome";

const LOBBY_CHROME_Z = 5200;
/** dvh 跟动态可视区域，比 % 在 modal/移动浏览器下更稳 */
const STRIP_H = "clamp(44px, 8dvh, 96px)";

const LobbyHome: React.FC<PageProp> = () => {
  const headRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const { setShared } = useSharedPageData();
  useLobbyHomeChrome(headRef, footerRef, setShared);

  const chrome = (
    <>
      <div
        id="header"
        ref={headRef}
        data-lobby-chrome="header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: STRIP_H,
          zIndex: LOBBY_CHROME_Z,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          pointerEvents: "none",
        }}
      />
      {/* footer ref 供共享尺寸测量；勿去掉 */}
      <div
        id="footer"
        ref={footerRef}
        data-lobby-chrome="footer"
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
          overflow: "hidden",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <LobbyNavControl />
      </div>
    </>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(chrome, document.body);
  }
  return chrome;
};

export default LobbyHome;
