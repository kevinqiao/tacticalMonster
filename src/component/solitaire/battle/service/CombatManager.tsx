import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { useConvex, useQuery } from "convex/react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/solitaire/convex/_generated/api";
import { BoardDimension, CombatEvent, GameModel, ICombatContext } from "../types/CombatTypes";
// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export const CombatContext = createContext<ICombatContext>({
  direction: 0,
  // decks: [],
  boardDimension: null,
  game: null,
  currentAct: null,
  eventQueue: [],
  boardContainer: {},
  updateBoardDimension: () => { },
  askAct: () => { },
  completeAct: () => { }
});


const CombatProvider = ({ gameId, children }: { gameId: string, children: ReactNode }) => {
  const boardContainerEleRef: React.MutableRefObject<{ [k: string]: { [k: number]: HTMLDivElement | null } }> = useRef<{ [k: string]: { [k: number]: HTMLDivElement | null } }>({});
  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [game, setGame] = useState<GameModel | null>(null);
  // const decksRef: React.MutableRefObject<Card[]> = useRef<Card[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<number>(0);
  const [currentAct, setCurrentAct] = useState<{ due: number; uid: string } | null>(null);
  const events: any = useQuery(api.dao.gameEventDao.find, { gameId: game?.gameId, lastUpdate });
  const [boardDimension, setBoardDimension] = useState<BoardDimension | null>(null);
  const { user } = useUserManager();

  const convex = useConvex();

  useEffect(() => {
    if (!game) return;
    if (!user || !user.uid) {
      setDirection(0);
      return;
    }
    const seat = game?.seats?.find((s) => s.uid === user.uid);
    if (seat?.field) {
      setDirection(seat.field === 2 ? 0 : 1);
    }
  }, [user, game]);
  useEffect(() => {
    if (Array.isArray(events) && events.length > 0) {
      for (const event of events) {
        if (event.actor !== user?.uid) {
          eventQueueRef.current.push(event);
        }
      }
      setLastUpdate(events[events.length - 1].id);
    }
  }, [events]);

  useEffect(() => {
    const fetchGame = async (gameId: string) => {
      const gameObj = await convex.query(api.dao.gameDao.find, {
        gameId, uid: "1",
        token: "test-token"
      });
      if (gameObj) {
        // console.log("gameObj", gameObj);
        setGame(gameObj);
        if (gameObj.actDue) {

          setCurrentAct({ due: gameObj.actDue ?? -1, uid: gameObj.currentTurn?.uid ?? "" });
        }
        setLastUpdate(gameObj.lastUpdate ?? "####");
      }
    }
    fetchGame(gameId);
  }, [gameId, convex])
  const updateBoardDimension = (boardDimension: BoardDimension) => {
    setBoardDimension(boardDimension);
  }
  const askAct = useCallback((due: number) => {
    // console.log("askAct", game?.currentTurn);
    if (!game || !game.currentTurn) return;
    setCurrentAct({ due, uid: game.currentTurn.uid ?? "" });
  }, [game])
  const completeAct = useCallback(() => {
    setCurrentAct(null);
  }, [game])

  const value = {
    direction,
    // decks: decksRef.current,
    game,
    currentAct,
    eventQueue: eventQueueRef.current,
    boardContainer: boardContainerEleRef.current,
    boardDimension,
    updateBoardDimension,
    askAct,
    completeAct
  };
  return <CombatContext.Provider value={value}>{children}</CombatContext.Provider>;
};

export const useCombatManager = () => {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error("useCombatManager must be used within a CombatProvider");
  }
  return context;
};

export default CombatProvider;

