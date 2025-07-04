import { useConvex } from "convex/react";
import { useCallback, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/solitaire/convex/_generated/api";
import useActionAnimate from "../animation/useActionAnimate";
import { Card } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
const useCombatAct = () => {
  const actRef = useRef<number>(0);
  const { user } = useUserManager();
  const { game, eventQueue, currentAct, completeAct, boardDimension, direction } = useCombatManager();
  const { playOpenCard } = useActionAnimate();
  const convex = useConvex();


  const onActComplete = useCallback(() => {
    const index = eventQueue.findIndex(e => e.name === "localAct");
    if (index !== -1) {
      eventQueue.splice(index, 1);
    }

  }, [user, eventQueue, game, boardDimension, completeAct, direction]);

  const move = useCallback(async (cardId: string, to: { field: number, slot: number }) => {

    if (!game || actRef.current > 0) {
      return;
    }

    actRef.current = Date.now();
    const res: any = await convex.mutation(api.service.gameProxy.move, {
      uid: user.uid,
      token: user.token,
      gameId: game.gameId,
      cardId: cardId,
      to: to
    });
    // console.log("move result", res)
    actRef.current = 0;
    return res;

  }, [user, currentAct, game, direction, eventQueue]);
  const flipCard = useCallback(async () => {

    if (actRef.current > 0) {
      return;
    }
    console.log("flipCard", currentAct);
    if (!game || !currentAct || !user || !user.uid || currentAct.uid !== user.uid) return;
    const localEvent = { name: "localAct", data: {} };
    eventQueue.push(localEvent);
    actRef.current = Date.now();
    const res: any = await convex.mutation(api.service.gameProxy.flip, {
      uid: user.uid,
      token: user.token,
      gameId: game.gameId,
    });
    actRef.current = 0;
    if (res && res.ok && res.result) {
      console.log("play open card result: ", res);
      const openCards: Card[] = [];
      res.result.open.forEach((card: Card) => {
        const mcard = game.cards?.find((c) => c.id === card.id);
        if (mcard) {
          mcard.suit = card.suit;
          mcard.rank = card.rank;
          mcard.col = card.col;
          mcard.status = 1;
          openCards.push(mcard);
        }
      });

      playOpenCard({ data: { open: openCards }, onComplete: onActComplete });
    }
  }, [eventQueue, game, currentAct, user, playOpenCard, direction]);

  return { move, flipCard, currentAct };
};
export default useCombatAct;

