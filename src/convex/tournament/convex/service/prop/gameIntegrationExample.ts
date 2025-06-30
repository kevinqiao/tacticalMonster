// @ts-nocheck
import { internal } from "../../_generated/api";

// 游戏状态管理类
export class GameStateManager {
    private gameId: string;
    private uid: string;
    private gameType: string;
    private gameState: any;
    private usedProps: string[] = [];

    constructor(gameId: string, uid: string, gameType: string, initialGameState: any) {
        this.gameId = gameId;
        this.uid = uid;
        this.gameType = gameType;
        this.gameState = initialGameState;
    }

    // 游戏进行中使用道具
    async useProp(propType: string, params?: any) {
        try {
            const result = await internal.service.prop.delayedPropDeduction.usePropDuringGame({
                uid: this.uid,
                gameId: this.gameId,
                gameType: this.gameType,
                propType,
                gameState: this.gameState,
                params
            });

            if (result.success) {
                this.gameState = result.newGameState;
                this.usedProps.push(propType);
                return {
                    success: true,
                    newGameState: this.gameState,
                    propUsed: propType,
                    message: result.message
                };
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 批量使用道具
    async useMultipleProps(props: Array<{ propType: string; params?: any }>) {
        try {
            const result = await internal.service.prop.delayedPropDeduction.useMultiplePropsDuringGame({
                uid: this.uid,
                gameId: this.gameId,
                gameType: this.gameType,
                props,
                gameState: this.gameState
            });

            if (result.success) {
                this.gameState = result.finalGameState;
                this.usedProps.push(...props.map(p => p.propType));
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 游戏完成时执行道具扣除
    async completeGame(gameResult: any) {
        try {
            // 执行延迟扣除
            const deductionResult = await internal.service.prop.delayedPropDeduction.executeDelayedPropDeduction({
                gameId: this.gameId,
                uid: this.uid,
                gameResult
            });

            return {
                success: true,
                gameResult,
                deductionResult,
                usedProps: this.usedProps
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 游戏中断时取消道具扣除
    async cancelGame(reason?: string) {
        try {
            const cancelResult = await internal.service.prop.delayedPropDeduction.cancelDelayedPropDeduction({
                gameId: this.gameId,
                uid: this.uid,
                reason
            });

            return {
                success: true,
                cancelResult,
                usedProps: this.usedProps
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 获取当前游戏状态
    getGameState() {
        return this.gameState;
    }

    // 获取已使用的道具
    getUsedProps() {
        return this.usedProps;
    }
}

// 纸牌游戏集成示例
export class SolitaireGame {
    private gameManager: GameStateManager;
    private gameId: string;
    private uid: string;

    constructor(gameId: string, uid: string) {
        this.gameId = gameId;
        this.uid = uid;

        // 初始化游戏状态
        const initialGameState = {
            moves: [],
            remainingCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            isCompleted: false,
            score: 0,
            timeRemaining: 300
        };

        this.gameManager = new GameStateManager(gameId, uid, "solitaire", initialGameState);
    }

    // 使用提示道具
    async useHint() {
        return await this.gameManager.useProp("hint");
    }

    // 使用撤销道具
    async useUndo() {
        return await this.gameManager.useProp("undo");
    }

    // 使用洗牌道具
    async useShuffle() {
        return await this.gameManager.useProp("shuffle");
    }

    // 使用时间冻结道具
    async useTimeFreeze() {
        return await this.gameManager.useProp("time_freeze");
    }

    // 完成游戏
    async completeGame(score: number, isWin: boolean) {
        const gameResult = {
            score,
            isWin,
            completedAt: new Date().toISOString(),
            totalMoves: this.gameManager.getGameState().moves.length
        };

        return await this.gameManager.completeGame(gameResult);
    }

    // 中断游戏
    async cancelGame() {
        return await this.gameManager.cancelGame("玩家主动退出");
    }

    // 获取游戏状态
    getGameState() {
        return this.gameManager.getGameState();
    }
}

// 飞行棋游戏集成示例
export class LudoGame {
    private gameManager: GameStateManager;
    private gameId: string;
    private uid: string;

    constructor(gameId: string, uid: string) {
        this.gameId = gameId;
        this.uid = uid;

        // 初始化游戏状态
        const initialGameState = {
            currentPlayer: "player1",
            playerId: "player1",
            diceValue: 1,
            hasShield: false,
            shieldDuration: 0,
            position: 0
        };

        this.gameManager = new GameStateManager(gameId, uid, "ludo", initialGameState);
    }

    // 使用骰子增强道具
    async useDiceBoost() {
        return await this.gameManager.useProp("dice_boost");
    }

    // 使用护盾道具
    async useShield() {
        return await this.gameManager.useProp("shield");
    }

    // 使用传送道具
    async useTeleport(targetPosition: number) {
        return await this.gameManager.useProp("teleport", { targetPosition });
    }

    // 完成游戏
    async completeGame(isWin: boolean, finalPosition: number) {
        const gameResult = {
            isWin,
            finalPosition,
            completedAt: new Date().toISOString()
        };

        return await this.gameManager.completeGame(gameResult);
    }

    // 中断游戏
    async cancelGame() {
        return await this.gameManager.cancelGame("游戏中断");
    }

    // 获取游戏状态
    getGameState() {
        return this.gameManager.getGameState();
    }
}

// 锦标赛集成示例
export class TournamentGameManager {
    private gameManager: GameStateManager;
    private tournamentId: string;
    private gameId: string;
    private uid: string;

    constructor(tournamentId: string, gameId: string, uid: string, gameType: string, initialGameState: any) {
        this.tournamentId = tournamentId;
        this.gameId = gameId;
        this.uid = uid;
        this.gameManager = new GameStateManager(gameId, uid, gameType, initialGameState);
    }

    // 使用道具
    async useProp(propType: string, params?: any) {
        return await this.gameManager.useProp(propType, params);
    }

    // 提交锦标赛分数
    async submitTournamentScore(score: number) {
        try {
            // 1. 完成游戏并扣除道具
            const gameResult = {
                score,
                tournamentId: this.tournamentId,
                submittedAt: new Date().toISOString()
            };

            const deductionResult = await this.gameManager.completeGame(gameResult);

            // 2. 提交锦标赛分数
            const submitResult = await internal.service.tournaments.submitScore({
                uid: this.uid,
                tournamentId: this.tournamentId,
                score,
                gameId: this.gameId
            });

            return {
                success: true,
                deductionResult,
                submitResult
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 获取游戏状态
    getGameState() {
        return this.gameManager.getGameState();
    }
}

// 使用示例
export async function gamePlayExample() {
    const gameId = "game_123";
    const uid = "player_456";

    // 创建纸牌游戏
    const solitaireGame = new SolitaireGame(gameId, uid);

    // 游戏进行中使用道具
    console.log("使用提示道具...");
    const hintResult = await solitaireGame.useHint();
    console.log("提示结果:", hintResult);

    console.log("使用撤销道具...");
    const undoResult = await solitaireGame.useUndo();
    console.log("撤销结果:", undoResult);

    // 完成游戏（此时才扣除道具）
    console.log("完成游戏...");
    const completeResult = await solitaireGame.completeGame(1500, true);
    console.log("完成结果:", completeResult);

    return {
        hintResult,
        undoResult,
        completeResult
    };
}

// 错误处理示例
export async function errorHandlingExample() {
    const gameId = "game_789";
    const uid = "player_999";

    const solitaireGame = new SolitaireGame(gameId, uid);

    try {
        // 尝试使用不存在的道具
        const result = await solitaireGame.useHint();

        if (!result.success) {
            console.log("道具使用失败:", result.error);
            // 游戏中断，取消道具扣除
            await solitaireGame.cancelGame("道具使用失败");
        }

        return result;
    } catch (error) {
        console.error("游戏异常:", error);
        // 确保取消道具扣除
        await solitaireGame.cancelGame("游戏异常");
        throw error;
    }
} 