import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import { GamePlayerProps } from "component/battle/MatchTypes";
import { SSA_URLS } from "service/SSAManager";
import ChessBattlePlayer from "./ChessBattlePlayer";
import ChessCombatManager from "./ChessCombatManager";
import "./style.css";

const PlayChess: React.FC<GamePlayerProps> = ({ gameId, onGameLoadComplete, onGameSubmit }) => {
  const client = React.useMemo(() => new ConvexReactClient(SSA_URLS.chessArena), []);
  return (
    <div className="chess-arena-game">
      <ConvexProvider client={client}>
        <ChessCombatManager gameId={gameId} onGameLoadComplete={onGameLoadComplete} onGameSubmit={onGameSubmit}>
          <ChessBattlePlayer />
        </ChessCombatManager>
      </ConvexProvider>
    </div>
  );
};

export default PlayChess;
