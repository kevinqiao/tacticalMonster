import { useSharedValue } from "host/service/SharedPageDataManager";
import React from "react";
import { FooterNavBarDesktop } from "./FooterNavBarDesktop";
import { FooterNavBarTouch } from "./FooterNavBarTouch";
import { FooterNavBarTouchPortrait } from "./FooterNavBarTouchPortrait";
import "./FooterNavControl.css";
import { useFooterNavIsDesktop } from "./FooterNavIsDesktop";

const FooterNavBar: React.FC = () => {
  const isDesktop = useFooterNavIsDesktop();
  const orientation = useSharedValue("lobby.layout.orientation");
  /** 竖屏：手游风底栏；横屏：与桌面同款 HUD（触摸横屏由 CSS 放大，避免壳体矮时 cqh 过小） */
  if (!isDesktop && orientation === "portrait") return <FooterNavBarTouchPortrait />;
  if (isDesktop || orientation === "landscape") return <FooterNavBarDesktop />;
  return <FooterNavBarTouch />;
};

const PortraitControl: React.FC = () => (
  <div className="footer-nav-shell--portrait">
    <FooterNavBar />
  </div>
);

const LandscapeControl: React.FC = () => (
  <div className="footer-nav-shell--landscape">
    <FooterNavBar />
  </div>
);

const FooterNavControl: React.FC = () => {
  const orientation = useSharedValue("lobby.layout.orientation");
  const isDesktop = useFooterNavIsDesktop();
  /** 触摸 + 竖屏：底栏条贴齐壳体下边（由 CSS 收紧 padding / 对齐） */
  const touchPortrait = orientation === "portrait" && !isDesktop;
  /** 仅在为 true 时用竖屏壳；null/undefined 时用横屏壳，避免未测量或与 modal 竞态时整栏不渲染 */
  return (
    <div
      className={
        touchPortrait ? "footer-nav-root footer-nav-root--touch-portrait" : "footer-nav-root"
      }
    >
      {orientation === "portrait" ? <PortraitControl /> : orientation === "landscape" ? <LandscapeControl /> : null}
    </div>
  );
};

export default FooterNavControl;
