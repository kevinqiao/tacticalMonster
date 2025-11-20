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

    if (foundationCards.length === 0) {
        console.warn('No foundation cards found for victory animation');
        onComplete?.();
        return;
    }

    const eles = foundationCards.map((c: SoloCard) => c.ele).filter((ele: HTMLDivElement | null | undefined): ele is HTMLDivElement => ele !== null);

    console.log('Starting simple cascade for', eles.length, 'cards');

    // 设置高 zIndex
    eles.forEach((ele: HTMLDivElement, idx: number) => {
        if (ele) gsap.set(ele, { zIndex: 1000 + idx });
    });

    // 第一阶段：向上抛
    tl.to(eles, {
        x: () => Math.random() * boardDimension.width,
        y: -200,
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        rotation: () => (Math.random() - 0.5) * 360,
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out"
    });

    // 第二阶段：落下
    tl.to(eles, {
        y: boardDimension.height + 100,
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        rotation: () => (Math.random() - 0.5) * 720,
        duration: 0.8,
        stagger: 0.05,
        ease: "power2.in"
    });

    tl.play();
};

