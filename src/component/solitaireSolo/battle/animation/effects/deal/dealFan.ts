import gsap from "gsap";
import { SoloCard } from "../../../types/SoloTypes";
import { getCoord } from "../../../Utils";
import { popCard } from "../popCard";

/**
 * 扇形展开发牌效果 - 魔术师风格
 */
export const dealFan = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, gameState, boardDimension } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });

    const deckX = boardDimension.zones.talon.x;
    const deckY = boardDimension.zones.talon.y;
    const centerX = boardDimension.width / 2;
    const centerY = boardDimension.height / 2;

    // 第一阶段：所有牌扇形展开在中心
    // const tableauCards = gameState.cards.filter((c: SoloCard) => {return c.zone === ZoneType.TABLEAU && c.zoneId === 'talon'});
    const tableauCards = cards;
    tableauCards.forEach((card: SoloCard) => {
        card.ele = gameState.cards.find((c: SoloCard) => c.id === card.id)?.ele;
    });
    const totalCards = tableauCards.length;

    tableauCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        // 计算扇形角度 (-60度到60度)
        const angle = (index / totalCards - 0.5) * 120;
        const radius = 150;
        const fanX = centerX + Math.sin(angle * Math.PI / 180) * radius;
        const fanY = centerY - Math.cos(angle * Math.PI / 180) * radius * 0.3;

        gsap.set(card.ele, { x: deckX, y: deckY, rotateZ: 0 });

        tl.to(card.ele, {
            x: fanX,
            y: fanY,
            rotateZ: angle * 0.5,
            duration: 0.6,
            ease: "back.out(1.2)",
            zIndex: index + 100
        }, index * 0.02);
    });

    // 第二阶段：从扇形飞向各自位置
    tl.add("flyToPosition", "+=0.3");

    tableauCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;
        const zoneCards = cards.filter((c: SoloCard) => c.zoneId === card.zoneId);
        const { x, y } = getCoord(card, zoneCards, boardDimension);

        tl.to(card.ele, {
            x, y,
            rotateZ: 0,
            duration: 0.5,
            ease: "power2.inOut",
            zIndex: card.zoneIndex + 10
        }, `flyToPosition+=${index * 0.03}`);
    });

    // 第三阶段：翻牌
    const revealCards = cards.filter((c: SoloCard) => c.isRevealed);
    tl.add("reveal", "+=0.2");

    revealCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;
        popCard(card);
        tl.to(card.ele, {
            rotateY: 180,
            duration: 0.35,
            ease: "power2.inOut"
        }, `reveal+=${index * 0.08}`);
    });

    tl.play();
};
