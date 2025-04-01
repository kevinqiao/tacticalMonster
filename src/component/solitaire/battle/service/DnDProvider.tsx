import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useRef } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { useUserManager } from "service/UserManager";
import useActionAnimate from "../animation/useActionAnimate";
import useTurnAnimate from "../animation/useTurnAnimate";
import { Card, IDnDContext } from "../types/CombatTypes";
import { DragEventData } from "../view/DnDCard";
import { useCombatManager } from "./CombatManager";
import useCombatAct from "./useCombatAct";
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export const DnDContext = createContext<IDnDContext>({
  isTouchDevice: false,
  onDrag: (card: Card, data: DragEventData) => null,
  onDragStart: (card: Card, data: DragEventData) => null,
  onDragEnd: (card: Card, data: DragEventData) => null,
  onDrop: (card: Card, targets: string[]) => null,
  onDragOver: (card: Card, data: DragEventData) => null
});


const DnDProvider = ({ children }: { children: ReactNode }) => {
  const { game } = useCombatManager();
  const { user } = useUserManager();
  const { eventQueue, boardDimension, direction, completeAct } = useCombatManager();
  const draggingGroupRef = useRef<Card[]>([]);
  const dropTargetsRef = useRef<string[]>([]);
  const { move } = useCombatAct();
  const { playMove, playOpenCard } = useActionAnimate();
  const { playTurnActed } = useTurnAnimate();
  const onDrag = useCallback((card: Card, data: DragEventData) => {
    // console.log("onDrag", card, data);
    if (!card.ele || !boardDimension) return;
    const { top, left } = boardDimension;

    const x = data.x - left - (card.width || 0) / 2;
    const y = data.y - top - (card.height || 0) / 2;
    if (y < boardDimension.zones[0].top) return;
    if (draggingGroupRef.current) {
      draggingGroupRef.current.forEach((c: Card, index: number) => {
        if (c.ele)
          gsap.set(c.ele, { x, y: y + index * (card.height || 0) * 0.15, zIndex: 1000 + index });
      })
    }
    onDragOver(card, data);

  }, [user, eventQueue, game, boardDimension, direction])
  const onDragStart = useCallback((card: Card, data: DragEventData) => {
    if (card.ele) {
      // console.log("onDragStart", card);
      const cards = game?.cards?.filter((c: Card) => ((c.field || 0) < 2 && c.id === card.id) || (c.field === card.field && c.col === card.col && c.row !== undefined && c.row >= (card.row || 0)))
      // console.log("onDragStart", cards);
      cards?.sort((a, b) => (a.row || 0) - (b.row || 0));
      if (cards) {
        draggingGroupRef.current.push(...cards);
      }
    }
  }, [user, eventQueue, game, boardDimension, direction])
  const onDragEnd = useCallback(async (card: Card, data: DragEventData) => {
    await onDrop(card, dropTargetsRef.current);
    draggingGroupRef.current.length = 0;
    dropTargetsRef.current.length = 0;

  }, [user, game, boardDimension, direction])
  const onDrop = useCallback(async (card: Card, targets: string[]) => {
    if (!game || !boardDimension) return;
    if (targets.length === 0) {
      playMove({ data: { move: draggingGroupRef.current } });
      return;
    }
    const [zone, slot] = targets[0].split("_");

    const field = Number(zone) < 2 ? +zone : (direction === 1 ? (zone === "2" ? 3 : 2) : +zone);
    if (card.field === field && card.col === Number(slot)) {
      playMove({ data: { move: draggingGroupRef.current } });
      return;
    }
    completeAct();
    await executeDrop(card, { field, slot: Number(slot) });


  }, [user, boardDimension, game, direction, move])
  const executeDrop = useCallback(async (card: Card, { field, slot }: { field: number, slot: number }) => {
    if (!game || !boardDimension) return;
    const onComplete = () => {
      if (game?.currentTurn?.actions) {
        game.currentTurn.actions.acted++;
      }
      setTimeout(() => playTurnActed({
        data: {
          uid: game?.currentTurn?.uid,
          acted: game?.currentTurn?.actions.acted
        }, onComplete: () => {
          // completeAct();
          const index = eventQueue.findIndex(e => e.name === "localAct");
          if (index !== -1) {
            eventQueue.splice(index, 1);
          }
        }
      }), 500);
    }
    const cards = game.cards?.filter((c: Card) => c.field === field && c.col === Number(slot));
    const row = cards?.length || 0;
    const col = Number(slot);
    const prePos: Card[] = [];

    draggingGroupRef.current.forEach((c: Card, index: number) => {
      prePos.push({ ...c });
      c.row = row + index;
      c.field = field;
      c.col = col;
    });
    const localEvent = { name: "localAct", data: { cardId: card.id, to: { field, slot: +slot } } };
    eventQueue.push(localEvent);
    playMove({ data: { move: draggingGroupRef.current } });
    const res = await move(card.id, { field, slot: +slot });

    if (res.ok && res.result.open && res.result.open.length > 0) {
      const openCards: Card[] = [];
      res.result.open.forEach((card: Card) => {
        const mcard = game.cards?.find((c) => c.id === card.id);
        if (mcard) {
          mcard.suit = card.suit;
          mcard.rank = card.rank;
          mcard.status = 1;
          openCards.push(mcard);
        }
      });
      playOpenCard({ cards: openCards, onComplete: onComplete });
    } else {
      onComplete();
    }


  }, [user, eventQueue, boardDimension, game, direction, move])

  const onDragOver = useCallback((card: Card, data: DragEventData) => {
    dropTargetsRef.current.length = 0;
    const elements = document.elementsFromPoint(data.x, data.y);
    const dropTargets = elements.filter((el) => el.classList.contains('slot'))
      .map((el) => el.getAttribute('data-id'))
      .filter((id) => id != null);

    if (dropTargets.length > 0)
      dropTargetsRef.current.push(...dropTargets);

  }, [user, boardDimension, game, direction])


  const value: IDnDContext = {
    isTouchDevice: isTouchDevice(),
    onDrag,
    onDragStart,
    onDragEnd,
    onDrop,
    onDragOver,
  };

  return <DnDContext.Provider value={value}>{children}</DnDContext.Provider>;
};
export const useDnDManager = () => {
  const context = useContext(DnDContext);
  if (!context) {
    throw new Error("useDnDManager must be used within a DnDProvider");
  }
  return context;
};

export default DnDProvider;

