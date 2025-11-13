import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";

export const recycle = ({ timelines, data, onComplete }: { timelines: { [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }, data: any; onComplete?: () => void }) => {

    const { cards, gameState, boardDimension } = data;

    const tl = gsap.timeline({
        onComplete: () => {
            cards.forEach((c: SoloCard) => {
                if (c.ele)
                    gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
            });
            onComplete?.();
        }
    });
    timelines.recycle = { timeline: tl, cards: cards };

    // 为每张卡创建独立动画
    cards.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        let zIndexChanged = false;
        let contentHidden = false;

        tl.to(card.ele, {
            x: boardDimension.zones.talon.x,
            y: boardDimension.zones.talon.y,
            rotateZ: 0,
            rotateY: 0, // 从当前角度（可能是 180 或 -180）旋转到 0
            duration: 0.8,
            ease: "ease.in",
            onUpdate: function () {
                // 获取当前的 rotateY 值
                if (!card.ele) return;
                const currentRotateY = gsap.getProperty(card.ele, "rotateY") as number;

                // 当旋转到侧面（90度附近）时提高 zIndex，避免穿帮
                if (!zIndexChanged && Math.abs(Math.abs(currentRotateY) - 90) < 45) {
                    gsap.set(card.ele, { zIndex: 1000 + index });
                    zIndexChanged = true;
                }

                // 当旋转到侧面时隐藏正面内容（可选）
                // if (!contentHidden && Math.abs(Math.abs(currentRotateY) - 90) < 10) {
                //     hideCard(card); // 在侧面时隐藏内容，避免看到反向的内容
                //     contentHidden = true;
                // }
            }
        }, index * 0.1); // stagger 效果
    });

    tl.play();
    return;
}