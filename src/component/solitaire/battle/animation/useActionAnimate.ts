import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { useSprite } from "../service/SpriteProvider";
import { Card } from "../types/CombatTypes";
import { cardCoord } from "../utils";
const useActionAnimate = () => {
   const { spriteRefs } = useSprite();
   const { game, boardDimension, direction } = useCombatManager();



   const playOpenCard = useCallback(({ cards, onComplete }: { cards: Card[], onComplete?: () => void }) => {
      if (!boardDimension || !game || !cards || cards.length === 0) {
         onComplete?.();
         return;
      }
      console.log("playOpenCard", cards);
      // const openCards = cards.map((c) => {
      //    const card = game.cards?.find((card) => card.id === c.id);
      //    if (card) {
      //       Object.assign(card, c);
      //       card.status = 1;
      //    }
      //    return card;
      // })
      const tl = gsap.timeline({
         onComplete: () => {
            tl.kill();
            onComplete?.();
         }
      });
      cards.forEach((card) => {
         if (card && card.ele) {
            popCard(card);
            card.status = 1;
            if (card.field === 1) {
               const decks = game.cards?.filter((c) => c.field === 1);
               if (!decks) return;
               const col = decks.findIndex((c) => c.id === card.id);
               const coord = cardCoord(card.field, col, 0, boardDimension, direction);
               card.x = coord.x;
               card.y = coord.y;
               card.zIndex = coord.zIndex;
               tl.to(card.ele, {
                  duration: 0.5,
                  zIndex: 10000,
                  rotateY: 180,
                  ease: "power2.inOut",
               }).to(card.ele, {
                  duration: 0.5,
                  x: coord.x,
                  y: coord.y,
                  zIndex: coord.zIndex,
                  ease: "power2.inOut",
               })
            } else {
               gsap.to(card.ele, {
                  duration: 0.5,
                  rotateY: 180,
                  ease: "power2.inOut",
               })
            }

         }
      })


   }, [game, boardDimension])

   const popCard = useCallback((card: Card) => {
      if (card.ele) {
         const frontSvg = card.ele.querySelector('.front'); // 选择 .front SVG
         if (frontSvg) {
            // 获取顶部 rank 和 suit 的 <text> 元素
            const topRankText = frontSvg.querySelector('text[x="10"][y="25"]');
            const topSuitText = frontSvg.querySelector('text[x="10"][y="45"]');

            // 获取底部（旋转） rank 和 suit 的 <text> 元素
            const bottomRankText = frontSvg.querySelector('g text[x="0"][y="20"]');
            const bottomSuitText = frontSvg.querySelector('g text[x="0"][y="40"]');

            // 获取中央 suit 的 <text> 元素
            const centerSuitText = frontSvg.querySelector('text[x="50"][y="90"]');
            if (topRankText && topSuitText && bottomRankText && bottomSuitText && centerSuitText) {
               topRankText.textContent = card.rank || '';
               topSuitText.textContent = card.suit || '';
               bottomRankText.textContent = card.rank || '';
               bottomSuitText.textContent = card.suit || '';
               centerSuitText.textContent = card.suit || '';
            }
         }
      }
   }, [game, boardDimension])
   const playMove = useCallback(({ data, onComplete }: { data: { open?: Card[], move: Card[] }, onComplete?: () => void }) => {
      if (!game || !boardDimension) return;
      const { open, move } = data;
      const tl = gsap.timeline({
         onComplete: () => {
            if (open && open.length > 0) {
               playOpenCard({ cards: open, onComplete: onComplete });
            } else {
               onComplete?.();
            }
            tl.kill();
         }
      });
      move.forEach((card, index) => {
         const coord = cardCoord(card.field || 0, card.col || 0, card.row || 0, boardDimension, direction);
         // card.x = coord.x;
         // card.y = coord.y;
         if (card.ele) {
            tl.fromTo(card.ele, { zIndex: (card.row || 0) + 10000 }, {
               duration: 0.5,
               x: coord.x,
               y: coord.y,
               width: coord.cwidth,
               height: coord.cheight,
               ease: "power2.inOut",
               onComplete: () => {
                  if (card.ele) {
                     card.ele.style.zIndex = (card.row || 0).toString();
                  }
               }
            }, "<")
         }

      })
      tl.play();


   }, [game, boardDimension, direction])

   return { playOpenCard, playMove }
}
export default useActionAnimate;


