import React from "react";
import { usePageManager } from "service/PageManager";
import { getRpgHud, setHallKind } from "./rpgRuntime";

const RpgHome: React.FC = () => {
  const { openPage } = usePageManager();
  const hud = getRpgHud();
  const mins = Math.max(1, Math.round(hud.remainingMs / 60000));
  return (
    <div>
      <div className="rpg-title">对战 · 本小时题 {mins} 分后刷新</div>
      <div
        className="rpg-card"
        onClick={() => {
          setHallKind("showdown");
          openPage({ uri: "/rpg/hall", data: { hallKind: "showdown" } });
        }}
      >
        <h3>秀斗馆</h3>
        <p>多人同题 · 计入周榜</p>
      </div>
      <div
        className="rpg-card"
        onClick={() => {
          setHallKind("trial");
          openPage({ uri: "/rpg/hall", data: { hallKind: "trial" } });
        }}
      >
        <h3>试炼馆</h3>
        <p>单人挑战 · 不计周分</p>
      </div>
    </div>
  );
};

export default RpgHome;
