import { RPG_CODEX_LIBRARIES } from "convex/rpg/architecture";
import React, { useState } from "react";
import { getChessCodex, getLastGameType, getRpgHud, setLastGameType } from "./rpgRuntime";

const RpgCodex: React.FC = () => {
  const [gameType, setGameType] = useState(getLastGameType());
  const hud = getRpgHud();
  const chess = getChessCodex();
  return (
    <div>
      <div className="rpg-hud" style={{ margin: "-16px -16px 12px", border: 0 }}>
        <span>金 III</span>
        <span>{hud.coins} · 票 {hud.tickets}</span>
        <span>尘 {chess.dust}</span>
      </div>
      <div className="rpg-chips">
        {RPG_CODEX_LIBRARIES.map((library) => {
          const disabled = library.gameType === "tcg";
          const active = gameType === library.gameType;
          return (
            <button
              key={library.gameType}
              className={`rpg-chip${active ? " active" : ""}`}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                setGameType(library.gameType);
                setLastGameType(library.gameType);
              }}
            >
              {library.navLabel}{disabled ? " 占位" : ""}
            </button>
          );
        })}
      </div>
      <p className="rpg-note">chessArena · {chess.cards.filter((c) => c.ownedCopies > 0).length}/{chess.cards.length}</p>
      <div className="rpg-grid">
        {chess.cards.map((card) => (
          <div key={card.cardId} className="rpg-hero">
            {card.name}
            <div>{card.ownedCopies > 0 ? `x${card.ownedCopies}` : "未有"}</div>
          </div>
        ))}
      </div>
      <p className="rpg-note">v1 不在这里组 4 人。TCG 库禁用占位。</p>
    </div>
  );
};

export default RpgCodex;
