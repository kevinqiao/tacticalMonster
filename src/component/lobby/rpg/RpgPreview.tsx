import React from "react";
import { usePageManager } from "service/PageManager";
import { getHallKind, previewCurrentTable } from "./rpgRuntime";

const RpgPreview: React.FC = () => {
  const { openPage } = usePageManager();
  const hallKind = getHallKind();
  const preview = previewCurrentTable();
  const boss = preview.preview && "boss" in preview.preview ? preview.preview.boss : null;
  const map = preview.preview && "map" in preview.preview ? preview.preview.map : null;
  return (
    <div>
      <div className="rpg-title">
        {hallKind === "showdown" ? "秀斗" : "试炼"} · chess
      </div>
      <div className="rpg-card">
        <h3>{map?.name ?? "地图预览"} · 固定 Boss</h3>
        <p>
          {boss ? `${boss.name} · ${boss.tags.join(" / ")} · HP ${boss.hp}` : "加载中"}
        </p>
      </div>
      <p className="rpg-note">基础 4 人可通关。克制只加分，不挡进场，不缩 Boss。</p>
      <button className="rpg-cta" onClick={() => openPage({ uri: "/rpg/loadout" })}>
        组 4 人
      </button>
    </div>
  );
};

export default RpgPreview;
