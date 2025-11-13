import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";

export const moveCard = ({ timelines, data, onComplete }: { timelines: { [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }, data: any; onComplete?: () => void }) => {

    const { cards, gameState, boardDimensionRef } = data;

    const tl = gsap.timeline({
        onComplete: () => {
            cards.forEach((c: SoloCard) => {
                if (c.ele)
                    gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
            });
            onComplete?.();
        }
    });
    timelines.move = { timeline: tl, cards: cards };
    const zoneCards = gameState.cards.filter((c: SoloCard) => c.zoneId === cards[0].zoneId);
    const columnCards = [...zoneCards, ...cards];
    cards.forEach((c: SoloCard) => {
        if (c.ele) {
            tl.to(c.ele, {
                x: () => {
                    const { x } = getCoord(c, columnCards, boardDimensionRef);
                    return x;
                },
                y: () => {
                    const { y } = getCoord(c, columnCards, boardDimensionRef);
                    return y;
                },
                rotateZ: 0,
                duration: 0.6,
                ease: "ease.in"
            }, "<");
        }
    });
    tl.play();
}