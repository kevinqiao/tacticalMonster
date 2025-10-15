import gsap from "gsap";
import { SoloCard, ZoneType } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";
import { popCard } from "./popCard";

export const gameOverBomb = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, boardDimension } = data;
    const tl = gsap.timeline({ onComplete });

    const centerX = boardDimension.width / 2;
    const centerY = boardDimension.height / 2;

    const tableauCards = cards.filter((c: SoloCard) => c.zone === ZoneType.TABLEAU);

    // 第一阶段：所有牌聚集在中心
    tableauCards.forEach((card: SoloCard) => {
        if (!card.ele) return;
        gsap.set(card.ele, {
            x: centerX,
            y: centerY,
            scale: 0,
            rotateZ: 0,
            autoAlpha: 0
        });
    });

    // 第二阶段：爆炸散开
    tableauCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        const zoneCards = cards.filter((c: SoloCard) => c.zoneId === card.zoneId);
        const { x, y } = getCoord(card, zoneCards, boardDimension);

        // 计算爆炸方向（从中心向外）
        const angle = Math.atan2(y - centerY, x - centerX);
        const distance = 200;
        const explosionX = centerX + Math.cos(angle) * distance;
        const explosionY = centerY + Math.sin(angle) * distance;

        // 爆炸出去
        tl.to(card.ele, {
            x: explosionX,
            y: explosionY,
            scale: 1,
            autoAlpha: 1,
            rotateZ: (Math.random() - 0.5) * 360,
            duration: 0.4,
            ease: "power4.out",
            zIndex: card.zoneIndex + 10
        }, index * 0.02)
            // 收回到目标位置
            .to(card.ele, {
                x, y,
                rotateZ: 0,
                duration: 0.5,
                ease: "power2.inOut"
            }, `>-0.1`);
    });

    // 翻牌
    const revealCards = cards.filter((c: SoloCard) => c.isRevealed);
    tl.add("reveal", "+=0.3");

    revealCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;
        popCard(card);
        tl.to(card.ele, {
            rotateY: 180,
            duration: 0.35,
            ease: "back.out(1.5)"
        }, `reveal+=${index * 0.08}`);
    });

    tl.play();
}