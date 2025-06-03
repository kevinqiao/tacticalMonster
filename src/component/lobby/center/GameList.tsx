import { PageProp } from "component/RenderApp";
import React, { useCallback } from "react";
import { GameItem, useGameCenterManager } from "service/GameCenterManager";
import "./style.css";
const GameList: React.FC<PageProp> = ({ visible, close }) => {
  const { activeGame, gameList, selectGame } = useGameCenterManager();
  const changeGame = useCallback((game: GameItem) => {
    close?.();
    setTimeout(() => {
      selectGame(game);
    }, 0);

  }, [selectGame]);
  return <div className="game-list-container">

    {activeGame && <div className="game-list-item active" >
      {activeGame.ssa}
    </div>}
    {gameList.filter((game) => game.ssa !== activeGame?.ssa).map((game) => (
      game && <div className="game-list-item" key={game.id} onClick={() => changeGame(game)}>
        {game.ssa}
      </div>
    ))}
  </div>

};

export default GameList;
