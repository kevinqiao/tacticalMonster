import { dealEffect } from "./effects/dealEffect";
import { dragCancel } from "./effects/dragCancel";
import { drawCard } from "./effects/draw";
import { flipCard } from "./effects/flip";
import { gameOverEffect } from "./effects/gameOverEffect";
import { hideCard } from "./effects/hideCard";
import { initGame } from "./effects/initGame";
import { moveCard } from "./effects/move";
import { popCard } from "./effects/popCard";
import { recycle } from "./effects/recycle";
import { shuffle } from "./effects/shuffle";


interface PlayEffects {
    [key: string]: (args: { effectType?: string, data: any; onComplete?: () => void }) => void;
}

export const PlayEffects: PlayEffects = {
    initGame: ({ data, onComplete }) => {
        initGame({ data, onComplete });
    },
    popCard: ({ data }) => {
        const { card } = data;
        if (card && card.ele) {
            popCard(card);
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
