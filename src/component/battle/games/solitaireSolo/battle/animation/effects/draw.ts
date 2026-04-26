import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCardCoord } from "../../Utils";

const DRAW_FLIGHT_BASE_Z = 50000;

export const drawCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { card, boardDimensionRef, gameState } = data;

    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        onComplete?.();
    };

    if (!card?.ele || !boardDimensionRef?.current) {
        finish();
        return;
    }

    const bd = boardDimensionRef.current;
    const { talon } = bd.zones;

    const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === "waste");
    const cards = [...wasteCards, card].sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);

    // 与 recycle：从牌背朝外旋转到约 90° 时抬 z，避免穿插
    let zBumped = false;
    const bumpZOnEdge = (ele: HTMLElement) => {
        const currentRotateY = gsap.getProperty(ele, "rotateY") as number;
        if (!zBumped && Math.abs(Math.abs(currentRotateY) - 90) < 45) {
            gsap.set(ele, { zIndex: DRAW_FLIGHT_BASE_Z + 1 });
            zBumped = true;
        }
    };

    const tl = gsap.timeline({
        onComplete: () => {
            wasteCards.forEach((c: SoloCard) => {
                if (c.ele) gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
            });
            if (card.ele) {
                gsap.set(card.ele, { zIndex: card.zoneIndex + 10, rotateY: 180, rotateZ: 0 });
            }
            finish();
        }
    });

    try {
        gsap.set(card.ele, { x: talon.x, y: talon.y, zIndex: DRAW_FLIGHT_BASE_Z, rotateY: 0, rotateZ: 0 });

        // 主牌：talon → waste，用与 recycle 相同的翻转动效（ease.in + 侧面抬 z）
        tl.to(
            card.ele,
            {
                x: () => getCardCoord(card, cards, boardDimensionRef).x,
                y: () => getCardCoord(card, cards, boardDimensionRef).y,
                rotateY: 180,
                rotateZ: 0,
                duration: 0.8,
                ease: "ease.in",
                onUpdate: function () {
                    if (!card.ele) return;
                    bumpZOnEdge(card.ele);
                }
            },
            0
        );

        // 已有废牌随列宽重排，与主牌同拍
        wasteCards.forEach((c: SoloCard) => {
            if (!c.ele) return;
            tl.to(
                c.ele,
                {
                    x: () => getCardCoord(c, cards, boardDimensionRef).x,
                    y: () => getCardCoord(c, cards, boardDimensionRef).y,
                    rotateZ: 0,
                    duration: 0.8,
                    ease: "ease.in"
                },
                0
            );
        });

        tl.play();
    } catch (e) {
        console.error("drawCard animation", e);
        tl.kill();
        finish();
    }
};
