import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useRef } from "react";
// import useCombatAnimate from "../animation/useCombatAnimate_bak";
import { useUserManager } from "service/UserManager";
import { Card, IDnDContext } from "../types/CombatTypes";
import { cardCoord } from "../utils";
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
  onDrop: (card: Card, target: string) => null,
  onDragOver: (card: Card, data: DragEventData) => null
});


const DnDProvider = ({ children }: { children: ReactNode }) => {
  const { game } = useCombatManager();
  const { user } = useUserManager();
  const { boardDimension, direction } = useCombatManager();
  const draggingGroupRef = useRef<Card[]>([]);
  const dropTargetsRef = useRef<string[]>([]);
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

  }, [user, game, boardDimension, direction])
  const onDragStart = useCallback((card: Card, data: DragEventData) => {
    if (card.ele) {
      console.log("onDragStart", card);
      const cards = game?.cards?.filter((c: Card) => ((c.field || 0) < 2 && c.id === card.id) || (c.field === card.field && c.col === card.col && c.row !== undefined && c.row >= (card.row || 0)))
      console.log("onDragStart", cards);
      cards?.sort((a, b) => (a.row || 0) - (b.row || 0));
      if (cards) {
        draggingGroupRef.current.push(...cards);
      }
    }
  }, [user, game, boardDimension, direction])
  const onDragEnd = useCallback(async (card: Card, data: DragEventData) => {
    console.log("onDragEnd", card, data, dropTargetsRef.current);
    // const dropTarget = dropTargetsRef.current[0];
    if (dropTargetsRef.current.length > 0) {
      const dropTarget = dropTargetsRef.current[0];
      if (dropTarget) {
        await onDrop(card, dropTarget);
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

  }, [user, game, boardDimension, direction])
  const onDrop = useCallback(async (card: Card, target: string) => {
    if (!game || !boardDimension || !user || !user.uid) return;
    const [zone, slot] = target.split("_");
    const field = Number(zone) < 2 ? +zone : (direction === 1 ? (zone === "2" ? 3 : 2) : +zone);
    const cards = game.cards?.filter((c: Card) => c.field === field && c.col === Number(slot));
    const row = cards?.length || 0;
    const col = Number(slot);
    const prePos: Card[] = [];
    draggingGroupRef.current.forEach((c: Card, index: number) => {
      // const { id, field, col, row, ele } = c;
      prePos.push({ ...c });
      c.row = row + index;
      c.field = field;
      c.col = col;
      const coord = cardCoord(c.field || 0, c.col || 0, c.row || 0, boardDimension, direction);
      if (c.ele) {
        gsap.set(c.ele, { x: coord.x, y: coord.y, width: coord.cwidth, height: coord.cheight, zIndex: c.row })
      }
    });

    const res = await move(card.id, { field, slot: +slot });
    if (!res) {
      prePos.forEach((c) => {
        const coord = cardCoord(c.field || 0, c.col || 0, c.row || 0, boardDimension, direction);
        if (c.ele)
          gsap.to(c.ele, { x: coord.x, y: coord.y, width: coord.cwidth, height: coord.cheight, zIndex: c.row, duration: 0.3 })
      })
    }


  }, [boardDimension, game, direction, user, move])

  const onDragOver = useCallback((card: Card, data: DragEventData) => {
    dropTargetsRef.current.length = 0;
    const elements = document.elementsFromPoint(data.x, data.y);
    // const slotTargets = elements.filter((el) => el.classList.contains('slot')).map((el) => el.getAttribute('data-id'))
    // console.log("slotTargets", slotTargets);
    const dropTargets = elements.filter((el) => el.classList.contains('slot'))
      .map((el) => el.getAttribute('data-id'))
      .filter((id) => id != null);
    if (dropTargets.length > 0)
      dropTargetsRef.current.push(...dropTargets);

  }, [boardDimension, game, direction])


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

