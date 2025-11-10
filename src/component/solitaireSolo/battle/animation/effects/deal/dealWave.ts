import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";
import { getCoord } from "../../../Utils";
import { popCard } from "../popCard";

/**
 * 波浪式发牌效果 - 多米诺效果
 */
export const dealWave = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, gameState, boardDimension } = data;
    console.log("dealWave", cards, gameState.cards);
    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });

    const deckX = boardDimension.zones.talon.x;
    const deckY = boardDimension.zones.talon.y;

    // 按列发牌，每列形成波浪
    for (let col = 0; col < 7; col++) {
        const columnCards = cards.filter((c: SoloCard) =>
            c.zone === ZoneType.TABLEAU &&
            c.zoneId === `tableau-${col}`
        ).sort((a: SoloCard, b: SoloCard) => a.zoneIndex - b.zoneIndex);

        columnCards.forEach((c: SoloCard, rowIndex: number) => {
            const card = gameState.cards.find((gc: SoloCard) => gc.id === c.id);
            if (!card) return;

            const { x, y } = getCoord(c, columnCards, boardDimension);
            console.log("card", card, x, y);
            gsap.set(card.ele, { x: deckX, y: deckY - 200 }); // 从上方落下

            // 波浪效果：每列比前一列稍晚，每行比前一行稍晚
            const delay = col * 0.1 + rowIndex * 0.05;

            tl.to(card.ele, {
                x,
                y, // 先弹高一点
                // rotateZ: (Math.random() - 0.5) * 15,
                duration: 0.3,
                ease: "power2.out",
                zIndex: card.zoneIndex + 10
            }, delay)
            // .to(card.ele, {
            //     y, // 落到最终位置
            //     rotateZ: 0,
            //     duration: 0.2,
            //     ease: "bounce.out"
            // });
        });
    }

    // 翻牌：从左到右波浪式翻开
    const revealCards = cards.filter((c: SoloCard) => c.isRevealed)
        .sort((a: SoloCard, b: SoloCard) => {
            const colA = parseInt(a.zoneId.split('-')[1]);
            const colB = parseInt(b.zoneId.split('-')[1]);
            return colA - colB;
        });

    tl.add("reveal", "+=0.2");

    revealCards.forEach((c: SoloCard, index: number) => {
        const card = gameState.cards.find((gc: SoloCard) => gc.id === c.id);
        if (!card || !card.ele) return;
        popCard(card);
        tl.to(card.ele, {
            rotateY: 180,
            scale: 1.1, // 翻牌时放大
            duration: 0.25,
            ease: "power2.out"
        }, `reveal+=${index * 0.12}`)
            .to(card.ele, {
                scale: 1,
                duration: 0.15,
                ease: "power2.in"
            });
    });

    tl.play();
};
