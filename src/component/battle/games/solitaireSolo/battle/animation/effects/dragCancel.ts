import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";

export const dragCancel = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, boardDimensionRef, gameState } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            // cards.forEach((c: SoloCard) => {
            //      if (c && c.ele)
            //         gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
            // });
            onComplete?.();
        }
    });

    if (cards) {
        const zoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === cards[0].zoneId).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
        console.log("dragCancel zoneCards", zoneCards, cards[0]);
        cards.forEach((c: SoloCard, index: number) => {

            if (c.ele) {
                gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
                tl.to(c.ele, {
                    x: () => {
                        const { x } = getCoord(c, zoneCards, boardDimensionRef);
                        return x;
                    },
                    y: () => {
                        const { y } = getCoord(c, zoneCards, boardDimensionRef);
                        return y;
                    },
                    duration: 0.5,
                    ease: "ease.out"
                }, "<");
            }
        });
    }
    tl.play();
    return;
}