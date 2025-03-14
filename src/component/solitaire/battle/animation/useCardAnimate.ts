import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Card } from "../types/CombatTypes";
import { getCardCoord, getDeckCoord } from "../utils";
const useCardAnimate = () => {
   const timelineRef = useRef<GSAPTimeline | null>(null);
   const { game, boardDimension } = useCombatManager();

   const playShuffle = useCallback(() => {

   }, [game])
   const playFlip = useCallback((card: Card) => {
      // const { width, height } = boardDimension;
      // const x = Math.floor((width - 20 * 8) / 7)
      // console.log("card:", card)
      // if (card.ele) {
      //    gsap.to(card.ele, { x, rotationY: 0, duration: 0.5, ease: 'power2.out' });
      // }
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
   const playDeal = useCallback(({ onComplete }: { onComplete?: () => void }) => {
      if (!boardDimension || !game) return;

      const tl = gsap.timeline({
         onComplete: () => {
            timelineRef.current = null;
            game?.cards?.filter((card) => card.status === 1 && card.field && card.field > 1).forEach((card) => {
               if (card.ele) {
                  popCard(card);
                  gsap.to(card.ele, { rotationY: 180, duration: 0.5, ease: 'power2.out' });
               }
            })
            const stl = gsap.timeline();
            game?.cards?.filter((card, index) => card.status === 1 && card.field && card.field === 1).forEach((card, index) => {
               if (card.ele) {
                  const coord = getCardCoord(card, game, boardDimension);
                  stl.to(card.ele, { x: coord.x, y: coord.y, zIndex: coord.zIndex, rotationY: 180, duration: 0.3, ease: 'power2.out', delay: index * 0.1 });
               }
            })
            if (onComplete) {
               onComplete();
            }
         },
         defaults: {
            duration: 0.1,
            ease: 'power2.out'
         }
      })

      timelineRef.current = tl;
      game?.cards?.filter((card) => card.field && card.field >= 2 && card.ele).forEach((card, index) => {
         const { x, y } = getCardCoord(card, game, boardDimension);
         if (card.ele) {
            tl.to(card.ele, {
               x: Math.round(x), y: Math.round(y), delay: index * 0.02 / 4, onComplete: () => {
                  if (card.ele) {
                     gsap.set(card.ele, {
                        zIndex: card.row,
                     })
                  }
               }
            }, "<");
         }
      })

   }, [game, boardDimension])
   const playInit = useCallback(() => {
      if (!boardDimension || !game) return;
      if (!game.status) {
         game.cards?.forEach((card, index) => {
            if (card.ele) {
               const { x, y, cwidth, cheight } = getDeckCoord(boardDimension);
               gsap.set(card.ele, { x, y, width: cwidth, height: cheight, zIndex: 500 - index });
            }
         })
      } else {
         game.cards?.forEach((card) => {
            if (card.ele) {
               popCard(card);
               const coord = getCardCoord(card, game, boardDimension);
               gsap.set(card.ele, {
                  x: coord.x,
                  y: coord.y,
                  rotationY: game.status === 1 ? card.status === 1 ? 180 : 0 : 0,
                  width: coord.cwidth,
                  height: coord.cheight,
                  zIndex: coord.zIndex,
               })
            }
         })
      }
      console.log("playInit")
   }, [game, boardDimension, popCard])
   useEffect(() => {
      if (!game || !boardDimension) return;

      if (timelineRef.current) {
         timelineRef.current.kill();
         timelineRef.current = null;
      }


   }, [game, boardDimension])
   return { playShuffle, playDeal, playFlip, playInit }
}
export default useCardAnimate;


