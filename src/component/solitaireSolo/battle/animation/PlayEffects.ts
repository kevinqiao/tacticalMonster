import gsap from "gsap";
import { SoloCard, SUIT_ICONS, ZoneType } from "../types/SoloTypes";
import { getCoord } from "../Utils";
interface PlayEffect {
    (args: { data: any; tl?: gsap.core.Timeline }): gsap.core.Timeline | null;
}

interface PlayEffects {
    [key: string]: PlayEffect;
}
const popCard = (card: SoloCard) => {

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
                topSuitText.textContent = card.suit ? SUIT_ICONS[card.suit] : '';
                bottomRankText.textContent = card.rank || '';
                bottomSuitText.textContent = card.suit ? SUIT_ICONS[card.suit] : '';
                centerSuitText.textContent = card.suit ? SUIT_ICONS[card.suit] : '';
            }
        }
    }

}
export const PlayEffects: PlayEffects = {

    shuffle: ({ data }) => {
        const { cards, boardDimension } = data;

        if (boardDimension && cards) {
            const centerX = (boardDimension.width - boardDimension.cardWidth) / 2;
            const centerY = (boardDimension.height - boardDimension.cardHeight) / 2;
            const tl = gsap.timeline({
                onStart: () => {
                    console.log("whole start")
                }
            });
            const ctl = gsap.timeline({
                onStart: () => {
                    console.log("center start")
                },
                onComplete: () => {
                    console.log("center complete")
                }
            });
            const eles = cards.map((card: SoloCard) => card.ele);
            cards.forEach((card: SoloCard, index: number) => {
                if (card.ele) {
                    gsap.set(card.ele, { x: centerX, y: centerY, autoAlpha: 0 });
                    ctl.to(card.ele, {
                        autoAlpha: 1,
                        duration: 0.2,
                        ease: "power2.out"
                    }, "<");
                }
            });

            const stl = gsap.timeline({
                onStart: () => {
                    console.log("shuffle start")
                }
            });
            stl.to(eles, {
                x: () => centerX + Math.random() * 600 - 300, // 随机 x 位移 (-300 到 300)
                y: () => centerY + Math.random() * 400 - 200, // 随机 y 位移 (-200 到 200)
                rotation: () => Math.random() * 360, // 随机旋转
                duration: 0.5,
                stagger: 0.01, // 每张牌依次动画
                ease: "power2.out",
            });
            stl.to(eles, {
                x: centerX, // 收集到的 x 坐标
                y: centerY, // 收集到的 y 坐标
                rotation: 0,
                duration: 0.5,
                stagger: 0.01,
                ease: "power2.in",
            });
            const ftl = gsap.timeline();
            ftl.to(eles, {
                x: boardDimension.width - 100,
                y: 100,
                duration: 0.5,
                ease: "power2.out",
            });
            tl.add(ctl, ">=+0.2");
            tl.add(stl, "+=0");
            tl.add(ftl, ">=+0.5");
            tl.play();
        }
        return null;
    },
    init: ({ data }) => {
        const tl = gsap.timeline();
        const mtl = gsap.timeline();
        const otl = gsap.timeline();
        const { cards, boardDimension } = data;
        cards.forEach((card: SoloCard) => {
            const { x, y } = getCoord(card, boardDimension);
            if (card.ele) {
                mtl.to(card.ele, { x, y, duration: 0 }, "<");
                otl.to(card.ele, { autoAlpha: 1, duration: 0.1 }, "<");
            }
        });
        tl.add(mtl);
        tl.add(otl, ">=+0.3");
        tl.play();
        return null;
    },
    deal: ({ data }) => {
        const { cards, boardDimension } = data;
        const tl = gsap.timeline();

        for (let i = 0; i < 7; i++) {
            const row = cards.filter((card: SoloCard) => card.zone === ZoneType.TABLEAU && card.zoneIndex === i);
            if (row.length > 0) {
                const rtl = gsap.timeline();
                row.forEach((card: SoloCard) => {
                    const { x, y } = getCoord(card, boardDimension);
                    if (card.ele) {
                        rtl.to(card.ele, { x, y, duration: 0.2, zIndex: card.zoneIndex + 10, ease: "power2.out" }, "<=+0.1");
                    }
                });
                tl.add(rtl, ">");
            }
        }
        const otl = gsap.timeline();
        cards.filter((card: SoloCard) => card.isRevealed).sort((a: SoloCard, b: SoloCard) => {
            const acol = a.zoneId.split('-')[1];
            const bcol = b.zoneId.split('-')[1];
            return +acol || 0 - +bcol || 0;
            // return a.zoneIndex - b.zoneIndex
        }).forEach((card: SoloCard) => {
            if (card.ele) {
                popCard(card);
                otl.to(card.ele, { rotateY: 180, duration: 0.2, ease: "power2.out" }, "<=+0.1");
            }
        });
        tl.add(otl, ">");

        // for(let i=0;i<7;i++){

        // }
        tl.play();



        return null;
    }
};
