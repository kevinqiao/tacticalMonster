import { SoloCard, SUIT_ICONS } from "../../types/SoloTypes";

export const popCard = (card: SoloCard) => {

    if (card.ele) {
        const frontSvg = card.ele.querySelector('.front'); // 选择 .front SVG
        if (frontSvg) {
            // 获取顶部 rank 和 suit 的 <text> 元素
            const topRankText = frontSvg.querySelector('text[x="10"][y="25"]');
            const topSuitText = frontSvg.querySelector('text[x="10"][y="45"]');

            // 获取底部（旋转） rank 和 suit 的 <text> 元素
            const bottomRankText = frontSvg.querySelector('g text[x="0"][y="20"]');
            const bottomSuitText = frontSvg.querySelector('g text[x="0"][y="40"]');

            // 获取中央 suit 的 <text> 元素
            const centerSuitText = frontSvg.querySelector('text[x="50"][y="90"]');
            if (topRankText && topSuitText && bottomRankText && bottomSuitText && centerSuitText) {
                topRankText.textContent = card.rank || '';
                topSuitText.textContent = card.suit ? SUIT_ICONS[card.suit] : '';
                bottomRankText.textContent = card.rank || '';
                bottomSuitText.textContent = card.suit ? SUIT_ICONS[card.suit] : '';
                centerSuitText.textContent = card.suit ? SUIT_ICONS[card.suit] : '';
            }
        }
    }

}