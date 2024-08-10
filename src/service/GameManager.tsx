import { useConvex, useQuery } from "convex/react";
import { GameModel } from "model/GameModel";
import { GAME_EVENT, getEventByAct } from "model/Match3Constants";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { CellItem } from "../model/CellItem";
import { BATTLE_LOAD } from "../model/Constants";
import { GameEvent } from "../model/GameEvent";
import { useBattleManager } from "./BattleManager";
import * as GameEngine from "./GameEngine";
import { useSceneManager } from "./SceneManager";
import { useUserManager } from "./UserManager";
interface IGameContext {
  game: GameModel | null;
  gameEvent?: GameEvent | null;
  // action: { act: number; id: number; status: number };
  doAct: (act: number, data: any) => Promise<void>;
}
const GameContext = createContext<IGameContext>({
  game: null,
  gameEvent: null,
  // action: { act: 0, id: 0, status: -1 },
  doAct: async (act: number, data: any) => {
    return;
  },
});

export const GameProvider = ({ gameId, children }: { gameId: string; children: React.ReactNode }) => {
  const gameRef = useRef<GameModel | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastEventRef = useRef<any>({ steptime: 0 });
  const [gameEvent, setGameEvent] = useState<GameEvent | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const { load, battle, setOverReport } = useBattleManager();
  const { visible } = useSceneManager();
  const [laststep, setLaststep] = useState(-1);
  const { user } = useUserManager();

  const events: GameEvent[] | undefined | null = useQuery(api.events.findByGame, {
    gameId,
    laststep,
    // laststep: load === BATTLE_LOAD.REPLAY ? -1 : laststep,
  });

  const convex = useConvex();
  const sync = useCallback(async () => {
    if (!battle?.data) return;
    // console.log("sync game");
    let g: any;
    if (load === BATTLE_LOAD.PLAY || load === BATTLE_LOAD.RELOAD)
      g = await convex.query(api.games.findGame, {
        gameId: gameId as Id<"games">,
      });
    else if (load === BATTLE_LOAD.REPLAY && gameRef.current == null) {
      g = await convex.query(api.games.findInitGame, {
        gameId,
      });
      const allEvents = await convex.query(api.events.findAllByGame, {
        gameId,
      });
      if (allEvents) {
        startTimeRef.current = Date.now();
        setGameEvents(allEvents);
      }
    }

    if (g) {
      g.data.cells.sort((a: CellItem, b: CellItem) => {
        if (a.row === b.row) return a.column - b.column;
        else return a.row - b.row;
      });
      if (gameRef.current) Object.assign(gameRef.current, g);
      else gameRef.current = g;
      if (load !== BATTLE_LOAD.REPLAY) setLaststep(g.laststep);
      setGameEvent({
        id: Date.now() + "" + Math.floor(Math.random() * 100),
        steptime: g.laststep,
        name: "initGame",
        data: g,
      });
    }
  }, [convex, gameId, battle]);

  const processEvents = useCallback(
    (eventList: any[]) => {
      let count = 0;
      if (!gameRef.current) return;
      for (const event of eventList) {
        if (event.name === GAME_EVENT.GOAL_COMPLETE) {
          console.log(event);
        } else if (event.name === GAME_EVENT.GAME_OVER) {
          const result = event.data.result;
          gameRef.current.result = result;
          setGameEvent(event);
          if (gameRef.current.uid === user.uid) setOverReport(1);
          // completeGame(gameId, result);
        } else if (gameRef.current.uid !== user.uid) {
          lastEventRef.current = event;
          // console.log(event);
          setTimeout(() => {
            // console.log(event.steptime + ":" + laststep);
            if (event.steptime > laststep) {
              GameEngine.handleEvent(event.name, event.data, gameRef.current);
              setGameEvent(event);
            }
          }, 10 * count++);
        }
        if (load !== BATTLE_LOAD.REPLAY) setLaststep(event.steptime);
      }
    },
    [gameId, gameRef.current]
  );
  const localAct = useCallback(
    (act: number, data: any) => {
      if (!gameRef.current || !battle) return;

      const actionResult: {
        data: any;
        result: any;
        gameData: {
          lastCellId: number;
          matched: CellItem[];
          move?: number;
          skillBuff?: { skill: number; quantity: number }[];
        };
      } = GameEngine.executeAct(gameRef.current, battle, { act, data });
      if (actionResult) {
        const eventName = getEventByAct(act);
        const steptime = Math.round(Date.now() + user.timelag - battle["startTime"]);
        // console.log("locat act at steptime:" + steptime);
        if (eventName) {
          const event: GameEvent = {
            name: eventName,
            data: {
              ...actionResult.data,
              results: actionResult.result,
              gameData: { ...gameRef.current.data, cells: undefined },
            },
            steptime,
          };
          setGameEvent(event);
        }
      }
      return;
    },
    [battle]
  );
  useEffect(() => {
    if (visible) sync();
  }, [visible, load, sync]);

  useEffect(() => {
    if (events && events.length > 0) {
      console.log(events);
      processEvents(events);
    }
  }, [events, battle, gameRef.current]);

  useEffect(() => {
    if (gameEvents?.length === 0 || load !== BATTLE_LOAD.REPLAY) return;
    const timer = setInterval(() => {
      const pastTime = Date.now() - startTimeRef.current;
      const laststep = lastEventRef.current.steptime;
      // console.log(pastTime + ":" + laststep);
      if (pastTime - laststep > 500) {
        const pastEvents = gameEvents
          .filter((event) => event.steptime && event.steptime > laststep && event.steptime < pastTime)
          .sort((a, b) => a.steptime - b.steptime);
        // console.log(pastEvents);
        if (pastEvents?.length > 0) {
          processEvents(pastEvents);
        }
      }
    }, 400);
    return () => {
      clearInterval(timer);
    };
  }, [gameEvents, processEvents]);

  const value = {
    load,
    // action: actionRef.current,
    game: gameRef.current,
    gameEvent,
    doAct: useCallback(
      async (act: number, data: any) => {
        if (user && load !== BATTLE_LOAD.REPLAY && gameRef.current && battle) {
          localAct(act, data);
          // const move = battle?.data.steps - gameRef.current.data.move;
          // if (move <= 0) setBattleOver(1);
          await convex.action(api.gameService.doAct, {
            act,
            uid: user.uid,
            token: user.token,
            gameId,
            data,
          });
        }
      },
      [load, battle, user, convex, gameId]
    ),
  };

  return <GameContext.Provider value={value}> {children} </GameContext.Provider>;
};
export const useGameManager = () => {
  return useContext(GameContext);
};

export default GameProvider;
