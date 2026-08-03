import gsap from "gsap";
import { ZoneType } from "../../types/SoloTypes";
import { tableauCardZIndex } from "../../Utils";
import { SOLO_ANIMATION_CONFIG } from "../animationConfig";
import { popCard } from "./popCard";

const FLIP_FLIGHT_Z = SOLO_ANIMATION_CONFIG.zIndex.moveFlightBase + 200;

export const flipCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { card, duration: durationOverride } = data;
    const duration = typeof durationOverride === "number" ? durationOverride : SOLO_ANIMATION_CONFIG.duration.flip.normal;

    if (!card?.ele) {
        onComplete?.();
        return;
    }

    popCard(card);
    // 明牌前牌背为 0，避免元素已是 180 时 to(180) 无可见动画
    gsap.set(card.ele, {
        rotateY: 0,
        transformOrigin: "50% 50%",
        zIndex: FLIP_FLIGHT_Z,
    });

    gsap.timeline({
        onComplete: () => {
            if (card.ele) {
                const z =
                    card.zone === ZoneType.TABLEAU
                        ? tableauCardZIndex(card.zoneId, card.zoneIndex)
                        : (card.zoneIndex ?? 0) + 10;
                gsap.set(card.ele, { rotateY: 180, zIndex: z });
            }
            onComplete?.();
        },
    })
        .to(card.ele, {
            rotateY: 180,
            duration,
            ease: "sine.inOut",
            force3D: true,
        });
};