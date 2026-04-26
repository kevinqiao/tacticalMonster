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
import { shuffle } from "./effects/shuffle";


interface PlayEffects {
    [key: string]: (args: { effectType?: string, data: any; onComplete?: () => void }) => void;
}

export const PlayEffects: PlayEffects = {

    popCard: ({ data, onComplete }) => {
        const { card, gameState } = data;
        if (!gameState || !card) {
            onComplete?.();
            return;
        }
        const pcard = gameState.cards.find((c: SoloCard) => c.id === card.id);
        if (pcard && !pcard.isRevealed && pcard.ele) {
            popCard(pcard);
            onComplete?.();
            return;
        }
        onComplete?.();
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
    deal: ({ effectType, data, onComplete }) => {
        dealEffect({ effectType, data, onComplete });
    },
    dragCancel: ({ data, onComplete }) => {
        dragCancel({ data, onComplete });
    },
    flipCard: ({ data, onComplete }) => {
        flipCard({ data, onComplete });
    },

    drawCard: ({ data, onComplete }) => {
        drawCard({ data, onComplete });
    },
    moveCard: ({ data, onComplete }) => {
        moveCard({ data, onComplete });
    },
    recycle: ({ data, onComplete }) => {
        recycle({ data, onComplete });
    },


    // 游戏胜利效果
    gameOver: ({ effectType, data, onComplete }) => {
        gameOverEffect({ effectType: effectType || 'default', data, onComplete });
    }


};
