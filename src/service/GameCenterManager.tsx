import React, { createContext, useContext, useEffect, useMemo, useState } from "react";



const GAME_LIST = [
  {
    id: "1",
    name: "Solitaire",
    ssa: "solitaire",
    api: "https://limitless-platypus-124.convex.site",
  },
  {
    id: "2",
    name: "Game 2",
    ssa: "ssa2",
    api: "https://limitless-platypus-124.convex.site",
  },
  {
    id: "3",
    name: "Game 3",
    ssa: "ssa3",
    api: "https://limitless-platypus-124.convex.site",
  },
  {
    id: "4",
    name: "Game 4",
    ssa: "ssa4",
    api: "https://limitless-platypus-124.convex.site",
  },
  {
    id: "5",
    name: "Game 5",
    ssa: "ssa5",
    api: "https://limitless-platypus-124.convex.site",
  },



]
export interface GameItem {
  id: string;
  name?: string;
  ssa: string;
  api?: string;
}

interface IGameCenterContext {
  activeGame: GameItem | null;
  gameList: GameItem[];
  selectGame: (game: GameItem) => void;
}
const GameCenterContext = createContext<IGameCenterContext>({
  activeGame: null,
  gameList: [],
  selectGame: () => { },
});



export const GameCenterProvider = ({ children }: { children: React.ReactNode }) => {

  const [activeGame, setActiveGame] = useState<GameItem | null>(null);
  const [games, setGames] = useState<GameItem[]>(GAME_LIST);
  const gameList = useMemo(() => {
    if (activeGame) {
      return games.filter((game) => game.ssa !== activeGame.ssa);
    }
    return games;
  }, [activeGame, games]);

  useEffect(() => {
    setActiveGame(GAME_LIST[0]);
  }, []);
  const value = {
    activeGame,
    gameList,
    selectGame: (game: GameItem) => {
      setActiveGame(game);
    }
  }

  return (
    <GameCenterContext.Provider value={value}>
      {children}
    </GameCenterContext.Provider>
  );
};
export const useGameCenterManager = () => {
  const value = useContext(GameCenterContext);
  if (!value) {
    throw new Error("useGameCenterManager must be used within a GameCenterProvider");
  }
  return value;
};
export default GameCenterProvider;
