import { PageProp } from "component/RenderApp";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import { SSA_URLS } from "service/SSAManager";
import ChessBattlePlayer from "../../battle/games/chessArena/battle/ChessBattlePlayer";
import ChessCombatManager from "../../battle/games/chessArena/battle/ChessCombatManager";
import "./rpg.css";

const ChessArenaPlay: React.FC<PageProp> = ({ visible, data }) => {
  const client = React.useMemo(() => new ConvexReactClient(SSA_URLS.chessArena), []);
  if (!visible) return null;
  return (
    <div className="rpg-shell">
      <ConvexProvider client={client}>
        <ChessCombatManager gameId={data?.gameId}>
          <ChessBattlePlayer />
        </ChessCombatManager>
      </ConvexProvider>
    </div>
  );
};

export default ChessArenaPlay;
