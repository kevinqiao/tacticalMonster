/**
 * 关卡结算：Solo score_tiers 直发碎片/金币、章节通章整卡
 *
 * **Solo 碎片掉哪只怪**：`data/soloRewardResolve.ts` → `resolveSoloDirectShardMonsterId`。
 * 分档数量：`data/stageRuleConstants.ts` → `DEFAULT_SOLO_SCORE_TIERS` 的 `directShardQuantity` / `coins`。
 */

import { CHAPTER_CLEAR_CHEST_BY_CHAPTER } from "../../data/chapterRewards";
import { resolveSoloDirectShardMonsterId } from "../../data/soloRewardResolve";
import { DEFAULT_SCORING_CONFIG_VERSION } from "../../data/scoringConfigs";
import { ScoreTierReward, StageModeType } from "../../types/stageRuleTypes";
import { getModeTypeForRuleId } from "../../utils/tournamentModeType";
import { GameRuleConfigService } from "../game/gameRuleConfigService";
import { GameResult, sharedScoreService } from "../game/sharedScoreService";
import { ChestService } from "../chest/chestService";
import { MonsterService } from "../monster/monsterService";
import { TournamentProxyService } from "../tournament/tournamentProxyService";

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

/** 取命中的最高档（minScore 降序第一个满足 finalScore >= minScore） */
export function resolveScoreTierHit(
    scoreTiers: ScoreTierReward[] | undefined,
    finalScore: number
): ScoreTierReward | undefined {
    if (!scoreTiers?.length) return undefined;
    const sorted = [...scoreTiers].sort((a, b) => b.minScore - a.minScore);
    for (const tier of sorted) {
        if (finalScore >= tier.minScore) {
            return tier;
        }
    }
    return undefined;
}

function resolveStageMode(ruleId: string | undefined, game: any): StageModeType | undefined {
    const fromCfg = ruleId ? getModeTypeForRuleId(ruleId) : undefined;
    if (fromCfg) return fromCfg;
    const g = game?.mode ?? game?.modeType;
    if (g) return g as StageModeType;
    return undefined;
}

export class StageRewardSettlementService {
    /**
     * 胜利后：Solo 直发（非教学/非多人）+ 通章整卡（配置存在时）
     */
    static async grantOnSoloWin(ctx: any, params: { gameId: string; game: any }): Promise<void> {
        const { gameId, game } = params;
        const uid = game.uid as string | undefined;
        const ruleId = game.ruleId as string | undefined;
        if (!uid || !ruleId) return;

        const stageRule = GameRuleConfigService.getGameRuleConfig(ruleId);
        if (!stageRule) return;

        const modeType = resolveStageMode(ruleId, game);
        if (modeType === "tutorial") return;

        await this.grantSoloDirectRewards(ctx, { uid, gameId, ruleId, game, stageRule, modeType });
        await this.grantChapterClearRewardIfEligible(ctx, { uid, gameId, ruleId, stageRule, modeType });
    }

    private static async grantSoloDirectRewards(
        ctx: any,
        params: {
            uid: string;
            gameId: string;
            ruleId: string;
            game: any;
            stageRule: any;
            modeType: StageModeType | undefined;
        }
    ): Promise<void> {
        const { uid, gameId, ruleId, game, stageRule, modeType } = params;
        if (modeType === "multiplayer_tournament") return;

        const rp = stageRule.rewardPolicy;
        if (!rp || rp.type !== "score_tiers" || !rp.scoreTiers?.length) return;

        const existing = await ctx.db
            .query("mr_solo_stage_reward_claims")
            .withIndex("by_uid_gameId", (q: any) => q.eq("uid", uid).eq("gameId", gameId))
            .unique();
        if (existing) return;

        const scoreResult = buildScoreResultForEndedGame(game, GameResult.WIN);
        const finalScore = scoreResult.totalScore;
        const hit = resolveScoreTierHit(rp.scoreTiers, finalScore);
        if (!hit) return;

        const bossMonsterId = resolveSoloDirectShardMonsterId(stageRule);
        const shards = hit.directShardQuantity ?? 0;
        const coins = hit.coins ?? 0;

        if (shards <= 0 && coins <= 0) return;

        let shardsGranted = 0;
        if (bossMonsterId && shards > 0) {
            await MonsterService.addShards(ctx, {
                uid,
                monsterId: bossMonsterId,
                quantity: shards,
                source: "solo_score_tier",
                sourceId: gameId,
            });
            shardsGranted = shards;
        }

        if (coins > 0) {
            await TournamentProxyService.addCoins(ctx, {
                uid,
                coins,
                source: "solo_score_tier",
                sourceId: gameId,
            });
        }

        await ctx.db.insert("mr_solo_stage_reward_claims", {
            uid,
            gameId,
            ruleId,
            rewardKey: hit.rewardKey ?? "",
            shardsGranted,
            coinsGranted: coins,
            createdAt: new Date().toISOString(),
        });
    }

    private static async grantChapterClearRewardIfEligible(
        ctx: any,
        params: {
            uid: string;
            gameId: string;
            ruleId: string;
            stageRule: any;
            modeType: StageModeType | undefined;
        }
    ): Promise<void> {
        const { uid, ruleId, stageRule, modeType } = params;
        if (modeType === "multiplayer_tournament" || modeType === "tutorial") return;

        const ch = stageRule.chapter;
        const sn = stageRule.stageNumber;
        if (ch == null || sn !== 5) return;

        const chestSpec = CHAPTER_CLEAR_CHEST_BY_CHAPTER[ch];
        if (!chestSpec) return;

        const claimed = await ctx.db
            .query("mr_player_chapter_rewards_claimed")
            .withIndex("by_uid_chapterId", (q: any) => q.eq("uid", uid).eq("chapterId", ch))
            .unique();
        if (claimed) return;

        const grant = await ChestService.grantChestToPlayer(ctx, {
            uid,
            chestType: chestSpec.chestType,
            stageRuleId: chestSpec.stageRuleId,
            gameId,
            rewardSeedExtra: `chapter_clear_ch${ch}`,
        });

        if (!grant.ok) {
            console.error(
                `[grantChapterClearRewardIfEligible] 通章宝箱发放失败 uid=${uid} chapter=${ch}`,
                grant
            );
            return;
        }

        await ctx.db.insert("mr_player_chapter_rewards_claimed", {
            uid,
            chapterId: ch,
            ruleId,
            chestStageRuleId: chestSpec.stageRuleId,
            createdAt: new Date().toISOString(),
        });
    }
}
