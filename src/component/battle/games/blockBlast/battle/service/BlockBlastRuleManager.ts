/**
 * Block Blast 游戏规则管理器
 * 基于 solitaireSolo 的 SoloRuleManager 设计模式
 * 使用共享的游戏规则逻辑，添加前端特有的状态检查
 */

import {
    ActionStatus,
    BlockBlastGameState,
    BlockBlastGameStatus,
    BlockBlastRule,
    Shape
} from '../types/BlockBlastTypes';
// 导入共享规则函数
import {
    canPlaceAnyShape as canPlaceAnyShapeLogic,
    canPlaceShape as canPlaceShapeLogic,
    checkLines as checkLinesLogic
} from '../utils/gameRules';

export class BlockBlastRuleManager implements BlockBlastRule {
    private gameState: BlockBlastGameState;

    constructor(gameState: BlockBlastGameState) {
        this.gameState = gameState;
    }

    /**
     * 检查是否可以放置形状到指定位置
     * 包含前端特有的状态检查，然后调用共享逻辑
     */
    canPlaceShape(shape: Shape, position: { row: number, col: number }): boolean {
        // 前端特有的状态检查
        if (this.gameState.actionStatus !== ActionStatus.IDLE) return false;
        if (this.gameState.status !== BlockBlastGameStatus.PLAYING) return false;

        // 调用共享的规则逻辑
        return canPlaceShapeLogic(
            this.gameState.grid,
            shape.shape,
            position.row,
            position.col
        );
    }

    /**
     * 查找形状可以放置的所有有效位置
     */
    findValidPositions(shape: Shape): { row: number, col: number }[] {
        const validPositions: { row: number, col: number }[] = [];
        const shapeMatrix = shape.shape;

        // 遍历所有可能的位置
        for (let row = 0; row <= 10 - shapeMatrix.length; row++) {
            for (let col = 0; col <= 10 - shapeMatrix[0].length; col++) {
                if (canPlaceShapeLogic(this.gameState.grid, shapeMatrix, row, col)) {
                    validPositions.push({ row, col });
                }
            }
        }

        return validPositions;
    }

    /**
     * 检查哪些行/列已填满，需要消除
     * 直接调用共享逻辑
     */
    checkLines(): { rows: number[], cols: number[] } {
        return checkLinesLogic(this.gameState.grid);
    }

    /**
     * 检查游戏是否结束（失败）
     */
    isGameOver(): boolean {
        return this.gameState.status === BlockBlastGameStatus.LOST ||
            this.gameState.status === BlockBlastGameStatus.WON ||
            !this.canPlaceAnyShape();
    }

    /**
     * 检查是否有任何形状可以放置
     * 调用共享逻辑
     */
    canPlaceAnyShape(): boolean {
        return canPlaceAnyShapeLogic(this.gameState.grid, this.gameState.shapes);
    }
}

export default BlockBlastRuleManager;

