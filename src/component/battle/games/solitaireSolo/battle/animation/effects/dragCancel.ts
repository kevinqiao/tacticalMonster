import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";
import { getCardCoord, soloCardZIndex } from "../../Utils";

export const dragCancel = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards: rawCards, boardDimensionRef, gameState } = data;
    const cards = (rawCards as SoloCard[] | undefined)?.filter(Boolean) ?? [];

    const finish = () => {
        onComplete?.();
    };

    if (!gameState || !boardDimensionRef?.current || cards.length === 0 || !cards[0]?.zoneId) {
        finish();
        return;
    }

    const zoneId = cards[0].zoneId;
    const zoneCards = gameState.cards
        .filter((c: SoloCard) => c.zoneId === zoneId)
        .sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);

    const snapStackToLayout = () => {
        for (const c of cards) {
            if (!c.ele) continue;
            const { x, y } = getCardCoord(c, zoneCards, boardDimensionRef);
            const z = soloCardZIndex(c, zoneCards);
            gsap.set(c.ele, { x, y, zIndex: z });
        }
    };

    const tl = gsap.timeline({
        onComplete: () => {
            snapStackToLayout();
            finish();
        },
    });

    try {
        let added = false;
        for (const c of cards) {
            if (!c.ele) continue;
            const z = soloCardZIndex(c, zoneCards);
            gsap.set(c.ele, { zIndex: z });
            tl.to(
                c.ele,
                {
                    x: () => getCardCoord(c, zoneCards, boardDimensionRef).x,
                    y: () => getCardCoord(c, zoneCards, boardDimensionRef).y,
                    duration: 0.22,
                    ease: "power2.out",
                },
                "<"
            );
            added = true;
        }
        if (!added) {
            snapStackToLayout();
            finish();
            return;
        }
        tl.play();
    } catch (e) {
        console.error("dragCancel", e);
        snapStackToLayout();
        finish();
    }
};