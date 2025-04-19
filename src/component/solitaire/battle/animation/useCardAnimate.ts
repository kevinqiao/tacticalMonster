import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { useCombatManager } from "../service/CombatManager";
import { useSprite } from "../service/SpriteProvider";
import { Card, Slot } from "../types/CombatTypes";
import { cardCoord, getDeckCoord } from "../utils";
const useCardAnimate = () => {
   const timelineRef = useRef<GSAPTimeline | null>(null);
   const { game, boardDimension, direction } = useCombatManager();
   const { spriteRefs } = useSprite();
   const initAvatar = useCallback(() => {
      const ctrl0 = spriteRefs.get("control-panel-0");
      const ctrl1 = spriteRefs.get("control-panel-1");
      const { width, height } = ctrl0?.current?.getBoundingClientRect() || { width: 0, height: 0 };
      if (ctrl0 && ctrl1) {
         gsap.set(ctrl0.current, {
            autoAlpha: 1,
            x: -width,
         })
         gsap.set(ctrl1.current, {
            autoAlpha: 1,
            x: -width,
         })
      }
   }, [spriteRefs])
   const openAvatar = useCallback(() => {
      const ctrl0 = spriteRefs.get("control-panel-0");
      const ctrl1 = spriteRefs.get("control-panel-1");
      const { width, height } = ctrl0?.current?.getBoundingClientRect() || { width: 0, height: 0 };
      if (ctrl0 && ctrl1) {
         gsap.to(ctrl0.current, {
            autoAlpha: 1,
            x: -width,
            duration: 0.5,
            ease: 'power2.out'
         })
         gsap.to(ctrl1.current, {
            x: -width,
            duration: 0.5,
            ease: 'power2.out'
         })
      }
   }, [spriteRefs])

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
         const coord: Slot = getDeckCoord(boardDimension);
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
         tl.add(openAvatar, ">");
         tl.to(eles, {
            x: coord.left,
            y: coord.top,
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
                  const coord = cardCoord(card.field || 0, card.col || 0, card.row || 0, boardDimension, direction);
                  card.x = coord.x;
                  card.y = coord.y;
                  card.zIndex = coord.zIndex;
                  stl.to(card.ele, { x: coord.x, y: coord.y, zIndex: coord.zIndex, rotationY: 180, duration: 0.3, ease: 'power2.out', delay: index * 0.1 });
               }
            })
            const foundationGround = spriteRefs.get("foundation-ground");
            if (foundationGround) {
               stl.to(foundationGround.current, {
                  duration: 0.5,
                  opacity: 1,
                  visibility: "visible",
                  ease: 'power2.out'
               }, ">")
            }
            if (onComplete) {
               setTimeout(() => {
                  onComplete();
               }, 1000)
            }
         },
         defaults: {
            duration: 0.1,
            ease: 'power2.out'
         }
      })

      timelineRef.current = tl;
      game?.cards?.filter((card) => card.field && card.field >= 2 && card.ele).forEach((card, index) => {
         const { x, y, cwidth, cheight } = cardCoord(card.field || 0, card.col || 0, card.row || 0, boardDimension, direction);
         // console.log("playDeal", card, x, y);
         if (card.ele) {
            card.x = Math.round(x);
            card.y = Math.round(y);
            card.width = Math.round(cwidth);
            card.height = Math.round(cheight);
            tl.to(card.ele, {
               x: card.x, y: card.y, width: card.width, height: card.height, delay: index * 0.02 / 4, onComplete: () => {
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

   const playInit = useCallback(({ onComplete }: { onComplete?: () => void }) => {
      // console.log("playInit", game);
      if (!boardDimension || !game) return;
      // console.log("playInit", game);
      game.cards?.forEach((card, index) => {

         if (card.ele) {
            popCard(card);
            const pos = { field: card.field ?? 0, col: card.col ?? 0, row: card.row ?? 0 };

            const coord = cardCoord(pos.field, pos.col, pos.row, boardDimension, direction);
            card.width = coord.cwidth;
            card.height = coord.cheight;
            card.x = coord.x;
            card.y = coord.y;
            card.zIndex = coord.zIndex;
            gsap.set(card.ele, {
               x: coord.x,
               y: coord.y,
               rotationY: card.status === 1 ? 180 : 0,
               width: coord.cwidth,
               height: coord.cheight,
               zIndex: coord.zIndex,
            })
         }

      })
      const foundationGround = spriteRefs.get("foundation-ground");
      if (foundationGround) {
         gsap.set(foundationGround.current, {
            opacity: 1,
            visibility: "visible"
         })
      }
      initAvatar();
      onComplete?.();
   }, [game, boardDimension, popCard, direction])
   useEffect(() => {
      if (!game || !boardDimension) return;
      if (game.status > 0) playInit({});

   }, [game, boardDimension, direction, playInit])
   return { playShuffle, playDeal, playInit }
}
export default useCardAnimate;


