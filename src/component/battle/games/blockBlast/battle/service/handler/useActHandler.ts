/**
 * Block Blast 操作处理器
 * 基于 solitaireSolo 的 useActHandler 模式
 */

import { useConvex } from "convex/react";
import { useCallback } from "react";
import { api } from "../../../../../../../convex/blockBlast/convex/_generated/api";
import { ActionStatus, Shape } from "../../types/BlockBlastTypes";
import { useBlockBlastGameManager } from "../GameManager";

const useActHandler = () => {
    const convex = useConvex();
    const { gameState, ruleManager } = useBlockBlastGameManager();

    const onDrop = useCallback(async (shape: Shape, position: { row: number, col: number }) => {
        if (!gameState || !ruleManager) return;
        if (!ruleManager.canPlaceShape(shape, position)) {
            gameState.actionStatus = ActionStatus.IDLE;
            return;
        }

        gameState.actionStatus = ActionStatus.DROPPING;

        try {
            const result = await convex.mutation(api.service.gameManager.placeShape, {
                gameId: gameState.gameId,
                shapeId: shape.id,
                row: position.row,
                col: position.col,
            });

            if (result.ok && result.data) {
                // 更新本地状态
                if (result.data.grid) {
                    gameState.grid = result.data.grid;
                }
                if (result.data.shapes) {
                    gameState.shapes = result.data.shapes;
                }
                if (result.data.score !== undefined) {
                    gameState.score = result.data.score;
                }
                if (result.data.lines !== undefined) {
                    gameState.lines = result.data.lines;
                }
                if (result.data.status !== undefined) {
                    gameState.status = result.data.status;
                }

                // 触发放置事件
                // 事件会由 EventProvider 处理
            } else {
                gameState.actionStatus = ActionStatus.IDLE;
            }
        } catch (error) {
            console.error("placeShape failed:", error);
            gameState.actionStatus = ActionStatus.IDLE;
        }
    }, [gameState, ruleManager, convex]);

    return { onDrop };
};

export default useActHandler;

