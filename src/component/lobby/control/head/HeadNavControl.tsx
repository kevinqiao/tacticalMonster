import { useSharedValue } from "@/service/SharedPageDataManager";
import React from "react";
import { HeadNavBarDesktop } from "./HeadNavBarDesktop";
import "./HeadNavControl.css";

const HeadNavControl: React.FC = () => {
  const portrait = useSharedValue("lobby.layout.portrait");
  /** 与 footer 一致：仅在为 true 时用竖屏壳；null/undefined 时用横屏壳 */
  return (
    <div className="head-nav-root">
      <div
        className={
          portrait === true
            ? "head-nav-shell--portrait"
            : "head-nav-shell--landscape"
        }
      >
        <HeadNavBarDesktop />
      </div>
    </div>
  );
};

export default HeadNavControl;
