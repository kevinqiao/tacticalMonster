import { SoloCard, SUIT_ICONS } from "../../types/SoloTypes";

export const popCard = (card: SoloCard) => {
    if (!card.ele) return;
    const frontSvg = card.ele.querySelector(".front");
    if (!frontSvg) return;

    const topRankText = frontSvg.querySelector("text.solo-face-rank");
    const topSuitText = frontSvg.querySelector("text.solo-face-suit-corner");
    const bottomRankText = frontSvg.querySelector("g.solo-face-mirror text:first-of-type");
    const bottomSuitText = frontSvg.querySelector("g.solo-face-mirror text:last-of-type");
    const centerSuitText = frontSvg.querySelector("text.solo-face-center");
    const lowSuitText = frontSvg.querySelector("text.solo-face-suit-low");

    if (!topRankText || !topSuitText || !bottomRankText || !bottomSuitText || !centerSuitText) {
        return;
    }

    const suit = card.suit ? SUIT_ICONS[card.suit] : "";
    const rank = card.rank || "";
    topRankText.textContent = rank;
    topSuitText.textContent = suit;
    bottomRankText.textContent = rank;
    bottomSuitText.textContent = suit;
    centerSuitText.textContent = suit;
    if (lowSuitText) lowSuitText.textContent = suit;
};
