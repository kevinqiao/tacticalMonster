import gsap from "gsap";
import { SoloCard, ZoneType } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";
import { popCard } from "./popCard";

export const initGame = ({ timelines, data, onComplete }: { timelines: { [k: string]: GSAPTimeline }, data: any; onComplete?: () => void }) => {

    const { cards, boardDimension } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            if (onComplete) {
                onComplete();
            }
        }
    });

    // 按行发牌
    for (let i = 0; i < 7; i++) {
        const row = cards.filter((card: SoloCard) =>
            card.zone === ZoneType.TABLEAU && card.zoneIndex === i
        );

        if (row.length > 0) {
            const rtl = gsap.timeline();

            row.forEach((card: SoloCard) => {
                const zoneCards = cards.filter((c: SoloCard) => c.zoneId === card.zoneId);
                const { x, y } = getCoord(card, zoneCards, boardDimension);

                if (card.ele) {

                    // 飞向目标位置（添加轻微弧线）
                    rtl.to(card.ele, {
                        autoAlpha: 1,
                        rotateZ: 0,
                        duration: 0.2,  // 比原来稍慢
                        ease: "power2.out",
                        // 使用 motionPath 创建弧线（需要 gsap MotionPathPlugin）
                        // 或者用简单的 yoyo 效果
                    }, "<"); // 减少间隔，让发牌更流畅
                }
            });
            tl.add(rtl, ">=+0.1");
        }
    }

    // 翻牌动画（更慢更自然）
    const otl = gsap.timeline();
    cards.filter((card: SoloCard) => card.isRevealed)
        .sort((a: SoloCard, b: SoloCard) => {
            const acol = a.zoneId.split('-')[1];
            const bcol = b.zoneId.split('-')[1];
            return +acol - +bcol; // 修复排序
        })
        .forEach((card: SoloCard) => {
            if (card.ele) {
                popCard(card);
                otl.to(card.ele, {
                    rotateY: 180,
                    duration: 0.35, // 从 0.2 增加到 0.35
                    ease: "power2.inOut" // 使用 inOut 更平滑
                }, "<");
            }
        });
    tl.add(otl, "+=0.2"); // 发完牌后稍作停顿再翻牌

    tl.play();
}