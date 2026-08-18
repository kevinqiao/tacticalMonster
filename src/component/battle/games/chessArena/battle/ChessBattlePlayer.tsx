import React from "react";
import { usePageManager } from "service/PageManager";
import { submitCurrentGame } from "component/lobby/rpg/rpgRuntime";
import { useChessCombat } from "./ChessCombatManager";
import "./style.css";

const ChessBattlePlayer: React.FC = () => {
  const { game, submitScore } = useChessCombat();
  const { openPage } = usePageManager();
  if (!game) {
    return <div className="chess-arena-empty">加载对局…</div>;
  }
  const finish = async () => {
    const result = submitCurrentGame();
    const score = result.ok ? result.score : game.score;
    await submitScore(score);
    openPage({ uri: "/rpg/result", data: { gameId: game.gameId, score } });
  };
  return (
    <div className="chess-arena-play">
      <div className="chess-arena-hud">
        <span>{game.boss.name} {game.boss.stats.hp.current}/{game.boss.stats.hp.max}</span>
        <span>{game.map.name}</span>
        <button type="button" onClick={finish}>交卷</button>
      </div>
      <div className="chess-arena-board">
        chessArena 棋盘 · Boss 数值固定 · 不按队伍缩放
      </div>
      <div className="chess-arena-team">
        {game.team.map((hero) => (
          <div key={hero.heroId}>{hero.name}</div>
        ))}
      </div>
    </div>
  );
};

export default ChessBattlePlayer;
