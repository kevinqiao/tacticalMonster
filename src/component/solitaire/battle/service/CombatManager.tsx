import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { Card, CombatEvent, GameModel, ICombatContext } from "../types/CombatTypes";
import CombatEventHandler from "./CombatEventHandler";


// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export const CombatContext = createContext<ICombatContext>({
  decks: [],
  boardDimension: { width: 0, height: 0 },
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

  // const events: any = useQuery(api.dao.gameEventDao.find, { gameId: game?.gameId, lastUpdate });
  const [boardDimension, setBoardDimension] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  useEffect(() => {
    if (gameId) {
      const suits = ['♠', '♥', '♦', '♣'];
      const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const newDeck: Card[] = [];
      let id = 0
      suits.forEach(suit => {
        values.forEach(rank => {
          id++
          newDeck.push({ zone: 1, id: `${id}` });
          decksRef.current?.push({ zone: 1, suit, rank, id: `${id}` });
        });
      });
      setGame({ gameId, cards: newDeck, status: 0 })
    }

  }, [gameId])
  // const cards = useMemo(() => {
  //   const suits = ['♠', '♥', '♦', '♣'];
  //   const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  //   const newDeck: Card[] = [];
  //   let id = 0
  //   suits.forEach(suit => {
  //     values.forEach(rank => {
  //       id++
  //       newDeck.push({ zone: 1, suit, rank, id: `${id}` });
  //     });
  //   });
  //   // newDeck.forEach((card, index) => {
  //   //   if (index < 28) {
  //   //     const dealPos = dealData[index];
  //   //     card.zone = 2;
  //   //     card.col = dealPos.pile;
  //   //     card.row = dealPos.row;
  //   //   }
  //   // })
  //   return newDeck
  // }, [])

  const updateBoardDimension = (width: number, height: number) => {
    setBoardDimension({ width, height });
  }




  const value = {
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

