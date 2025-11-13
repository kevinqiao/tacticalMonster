import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";
export const resetZone = ({ timelines, data, onComplete }: { timelines: { [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }, data: any; onComplete?: () => void }) => {
    const { cards, boardDimension } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });
    timelines.resetZone.timeline = tl;
    timelines.resetZone.cards = cards;
    cards.forEach((c: SoloCard) => {
        const coord = getCoord(c, cards, boardDimension);
        if (c.ele) {
            tl.to(c.ele, {
                x: coord.x,
                y: coord.y,
                duration: 0.5,
                ease: "ease.out"
            }, "<");
        }
    });
    tl.play();
    return;

}