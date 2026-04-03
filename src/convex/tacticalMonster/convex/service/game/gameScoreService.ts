/**
 * 游戏分数服务
 * 负责分数计算和管理
 */

import { internal } from "../../_generated/api";
import { DEFAULT_SCORING_CONFIG_VERSION } from "../../data/scoringConfigs";
import { GameStatus, getMrGameStageMode } from "../../types/gameTypes";
import { isTutorialGuideComplete } from "../../utils/tutorialProgressUtils";
import { GameResult, sharedScoreService } from "./sharedScoreService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GameEventService } from "./gameEventService";
import { getModeTypeForRuleId } from "../../utils/tournamentModeType";
import { GameRuleConfigService } from "./gameRuleConfigService";

/** 终局计分（checkAndUpdateGameStatus / Tournament submit 复用） */
function buildScoreResultForEndedGame(game: any, gameResult: GameResult) {
    const configVersion = game.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION;
    const baseScore = game.score || 0;
    const gameStartTime = game.createdAt ? new Date(game.createdAt).getTime() : Date.now();
    const timeElapsed = Date.now() - gameStartTime;
    const roundsUsed = game.currentRound?.no ?? 0;
    const survivalStats = sharedScoreService.calculateSurvivalStats(game.team || []);
    return sharedScoreService.calculateCompleteScore(
        {
            baseScore,
            timeElapsed,
            roundsUsed,
            damageDealt: 0,
            skillsUsed: 0,
            gameResult,
            survivalStats,
        },
        configVersion
    );
}

export class GameScoreService {
    constructor(
        private dbCtx: any,
        private lifecycleService: GameLifecycleService,
        private eventService: GameEventService
    ) {}

    /**
     * 胜利时写入 mr_player_first_clear（正常对局结束走 checkAndUpdateGameStatus，必须在此路径也写入）
     */
    private async maybeInsertMrPlayerFirstClear(game: any, gameResult: GameResult): Promise<boolean> {
        if (gameResult !== GameResult.WIN) return false;
        const ruleId = (game as any).ruleId;
        const uid = (game as any).uid;
        const stageId = (game as any).stageId;
        if (!ruleId || !uid || !stageId) return false;
        const existing = await this.dbCtx.db
            .query("mr_player_first_clear")
            .withIndex("by_uid_ruleId", (q: any) => q.eq("uid", uid).eq("ruleId", ruleId))
            .unique();
        if (existing) return false;
        const scoreResult = buildScoreResultForEndedGame(game, gameResult);
        const now = new Date().toISOString();
        await this.dbCtx.db.insert("mr_player_first_clear", {
            uid,
            ruleId,
            stageId,
            score: scoreResult.totalScore,
            performance: 3,
            createdAt: now,
        });
        return true;
    }

    /**
     * 对局结束后通知 Tournament（HTTP /submitScore → player_matches 完结 / 可能 settleMatch）。
     * 任意终局结果均需提交，否则锦标赛侧无法结算；仅胜利时 isFirstClear 可能为 true。
     */
    private async scheduleSubmitScoreToTournament(
        gameId: string,
        game: any,
        gameResult: GameResult,
        isFirstClear: boolean
    ): Promise<void> {
        const scoreResult = buildScoreResultForEndedGame(game, gameResult);
        const sched = this.dbCtx?.scheduler;
        if (!sched?.runAfter) {
            console.warn("[GameScoreService] scheduler unavailable, skip tournament submitScore", gameId);
            return;
        }
        await sched.runAfter(
            0,
            internal.service.tournament.tournamentMatchNotify.submitMatchScoreToTournament,
            {
                gameId,
                finalScore: scoreResult.totalScore,
                isFirstClear: isFirstClear === true,
            }
        );
    }

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
     * ✅ 检查并更新游戏状态
     */
    async checkAndUpdateGameStatus(gameId: string): Promise<{
        result: GameResult;
        reason: string;
        isGameOver: boolean;
    } | null> {
        const game = await this.lifecycleService.load(gameId);
        if (!game) return null;

        const existingStatus = (game as { status?: GameStatus }).status;
        if (existingStatus !== 0 && existingStatus !== undefined) {
            const resultByStatus: Record<number, GameResult> = {
                1: GameResult.WIN,
                2: GameResult.LOSE,
                3: GameResult.DRAW,
            };
            return {
                result: resultByStatus[existingStatus] ?? GameResult.DRAW,
                reason: "游戏已结束",
                isGameOver: true,
            };
        }

        const configVersion = game.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION;
        const ruleId = (game as any).ruleId;
        const stageRule = ruleId ? GameRuleConfigService.getGameRuleConfig(ruleId as string) : undefined;
        const modeTypeFromTournament = ruleId ? getModeTypeForRuleId(ruleId as string) : undefined;
        const modeType = modeTypeFromTournament ?? getMrGameStageMode(game as { mode?: string; modeType?: string });
        const isTutorialMode = modeType === "tutorial";
        const tutorialRoundLimit = stageRule?.starRatingConfig?.threeStarMaxRounds ?? 6;
        const roundsUsed = game.currentRound?.no ?? 0;
        const pedagogy = stageRule?.pedagogy;
        const tutorialWinMode = isTutorialMode ? (pedagogy?.tutorialWinMode ?? "boss_only") : undefined;
        const tutorialGuideComplete = isTutorialMode
            ? isTutorialGuideComplete(pedagogy, (game as any).tutorialProgress)
            : true;

        const result = (isTutorialMode && roundsUsed >= tutorialRoundLimit)
            ? { result: GameResult.DRAW, reason: `教学关回合上限（${tutorialRoundLimit}）已达到`, isGameOver: true }
            : sharedScoreService.determineGameResult(game, configVersion, {
                winOnBossKill: isTutorialMode,
                tutorialWinMode,
                tutorialGuideComplete,
            });

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

            // 首通仅胜利写入；Tournament 任意终局结果都要 submit（教学关 DRAW/超时等同理）
            let isFirstClear = false;
            if (result.result === GameResult.WIN) {
                isFirstClear = await this.maybeInsertMrPlayerFirstClear(game, result.result);
            }
            await this.scheduleSubmitScoreToTournament(gameId, game, result.result, isFirstClear);
        }

        return result;
    }
}

