import { useSharedValue } from "@/service/SharedPageDataManager";
import React from "react";
import { LobbyNavBarDesktop } from "./LobbyNavBarDesktop";
import { LobbyNavBarTouch } from "./LobbyNavBarTouch";
import "./lobbyNavControl.css";
import { useLobbyNavIsDesktop } from "./useLobbyNavIsDesktop";

const LobbyNavBar: React.FC = () => {
  const isDesktop = useLobbyNavIsDesktop();
  const isPortrait = useSharedValue("lobby.layout.portrait");
  if (isDesktop || !isPortrait) return <LobbyNavBarDesktop />;
  return <LobbyNavBarTouch />;
};

const PortraitControl: React.FC = () => (
  <div className="lobby-nav-shell--portrait">
    <LobbyNavBar />
  </div>
);

const LandscapeControl: React.FC = () => (
  <div className="lobby-nav-shell--landscape">
    <LobbyNavBar />
  </div>
);

const LobbyControl: React.FC = () => {
  const portrait = useSharedValue("lobby.layout.portrait");
  /** 仅在为 true 时用竖屏壳；null/undefined 时用横屏壳，避免未测量或与 modal 竞态时整栏不渲染 */
  return (
    <div className="lobby-nav-root">
      {portrait === true ? <PortraitControl /> : <LandscapeControl />}
    </div>
  );
};

export default LobbyControl;
