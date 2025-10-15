import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCoord } from "../../Utils";

export const drawCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { card, boardDimension, gameState } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            if (card.ele)
                gsap.set(card.ele, { zIndex: card.zoneIndex + 10 });
            onComplete?.();
        }
    });
    if (card.ele) {
        // popCard(card);
        const wasteCards = gameState.cards.filter((c: SoloCard) => c.zoneId === 'waste');
        const cards = [...wasteCards, card].sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);
        console.log('drawCard cards', cards);
        const coord = getCoord(card, cards, boardDimension);
        tl.to(card.ele, {
            x: coord.x + 120,
            y: coord.y,
            rotateY: -180,
            rotateZ: 20,
            duration: 0.8,
            ease: "ease.out"
        }).to(card.ele, {
            x: coord.x + 80,
            y: coord.y + 40,
            rotateZ: 0,
            duration: 0.7,
            ease: "ease.in"
        });

        wasteCards.forEach((c: SoloCard) => {
            const coord = getCoord(c, cards, boardDimension);
            if (c.ele) {
                tl.to(c.ele, {
                    x: coord.x + 80,
                    y: coord.y + 40,
                    rotateZ: 0,
                    duration: 0.7,
                    ease: "ease.in"
                }, "<");
            }
        });

    }
    tl.play();

}