import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../../../convex/solitaire/convex/_generated/api";
import { BoardDimension, Card, CombatEvent, GameModel, ICombatContext } from "../types/CombatTypes";
import CombatEventHandler from "./CombatEventHandler";


// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export const CombatContext = createContext<ICombatContext>({
  direction: 0,
  decks: [],
  boardDimension: null,
  game: null,
  eventQueue: [],
  boardContainer: {},
  updateBoardDimension: () => { }
});


const CombatProvider = ({ gameId, children }: { gameId: string, children: ReactNode }) => {
  const boardContainerEleRef: React.MutableRefObject<{ [k: string]: { [k: number]: HTMLDivElement | null } }> = useRef<{ [k: string]: { [k: number]: HTMLDivElement | null } }>({});
  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [game, setGame] = useState<GameModel | null>(null);
  const decksRef: React.MutableRefObject<Card[]> = useRef<Card[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<number>(0);
  const events: any = useQuery(api.dao.gameEventDao.find, { gameId: game?.gameId, lastUpdate });
  const [boardDimension, setBoardDimension] = useState<BoardDimension | null>(null);
  const convex = useConvex();


  useEffect(() => {
    const fetchGame = async (gameId: string) => {
      const gameObj = await convex.query(api.dao.gameDao.find, {
        gameId, uid: "1",
        token: "test-token"
      });
      if (gameObj) {
        console.log("gameObj", gameObj);
        setGame({ ...gameObj, status: 0 });
        setLastUpdate(gameObj.lastUpdate ?? "####");
      }
    }
    fetchGame(gameId);
  }, [gameId, convex])
  const updateBoardDimension = (boardDimension: BoardDimension) => {
    setBoardDimension(boardDimension);
  }

  const value = {
    direction,
    decks: decksRef.current,
    game,
    eventQueue: eventQueueRef.current,
    boardContainer: boardContainerEleRef.current,
    boardDimension,
    updateBoardDimension,
  };
  return <CombatContext.Provider value={value}><CombatEventHandler>{children}</CombatEventHandler></CombatContext.Provider>;
};

export const useCombatManager = () => {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error("useCombatManager must be used within a CombatProvider");
  }
  return context;
};

export default CombatProvider;

