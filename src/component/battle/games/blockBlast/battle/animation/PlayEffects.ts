import { AudioBus } from 'host/service/audio';
import { clearLinesAnim } from './effects/clearLinesAnim';
import { dragCancelShape } from './effects/dragCancelShape';
import { gameOverEffect } from './effects/gameOver';

type EffectFn = (args: { data: any; onComplete?: () => void }) => void;

export const PlayEffects: Record<string, EffectFn> = {
    dragCancel: ({ data, onComplete }) => {
        AudioBus.emit('game.blockblast.drag_cancel');
        dragCancelShape({ data, onComplete });
    },
    clearLines: ({ data, onComplete }) => {
        const { rows, cols, gridCellRefs } = data;
        if (!gridCellRefs?.length) {
            onComplete?.();
            return;
        }
        AudioBus.emit('game.blockblast.clear');
        clearLinesAnim({
            rows: rows ?? [],
            cols: cols ?? [],
            gridCellRefs,
            onComplete,
        });
    },
    gameOver: ({ data, onComplete }) => {
        AudioBus.emit('game.blockblast.game_over');
        gameOverEffect({ element: data?.reportElement ?? null, onComplete });
    },
};
