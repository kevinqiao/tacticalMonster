import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";
import { getCoord } from "../../../Utils";
import { popCard } from "../popCard";

/**
 * 旋转散开发牌效果 - 漩涡风格
 */
export const dealSpiral = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, boardDimension } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });

    const centerX = boardDimension.width / 2;
    const centerY = boardDimension.height / 2;

    const tableauCards = cards.filter((c: SoloCard) => c.zone === ZoneType.TABLEAU);

    // 卡牌从中心螺旋飞出
    tableauCards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        const zoneCards = cards.filter((c: SoloCard) => c.zoneId === card.zoneId);
        const { x, y } = getCoord(card, zoneCards, boardDimension);

        // 初始在中心并旋转
        gsap.set(card.ele, {
            x: centerX,
            y: centerY,
            rotateZ: index * 15,
            scale: 0.5,
            autoAlpha: 0
        });

        // 旋转飞出到目标位置
        tl.to(card.ele, {
            x, y,
            rotateZ: 720 + (index % 2 ? 360 : -360), // 旋转2-3圈
            scale: 1,
            autoAlpha: 1,
            duration: 0.8,
            ease: "power2.out",
            zIndex: card.zoneIndex + 10
        }, index * 0.05);

        // 回正旋转
        tl.to(card.ele, {
            rotateZ: 0,
            duration: 0.3,
            ease: "back.out(2)"
        }, `-=0.2`);
    });

    // 翻牌
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
