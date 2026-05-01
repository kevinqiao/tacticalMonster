/**
 * 与 solitaire SoloRuleManager 同层：交互/可下子判断，底层走 shared gameRules。
 * 前后端共用本类；DOM 相关只在前端 Shape 上挂 ele，仍与共享 Shape 结构兼容。
 */
import {
    ActMode,
    BlockBlastGameStatus,
    GameInteractionPhase,
} from '../types/BlockBlastTypes';
import type { BlockBlastRule, GameModel, Shape } from '../types/BlockBlastTypes';
import {
    canPlaceAnyShape as canPlaceAnyShapeLogic,
    canPlaceShape as canPlaceShapeLogic,
    checkLines as checkLinesLogic,
} from '../utils/gameRules';

export class BlockBlastRuleManager implements BlockBlastRule {
    private gameState: GameModel;
    private interactionPhase: GameInteractionPhase;

    constructor(gameState: GameModel, interactionPhase: GameInteractionPhase) {
        this.gameState = gameState;
        this.interactionPhase = interactionPhase;
    }

    getActModes(s: Shape): ActMode[] {
        if (this.interactionPhase === GameInteractionPhase.animating) return [];
        if (
            this.interactionPhase !== GameInteractionPhase.idle &&
            this.interactionPhase !== GameInteractionPhase.pointerDrag
        ) {
            return [];
        }
        if (this.gameState.status !== BlockBlastGameStatus.PLAYING) return [];
        const inHand = this.gameState.shapes.some((h) => h.id === s.id);
        if (!inHand) return [];
        return [ActMode.DRAG, ActMode.CLICK];
    }

    canPlaceShape(s: Shape, position: { row: number; col: number }): boolean {
        if (this.interactionPhase === GameInteractionPhase.animating) return false;
        if (
            this.interactionPhase !== GameInteractionPhase.idle &&
            this.interactionPhase !== GameInteractionPhase.pointerDrag
        ) {
            return false;
        }
        if (this.gameState.status !== BlockBlastGameStatus.PLAYING) return false;

        return canPlaceShapeLogic(this.gameState.grid, s.shape, position.row, position.col);
    }

    findValidPositions(s: Shape): { row: number; col: number }[] {
        const valid: { row: number; col: number }[] = [];
        const shapeMatrix = s.shape;
        const grid = this.gameState.grid;
        const n = grid.length;
        const sh = shapeMatrix.length;
        const sw = shapeMatrix[0]?.length ?? 0;
        if (n === 0 || sh === 0 || sw === 0) return valid;
        for (let row = 0; row <= n - sh; row++) {
            for (let col = 0; col <= n - sw; col++) {
                if (canPlaceShapeLogic(grid, shapeMatrix, row, col)) {
                    valid.push({ row, col });
                }
            }
        }
        return valid;
    }

    checkLines(): { rows: number[]; cols: number[] } {
        return checkLinesLogic(this.gameState.grid);
    }

    isGameOver(): boolean {
        return (
            this.gameState.status === BlockBlastGameStatus.LOST ||
            this.gameState.status === BlockBlastGameStatus.WON ||
            !this.canPlaceAnyShape()
        );
    }

    canPlaceAnyShape(): boolean {
        return canPlaceAnyShapeLogic(this.gameState.grid, this.gameState.shapes);
    }
}

export default BlockBlastRuleManager;
