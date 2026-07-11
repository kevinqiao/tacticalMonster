import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCardCoord, soloCardZIndex } from "../../Utils";
import { SOLO_ANIMATION_CONFIG } from "../animationConfig";

const DRAW_FLIGHT_BASE_Z = SOLO_ANIMATION_CONFIG.zIndex.moveFlightBase;
const {
    flight: DRAW_FLIGHT_DURATION_SEC,
    stagger: DRAW_PEEL_STAGGER_SEC,
    flip: DRAW_FLIP_DURATION_SEC,
    wasteReposition: WASTE_REPOSITION_DURATION_SEC,
} = SOLO_ANIMATION_CONFIG.duration.draw;
const {
    flight: drawFlightEase,
    flip: drawFlipEase,
    wasteReposition: wasteRepositionEase,
} = SOLO_ANIMATION_CONFIG.ease.draw;

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
    const cards = [...wasteCards, ...drawnCards].sort(
        (a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex
    );

    // 预计算落点，避免每帧 getter + 布局查询
    const targetById = new Map<string, { x: number; y: number; z: number }>();
    for (const c of cards) {
        const { x, y } = getCardCoord(c, cards, boardDimensionRef);
        targetById.set(c.id, {
            x: Math.round(x),
            y: Math.round(y),
            z: soloCardZIndex(c, cards),
        });
    }

    const syncAllWasteZ = () => {
        for (const c of [...wasteCards, ...drawnCards]) {
            if (!c.ele) continue;
            const t = targetById.get(c.id);
            gsap.set(c.ele, {
                ...(t ? { x: t.x, y: t.y, zIndex: t.z } : { zIndex: soloCardZIndex(c, cards) }),
                rotateY: 180,
                rotateZ: 0,
            });
        }
    };

    const tl = gsap.timeline({
        onComplete: () => {
            // 整段结束再统一落 z，避免逐张落地改 z 造成顿挫
            syncAllWasteZ();
            finish();
        },
    });

    try {
        const n = drawnCards.length;

        // 起始：全部叠在 talon，talon 顶（先 peel 的）层级最高
        drawnCards.forEach((drawn, idx) => {
            if (!drawn.ele) return;
            gsap.set(drawn.ele, {
                x: talon.x,
                y: talon.y,
                zIndex: DRAW_FLIGHT_BASE_Z + (n - idx),
                rotateY: 0,
                rotateZ: 0,
            });
        });

        drawnCards.forEach((drawn, idx) => {
            if (!drawn.ele) return;
            const target = targetById.get(drawn.id);
            if (!target) return;
            const t = idx * DRAW_PEEL_STAGGER_SEC;
            // 后 peel 的牌 flight z 更高，飞过时盖住先落地的牌，结束再统一落到 waste z
            const flightZ = DRAW_FLIGHT_BASE_Z + 20 + idx;

            tl.set(drawn.ele, { zIndex: flightZ }, t);

            tl.to(
                drawn.ele,
                {
                    x: target.x,
                    y: target.y,
                    duration: DRAW_FLIGHT_DURATION_SEC,
                    ease: drawFlightEase,
                },
                t
            );

            // 翻面嵌在飞行中段，比位移+翻面绑死同一条 tween 更顺
            tl.to(
                drawn.ele,
                {
                    rotateY: 180,
                    duration: DRAW_FLIP_DURATION_SEC,
                    ease: drawFlipEase,
                },
                t + DRAW_FLIGHT_DURATION_SEC * 0.18
            );
        });

        // 已有废牌 fan 重排：与首张同步起步，略短、同缓动，避免拖尾
        wasteCards.forEach((c: SoloCard) => {
            if (!c.ele) return;
            const target = targetById.get(c.id);
            if (!target) return;
            tl.to(
                c.ele,
                {
                    x: target.x,
                    y: target.y,
                    rotateZ: 0,
                    duration: WASTE_REPOSITION_DURATION_SEC,
                    ease: wasteRepositionEase,
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
