import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { getRoutePath } from "component/ludo/util/mapUtils";
import { useConvex, useQuery } from "convex/react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/ludo/convex/_generated/api";
import { CombatEvent, GameModel, ICombatContext } from "../types/CombatTypes";
import CombatEventHandler from "./CombatEventHandler";
import { tokenRoutes } from "./tokenRoutes";

// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);


const boardSize = 15

export const CombatContext = createContext<ICombatContext>({
  boardDimension: { width: 0, height: 0 },
  game: null,
  tokens: [],
  eventQueue: [],
  seatRoutes: {},
  updateBoardDimension: () => { }
});


const CombatProvider = ({ gameId, children }: { gameId: string, children: ReactNode }) => {
  const { user } = useUserManager();
  const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const [game, setGame] = useState<GameModel | null>(null);
  const events: any = useQuery(api.dao.gameEventDao.find, { gameId, lastTime });
  const [boardDimension, setBoardDimension] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  const convex = useConvex();


  const tokens = useMemo(() => {
    return game?.seats.map(seat => seat.tokens).flat();
  }, [game]);
  const seatRoutes = useMemo(() => {
    if (!game) return {};
    const { seats } = game;
    const routes: { [k: number]: { x: number, y: number }[] } = {};
    seats.forEach((seat) => {
      const path = tokenRoutes[seat.no];
      if (path) {
        const route = getRoutePath(path);
        routes[seat.no] = route;
      }
    });
    return routes;
  }, [game])

  const updateBoardDimension = (width: number, height: number) => {
    setBoardDimension({ width, height });
  }
  useEffect(() => {
    console.log("events", events);
    if (Array.isArray(events) && events.length > 0) {
      for (const event of events) {
        if (event.name != "####" && event.actor !== user?.uid) {
          eventQueueRef.current.push(event);
        }
      }
      setLastTime(events[events.length - 1].time);
    }
  }, [events]);
  useEffect(() => {
    const fetchGame = async (gameId: string) => {
      const gameObj = await convex.query(api.dao.gameDao.find, {
        gameId, uid: "1",
        token: "test-token"
      });
      if (gameObj) {
        console.log("gameObj", gameObj)
        gameObj.actDue = gameObj.actDue + Date.now();
        gameObj.seats.forEach((seat: any) => {
          seat.stationEles = {};
          seat.tokens.forEach((token: any) => {
            token.seatNo = seat.no;
          })
        })
        setGame(gameObj);
      }
    }
    fetchGame(gameId);
  }, [gameId])
  useEffect(() => {
    if (game?.currentAction && game?.actDue) {
      const event = { name: "askAct", gameId: game.gameId, data: { ...game.currentAction, duration: game.actDue - Date.now() } }
      eventQueueRef.current.push(event);
    }
  }, [game])


  const value = {
    game,
    tokens,
    eventQueue: eventQueueRef.current,
    seatRoutes,
    boardDimension,
    updateBoardDimension
  };
  return <CombatContext.Provider value={value}> <CombatEventHandler>{children}</CombatEventHandler></CombatContext.Provider>;
};

export const useCombatManager = () => {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error("useCombatManager must be used within a CombatProvider");
  }
  return context;
};

export default CombatProvider;

