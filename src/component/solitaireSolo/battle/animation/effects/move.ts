import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";

export const moveCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {

    const { cards, gameState, boardDimension } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            cards.forEach((c: SoloCard) => {
                if (c.ele)
                    gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
            });
            onComplete?.();
        }
    });
    const zoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === cards[0].zoneId);
    const columnCards = [...zoneCards, ...cards];
    cards.forEach((c: SoloCard) => {
        if (c.ele) {
            const coord = getCoord(c, columnCards, boardDimension);
            tl.to(c.ele, {
                x: coord.x,
                y: coord.y,
                rotateZ: 0,
                duration: 0.6,
                ease: "ease.in"
            }, "<");
        }
    });
    tl.play();
}