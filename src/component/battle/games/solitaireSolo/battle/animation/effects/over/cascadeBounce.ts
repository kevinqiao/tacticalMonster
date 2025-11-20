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

    if (foundationCards.length === 0) {
        console.warn('No foundation cards found for victory animation');
        onComplete?.();
        return;
    }

    const groundY = boardDimension.height - 80;

    const eles = foundationCards.map((c: SoloCard) => c.ele).filter((ele: HTMLDivElement | null | undefined): ele is HTMLDivElement => ele !== null);

    console.log('Starting bounce cascade for', eles.length, 'cards');

    // 设置高 zIndex
    eles.forEach((ele: HTMLDivElement, idx: number) => {
        if (ele) gsap.set(ele, { zIndex: 1000 + idx });
    });

    // 第一阶段：向上飞出
    tl.to(eles, {
        x: () => Math.random() * (boardDimension.width - boardDimension.cardWidth),
        y: -150,
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        rotation: () => (Math.random() - 0.5) * 540,
        scale: 1.1,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out"
    });

    // 第二阶段：下落到地面
    tl.to(eles, {
        y: groundY,
        width: boardDimension.cardWidth, // 保持宽度
        height: boardDimension.cardHeight, // 保持高度
        rotation: () => (Math.random() - 0.5) * 1080,
        scale: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.in"
    });

    // 第三阶段：弹跳效果
    tl.to(eles, {
        y: groundY - 40,
        width: boardDimension.cardWidth,
        height: boardDimension.cardHeight,
        duration: 0.2,
        stagger: 0.08,
        ease: "power1.out"
    })
        .to(eles, {
            y: groundY,
            width: boardDimension.cardWidth,
            height: boardDimension.cardHeight,
            duration: 0.2,
            stagger: 0.08,
            ease: "bounce.out"
        })
        .to(eles, {
            y: groundY - 15,
            width: boardDimension.cardWidth,
            height: boardDimension.cardHeight,
            duration: 0.1,
            stagger: 0.08,
            ease: "power1.out"
        })
        .to(eles, {
            y: groundY,
            width: boardDimension.cardWidth,
            height: boardDimension.cardHeight,
            duration: 0.1,
            stagger: 0.08,
            ease: "power1.in"
        });

    tl.play();
};

