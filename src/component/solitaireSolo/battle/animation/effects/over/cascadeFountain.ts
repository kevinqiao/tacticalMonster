import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";

/**
 * 喷泉式效果 - 从中心向四周喷射
 */
export const cascadeFountain = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
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
    const centerY = boardDimension.height / 2;

    foundationCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        // 计算喷泉散射角度
        const angle = (Math.random() - 0.5) * Math.PI; // -90度到90度
        const velocity = 300 + Math.random() * 200;
        const targetX = centerX + Math.cos(angle) * velocity;
        const targetY = centerY - Math.abs(Math.sin(angle)) * velocity;
        const rotation = Math.random() * 720 - 360;

        tl.to(card.ele, {
            x: targetX,
            y: targetY,
            rotation: rotation * 0.5,
            scale: 1.2,
            duration: 0.6,
            ease: "power2.out",
            zIndex: 1000 + index
        }, index * 0.05)
            .to(card.ele, {
                y: boardDimension.height + 50,
                rotation: rotation,
                scale: 1,
                duration: 0.8,
                ease: "power2.in"
            });
    });

    tl.play();
};

