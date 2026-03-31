/**
 * 游戏分数服务
 * 负责分数计算和管理
 */

import { internal } from "../../_generated/api";
import { DEFAULT_SCORING_CONFIG_VERSION } from "../../data/scoringConfigs";
import { GameReport, GameStatus } from "../../types/gameTypes";
import type { RewardPolicyType, ScoreTierReward, StageRewardPolicy } from "../../types/stageRuleTypes";
import { isTutorialGuideComplete } from "../../utils/tutorialProgressUtils";
import { GameResult, sharedScoreService } from "./sharedScoreService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GameEventService } from "./gameEventService";
import { getModeTypeForRuleId } from "../../utils/tournamentModeType";
import { GameRuleConfigService } from "./gameRuleConfigService";

/** 未单独配置 scoreTiers 的 solo 关卡使用的默认档位 */
const DEFAULT_SOLO_SCORE_TIERS: ScoreTierReward[] = [
    { minScore: 4000, rewardKey: "solo_s", chestType: "purple" },
    { minScore: 2500, rewardKey: "solo_a", chestType: "gold" },
    { minScore: 1000, rewardKey: "solo_b", chestType: "silver" },
    { minScore: 0, rewardKey: "solo_c", chestType: "bronze" },
];

function resolveEffectiveRewardPolicy(
    modeType: string | undefined,
    explicit: StageRewardPolicy | undefined
): StageRewardPolicy | undefined {
    if (explicit) {
        if (explicit.type === "score_tiers" && (!explicit.scoreTiers || explicit.scoreTiers.length === 0)) {
            return { ...explicit, scoreTiers: DEFAULT_SOLO_SCORE_TIERS };
        }
        return explicit;
    }
    if (modeType === "tutorial") return { type: "one_time_clear" };
    if (modeType === "multiplayer_tournament") return { type: "ranking_or_match_result" };
    if (modeType === "solo_challenge") return { type: "score_tiers", scoreTiers: DEFAULT_SOLO_SCORE_TIERS };
    return undefined;
}

function pickScoreTier(totalScore: number, tiers: ScoreTierReward[] | undefined): ScoreTierReward | undefined {
    if (!tiers?.length) return undefined;
    const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore);
    for (const t of sorted) {
        if (totalScore >= t.minScore) return t;
    }
    return undefined;
}

/** 与 gameOver 中 calculateCompleteScore 入参一致，供首通写入复用 */
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

        const ruleId = (game as any).ruleId;
        const stageRule = ruleId ? GameRuleConfigService.getGameRuleConfig(ruleId as string) : undefined;
        const modeTypeFromTournament = ruleId ? getModeTypeForRuleId(ruleId as string) : undefined;
        const modeType = modeTypeFromTournament ?? (game as { modeType?: string }).modeType;
        const isTutorialMode = modeType === "tutorial";
        const tutorialRoundLimit = stageRule?.starRatingConfig?.threeStarMaxRounds ?? 6;
        const roundsUsed = game.currentRound?.no ?? 0;
        const hitTutorialRoundLimit = isTutorialMode && roundsUsed >= tutorialRoundLimit;
        // ✅ 判断游戏结果（教学关：击败 Boss 即胜利）
        const pedagogy = stageRule?.pedagogy;
        const tutorialWinMode = isTutorialMode ? (pedagogy?.tutorialWinMode ?? "boss_only") : undefined;
        const tutorialGuideComplete = isTutorialMode
            ? isTutorialGuideComplete(pedagogy, (game as any).tutorialProgress)
            : true;

        const gameResult = hitTutorialRoundLimit
            ? { result: GameResult.DRAW, reason: `教学关回合上限（${tutorialRoundLimit}）已达到`, isGameOver: true }
            : sharedScoreService.determineGameResult(game, configVersion, {
                winOnBossKill: isTutorialMode,
                tutorialWinMode,
                tutorialGuideComplete,
            });

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

        const scoreResult = buildScoreResultForEndedGame(game, gameResult.result);

        // ✅ 保存游戏状态
        await this.lifecycleService.save(gameId, {
            status: newStatus,
            lastUpdate: new Date().toISOString()
        });

        // ✅ 创建游戏结束事件
        const event = this.eventService.createGameEndEvent(gameId);
        await this.eventService.createEvent(event);

        // 记录首通（关卡体力与奖励机制）
        const isFirstClear = await this.maybeInsertMrPlayerFirstClear(game, gameResult.result);

        const policy = resolveEffectiveRewardPolicy(modeType, stageRule?.rewardPolicy);

        let rewardPolicyType: RewardPolicyType | undefined;
        let scoreTierHit: ScoreTierReward | undefined;
        let rewardEligible: boolean | undefined;
        let oneTimeRewardKey: string | undefined;

        if (policy) {
            rewardPolicyType = policy.type;
            if (gameResult.result === GameResult.WIN) {
                if (policy.type === "one_time_clear") {
                    rewardEligible = isFirstClear;
                    oneTimeRewardKey = policy.oneTimeRewardKey;
                } else if (policy.type === "score_tiers") {
                    scoreTierHit = pickScoreTier(scoreResult.totalScore, policy.scoreTiers);
                    rewardEligible = scoreTierHit !== undefined;
                }
                // ranking_or_match_result：奖励由锦标赛/匹配结算处理，不在此标记 grant
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
            rewardPolicyType,
            scoreTierHit,
            rewardEligible,
            oneTimeRewardKey,
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
        const ruleId = (game as any).ruleId;
        const stageRule = ruleId ? GameRuleConfigService.getGameRuleConfig(ruleId as string) : undefined;
        const modeTypeFromTournament = ruleId ? getModeTypeForRuleId(ruleId as string) : undefined;
        const modeType = modeTypeFromTournament ?? (game as { modeType?: string }).modeType;
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

            // 正常对局只调用 checkAndUpdateGameStatus，不经过 gameOver mutation；首通必须在此写入
            if (result.result === GameResult.WIN) {
                const isFirstClear = await this.maybeInsertMrPlayerFirstClear(game, result.result);
                const scoreResult = buildScoreResultForEndedGame(game, result.result);
                // 同步 Tournament 端 player_matches / matches（与 proxy submitScore 一致）
                const sched = this.dbCtx?.scheduler;
                if (sched?.runAfter) {
                    await sched.runAfter(
                        0,
                        internal.service.tournament.tournamentMatchNotify.submitMatchScoreToTournament,
                        {
                            gameId,
                            finalScore: scoreResult.totalScore,
                            isFirstClear,
                        }
                    );
                }
            }
        }

        return result;
    }
}

