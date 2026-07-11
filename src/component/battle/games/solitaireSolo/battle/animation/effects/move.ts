import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCardCoord, soloCardZIndex } from "../../Utils";
import { SOLO_ANIMATION_CONFIG } from "../animationConfig";

const { moveFlightBase, moveFlightStackOffset } = SOLO_ANIMATION_CONFIG.zIndex;

export const moveCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { moveCards, targetZoneId, gameState, boardDimensionRef, autoFoundationMove } = data;
    // 每次读取配置，避免 HMR 后仍用模块加载时的旧时长
    const moveDuration = autoFoundationMove
        ? SOLO_ANIMATION_CONFIG.duration.move.autoFoundation
        : SOLO_ANIMATION_CONFIG.duration.move.normal;
    const moveEase = autoFoundationMove
        ? SOLO_ANIMATION_CONFIG.ease.move.autoFoundation
        : SOLO_ANIMATION_CONFIG.ease.move.normal;

    const targetCards: SoloCard[] = gameState.cards.filter((c: SoloCard) => c.zoneId === targetZoneId);
    const zoneCards: SoloCard[] = [...targetCards, ...moveCards];

    const pile = [...moveCards].sort(
        (a: SoloCard, b: SoloCard) => (a.zoneIndex ?? 0) - (b.zoneIndex ?? 0)
    );

    const withEle = pile.filter((c) => c.ele);
    if (withEle.length === 0) {
        onComplete?.();
        return;
    }

    const snapToLayout = () => {
        for (const c of pile) {
            if (!c.ele) continue;
            const { x, y } = getCardCoord(c, zoneCards, boardDimensionRef);
            gsap.set(c.ele, {
                x: Math.round(x),
                y: Math.round(y),
                rotateZ: 0,
                scale: 1,
                autoAlpha: 1,
            });
        }
    };

    const settleTargetStackZ = () => {
        for (const c of zoneCards) {
            if (!c.ele) continue;
            gsap.set(c.ele, { zIndex: soloCardZIndex(c, zoneCards) });
        }
    };

    const getAutoFlightStart = (planned: SoloCard): { x: number; y: number } => {
        const live = gameState.cards.find((c: SoloCard) => c.id === planned.id) ?? planned;
        if (live.zoneId === targetZoneId && planned.ele) {
            return {
                x: Number(gsap.getProperty(planned.ele, "x")) || 0,
                y: Number(gsap.getProperty(planned.ele, "y")) || 0,
            };
        }
        const sourceZoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === live.zoneId);
        const coord = getCardCoord(live, sourceZoneCards, boardDimensionRef);
        return { x: Math.round(coord.x), y: Math.round(coord.y) };
    };

    const applyFlightZ = () => {
        withEle.forEach((c: SoloCard, i: number) => {
            gsap.set(c.ele!, { zIndex: moveFlightBase + moveFlightStackOffset + i });
        });
    };

    const tl = gsap.timeline({
        onStart: () => {
            // React setState(animating) 可能在同帧晚些覆盖 inline style；起飞再锁一次
            applyFlightZ();
        },
        onComplete: () => {
            snapToLayout();
            settleTargetStackZ();
            onComplete?.();
        },
    });

    applyFlightZ();
    // 覆盖 setInteractionPhase 触发的 React 重渲染（会晚一拍写 style）
    queueMicrotask(applyFlightZ);
    requestAnimationFrame(applyFlightZ);

    withEle.forEach((c: SoloCard) => {
        const dest = getCardCoord(c, zoneCards, boardDimensionRef);
        const toX = Math.round(dest.x);
        const toY = Math.round(dest.y);

        if (autoFoundationMove) {
            const modelStart = getAutoFlightStart(c);
            const domX = Number(gsap.getProperty(c.ele!, "x"));
            const domY = Number(gsap.getProperty(c.ele!, "y"));
            const domDistToModel = Math.hypot(domX - modelStart.x, domY - modelStart.y);
            const start =
                Number.isFinite(domX) && Number.isFinite(domY) && domDistToModel < 6
                    ? { x: Math.round(domX), y: Math.round(domY) }
                    : modelStart;

            gsap.killTweensOf(c.ele!);
            gsap.set(c.ele!, {
                x: start.x,
                y: start.y,
                rotateZ: 0,
                scale: 1,
                autoAlpha: 1,
            });

            // 单段直达目标槽位，不要中途停在 foundation 区域再挪槽
            tl.to(
                c.ele!,
                {
                    x: toX,
                    y: toY,
                    rotateZ: 0,
                    scale: 1,
                    duration: moveDuration,
                    ease: moveEase,
                },
                "<"
            );
            return;
        }

        tl.to(
            c.ele!,
            {
                x: toX,
                y: toY,
                rotateZ: 0,
                duration: moveDuration,
                ease: moveEase,
            },
            "<"
        );
    });
    tl.play();
};
