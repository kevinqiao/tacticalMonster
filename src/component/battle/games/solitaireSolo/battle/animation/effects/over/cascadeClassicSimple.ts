import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";

/**
 * 经典 Solitaire 简化版 - 只动画部分卡牌，轨迹更清晰
 */
export const cascadeClassicSimple = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
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
            console.log('🎊 Classic simple cascade complete!');
            onComplete?.();
        }
    });

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const groundY = boardDimension.height * 0.75;

    console.log('🎬 Classic Simple Cascade - Animating only top 5 cards per suit');

    // 只处理每堆的前5张（K, Q, J, 10, 9）
    const maxCardsPerSuit = 5;

    suits.forEach((suit, suitIndex) => {
        const suitCards = foundationCards
            .filter((c: SoloCard) => c.zoneId === `foundation-${suit}`)
            .sort((a: SoloCard, b: SoloCard) => (b.value || 0) - (a.value || 0))
            .slice(0, maxCardsPerSuit); // 只取前5张

        if (suitCards.length === 0) return;

        console.log(`Processing ${suit}: ${suitCards.length} cards (K to ${suitCards[suitCards.length - 1].rank})`);

        suitCards.forEach((card: SoloCard, cardIndex: number) => {
            if (!card.ele) return;

            // 大幅延迟，确保一次只有1-2张卡在动画
            const totalDelay = suitIndex * 0.8 + cardIndex * 0.25;

            // 固定目标位置
            const targetColumn = suitIndex * 1.5 + cardIndex * 0.3;
            const targetX = boardDimension.width * 0.2 + targetColumn * 80;

            const currentX = gsap.getProperty(card.ele, "x") as number;
            const currentY = gsap.getProperty(card.ele, "y") as number;

            if (cardIndex === 0) {
                console.log(`  ${suit} K at delay ${totalDelay.toFixed(2)}s: (${currentX},${currentY}) → (${targetX},${groundY})`);
            }

            // 设置高 zIndex
            gsap.set(card.ele, { zIndex: 3000 + suitIndex * 10 + cardIndex });

            const cardTL = gsap.timeline();

            // 第1段：垂直向上（只上升，不横移）
            cardTL.to(card.ele, {
                y: currentY - 200,
                width: boardDimension.cardWidth,
                height: boardDimension.cardHeight,
                scale: 1.2,
                duration: 0.5,
                ease: "power2.out",
                onStart: () => {
                    if (cardIndex === 0) console.log(`  ⬆️ ${suit} K rising`);
                }
            });

            // 第2段：抛物线下落（横移+下落）
            cardTL.to(card.ele, {
                x: targetX,
                y: groundY,
                width: boardDimension.cardWidth,
                height: boardDimension.cardHeight,
                rotation: randomRotation,
                scale: 1,
                duration: 0.6,
                ease: "power2.in",
                onStart: () => {
                    if (cardIndex === 0) console.log(`  ↘️ ${suit} K falling`);
                }
            });

            // 第3段：大弹跳
            cardTL.to(card.ele, {
                y: groundY - 120,
                width: boardDimension.cardWidth,
                height: boardDimension.cardHeight,
                duration: 0.35,
                ease: "power1.out",
                onStart: () => {
                    if (cardIndex === 0) console.log(`  🔺 ${suit} K bounce 1`);
                }
            })
                .to(card.ele, {
                    y: groundY,
                    width: boardDimension.cardWidth,
                    height: boardDimension.cardHeight,
                    duration: 0.35,
                    ease: "power2.in"
                });

            // 第4段：中弹跳
            cardTL.to(card.ele, {
                y: groundY - 60,
                width: boardDimension.cardWidth,
                height: boardDimension.cardHeight,
                duration: 0.25,
                ease: "power1.out"
            })
                .to(card.ele, {
                    y: groundY,
                    width: boardDimension.cardWidth,
                    height: boardDimension.cardHeight,
                    duration: 0.25,
                    ease: "power2.in"
                });

            // 第5段：小弹跳
            cardTL.to(card.ele, {
                y: groundY - 25,
                width: boardDimension.cardWidth,
                height: boardDimension.cardHeight,
                duration: 0.15,
                ease: "power1.out"
            })
                .to(card.ele, {
                    y: groundY,
                    width: boardDimension.cardWidth,
                    height: boardDimension.cardHeight,
                    duration: 0.15,
                    ease: "sine.in",
                    onComplete: () => {
                        if (cardIndex === 0) console.log(`  ✅ ${suit} K settled`);
                    }
                });

            tl.add(cardTL, totalDelay);
        });
    });

    tl.play();
};

