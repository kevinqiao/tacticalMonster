import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCardCoord, soloCardZIndex } from "../../Utils";

const DRAW_FLIGHT_BASE_Z = 50000;
/** Draw 3：逐张从 talon 顶 peel，间隔略错开 */
const DRAW_PEEL_STAGGER_SEC = 0.12;
const DRAW_FLIGHT_DURATION_SEC = 0.5;
const WASTE_REPOSITION_DURATION_SEC = 0.55;

export const drawCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { card, cards: drawnBatch, boardDimensionRef, gameState } = data;
    const drawnCards: SoloCard[] =
        Array.isArray(drawnBatch) && drawnBatch.length > 0
            ? drawnBatch
            : card
              ? [card]
              : [];

    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        onComplete?.();
    };

    if (drawnCards.length === 0 || !boardDimensionRef?.current) {
        finish();
        return;
    }

    const bd = boardDimensionRef.current;
    const { talon } = bd.zones;

    const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === "waste");
    const cards = [...wasteCards, ...drawnCards].sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);

    const syncAllWasteZ = () => {
        wasteCards.forEach((c: SoloCard) => {
            if (c.ele) gsap.set(c.ele, { zIndex: soloCardZIndex(c, cards) });
        });
        for (const drawn of drawnCards) {
            if (drawn.ele) {
                gsap.set(drawn.ele, {
                    zIndex: soloCardZIndex(drawn, cards),
                    rotateY: 180,
                    rotateZ: 0,
                });
            }
        }
    };

    const tl = gsap.timeline({
        onComplete: () => {
            syncAllWasteZ();
            finish();
        },
    });

    try {
        const n = drawnCards.length;

        // 起始：全部叠在 talon，第一张（talon 顶）层级最高
        drawnCards.forEach((drawn, idx) => {
            if (!drawn.ele) return;
            gsap.set(drawn.ele, {
                x: talon.x,
                y: talon.y,
                zIndex: DRAW_FLIGHT_BASE_Z + (n - 1 - idx),
                rotateY: 0,
                rotateZ: 0,
            });
        });

        // 逐张 peel：飞行全程保持高层级，落地瞬间再设 waste 终值，避免半空 z 交叉或结束时集体跳变
        drawnCards.forEach((drawn, idx) => {
            if (!drawn.ele) return;
            const targetZ = soloCardZIndex(drawn, cards);
            const t = idx * DRAW_PEEL_STAGGER_SEC;
            const flightZ = DRAW_FLIGHT_BASE_Z + 10 + idx;

            tl.set(drawn.ele, { zIndex: flightZ }, t);

            tl.to(
                drawn.ele,
                {
                    x: () => getCardCoord(drawn, cards, boardDimensionRef).x,
                    y: () => getCardCoord(drawn, cards, boardDimensionRef).y,
                    rotateY: 180,
                    duration: DRAW_FLIGHT_DURATION_SEC,
                    ease: "power2.out",
                    onComplete: () => {
                        gsap.set(drawn.ele, { zIndex: targetZ });
                    },
                },
                t
            );
        });

        // 已有废牌随 fan 重排；与首张 peel 同时起步，略短于整段 draw
        wasteCards.forEach((c: SoloCard) => {
            if (!c.ele) return;
            tl.to(
                c.ele,
                {
                    x: () => getCardCoord(c, cards, boardDimensionRef).x,
                    y: () => getCardCoord(c, cards, boardDimensionRef).y,
                    rotateZ: 0,
                    duration: WASTE_REPOSITION_DURATION_SEC,
                    ease: "power2.out",
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
