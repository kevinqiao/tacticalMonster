import { PageProp } from "component/RenderApp";
import React from "react";
import { usePageManager } from "service/PageManager";
import "./rpg.css";
import { getLastResult, setHallKind } from "./rpgRuntime";

const RpgResult: React.FC<PageProp> = ({ visible }) => {
  const { openPage } = usePageManager();
  const result = getLastResult();
  if (!visible) return null;
  return (
    <div className="rpg-shell">
      <div className="rpg-body">
        <div className="rpg-title">{result?.score ?? 0} 分</div>
        <p className="rpg-note">
          {result?.weeklyDelta ? `秀斗周分 +${result.weeklyDelta} · 本小时最高已记` : "试炼不计周分"}
        </p>
        <p className="rpg-note">
          +{result?.coins ?? 0} coin · Pass +{result?.passXp ?? 0} XP
          {result?.dust ? ` · 尘 +${result.dust}（chessArena）` : ""}
        </p>
        <button
          className="rpg-cta"
          onClick={() => {
            setHallKind("showdown");
            openPage({ uri: "/rpg/preview" });
          }}
        >
          再战本题
        </button>
        <button className="rpg-cta" style={{ marginTop: 8, background: "#3a435e", color: "#f4f1ea" }} onClick={() => openPage({ uri: "/rpg/home" })}>
          回馆
        </button>
      </div>
    </div>
  );
};

export default RpgResult;
