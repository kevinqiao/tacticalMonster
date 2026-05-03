import { PageProp } from "host/RenderApp";
import React, { useRef } from "react";
import { useSharedPageData } from "host/service/SharedPageDataManager";
import FooterNavControl from "./control/footer/FooterNavControl";
import HeadNavControl from "./control/head/HeadNavControl";
import "./style.css";
import { useLobbyHomeChrome } from "./useLobbyHomeChrome";

const LOBBY_CHROME_Z = 1000;
/**
 * 顶栏 / 底栏外框严格同高；略抬下限给底栏 HUD（图标+文案）留高，避免只能靠 cqh 把按钮压扁。
 * 底部安全区由壳体样式控制，不把 #footer 总高加成高于 #header。
 */
const STRIP_H = "clamp(52px, 9dvh, 100px)";

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
          width: "100%",
          maxWidth: "100vw",
          height: STRIP_H,
          zIndex: LOBBY_CHROME_Z,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      >
        <HeadNavControl />
      </div>
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
          overflow: "visible",
          paddingBottom: 0,
        }}
      >
        <FooterNavControl />
      </div>
    </>
  );

  // if (typeof document !== "undefined" && document.body) {
  //   return createPortal(chrome, document.body);
  // }
  return chrome;
};

export default LobbyHome;
