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

  const move = useCallback(async (cardId: string, to: { field: number, slot: number }) => {
    console.log("move", cardId, to, user);
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

  }, [user, currentAct, game, playOpenCard, completeAct]);
  const flipCard = useCallback(async () => {
    console.log("flipCard", game, currentAct, user, user.uid);
    if (!game || !currentAct || !user || !user.uid || currentAct.uid !== user.uid) return;

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
  }, [game, currentAct, user, eventQueue, playOpenCard]);

  return { move, flipCard, currentAct };
};
export default useCombatAct;

