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

    if (foundationCards.length === 0) {
        console.warn('No foundation cards found for victory animation');
        onComplete?.();
        return;
    }

    const centerX = boardDimension.width / 2;
    const centerY = boardDimension.height / 2;

    const eles = foundationCards.map((c: SoloCard) => c.ele).filter((ele: HTMLDivElement | null | undefined): ele is HTMLDivElement => ele !== null);

    console.log('Starting fountain animation for', eles.length, 'cards');

    // 使用类似 shuffle 的方式处理所有卡牌
    tl.to(eles, {
        x: () => centerX + (Math.random() - 0.5) * 400, // 随机散开
        y: () => centerY - Math.random() * 300 - 100, // 向上喷射
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        rotation: () => (Math.random() - 0.5) * 360,
        scale: 1.2,
        duration: 0.6,
        stagger: 0.05, // 依次动画
        ease: "power2.out",
        onStart: () => {
            // 设置高 zIndex
            eles.forEach((ele: HTMLDivElement, idx: number) => {
                if (ele) gsap.set(ele, { zIndex: 1000 + idx });
            });
        }
    });

    // 第二阶段：下落
    tl.to(eles, {
        y: boardDimension.height + 100,
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        rotation: () => (Math.random() - 0.5) * 720,
        scale: 1,
        duration: 0.8,
        stagger: 0.05,
        ease: "power2.in"
    });

    tl.play();
};

