import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";

/**
 * 经典 Solitaire 胜利动画 - 真正的物理弹跳效果
 * 
 * 每张卡：
 * 1. 像扔球一样以抛物线飞出
 * 2. 落地后弹起，同时向前移动
 * 3. 再次落地、弹起、向前
 * 4. 弹跳高度和向前距离逐渐衰减
 * 5. 最后停在地面
 */
export const cascadeClassic = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, boardDimension } = data;

    if (!cards || cards.length === 0) {
        onComplete?.();
        return;
    }

    const foundationCards = cards.filter((c: SoloCard) => c.zone === ZoneType.FOUNDATION);

    if (foundationCards.length === 0) {
        onComplete?.();
        return;
    }

    const tl = gsap.timeline({
        onComplete: () => {
            console.log('🎊 Classic cascade complete!');
            onComplete?.();
        }
    });

    console.log('🎬 Classic Cascade - Physics bouncing ball effect');

    // 按foundation从左到右排序
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const allCardsInOrder: SoloCard[] = [];

    suits.forEach(suit => {
        const suitCards = foundationCards
            .filter((c: SoloCard) => c.zoneId === `foundation-${suit}`)
            .sort((a: SoloCard, b: SoloCard) => (a.value || 0) - (b.value || 0));
        allCardsInOrder.push(...suitCards);
    });

    const groundY = boardDimension.height * 0.8; // 地面位置

    // 创建残影函数
    const createAfterimage = (sourceEle: HTMLDivElement, x: number, y: number, rotation: number, scale: number = 1) => {
        const clone = sourceEle.cloneNode(true) as HTMLDivElement;
        sourceEle.parentElement?.appendChild(clone);

        // 设置克隆的初始样式
        gsap.set(clone, {
            x,
            y,
            rotation,
            scale,
            width: boardDimension.cardWidth,
            height: boardDimension.cardHeight,
            opacity: 0.5,
            zIndex: 4000
        });

        // 让残影逐渐淡出并移除
        gsap.to(clone, {
            opacity: 0,
            scale: scale * 0.9,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => clone.remove()
        });
    };

    // 为每张卡创建弹跳动画
    allCardsInOrder.forEach((card, index) => {
        if (!card.ele) return;

        const currentX = gsap.getProperty(card.ele, "x") as number;
        const currentY = gsap.getProperty(card.ele, "y") as number;

        const startDelay = index * 0.05; // 每张卡间隔0.05秒

        gsap.set(card.ele, { zIndex: 5000 + index });

        const cardTL = gsap.timeline();

        // 在动画开始时创建残影
        cardTL.call(() => {
            if (card.ele) {
                createAfterimage(card.ele, currentX, currentY, 0, 1);
            }
        });

        // 初始抛物线参数
        let currentHeight = 200; // 初始弹跳高度
        let forwardDistance = 80; // 每次向前的距离
        const damping = 0.6; // 高度衰减系数
        const distanceDamping = 0.7; // 距离衰减系数
        const bounceCount = 6; // 弹跳次数

        let currentPosX = currentX;

        // 第一段：初始抛物线（从foundation飞出）
        const firstLandX = currentPosX + forwardDistance * 1.5;

        cardTL.to(card.ele, {
            x: firstLandX,
            y: groundY,
            width: boardDimension.cardWidth,
            height: boardDimension.cardHeight,
            rotation: (Math.random() - 0.5) * 60,
            duration: 0.6,
            ease: "power2.in" // 下抛的抛物线
        });

        currentPosX = firstLandX;

        // 连续弹跳：弹起→向前→落下（每次在关键点创建残影）
        for (let i = 0; i < bounceCount; i++) {
            const nextPosX = currentPosX + forwardDistance;
            const bounceUpDuration = Math.sqrt(currentHeight / 150) * 0.2;
            const bounceDownDuration = Math.sqrt(currentHeight / 150) * 0.2;

            // 弹起（垂直向上，略微向前）
            const peakX = currentPosX + forwardDistance * 0.4;
            const peakY = groundY - currentHeight;

            cardTL.to(card.ele, {
                x: peakX,
                y: peakY,
                width: boardDimension.cardWidth,
                height: boardDimension.cardHeight,
                rotation: i * 20,
                duration: bounceUpDuration,
                ease: "power2.out",
                onUpdate: function () {
                    // 在上升过程中创建残影
                    if (card.ele && this.progress() % 0.3 < 0.1) {
                        const x = gsap.getProperty(card.ele, "x") as number;
                        const y = gsap.getProperty(card.ele, "y") as number;
                        const rot = gsap.getProperty(card.ele, "rotation") as number;
                        createAfterimage(card.ele, x, y, rot);
                    }
                }
            });

            // 落下到下一个位置
            cardTL.to(card.ele, {
                x: nextPosX,
                y: groundY,
                width: boardDimension.cardWidth,
                height: boardDimension.cardHeight,
                duration: bounceDownDuration,
                ease: "power2.in",
                onUpdate: function () {
                    // 在下落过程中创建残影
                    if (card.ele && this.progress() % 0.3 < 0.1) {
                        const x = gsap.getProperty(card.ele, "x") as number;
                        const y = gsap.getProperty(card.ele, "y") as number;
                        const rot = gsap.getProperty(card.ele, "rotation") as number;
                        createAfterimage(card.ele, x, y, rot);
                    }
                }
            });

            // 更新位置和衰减
            currentPosX = nextPosX;
            currentHeight *= damping;
            forwardDistance *= distanceDamping;

            // 当弹跳高度小于5px时停止
            if (currentHeight < 5) break;
        }

        // 添加到主时间轴
        tl.add(cardTL, startDelay);
    });

    tl.play();
};
