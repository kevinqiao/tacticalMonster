import React from "react";
import { usePageManager } from "service/PageManager";
import { getLeague, rpgUid } from "./rpgRuntime";

const RpgLeague: React.FC = () => {
  const { openPage } = usePageManager();
  const board = getLeague();
  const uid = rpgUid();
  return (
    <div>
      <div className="rpg-title">金 III · Pod {Math.max(board.length, 1)}/30</div>
      <p className="rpg-note">chess + tcg 秀斗合计。不按图鉴战力排序。</p>
      {(board.length ? board : [{ uid, points: 0 }]).map((row, index) => (
        <div key={row.uid} className="rpg-card">
          <h3>
            {index + 1} {row.uid === uid ? "你" : row.uid}
          </h3>
          <p>{row.points} 分</p>
        </div>
      ))}
      <p className="rpg-note">升段区 1-3 · 保段 4-8</p>
      <button className="rpg-cta" onClick={() => openPage({ uri: "/rpg/home" })}>
        回对战看题
      </button>
    </div>
  );
};

export default RpgLeague;
