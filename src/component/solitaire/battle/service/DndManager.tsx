import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { Card, IDnDContext } from "../types/CombatTypes";
import { DragEventData } from "../view/DnDCard";
import { useCombatManager } from "./CombatManager";
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export const DnDContext = createContext<IDnDContext>({
  draggingCard: null,
  activeDrops: {},
  canDrag: (id: string | number) => false,
  canDrop: (id: string | number) => false,
  isTouchDevice: false,
  onDrag: (card: Card, data: DragEventData) => null,
  onDragStart: (card: Card, data: DragEventData) => null,
  onDragEnd: (card: Card, data: DragEventData) => null,
  onDrop: (card: Card, data: DragEventData) => null,
  onDragOver: (card: Card, data: DragEventData) => null
});

console.log("isTouchDevice", isTouchDevice());
const DnDProvider = ({ children }: { children: ReactNode }) => {
  const { game } = useCombatManager();
  const [draggingCard, setDraggingCard] = useState<{ card: Card, clientX: number, clientY: number } | null>(null);
  const [activeDrops, setActiveDrops] = useState<{ [k: string]: { card: Card } }>({});
  const { boardDimension } = useCombatManager()

  const onDrag = useCallback((card: Card, data: DragEventData) => {
    console.log("onDrag", card, data);
    if (!card.ele || !boardDimension) return;
    const { top, left } = boardDimension;
    gsap.set(card.ele, { x: data.x - left - (card.width || 0) / 2, y: data.y - top - (card.height || 0) / 2 });
  }, [boardDimension])
  const onDragStart = useCallback((card: Card, data: DragEventData) => {
    console.log("onDragStart", card, data);
    if (card.ele) {
      gsap.set(card.ele, { zIndex: 1000 });
    }

  }, [boardDimension])
  const onDragEnd = useCallback((card: Card, data: DragEventData) => {
    console.log("onDragEnd", card, data);
    if (card.ele) {
      gsap.to(card.ele, { x: card.x, y: card.y, zIndex: card.row, duration: 0.3 });
    }
  }, [boardDimension])
  const onDrop = useCallback((card: Card, data: DragEventData) => {
    console.log("onDrop", card, data);
    if (game && data.id) {
      const draggedCard = game.cards?.find((c: Card) => c.id === data.id);
      if (draggedCard && draggedCard.ele) {
        draggedCard.x = card.x;
        const y = (card.y || 0) + (card.height || 0) * 0.15;
        draggedCard.y = y;
        draggedCard.width = card.width;
        draggedCard.height = card.height;
        draggedCard.col = card.col;
        draggedCard.row = (card.row || 0) + 1;
        const { x, width, height } = draggedCard;
        gsap.set(draggedCard.ele, { x, y, width, height, zIndex: draggedCard.row });

      }
    }
  }, [boardDimension, game])
  const onDragOver = useCallback((card: Card, data: DragEventData) => {

  }, [boardDimension, game])
  const canDrag = useCallback((id: string) => {
    const card = game?.cards?.find((c: Card) => c.id === id);
    if (!card || card.field === 0 || !card.status) return false;
    return true;
  }, [game])
  const canDrop = useCallback((id: string) => {
    const card = game?.cards?.find((c: Card) => c.id === id);
    if (!card || card.field === 1 || !card.status) return false;
    return true;
  }, [game])
  const value: IDnDContext = {
    draggingCard,
    activeDrops,
    isTouchDevice: isTouchDevice(),
    canDrag,
    canDrop,
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

