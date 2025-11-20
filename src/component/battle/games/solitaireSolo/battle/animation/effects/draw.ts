import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";

export const drawCard = ({ timelines, data, onComplete }: { timelines: { [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }, data: any; onComplete?: () => void }) => {
    const { card, boardDimensionRef, gameState } = data;
    const boardDimension = boardDimensionRef.current;
    const tl = gsap.timeline({
        onComplete: () => {
            // if (card.ele) {
            //     gsap.set(card.ele, { zIndex: card.zoneIndex + 10 });
            // }
            onComplete?.();
        }
    });
    timelines.draw = { timeline: tl, cards: [card] };
    if (card.ele) {
        // popCard(card);
        const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'waste');
        // const drawedCard = { ...card, zoneId: 'waste', zone: ZoneType.WASTE, zoneIndex: wasteCards.length };
        const cards = [...wasteCards, card].sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
        const ctl = gsap.timeline();
        tl.add(ctl);
        ctl.to(card.ele, {
            x: () => {
                const { x } = getCoord(card, cards, boardDimensionRef);
                return x + 40;
            },
            y: () => {
                const { y } = getCoord(card, cards, boardDimensionRef);
                return y - 40;
            },
            rotateY: -180,
            rotateZ: 20,
            zIndex: card.zoneIndex + 10,
            duration: 0.5,
            ease: "ease.out"
        }).to(card.ele, {
            x: () => {
                const { x } = getCoord(card, cards, boardDimensionRef);
                return x;
            },
            y: () => {
                const { y } = getCoord(card, cards, boardDimensionRef);
                return y;
            },
            rotateZ: 0,
            duration: 0.4,
            ease: "ease.in"
        });
        const wtl = gsap.timeline();
        tl.add(wtl, ">=-0.25");
        wasteCards.forEach((c: SoloCard) => {
            if (c.ele) {
                gsap.set(c.ele, { zIndex: c.zoneIndex + 10 });
                wtl.to(c.ele, {
                    x: () => {
                        const { x } = getCoord(c, cards, boardDimensionRef);
                        return x;
                    },
                    y: () => {
                        const { y } = getCoord(c, cards, boardDimensionRef);
                        return y;
                    },
                    rotateZ: 0,
                    duration: 0.4,
                    ease: "ease.in"
                }, "<");
            }
        });

    }
    tl.play();

}