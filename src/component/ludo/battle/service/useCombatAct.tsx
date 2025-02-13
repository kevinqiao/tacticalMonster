import { useConvex } from "convex/react";
import { gsap } from "gsap";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { Skill } from "../types/CharacterTypes";

import { useCombatManager } from "./CombatManager";

const useCombatAct = () => {

  const { user } = useUserManager();
  const { game, eventQueue, currentRound, seatRoutes, boardDimension } = useCombatManager()
  const convex = useConvex();

  const roll = useCallback(async (seatNo: number) => {

    const seat = game?.seats.find((s) => s.no === seatNo);
    if (!seat) return;
    const { tokens } = seat;
    const token = tokens.find((t) => t.x >= 0);
    if (!token) return;
    console.log(token)
    const route = seatRoutes[seatNo];
    if (!route) return;
    console.log(route)
    const cpos = route.findIndex((c) => c.x === token.x && c.y === token.y);
    const path = route.slice(cpos, cpos + 4 > route.length ? route.length - 1 : cpos + 4);
    console.log(path)
    if (token.ele && path.length > 0) {
      const tl = gsap.timeline({
        onComplete: () => {
          console.log("onComplete")
          token.x = path[path.length - 1].x;
          token.y = path[path.length - 1].y;
        }
      });
      path.forEach((p) => {
        if (token.ele) {
          tl.to(token.ele, {
            x: p.x / 15 * boardDimension.width,
            y: p.y / 15 * boardDimension.height,
            duration: 0.3, ease: "power2.inOut"
          }, ">")
        }
      })
      tl.play();

    }

  }, [convex, eventQueue, seatRoutes, game]);

  const useSkill = useCallback(async (skill: Skill) => {

    if (!currentRound || !game) return;

  }, [currentRound, game]);


  return { roll, useSkill };
};
export default useCombatAct;

