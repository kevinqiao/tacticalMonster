import React, { useState } from "react";
import { usePageManager } from "service/PageManager";
import { CHESS_LOADOUT_SLOTS } from "convex/chessArena/convex/data/heroCatalog";
import { getChessCodex, getLoadout, joinCurrentTable, setLoadout } from "./rpgRuntime";

const RpgLoadout: React.FC = () => {
  const { openPage } = usePageManager();
  const { cards } = getChessCodex();
  const owned = cards.filter((card) => card.ownedCopies > 0);
  const [slots, setSlots] = useState<string[]>(getLoadout());
  const [error, setError] = useState("");

  const toggle = (heroId: string) => {
    setSlots((current) => {
      if (current.includes(heroId)) return current.filter((id) => id !== heroId);
      if (current.length >= CHESS_LOADOUT_SLOTS) return current;
      return [...current, heroId];
    });
  };

  const enter = () => {
    if (slots.length !== CHESS_LOADOUT_SLOTS) {
      setError("需要 4 名英雄");
      return;
    }
    setLoadout(slots);
    const joined = joinCurrentTable();
    if (!joined.ok) {
      setError(joined.reason ?? "join failed");
      return;
    }
    openPage({ uri: "/rpg/match", data: { gameId: (joined as any).run?.gameId } });
  };

  return (
    <div>
      <div className="rpg-title">chessArena 英雄</div>
      <div className="rpg-grid">
        {owned.map((card) => (
          <div
            key={card.cardId}
            className={`rpg-hero${slots.includes(card.cardId) ? " selected" : ""}`}
            onClick={() => toggle(card.cardId)}
          >
            {card.name}
          </div>
        ))}
      </div>
      <p className="rpg-note">本段基础库已解锁 · 确认后 freeze</p>
      {error && <p className="rpg-note">{error}</p>}
      <button className="rpg-cta" onClick={enter}>进入本题</button>
    </div>
  );
};

export default RpgLoadout;
