import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Card } from "../types/CombatTypes";
import { getCardCoord } from "../utils";
const useActionAnimate = () => {

   const { game, boardDimension, direction } = useCombatManager();
   const playFlipCard = useCallback(({ cards }: { cards: Card[] }) => {
      if (!boardDimension || !game) return;

      const openCards = cards.map((c) => {
         const card = game.cards?.find((card) => card.id === c.id);
         if (card) {
            Object.assign(card, c);
            card.status = 1;
         }
         return card;
      })
      openCards.forEach((card) => {
         if (card && card.ele) {
            popCard(card);
            card.status = 1;
            gsap.to(card.ele, {
               duration: 0.5,
               rotateY: 180,
               ease: "power2.inOut",
            })
         }
      })


   }, [game, boardDimension])
   const playOpenCard = useCallback(({ cards }: { cards: Card[] }) => {
      if (!boardDimension || !game) return;
      console.log("playOpenCard", cards);
      const openCards = cards.map((c) => {
         const card = game.cards?.find((card) => card.id === c.id);
         if (card) {
            Object.assign(card, c);
            card.status = 1;
         }
         return card;
      })
      openCards.forEach((card) => {
         if (card && card.ele) {
            popCard(card);
            card.status = 1;
            if (card.field === 1) {
               const tl = gsap.timeline({
                  onComplete: () => {
                     tl.kill();
                  }
               });
               const coord = getCardCoord(card, game, boardDimension);
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

   return { playOpenCard }
}
export default useActionAnimate;


