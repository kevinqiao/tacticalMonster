import gsap from "gsap";
import { AudioBus } from "host/service/audio";
import { SoloCard } from "../../types/SoloTypes";
import { soloCardZIndex } from "../../Utils";
import { SOLO_ANIMATION_CONFIG } from "../animationConfig";

const { card: recycleDuration, stagger: recycleStagger } = SOLO_ANIMATION_CONFIG.duration.recycle;
const recycleEase = SOLO_ANIMATION_CONFIG.ease.recycle;
const RECYCLE_FLIGHT_BASE = SOLO_ANIMATION_CONFIG.zIndex.moveFlightBase;

/**
 * waste → talon。
 * 动画顺序：waste 顶牌（最高 zoneIndex / fan 右侧）先走。
 * zIndex：开场先按 waste 正确叠放校正；起飞时顶牌拿到最高 flight z。
 * （若误用 BASE+index 且 onStart 同帧触发，会把最先 draw 的底牌抬到最前。）
 */
export const recycle = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, gameState, boardDimensionRef } = data;

    const plannedById = new Map(
        ((cards as SoloCard[]) ?? []).map((c) => [c.id, c] as const)
    );

    // 用当前 waste DOM 卡做动画（仍是 waste zoneIndex），不要用 plan 里已反转的 talon zoneIndex
    const wastePile: SoloCard[] = (gameState?.cards ?? [])
        .filter((c: SoloCard) => c.zoneId === "waste" && c.ele)
        .sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);

    // 开场强制正确叠放：zoneIndex 越大越靠上（与 draw fan 一致）
    for (const c of wastePile) {
        if (!c.ele) continue;
        gsap.set(c.ele, { zIndex: soloCardZIndex(c, wastePile) });
    }

    // 顶牌先飞
    const animOrder = [...wastePile].sort(
        (a, b) => b.zoneIndex - a.zoneIndex
    );
    const n = animOrder.length;

    const tl = gsap.timeline({
        onComplete: () => {
            // 落到 talon 后的目标 z（plan 带 talon zoneIndex）
            const talonPlanned: SoloCard[] = animOrder.map((w) => {
                const p = plannedById.get(w.id);
                return {
                    ...(p ?? w),
                    ele: w.ele,
                    zoneId: p?.zoneId ?? "talon",
                    zone: p?.zone ?? w.zone,
                    zoneIndex: p?.zoneIndex ?? w.zoneIndex,
                } as SoloCard;
            });
            for (const c of talonPlanned) {
                if (!c.ele) continue;
                gsap.set(c.ele, { zIndex: soloCardZIndex(c, talonPlanned) });
            }
            onComplete?.();
        },
    });

    const stagger = Number.isFinite(recycleStagger) ? recycleStagger : 0.03;

    animOrder.forEach((card: SoloCard, index: number) => {
        if (!card.ele) return;

        // 顶牌 index=0 → 最高 z；即使同帧触发全部 onStart 也不会把底牌抬到最前
        const flightZ = RECYCLE_FLIGHT_BASE + (n - index);

        tl.to(
            card.ele,
            {
                x: () => boardDimensionRef.current?.zones.talon.x,
                y: () => boardDimensionRef.current?.zones.talon.y,
                rotateZ: 0,
                duration: recycleDuration,
                ease: recycleEase,
                onStart: () => {
                    if (card.ele) gsap.set(card.ele, { zIndex: flightZ });
                    // Match cascade: tick as each card lifts (catalog throttle paces dense piles)
                    AudioBus.emit("game.solitaire.recycle");
                },
            },
            index * stagger
        );

        // 翻面稍晚再做，避免仍叠在 waste 上时 3D rotateY 打乱视觉前后
        tl.to(
            card.ele,
            {
                rotateY: 0,
                duration: Math.max(0.12, recycleDuration * 0.55),
                ease: "power1.in",
            },
            index * stagger + recycleDuration * 0.35
        );
    });

    tl.play();
};
