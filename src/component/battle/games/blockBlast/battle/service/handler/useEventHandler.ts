/**
 * Block Blast 事件处理器
 * 基于 solitaireSolo 的 useEventHandler 模式
 */

import { useCallback } from "react";
import { MatchEvent } from "../EventProvider";
import { useBlockBlastGameManager } from "../GameManager";

const useEventHandler = () => {
    const { timelines, gameState, boardDimension } = useBlockBlastGameManager();

    const handleEvent = useCallback((event: MatchEvent, onComplete?: (eventId: string) => void) => {
        if (!gameState) return;
        const { id, name, data } = event;
        event.status = 1;

        switch (name) {
            case "placeShape":
                // 放置形状的动画处理
                console.log("placeShape", event);
                // TODO: 实现放置动画
                break;
            case "clearLines":
                // 清除行的动画处理
                console.log("clearLines", event);
                // TODO: 实现清除行动画
                break;
            case "init":
                // 初始化游戏
                console.log("init", event);
                break;
            case "drop":
                // 拖拽放置
                console.log("drop", event);
                break;
            case "gameOver":
                // 游戏结束
                console.log("gameOver", event);
                break;
            default:
                console.log("gameDefault", event);
                break;
        }

        if (onComplete) {
            onComplete(id);
        }
    }, [gameState, boardDimension, timelines]);

    return { handleEvent };
};

export default useEventHandler;

