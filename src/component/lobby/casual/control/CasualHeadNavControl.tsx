import { useSharedValue } from "@/service/SharedPageDataManager";
import React from "react";
import "../../tactical/control/head/HeadNavControl.css";
import { CasualHeadNavBarDesktop } from "./CasualHeadNavBarDesktop";

const CasualHeadNavControl: React.FC = () => {
  const orientation = useSharedValue("casualLobby.layout.orientation");
  /** 与 footer 一致：仅在为 true 时用竖屏壳；null/undefined 时用横屏壳 */
  return (
    <div className="head-nav-root">
      <div
        className={
          orientation === "portrait"
            ? "head-nav-shell--portrait"
            : "head-nav-shell--landscape"
        }
      >
        <CasualHeadNavBarDesktop />
      </div>
    </div>
  );
};

export default CasualHeadNavControl;
