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

    if (foundationCards.length === 0) {
        console.warn('No foundation cards found for victory animation');
        onComplete?.();
        return;
    }

    const centerX = boardDimension.width / 2;
    const centerY = boardDimension.height / 3;

    const eles = foundationCards.map((c: SoloCard) => c.ele).filter((ele: HTMLDivElement | null | undefined): ele is HTMLDivElement => ele !== null);

    console.log('Starting firework cascade for', eles.length, 'cards');

    // 设置高 zIndex
    eles.forEach((ele: HTMLDivElement, idx: number) => {
        if (ele) gsap.set(ele, { zIndex: 1000 + idx });
    });

    // 第一阶段：所有牌聚集到中心
    tl.to(eles, {
        x: centerX,
        y: centerY,
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        scale: 0.5,
        rotation: 0,
        duration: 0.4,
        ease: "power2.in"
    });

    // 第二阶段：爆炸散开
    tl.to(eles, {
        x: (index) => {
            const totalCards = eles.length;
            const angleStep = (Math.PI * 2) / totalCards;
            const angle = angleStep * index + Math.random() * 0.3;
            const distance = 200 + Math.random() * 150;
            return centerX + Math.cos(angle) * distance;
        },
        y: (index) => {
            const totalCards = eles.length;
            const angleStep = (Math.PI * 2) / totalCards;
            const angle = angleStep * index + Math.random() * 0.3;
            const distance = 200 + Math.random() * 150;
            return centerY + Math.sin(angle) * distance;
        },
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        scale: 1.3,
        rotation: () => (Math.random() - 0.5) * 360,
        duration: 0.3,
        stagger: 0.01,
        ease: "power4.out"
    });

    // 第三阶段：继续下落
    tl.to(eles, {
        y: boardDimension.height + 100,
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        rotation: () => (Math.random() - 0.5) * 720,
        scale: 1,
        duration: 0.8,
        stagger: 0.01,
        ease: "power2.in"
    });

    tl.play();
};

