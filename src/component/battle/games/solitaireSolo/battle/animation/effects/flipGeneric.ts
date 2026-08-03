import gsap from "gsap";
import type { SoloCard } from "../../types/SoloTypes";
import { ZoneType } from "../../types/SoloTypes";
import { tableauCardZIndex } from "../../Utils";
import { SOLO_ANIMATION_CONFIG } from "../animationConfig";
import { popCard } from "./popCard";

const FLIP_FLIGHT_Z = SOLO_ANIMATION_CONFIG.zIndex.moveFlightBase + 200;
/** 停在侧面，正面不可见，等待 server reveal */
const FLIP_HOLD_DEG = 90;

export type FlipGenericSession = {
    /** server 返回 rank/suit 后填牌面并完成翻到正面 */
    completeReveal: (faceCard: SoloCard, onComplete?: () => void) => void;
    /** mutation 失败或无 flip：翻回牌背 */
    cancel: (onComplete?: () => void) => void;
};

function settleFlipZIndex(card: SoloCard): void {
    if (!card.ele) return;
    const z =
        card.zone === ZoneType.TABLEAU
            ? tableauCardZIndex(card.zoneId, card.zoneIndex)
            : (card.zoneIndex ?? 0) + 10;
    gsap.set(card.ele, { rotateY: 180, zIndex: z });
}

export function startFlipGeneric({
    card,
    duration: durationOverride,
}: {
    card: SoloCard;
    duration?: number;
}): FlipGenericSession | null {
    if (!card?.ele) return null;

    const duration =
        typeof durationOverride === "number" ? durationOverride : SOLO_ANIMATION_CONFIG.duration.flip.normal;
    const half = duration / 2;
    let cancelled = false;
    let holdTween: gsap.core.Tween | null = null;
    let finishTween: gsap.core.Tween | null = null;

    gsap.set(card.ele, {
        rotateY: 0,
        transformOrigin: "50% 50%",
        zIndex: FLIP_FLIGHT_Z,
    });

    holdTween = gsap.to(card.ele, {
        rotateY: FLIP_HOLD_DEG,
        duration: half,
        ease: "sine.inOut",
    });

    return {
        completeReveal: (faceCard, onComplete) => {
            if (cancelled || !card.ele) {
                onComplete?.();
                return;
            }
            holdTween?.kill();
            popCard(faceCard);
            finishTween = gsap.to(card.ele, {
                rotateY: 180,
                duration: half,
                ease: "sine.inOut",
                onComplete: () => {
                    settleFlipZIndex(faceCard);
                    onComplete?.();
                },
            });
        },
        cancel: (onComplete) => {
            cancelled = true;
            holdTween?.kill();
            finishTween?.kill();
            if (!card.ele) {
                onComplete?.();
                return;
            }
            gsap.to(card.ele, {
                rotateY: 0,
                duration: half,
                ease: "sine.inOut",
                onComplete: () => {
                    const z =
                        card.zone === ZoneType.TABLEAU
                            ? tableauCardZIndex(card.zoneId, card.zoneIndex)
                            : (card.zoneIndex ?? 0) + 10;
                    gsap.set(card.ele, { zIndex: z });
                    onComplete?.();
                },
            });
        },
    };
}
