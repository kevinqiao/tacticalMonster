import gsap from "gsap";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { useCombatManager } from "../service/CombatManager";
import { useSprite } from "../service/SpriteProvider";
const useGameAnimate = () => {
   const { game, boardDimension, direction, currentAct } = useCombatManager();
   const { user } = useUserManager();
   const { spriteRefs, allSpritesLoaded } = useSprite();



   const playGo = useCallback(({ onComplete }: { onComplete?: () => void }) => {
      if (!game) return;
      const go = spriteRefs.get("countdown-go");
      const container = spriteRefs.get("countdown-container");
      if (!go?.current || !container?.current) return;
      const numbers: string[] = ['3', '2', '1', 'GO!'];

      const text = document.createElement('div');
      text.className = 'countdown-text';
      container.current?.appendChild(text);

      // GSAP时间线动画
      const tl = gsap.timeline({
         onComplete: () => {
            gsap.set(go.current, {
               autoAlpha: 0,
            })
            onComplete?.();
         },
      });
      tl.set(go.current, {
         autoAlpha: 1,
      })
      numbers.forEach((number: string) => {
         tl
            .set(text, { innerHTML: number })
            .fromTo(
               text,
               { scale: 0, opacity: 0 },
               {
                  scale: 1,
                  opacity: 1,
                  duration: 0.3,
                  ease: 'power2.out',
               }
            )
            .to(
               text,
               {
                  scale: 1.2,
                  duration: 0.5,
                  ease: 'power1.inOut',
               }
            )
            .to(
               text,
               {
                  scale: 0,
                  opacity: 0,
                  duration: 0.2,
                  ease: 'power2.in',
               }
            );
      });


   }, [spriteRefs, game, direction, allSpritesLoaded, boardDimension])

   return { playGo }
}
export default useGameAnimate;


