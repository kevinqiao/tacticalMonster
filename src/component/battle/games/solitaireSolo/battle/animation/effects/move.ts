import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCardCoord, syncCardStackZIndexFromGameState } from "../../Utils";
import { SOLO_ANIMATION_CONFIG } from "../animationConfig";

const { moveFlightBase, moveFlightStackOffset } = SOLO_ANIMATION_CONFIG.zIndex;
const { normal: normalMoveDuration, autoFoundation: autoFoundationMoveDuration } = SOLO_ANIMATION_CONFIG.duration.move;
const { normal: moveEaseNormal, autoFoundation: moveEaseAuto } = SOLO_ANIMATION_CONFIG.ease.move;

export const moveCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {

    const { moveCards, targetZoneId, gameState, boardDimensionRef, autoFoundationMove } = data;
    const moveDuration = autoFoundationMove ? autoFoundationMoveDuration : normalMoveDuration;
    const moveEase = autoFoundationMove ? moveEaseAuto : moveEaseNormal;

    const targetCards: SoloCard[] = gameState.cards.filter((c: SoloCard) => c.zoneId === targetZoneId);
    const zoneCards: SoloCard[] = [...targetCards, ...moveCards];

    const snapToLayout = () => {
        for (const c of pile) {
            if (!c.ele) continue;
            const { x, y } = getCardCoord(c, zoneCards, boardDimensionRef);
            // 与 layout 取整一致，避免末帧子像素 + z 重算时整卡闪一下
            gsap.set(c.ele, { x: Math.round(x), y: Math.round(y), rotateZ: 0 });
        }
    };

    const tl = gsap.timeline({
        onComplete: () => {
            snapToLayout();
            onComplete?.();
            // 下一帧再统一下 z，避免与末帧 transform 同 tick 重绘产生抖动
            requestAnimationFrame(() => {
                syncCardStackZIndexFromGameState(gameState);
            });
        }
    });

    const pile = moveCards.sort((a: SoloCard, b: SoloCard) => (a.zoneIndex ?? 0) - (b.zoneIndex ?? 0));
    // 飞行阶段将整摞牌统一抬到全局最上层，避免与任意列交错时被遮挡
    pile.forEach((c: SoloCard, i: number) => {
        if (c.ele) gsap.set(c.ele, { zIndex: moveFlightBase + moveFlightStackOffset + i });
    });
    pile.forEach((c: SoloCard) => {
        if (c.ele) {
            tl.to(c.ele, {
                x: () => {
                    const { x } = getCardCoord(c, zoneCards, boardDimensionRef);
                    return x;
                },
                y: () => {
                    const { y } = getCardCoord(c, zoneCards, boardDimensionRef);
                    return y;
                },
                rotateZ: 0,
                duration: moveDuration,
                ease: moveEase
            }, "<");
        }
    });
    tl.play();
}
