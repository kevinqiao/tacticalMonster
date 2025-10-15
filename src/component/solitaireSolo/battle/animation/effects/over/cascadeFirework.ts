import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";

/**
 * 烟花式效果 - 爆炸后四散
 */
export const cascadeFirework = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
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
    const centerX = boardDimension.width / 2;
    const centerY = boardDimension.height / 3;

    // 第一阶段：所有牌聚集到中心
    foundationCards.forEach((card: SoloCard) => {
        if (!card.ele) return;

        tl.to(card.ele, {
            x: centerX,
            y: centerY,
            scale: 0.5,
            rotation: 0,
            duration: 0.4,
            ease: "power2.in",
            zIndex: 1000
        }, 0);
    });

    // 第二阶段：爆炸散开
    tl.add("explode", "+=0.1");

    foundationCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        // 计算放射状散开的角度
        const totalCards = foundationCards.length;
        const angleStep = (Math.PI * 2) / totalCards;
        const angle = angleStep * index + Math.random() * 0.3;
        const distance = 200 + Math.random() * 150;

        const targetX = centerX + Math.cos(angle) * distance;
        const targetY = centerY + Math.sin(angle) * distance;
        const rotation = Math.random() * 720 - 360;

        // 爆炸阶段
        tl.to(card.ele, {
            x: targetX,
            y: targetY,
            scale: 1.3,
            rotation: rotation * 0.5,
            duration: 0.3,
            ease: "power4.out",
            zIndex: 1000 + index
        }, `explode+=${index * 0.01}`)
            // 继续散开并下落
            .to(card.ele, {
                x: targetX + Math.cos(angle) * 100,
                y: boardDimension.height + 100,
                rotation: rotation,
                scale: 1,
                duration: 0.8,
                ease: "power2.in"
            });
    });

    tl.play();
};

