import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";

/**
 * 简单瀑布效果 - 抛物线下落
 */
export const cascadeSimple = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
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

    // 从 foundation 区域获取所有卡牌
    const foundationCards = cards.filter((c: SoloCard) => c.zone === ZoneType.FOUNDATION);

    // 对每张牌创建抛物线下落动画
    foundationCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        // 随机的水平位置
        const randomX = Math.random() * (boardDimension.width - 100);
        // 随机的旋转角度
        const randomRotation = Math.random() * 720 - 360;
        // 随机的延迟
        const randomDelay = index * 0.05;

        // 抛物线动画：向上抛，然后落下
        tl.to(card.ele, {
            x: randomX,
            y: -200, // 先向上飞
            rotation: randomRotation * 0.3,
            duration: 0.4,
            ease: "power2.out",
            zIndex: 1000 + index
        }, randomDelay)
            .to(card.ele, {
                y: boardDimension.height + 100, // 然后落下屏幕外
                rotation: randomRotation,
                duration: 0.8,
                ease: "power2.in"
            });
    });

    tl.play();
};

