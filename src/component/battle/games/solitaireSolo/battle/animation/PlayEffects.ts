import { AudioBus } from "host/service/audio";
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
        if (effectType === "opening") {
            AudioBus.emit("game.solitaire.deal.opening");
        }
        dealEffect({ effectType, data, onComplete });
    },
    dragCancel: ({ data, onComplete }) => {
        AudioBus.emit("game.solitaire.drag_cancel");
        dragCancel({ data, onComplete });
    },
    flipCard: ({ data, onComplete }) => {
        AudioBus.emit("game.solitaire.flip");
        flipCard({ data, onComplete });
    },

    drawCard: ({ data, onComplete }) => {
        AudioBus.emit("game.solitaire.draw");
        drawCard({ data, onComplete });
    },
    moveCard: ({ data, onComplete }) => {
        const target = String(data?.targetZoneId ?? "");
        if (target.startsWith("foundation")) {
            AudioBus.emit("game.solitaire.move.foundation");
        } else {
            AudioBus.emit("game.solitaire.move");
        }
        moveCard({ data, onComplete });
    },
    recycle: ({ data, onComplete }) => {
        // SFX is timed inside recycle() to each card's flight start
        recycle({ data, onComplete });
    },


    // 游戏胜利效果（win SFX 跟拍在 cascadeClassicSimple 时间线内）
    gameOver: ({ effectType, data, onComplete }) => {
        gameOverEffect({ effectType: effectType || 'default', data, onComplete });
    }


};
