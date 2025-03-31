import { useConvex } from "convex/react";
import { useCallback, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/solitaire/convex/_generated/api";
import useActionAnimate from "../animation/useActionAnimate";
import useTurnAnimate from "../animation/useTurnAnimate";
import { Card } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
const useCombatAct = () => {
  const actRef = useRef<number>(0);
  const { user } = useUserManager();
  const { game, eventQueue, currentAct, completeAct, boardDimension, direction } = useCombatManager();
  const { playOpenCard } = useActionAnimate();
  const convex = useConvex();
  const { playTurnActed } = useTurnAnimate();

  const onActComplete = useCallback(() => {
    if (game?.currentTurn?.actions) {
      game.currentTurn.actions.acted++;
    }
    playTurnActed({
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
    })
  }, [eventQueue, game, boardDimension, playTurnActed, completeAct, direction]);

  const move = useCallback(async (cardId: string, to: { field: number, slot: number }) => {

    if (actRef.current > 0) {
      return;
    }
    const localEvent = { name: "localAct", data: { cardId, to } };
    eventQueue.push(localEvent);
    if (!game || !user || !user.uid) return;
    actRef.current = Date.now();
    completeAct();
    const res: any = await convex.mutation(api.service.gameProxy.move, {
      uid: user.uid,
      token: user.token,
      gameId: game.gameId,
      cardId: cardId,
      to: to
    });
    actRef.current = 0;
    if (res && res.ok && res.result) {
      if (res.result.open && res.result.open.length > 0) {
        playOpenCard({ cards: res.result.open, onComplete: onActComplete });
      } else {
        onActComplete();
      }


      return res.result;
    }

  }, [user, currentAct, game, playOpenCard, completeAct, direction, eventQueue]);
  const flipCard = useCallback(async () => {
    console.log("flipCard", game, currentAct, user, user.uid);
    if (actRef.current > 0) {
      return;
    }
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
          mcard.status = 1;
          openCards.push(mcard);
        }
      });
      playOpenCard({ cards: openCards, onComplete: onActComplete });
    }

    console.log("move res", res);
  }, [eventQueue, game, currentAct, user, playOpenCard, direction]);

  return { move, flipCard, currentAct };
};
export default useCombatAct;

