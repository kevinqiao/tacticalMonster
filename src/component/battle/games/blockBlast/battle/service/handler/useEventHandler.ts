/**
 * 事件队列处理器（与 solitaireSolo 同源；Block Blast 主流程已改由 useActHandler + PlayEffects 驱动）。
 * 若将来重新启用 EventProvider，可在此接入动画。
 */
import { useCallback } from 'react';
import { MatchEvent } from '../EventProvider';
import { useBlockBlastGameManager } from '../GameManager';

const useEventHandler = () => {
    const { gameState } = useBlockBlastGameManager();

    const handleEvent = useCallback(
        (event: MatchEvent, onComplete?: (eventId: string) => void) => {
            if (!gameState) return;
            event.status = 1;
            onComplete?.(event.id);
        },
        [gameState]
    );

    return { handleEvent };
};

export default useEventHandler;
