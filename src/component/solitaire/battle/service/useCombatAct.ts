import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/solitaire/convex/_generated/api";
import useActionAnimate from "../animation/useActionAnimate";
import { useCombatManager } from "./CombatManager";
const useCombatAct = () => {
  const { user } = useUserManager();
  const { game, eventQueue, currentAct, completeAct } = useCombatManager();
  const { playOpenCard } = useActionAnimate();
  const convex = useConvex();
  const move = useCallback(async (cardId: string, to: { field: number, col: number, row: number }) => {

    if (!game || !user || !user.uid) return;
    completeAct();
    const res: any = await convex.mutation(api.service.gameProxy.move, {
      uid: user.uid,
      token: user.token,
      gameId: game.gameId,
      cardId: cardId,
      to: to
    });
    if (res && res.ok && res.result) {
      console.log("play open card result: ", res);
      if (res.result.open && res.result.open.length > 0) {
        playOpenCard({ cards: res.result.open });
      }
      return res.result;
    }

  }, [user, game, convex, playOpenCard, completeAct]);
  const flipCard = useCallback(async () => {
    if (!game || !user || !user.uid) return;
    const seat = game.seats?.find(s => s.uid === user.uid);
    if (!seat || seat.field !== currentAct?.field) return;

    const res: any = await convex.mutation(api.service.gameProxy.flip, {
      uid: user.uid,
      token: user.token,
      gameId: game.gameId,
    });
    if (res && res.ok && res.result) {
      console.log("play open card result: ", res);
      playOpenCard({ cards: res.result.open });
    }
    console.log("move res", res);
  }, [game, user, eventQueue, playOpenCard]);
  return { move, flipCard, currentAct };
};
export default useCombatAct;

