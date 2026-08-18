import { api } from "convex/chessArena/convex/_generated/api";
import { useConvex } from "convex/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ChessGameState } from "convex/chessArena/convex/service/createGame";
import { getCurrentGame } from "component/lobby/rpg/rpgRuntime";

type ChessCombatValue = {
  game: ChessGameState | null;
  submitScore: (score: number) => Promise<void>;
};

const ChessCombatContext = createContext<ChessCombatValue>({
  game: null,
  submitScore: async () => undefined,
});

export const useChessCombat = () => useContext(ChessCombatContext);

const ChessCombatManager: React.FC<{
  gameId?: string;
  children: React.ReactNode;
  onGameLoadComplete?: () => void;
  onGameSubmit?: () => void;
}> = ({ gameId, children, onGameLoadComplete, onGameSubmit }) => {
  const convex = useConvex();
  const [game, setGame] = useState<ChessGameState | null>(getCurrentGame());

  useEffect(() => {
    const load = async () => {
      const local = getCurrentGame();
      if (local && (!gameId || local.gameId === gameId)) {
        setGame(local);
        onGameLoadComplete?.();
        return;
      }
      if (!gameId) return;
      try {
        const loaded = await convex.action(api.proxy.controller.loadGame, { gameId });
        if (loaded?.ok && loaded.game) {
          setGame(loaded.game);
          onGameLoadComplete?.();
          return;
        }
        const queried = await convex.query(api.service.gameManager.loadGame, { gameId });
        if (queried?.ok && queried.data) {
          setGame(queried.data);
          onGameLoadComplete?.();
        }
      } catch {
        if (local) {
          setGame(local);
          onGameLoadComplete?.();
        }
      }
    };
    load();
  }, [gameId, convex, onGameLoadComplete]);

  const submitScore = useCallback(async (score: number) => {
    if (!game) return;
    try {
      await convex.action(api.proxy.controller.submitScore, { gameId: game.gameId, score });
    } catch {
      // Portal HTTP 未部署时由页面 runtime settle。
    }
    onGameSubmit?.();
  }, [convex, game, onGameSubmit]);

  return (
    <ChessCombatContext.Provider value={{ game, submitScore }}>
      {children}
    </ChessCombatContext.Provider>
  );
};

export default ChessCombatManager;
