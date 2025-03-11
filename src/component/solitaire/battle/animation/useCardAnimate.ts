import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Card } from "../types/CombatTypes";
import { getCardCoord } from "../utils";
const useCardAnimate = () => {

   const { game, boardDimension } = useCombatManager();

   const playShuffle = useCallback(() => {

   }, [game])
   const playFlip = useCallback((card: Card) => {
      const { width, height } = boardDimension;
      const x = Math.floor((width - 20 * 8) / 7)
      console.log("card:", card)
      if (card.ele) {
         gsap.to(card.ele, { x, rotationY: 0, duration: 0.5, ease: 'power2.out' });
      }
   }, [game, boardDimension])
   // const playDeal = useCallback(() => {

   //    const { width, height } = boardDimension;
   //    const pwidth = Math.floor((width - 20 * 8) / 7)
   //    const top = (height - pwidth * 1.5) / 2
   //    const tl = gsap.timeline({
   //       onComplete: () => {
   //          game?.cards?.forEach((card) => {
   //             if (card.row != undefined && card.row === 3 && card.ele) {
   //                gsap.to(card.ele, { rotationY: 0, duration: 0.5, ease: 'power2.out' });
   //             }
   //          })
   //       },
   //       defaults: {
   //          duration: 0.1,
   //          ease: 'power2.out'
   //       }
   //    });

   //    game?.cards?.filter((card) => card?.col != undefined && card?.row != undefined).forEach((card, index) => {

   //       if (card.ele) {
   //          const x = 20 + (pwidth + 20) * (card.col || 0);
   //          const y = top + (card.row || 0) * 10;
   //          tl.to(card.ele, {
   //             x, y,
   //             delay: index * 0.01 / 3
   //          });
   //       }
   //    })
   // }, [game, boardDimension])
   const playDeal = useCallback(({ data, onComplete }: { data: { cards: Card[] }, onComplete: () => void }) => {
      const { width, height } = boardDimension;

      const tl = gsap.timeline({
         onComplete: () => {
            data.cards?.forEach((card) => {
               const gameCard = game?.cards?.find((c) => c.id === card.id);
               if (gameCard) {
                  Object.assign(gameCard, card);
                  if (card.suit && card.rank) {
                     const ele = gameCard?.ele;
                     if (ele) {
                        const frontSvg = ele.querySelector('.front'); // 选择 .front SVG
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
                        gsap.to(ele, { rotationY: 0, duration: 0.5, ease: 'power2.out' });
                     }
                  }
               }
            })
            onComplete();
         },
         defaults: {
            duration: 0.1,
            ease: 'power2.out'
         }
      })
      data.cards?.forEach((card, index) => {
         const { x, y, cwidth, cheight } = getCardCoord(card, width, height);
         if (card.ele) {
            tl.to(card.ele, { x: Math.round(x), y: Math.round(y), delay: index * 0.01 / 4 }, "<");
         }
      })

   }, [game, boardDimension])

   return { playShuffle, playDeal, playFlip }
}
export default useCardAnimate;


