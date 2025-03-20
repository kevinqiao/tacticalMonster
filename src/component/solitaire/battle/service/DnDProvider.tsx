import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useRef } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { Card, IDnDContext } from "../types/CombatTypes";
import { DragEventData } from "../view/DnDCard";
import { useCombatManager } from "./CombatManager";
import useCombatAct from "./useCombatAct";

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export const DnDContext = createContext<IDnDContext>({
  canDrag: (id: string | number) => false,
  isTouchDevice: false,
  onDrag: (card: Card, data: DragEventData) => null,
  onDragStart: (card: Card, data: DragEventData) => null,
  onDragEnd: (card: Card, data: DragEventData) => null,
  onDrop: (card: Card, data: DragEventData) => null,
  onDragOver: (card: Card, data: DragEventData) => null
});


const DnDProvider = ({ children }: { children: ReactNode }) => {
  const { game } = useCombatManager();

  const { boardDimension, direction } = useCombatManager();
  const draggingGroupRef = useRef<Card[]>([]);
  const dropTargetsRef = useRef<Card[]>([]);
  const { move } = useCombatAct();

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

  }, [game, boardDimension])
  const onDragStart = useCallback((card: Card, data: DragEventData) => {
    if (card.ele) {
      const cards = game?.cards?.filter((c: Card) => ((c.field || 0) < 2 && c.id === card.id) || (c.field === card.field && c.col === card.col && c.row && c.row >= (card.row || 0)))
      console.log("onDragStart", cards);
      cards?.sort((a, b) => (a.row || 0) - (b.row || 0));
      if (cards) {
        draggingGroupRef.current.push(...cards);
      }
    }
  }, [game, boardDimension])
  const onDragEnd = useCallback((card: Card, data: DragEventData) => {
    console.log("onDragEnd", card, data, dropTargetsRef.current);
    if (dropTargetsRef.current.length > 0) {
      const dropTarget = dropTargetsRef.current[0];
      if (dropTarget) {
        onDrop(card, dropTarget);
      }
    } else {
      console.log("onDragEnd", draggingGroupRef.current);
      draggingGroupRef.current?.forEach((c: Card) => {
        if (c.ele) {
          gsap.to(c.ele, { x: c.x, y: c.y, zIndex: c.zIndex, duration: 0.3 });
        }
      })
    }
    draggingGroupRef.current.length = 0;
    dropTargetsRef.current.length = 0;

  }, [game, boardDimension])
  const onDrop = useCallback((card: Card, target: Card) => {
    console.log("onDrop", card, target);
    // const cards = game?.cards?.filter((c) => c.field === card.field && c.col === card.col && !draggingGroupRef.current.some((c) => c.col === card.col)).sort((a, b) => (a.row || 0) - (b.row || 0));
    // const target = cards?.[cards.length - 1] || card;


    draggingGroupRef.current.forEach((c: Card, index: number) => {
      const zoneNo = (direction === 0 ? (target.field || 0) : ((target.field || 0) === 2 ? 3 : 2))
      c.x = target.x;
      // console.log("onDrop zone:", zoneNo);
      const y = (target.y || 0) + (index + 1) * (zoneNo === 2 ? 1 : -1) * (target.height || 0) * 0.15;
      c.y = y;
      c.field = target.field;
      c.width = target.width;
      c.height = target.height;
      c.col = target.col;
      c.row = (target.row || 0) + index + 1;
      c.zIndex = c.row;
      // console.log("onDrop", c, index);
      if (c.ele) {
        gsap.set(c.ele, { x: c.x, y: c.y, width: c.width, height: c.height, zIndex: c.zIndex });
      }
    })
    move(card.id, { field: target.field || 0, col: target.col || 0, row: target.row || 0 });

  }, [boardDimension, game, direction])

  const onDragOver = useCallback((card: Card, data: DragEventData) => {
    dropTargetsRef.current.length = 0;
    const elements = document.elementsFromPoint(data.x, data.y);
    const dropTargets = elements.filter((el) => el !== card.ele && el.classList.contains('card'))
      .map((el) => el.getAttribute('data-id'))
      .filter((id) => id != null && !draggingGroupRef.current.some((c) => c.id === id));

    dropTargets.forEach((tid) => {
      const t = game?.cards?.find((c: Card) => c.id === tid);
      if (t && t.field !== 1 && t.field !== 3 && t.status) {
        dropTargetsRef.current.push(t);
      }
    })

  }, [boardDimension, game])
  const canDrag = useCallback((id: string) => {
    const card = game?.cards?.find((c: Card) => c.id === id);
    if (!card || card.field === 0 || card.field === 3 || !card.status) return false;
    return true;
  }, [game])

  const value: IDnDContext = {
    isTouchDevice: isTouchDevice(),
    canDrag,
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
    throw new Error("useCombatManager must be used within a CombatProvider");
  }
  return context;
};

export default DnDProvider;

