import { useConvex } from "convex/react";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/solitaire/convex/_generated/api";
import useActionAnimate from "../animation/useActionAnimate";
import { useCombatManager } from "./CombatManager";
const useCombatAct = () => {
  const { user } = useUserManager();
  const { game, eventQueue } = useCombatManager();
  const { playOpenCard } = useActionAnimate();
  const convex = useConvex();
  const move = useCallback(async (cardId: string, to: { field: number, col: number, row: number }) => {
    if (!game || !user || !user.uid) return;
    const res: any = await convex.mutation(api.service.gameProxy.move, {
      uid: user.uid,
      token: user.token,
      gameId: game.gameId,
      cardId: cardId,
      to: to
    });
    if (res && res.ok && res.result) {
      console.log("play open card result: ", res);
      playOpenCard({ cards: res.result.open });
    }
    console.log("move res", res);
  }, [game, eventQueue, playOpenCard]);
  const flipCard = useCallback(async () => {
    if (!game || !user || !user.uid) return;
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
  }, [game, eventQueue, playOpenCard]);
  return { move, flipCard };
};
export default useCombatAct;

