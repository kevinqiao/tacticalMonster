import { useSharedValue } from "@/service/SharedPageDataManager";
import React from "react";
import { FooterNavBarDesktop } from "./FooterNavBarDesktop";
import { FooterNavBarTouch } from "./FooterNavBarTouch";
import { FooterNavBarTouchPortrait } from "./FooterNavBarTouchPortrait";
import "./FooterNavControl.css";
import { useFooterNavIsDesktop } from "./FooterNavIsDesktop";

const FooterNavBar: React.FC = () => {
  const isDesktop = useFooterNavIsDesktop();
  const isPortrait = useSharedValue("lobby.layout.portrait");
  if (!isDesktop && isPortrait) return <FooterNavBarTouchPortrait />;
  if (isDesktop || !isPortrait) return <FooterNavBarDesktop />;
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
  const portrait = useSharedValue("lobby.layout.portrait");
  const isDesktop = useFooterNavIsDesktop();
  /** 触摸 + 竖屏：底栏条贴齐壳体下边（由 CSS 收紧 padding / 对齐） */
  const touchPortrait = portrait === true && !isDesktop;
  /** 仅在为 true 时用竖屏壳；null/undefined 时用横屏壳，避免未测量或与 modal 竞态时整栏不渲染 */
  return (
    <div
      className={
        touchPortrait
          ? "footer-nav-root footer-nav-root--touch-portrait"
          : "footer-nav-root"
      }
    >
      {portrait === true ? <PortraitControl /> : <LandscapeControl />}
    </div>
  );
};

export default FooterNavControl;
