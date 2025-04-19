import gsap from "gsap";
import { useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";
import { useCombatManager } from "../service/CombatManager";
import { useSprite } from "../service/SpriteProvider";
const useTurnAnimate = () => {
   const { game, boardDimension, direction } = useCombatManager();
   const { user } = useUserManager();
   const { spriteRefs, allSpritesLoaded } = useSprite();


   const getTurnBarNo = useCallback((uid: string | undefined) => {
      if (!game || !uid) return -1;
      const seat = game.seats?.find(seat => seat.uid === uid);
      if (!seat) return -1;

      const turnBarNo = direction === 0 ? seat.field - 2 : 3 - seat.field;
      return turnBarNo;
   }, [game, direction])
   const playTurnActed = useCallback(({ data, onComplete }: { data: any, onComplete?: () => void }) => {

      if (!boardDimension || !game) {
         return;
      }
      const turnBarNo = getTurnBarNo(game.currentTurn?.uid);
      const actedItemRef = spriteRefs.get("turn-bar-item-" + turnBarNo + "-" + data.act);

      if (actedItemRef?.current)
         actedItemRef.current.style.backgroundColor = "red";
      onComplete?.();

   }, [game, direction, boardDimension])
   const playTurnActing = useCallback(({ data, onComplete }: { data: any, onComplete?: () => void }) => {

      if (!boardDimension || !game) {
         return;
      }

      const turnBarNo = getTurnBarNo(game.currentTurn?.uid);
      const toItemRef = spriteRefs.get("turn-bar-item-" + turnBarNo + "-" + data.act);

      if (toItemRef?.current)
         toItemRef.current.style.backgroundColor = "green";
      onComplete?.();

   }, [game, direction, boardDimension])

   const playTurnOver = useCallback(({ data, onComplete }: { data: any, onComplete?: () => void }) => {

      if (!boardDimension || !game) {
         return;
      }
      const turnBarNo = getTurnBarNo(data.uid);
      const turnBarRef = spriteRefs.get("turn-bar-" + turnBarNo);
      if (!turnBarRef?.current) return;
      gsap.set(turnBarRef.current, {
         autoAlpha: 0,
      })
      for (let i = 1; i <= (game.currentTurn?.actions?.max ?? 0); i++) {
         const turnBarItemRef = spriteRefs.get("turn-bar-item-" + turnBarNo + "-" + i);
         if (!turnBarItemRef?.current) continue;
         turnBarItemRef.current.style.backgroundColor = "grey";
      }
      onComplete?.();
   }, [game, direction, boardDimension])
   const playTurnStart = useCallback((data: any, onComplete: () => void) => {
      if (!boardDimension || !game) {
         return;
      }
      const turnBarNo = getTurnBarNo(data.uid);
      const turnBarRef = spriteRefs.get("turn-bar-" + turnBarNo);
      if (!turnBarRef?.current) return;

      const yourTurn = spriteRefs.get("your-turn");
      const turnText = spriteRefs.get("your-turn-text");
      if (!yourTurn?.current || !turnText?.current) return;
      const { uid } = data;
      const turnTextContent = user?.uid ? (uid === user?.uid ? "Your Turn" : "Opponent Turn") : uid + " Turn";
      gsap.set(turnText.current, {
         innerHTML: turnTextContent,
      })
      const tl = gsap.timeline(
         {
            onComplete: () => {
               tl.kill();
               onComplete();
            }
         }
      );

      tl.to(yourTurn.current, {
         autoAlpha: 1,
         duration: 0.3,
      })
      tl.to(yourTurn.current, {
         autoAlpha: 0,
         duration: 0.1,
      }, ">+=1")
      tl.to(turnBarRef.current, {
         autoAlpha: 1,
         duration: 0.3,
      }, ">+=0.3")
      tl.play();

   }, [user, spriteRefs, game, boardDimension, direction])
   const playInitTurn = useCallback(() => {

      if (!game || !game.currentTurn || !allSpritesLoaded) return;
      const turnBarNo = getTurnBarNo(game.currentTurn?.uid);
      const activeBar = spriteRefs.get("turn-bar-" + turnBarNo);
      const inactiveBar = spriteRefs.get("turn-bar-" + (turnBarNo === 1 ? 0 : 1));

      if (!activeBar?.current || !inactiveBar?.current) return;
      gsap.set(activeBar.current, {
         autoAlpha: 1,
      })
      gsap.set(inactiveBar.current, {
         autoAlpha: 0,
      })
      const max = game.currentTurn?.actions.max;
      const acted = game.currentTurn?.actions.acted?.length ?? 0;

      for (let i = 1; i <= max; i++) {
         const turnBarItemRef = spriteRefs.get("turn-bar-item-" + turnBarNo + "-" + i);
         if (!turnBarItemRef?.current) continue;
         turnBarItemRef.current.style.display = "block";
         if (i <= acted) {
            turnBarItemRef.current.style.backgroundColor = "red";
         } else if (i === acted + 1) {
            turnBarItemRef.current.style.backgroundColor = "green";
         } else {
            turnBarItemRef.current.style.backgroundColor = "grey";
         }
      }
      for (let i = 0; i < 4; i++) {
         const foundationCards = spriteRefs.get("foundation-ground-card" + i)?.current;
         if (foundationCards) {
            gsap.set(foundationCards, {
               autoAlpha: 1,
            })
         }
      }

   }, [spriteRefs, game, direction, allSpritesLoaded, boardDimension])
   useEffect(() => {
      if (game && game?.status > 0) playInitTurn();
   }, [game, playInitTurn, boardDimension, direction])

   return { playTurnStart, playInitTurn, playTurnActed, playTurnActing, playTurnOver }
}
export default useTurnAnimate;


