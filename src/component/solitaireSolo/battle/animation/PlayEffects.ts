import { SoloCard } from "../types/SoloTypes";
import { dealEffect } from "./effects/dealEffect";
import { dragCancel } from "./effects/dragCancel";
import { drawCard } from "./effects/draw";
import { flipCard } from "./effects/flip";
import { gameOverEffect } from "./effects/gameOverEffect";
import { hideCard } from "./effects/hideCard";
import { moveCard } from "./effects/move";
import { popCard } from "./effects/popCard";
import { recycle } from "./effects/recycle";
import { resetZone } from "./effects/resetZone";
import { shuffle } from "./effects/shuffle";


interface PlayEffects {
    [key: string]: (args: { timelines: { [k: string]: { timeline: GSAPTimeline, cards: SoloCard[] } }, effectType?: string, data: any; onComplete?: () => void }) => void;
}

export const PlayEffects: PlayEffects = {

    popCard: ({ timelines, data }) => {
        const { card, gameState } = data;
        if (!gameState || !card) return;
        const pcard = gameState.cards.find((c: SoloCard) => c.id === card.id);
        if (pcard && pcard.ele) {
            popCard(pcard);
            pcard.isRevealed = true;
            pcard.rank = card.rank;
            pcard.suit = card.suit;
        }
    },
    hideCard: ({ data }) => {
        const { card } = data;
        if (card && card.ele) {
            hideCard(card);
        }
    },
    shuffle: ({ data }) => {
        shuffle({ data });
    },

    // 默认发牌效果
    deal: ({ timelines, effectType, data, onComplete }) => {
        dealEffect({ timelines, effectType, data, onComplete });
    },
    dragCancel: ({ data, onComplete }) => {
        dragCancel({ data, onComplete });
    },
    flipCard: ({ data, onComplete }) => {
        flipCard({ data, onComplete });
    },

    drawCard: ({ timelines, data, onComplete }) => {
        drawCard({ timelines, data, onComplete });
    },
    moveCard: ({ timelines, data, onComplete }) => {
        moveCard({ timelines, data, onComplete });
    },
    recycle: ({ timelines, data, onComplete }) => {
        recycle({ timelines, data, onComplete });
    },
    resetZone: ({ timelines, data, onComplete }) => {
        resetZone({ timelines, data, onComplete });
    },

    // 游戏胜利效果
    gameOver: ({ effectType, data, onComplete }) => {
        gameOverEffect({ effectType: effectType || 'default', data, onComplete });
    }


};
