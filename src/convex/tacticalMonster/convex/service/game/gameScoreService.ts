/**
 * 游戏分数服务
 * 负责分数计算和管理
 */

import { DEFAULT_SCORING_CONFIG_VERSION } from "../../data/scoringConfigs";
import { GameReport, GameStatus } from "../../types/gameTypes";
import { GameResult, sharedScoreService } from "./sharedScoreService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GameEventService } from "./gameEventService";

export class GameScoreService {
    constructor(
        private dbCtx: any,
        private lifecycleService: GameLifecycleService,
        private eventService: GameEventService
    ) {}

    /**
     * 更新分数
     * 增加或减少游戏分数
     * @param gameId 游戏ID
     * @param scoreDelta 分数变化量
     * @returns 是否成功
     */
    async updateScore(gameId: string, scoreDelta: number): Promise<boolean> {
        const game = await this.lifecycleService.load(gameId);
        if (!game) return false;

        const newScore = (game.score || 0) + scoreDelta;
        await this.lifecycleService.save(gameId, { score: newScore, lastUpdate: new Date().toISOString() });

        return true;
    }

    /**
     * 游戏结束
     * 计算最终分数并生成游戏报告
     * @param gameId 游戏ID
     * @returns GameReport 或 null（如果失败）
     */
    async gameOver(gameId: string): Promise<GameReport | null> {
        const game = await this.lifecycleService.load(gameId);
        if (!game) return null;

        // ✅ 获取游戏使用的配置版本
        const configVersion = game.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION;

        // ✅ 判断游戏结果
        const gameResult = sharedScoreService.determineGameResult(game, configVersion);

        // 更新游戏状态
        let newStatus: GameStatus;
        switch (gameResult.result) {
            case GameResult.WIN:
                newStatus = 1;  // won
                break;
            case GameResult.LOSE:
                newStatus = 2;  // lost
                break;
            case GameResult.DRAW:
                newStatus = 3;  // draw（超时）
                break;
        }

        // ✅ 获取基础得分
        const baseScore = game.score || 0;

        // ✅ 计算游戏时长
        const gameStartTime = game.createdAt
            ? new Date(game.createdAt).getTime()
            : Date.now();
        const timeElapsed = Date.now() - gameStartTime;

        // ✅ 获取回合数
        const roundsUsed = game.currentRound?.no ?? 0;

        // ✅ 计算角色存活统计
        const survivalStats = sharedScoreService.calculateSurvivalStats(game.team || []);

        // ✅ 使用共享服务计算完整得分
        const scoreResult = sharedScoreService.calculateCompleteScore({
            baseScore,
            timeElapsed,
            roundsUsed,
            damageDealt: 0,  // 可选，可以从事件中统计
            skillsUsed: 0,    // 可选，可以从事件中统计
            gameResult: gameResult.result,
            survivalStats
        }, configVersion);

        // ✅ 保存游戏状态
        await this.lifecycleService.save(gameId, {
            status: newStatus,
            lastUpdate: new Date().toISOString()
        });

        // ✅ 创建游戏结束事件
        const event = this.eventService.createGameEndEvent(gameId);
        await this.eventService.createEvent(event);

        // 记录首通（关卡体力与奖励机制）
        const ruleId = (game as any).ruleId;
        const uid = (game as any).uid;
        const stageId = (game as any).stageId;
        let isFirstClear = false;
        if (ruleId && gameResult.result === GameResult.WIN && uid && stageId) {
            const existing = await this.dbCtx.db
                .query("mr_player_first_clear")
                .withIndex("by_uid_ruleId", (q: any) => q.eq("uid", uid).eq("ruleId", ruleId))
                .unique();
            if (!existing) {
                const now = new Date().toISOString();
                await this.dbCtx.db.insert("mr_player_first_clear", {
                    uid,
                    ruleId,
                    stageId,
                    score: scoreResult.totalScore,
                    performance: 3,  // 3 = 通关
                    createdAt: now,
                });
                isFirstClear = true;
            }
        }

        // 返回游戏报告（不再包含 star、rewardMultiplier）
        return {
            gameId,
            baseScore: scoreResult.baseScore,
            timeBonus: scoreResult.timeBonus,
            completeBonus: scoreResult.survivalBonus + scoreResult.resultScore,  // 兼容旧接口
            totalScore: scoreResult.totalScore,
            isFirstClear,
        };
    }

    /**
     * ✅ 检查并更新游戏状态
     */
    async checkAndUpdateGameStatus(gameId: string): Promise<{
        result: GameResult;
        reason: string;
        isGameOver: boolean;
    } | null> {
        const game = await this.lifecycleService.load(gameId);
        if (!game) return null;

        const configVersion = game.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION;
        const result = sharedScoreService.determineGameResult(game, configVersion);

        // 如果游戏结束，更新状态
        if (result.isGameOver) {
            let newStatus: GameStatus;
            switch (result.result) {
                case GameResult.WIN:
                    newStatus = 1;
                    break;
                case GameResult.LOSE:
                    newStatus = 2;
                    break;
                case GameResult.DRAW:
                    newStatus = 3;
                    break;
            }

            await this.lifecycleService.save(gameId, {
                status: newStatus,
                lastUpdate: new Date().toISOString()
            });

            // 创建游戏结束事件
            const event = this.eventService.createGameEndEvent(gameId);
            await this.eventService.createEvent(event);
        }

        return result;
    }
}

