import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";

/**
 * 弹跳瀑布效果 - 卡牌落地后弹跳
 */
export const cascadeBounce = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, boardDimension } = data;

    if (!cards || cards.length === 0) {
        onComplete?.();
        return;
    }

    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });

    const foundationCards = cards.filter((c: SoloCard) => c.zone === ZoneType.FOUNDATION);
    const groundY = boardDimension.height - 80;

    foundationCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        const randomX = Math.random() * (boardDimension.width - boardDimension.cardWidth);
        const randomRotation = Math.random() * 1080 - 540;
        const delay = index * 0.08;

        // 从当前位置弹出
        const subtl = gsap.timeline();

        subtl
            // 第一阶段：向上飞出
            .to(card.ele, {
                x: randomX,
                y: -150,
                rotation: randomRotation * 0.5,
                scale: 1.1,
                duration: 0.5,
                ease: "power2.out",
                zIndex: 1000 + index
            })
            // 第二阶段：下落
            .to(card.ele, {
                y: groundY,
                rotation: randomRotation,
                scale: 1,
                duration: 0.6,
                ease: "power3.in"
            })
            // 第三阶段：大弹跳
            .to(card.ele, {
                y: groundY - 40,
                duration: 0.2,
                ease: "power1.out"
            })
            .to(card.ele, {
                y: groundY,
                duration: 0.2,
                ease: "bounce.out"
            })
            // 第四阶段：小弹跳
            .to(card.ele, {
                y: groundY - 15,
                duration: 0.1,
                ease: "power1.out"
            })
            .to(card.ele, {
                y: groundY,
                duration: 0.1,
                ease: "power1.in"
            });

        tl.add(subtl, delay);
    });

    tl.play();
};

