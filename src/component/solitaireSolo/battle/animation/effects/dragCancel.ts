import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";

export const dragCancel = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, boardDimension, gameState } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            cards.forEach((c: SoloCard) => {
                console.log("dragCancel", c);
                if (c && c.ele)
                    gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
            });
            onComplete?.();
        }
    });

    if (cards) {
        console.log("dragCancel", cards);
        const zoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === cards[0].zoneId);
        cards.forEach((c: SoloCard, index: number) => {
            const coord = getCoord(c, zoneCards, boardDimension);
            if (c.ele) {
                tl.to(c.ele, {
                    x: coord.x,
                    y: coord.y,
                    duration: 0.5,
                    ease: "ease.out"
                }, "<");
            }
        });
    }
    tl.play();
    return;
}