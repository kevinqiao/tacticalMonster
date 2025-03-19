import gsap from "gsap";
import { useCallback, useRef } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Card } from "../types/CombatTypes";
import { getCardCoord, getDeckCoord } from "../utils";
const useCardAnimate = () => {
   const timelineRef = useRef<GSAPTimeline | null>(null);
   const { game, boardDimension, direction } = useCombatManager();

   const playShuffle = useCallback(({ data, onComplete }: { data: any; onComplete?: () => void }) => {
      if (!boardDimension || !game) return;
      if (game.status === 1 && onComplete) {
         onComplete();
         return;
      }
      if (data.status)
         game.status = data.status;
      const zone = boardDimension.zones[1];
      const centerX = (boardDimension.width - zone.cwidth) / 2;
      const centerY = (boardDimension.height - zone.cheight) / 2;
      game.cards?.forEach((card) => {
         if (card.ele) {
            gsap.set(card.ele, { x: centerX, y: centerY, width: zone.cwidth, height: zone.cheight });
         }
      })
      const eles = game.cards?.map((card) => card.ele);
      if (eles) {
         const coord = getDeckCoord(boardDimension);
         const tl = gsap.timeline({
            onComplete: () => {
               timelineRef.current = null;
               if (onComplete) {
                  onComplete();
               }
            }
         });
         timelineRef.current = tl;
         tl.to(eles, {
            x: () => centerX + Math.random() * 600 - 300, // 随机 x 位移 (-300 到 300)
            y: () => centerY + Math.random() * 400 - 200, // 随机 y 位移 (-200 到 200)
            rotation: () => Math.random() * 360, // 随机旋转
            duration: 0.5,
            stagger: 0.01, // 每张牌依次动画
            ease: "power2.out",
         });

         tl.to(eles, {
            x: centerX, // 收集到的 x 坐标
            y: centerY, // 收集到的 y 坐标
            rotation: 0,
            duration: 0.5,
            stagger: 0.01,
            ease: "power2.in",
         });
         tl.to(eles, {
            x: coord.x,
            y: coord.y,
            duration: 0.5,
            ease: "power2.out",
         }, ">=0.5");

      }
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
   const playDeal = useCallback(({ data, onComplete }: { data: any; onComplete?: () => void }) => {
      if (!boardDimension || !game) return;
      if (data.status)
         game.status = data.status;
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
         const { x, y } = getCardCoord(card, game, boardDimension, direction);
         if (card.ele) {
            card.x = Math.round(x);
            card.y = Math.round(y);
            tl.to(card.ele, {
               x: card.x, y: card.y, delay: index * 0.02 / 4, onComplete: () => {
                  if (card.ele) {
                     card.zIndex = card.row;
                     gsap.set(card.ele, {
                        zIndex: card.row,
                     })
                  }
               }
            }, "<");
         }
      })

   }, [game, boardDimension, direction])

   const playInit = useCallback(() => {
      if (!boardDimension || !game) return;

      if (!game.status) {
         game.cards?.forEach((card, index) => {
            if (card.ele) {
               const { x, y, cwidth, cheight } = getDeckCoord(boardDimension);
               card.width = cwidth;
               card.height = cheight;
               gsap.set(card.ele, { x, y, width: cwidth, height: cheight, zIndex: 500 - index });
            }
         })
      } else {

         game.cards?.forEach((card) => {
            // console.log("card", card);
            if (card.ele) {
               popCard(card);
               const coord = getCardCoord(card, game, boardDimension, direction);
               card.width = coord.cwidth;
               card.height = coord.cheight;
               card.x = coord.x;
               card.y = coord.y;
               card.zIndex = coord.zIndex;
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

   }, [game, boardDimension, popCard, direction])
   // useEffect(() => {
   //    if (!game || !boardDimension) return;

   //    if (timelineRef.current) {
   //       timelineRef.current.kill();
   //       timelineRef.current = null;
   //    }
   //    playInit();

   // }, [game, boardDimension])
   return { playShuffle, playDeal, playInit }
}
export default useCardAnimate;


