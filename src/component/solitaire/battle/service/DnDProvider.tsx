import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useRef } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { useUserManager } from "service/UserManager";
import { Card, IDnDContext } from "../types/CombatTypes";
import { DragEventData } from "../view/DnDCard";
import { useCombatManager } from "./CombatManager";
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export const DnDContext = createContext<IDnDContext>({
  isTouchDevice: false,
  onDrag: (card: Card, data: DragEventData) => null,
  onDragStart: (card: Card, data: DragEventData) => null,
  onDragEnd: (card: Card, data: DragEventData) => null,
  onDragOver: (card: Card, data: DragEventData) => null
});


const DnDProvider = ({ onDrop, children }: { onDrop?: (cards: Card[], targets: string[]) => Promise<void>, children: ReactNode }) => {
  const { game } = useCombatManager();
  const { user } = useUserManager();
  const { eventQueue, boardDimension, direction, completeAct } = useCombatManager();
  const draggingGroupRef = useRef<Card[]>([]);
  const dropTargetsRef = useRef<string[]>([]);
  const onDrag = useCallback((card: Card, data: DragEventData) => {

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
    if (onDrop) {
      await onDrop(draggingGroupRef.current, dropTargetsRef.current);
    }
    draggingGroupRef.current.length = 0;
    dropTargetsRef.current.length = 0;

  }, [user, game, boardDimension, direction])

  const onDragOver = useCallback((card: Card, data: DragEventData) => {
    dropTargetsRef.current.length = 0;
    const elements = document.elementsFromPoint(data.x, data.y);
    const dropTargets = elements.filter((el) => el.classList.contains('slot'))
      .map((el) => el.getAttribute('data-id'))
      .filter((id) => id != null);

    if (dropTargets.length > 0)
      dropTargetsRef.current.push(...dropTargets);

  }, [])


  const value: IDnDContext = {
    isTouchDevice: isTouchDevice(),
    onDrag,
    onDragStart,
    onDragEnd,
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

