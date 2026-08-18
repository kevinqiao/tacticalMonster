import React from "react";
import { usePageManager } from "service/PageManager";
import { getHallKind, getRpgCatalog, setTableId } from "./rpgRuntime";

const RpgHall: React.FC = () => {
  const { openPage } = usePageManager();
  const hallKind = getHallKind();
  const cat = getRpgCatalog();
  const tables = cat.tables.filter((table) => table.hallKind === hallKind);
  return (
    <div>
      <div className="rpg-title">{hallKind === "showdown" ? "秀斗馆 · chess / tcg 桌共用周分" : "试炼馆 · 不计周分"}</div>
      {tables.map((table) => {
        const disabled = table.gameType === "tcg";
        return (
          <div
            key={table.id}
            className={`rpg-card${disabled ? " disabled" : ""}`}
            onClick={() => {
              if (disabled) return;
              setTableId(table.id);
              openPage({ uri: "/rpg/preview", data: { tableId: table.id } });
            }}
          >
            <h3>{table.gameType} 桌{disabled ? " · v1 占位" : ""}</h3>
            <p>{hallKind === "showdown" ? "计入周榜" : "产 Pass XP"} · 点桌进预览</p>
          </div>
        );
      })}
    </div>
  );
};

export default RpgHall;
