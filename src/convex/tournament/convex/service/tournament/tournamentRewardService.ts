/**
 * 锦标赛奖励服务
 * 基于 TournamentConfig.RewardConfig 计算奖励
 * 支持单人关卡（performanceRewards）和多人比赛（rankRewards）
 */
import { ChestTypeWeights, RewardConfig, TournamentConfig } from "../../data/tournamentConfigs";
import { SeededRandom } from "./seededRandom";

export type ChestType = "silver" | "gold" | "purple" | "orange";

export interface RewardDecision {
    baseRewards: Record<string, {
        coins?: number;
        energy?: number;
    }>;
    rankRewards?: Record<string, {
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        energy?: number;
    }>;
    subscriptionBonuses?: Record<string, {
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        energy?: number;
    }>;
    chestInfo: Record<string, {
        chestTriggered: boolean;
        chestDropRate?: number;
        chestTypeWeights?: ChestTypeWeights;
        chestType?: ChestType;
        rank?: number;
        gameId: string;
        matchId?: string | null;
    }>;
    firstClearRewards?: Record<string, {
        coins?: number;
        energy?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        monsters?: Array<{
            monsterId: string;
            level?: number;
            stars?: number;
        }>;
        chestDropRate?: number;
        chestTypeWeights?: ChestTypeWeights;
    }>;
}

export class TournamentRewardService {
    /**
     * 处理锦标赛奖励（只计算，不发放）
     * 奖励将在玩家主动 claim 时发放
     */
    static async processTournamentRewards(params: {
        tournamentConfig: TournamentConfig;
        rankings: Array<{ uid: string; rank: number; score: number }>;
        gameId: string;
        matchId?: string | null;
        isSubscribed?: Record<string, boolean>;
        isFirstClear?: Record<string, boolean>;
        performanceLevels?: Record<string, string>;
    }): Promise<RewardDecision> {
        const {
            tournamentConfig,
            rankings,
            gameId,
            matchId,
            isSubscribed = {},
            isFirstClear = {},
            performanceLevels = {}
        } = params;

        const rewardConfig = tournamentConfig.rewards;
        const isSinglePlayer = tournamentConfig.matchRules.minPlayers === 1
            && tournamentConfig.matchRules.maxPlayers === 1;

        const decision: RewardDecision = {
            baseRewards: {},
            chestInfo: {}
        };

        // 计算基础奖励
        if (rewardConfig.baseRewards) {
            for (const player of rankings) {
                decision.baseRewards[player.uid] = {
                    coins: rewardConfig.baseRewards.coins || 0,
                    energy: rewardConfig.baseRewards.energy || 0
                };
            }
        }

        // 计算排名/表现奖励
        if (isSinglePlayer) {
            decision.rankRewards = this.calculatePerformanceRewards(
                rewardConfig.performanceRewards,
                rankings,
                performanceLevels
            );
        } else {
            decision.rankRewards = this.calculateRankRewards(
                rewardConfig.rankRewards,
                rankings
            );
        }

        // 计算订阅加成
        if (rewardConfig.subscriptionBonus) {
            decision.subscriptionBonuses = {};
            for (const player of rankings) {
                if (isSubscribed[player.uid]) {
                    decision.subscriptionBonuses[player.uid] = {
                        coins: rewardConfig.subscriptionBonus.coins || 0,
                        monsterShards: rewardConfig.subscriptionBonus.monsterShards || [],
                        energy: rewardConfig.subscriptionBonus.energy || 0
                    };
                }
            }
        }

        // 计算宝箱触发
        for (const player of rankings) {
            const { rank, uid } = player;
            let chestDropRate: number | undefined;
            let chestTypeWeights: ChestTypeWeights | undefined;

            if (isSinglePlayer) {
                const level = performanceLevels[uid];
                if (level && rewardConfig.performanceRewards?.levelRewards?.[level]) {
                    const levelReward = rewardConfig.performanceRewards.levelRewards[level];
                    chestDropRate = levelReward.chestDropRate;
                    chestTypeWeights = levelReward.chestTypeWeights;
                } else {
                    chestDropRate = rewardConfig.baseRewards?.chestDropRate;
                }
            } else {
                const rankReward = this.findRankReward(rewardConfig.rankRewards, rank);
                if (rankReward) {
                    chestDropRate = rankReward.chestDropRate;
                    chestTypeWeights = rankReward.chestTypeWeights;
                } else {
                    chestDropRate = rewardConfig.baseRewards?.chestDropRate;
                }
            }

            const shouldTrigger = chestDropRate !== undefined && Math.random() < chestDropRate;
            const chestType = shouldTrigger && chestTypeWeights
                ? this.selectChestType(chestTypeWeights, `${gameId}_${uid}`)
                : undefined;

            decision.chestInfo[uid] = {
                chestTriggered: shouldTrigger,
                chestDropRate,
                chestTypeWeights,
                chestType,
                rank,
                gameId,
                matchId: matchId || null
            };
        }

        // 计算首次通关奖励（仅单人关卡）
        if (isSinglePlayer && rewardConfig.firstClearRewards) {
            decision.firstClearRewards = {};
            for (const player of rankings) {
                if (isFirstClear[player.uid]) {
                    decision.firstClearRewards[player.uid] = {
                        coins: rewardConfig.firstClearRewards.coins || 0,
                        energy: rewardConfig.firstClearRewards.energy || 0,
                        monsterShards: rewardConfig.firstClearRewards.monsterShards || [],
                        monsters: rewardConfig.firstClearRewards.monsters || [],
                        chestDropRate: rewardConfig.firstClearRewards.chestDropRate,
                        chestTypeWeights: rewardConfig.firstClearRewards.chestTypeWeights
                    };
                }
            }
        }

        return decision;
    }

    private static calculateRankRewards(
        rankRewards: RewardConfig["rankRewards"],
        rankings: Array<{ uid: string; rank: number; score: number }>
    ): Record<string, {
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        energy?: number;
    }> {
        const rewards: Record<string, {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
        }> = {};

        if (!rankRewards || rankRewards.length === 0) {
            return rewards;
        }

        for (const player of rankings) {
            const rankReward = this.findRankReward(rankRewards, player.rank);
            if (rankReward) {
                rewards[player.uid] = {
                    coins: rankReward.coins || 0,
                    monsterShards: rankReward.monsterShards || [],
                    energy: rankReward.energy || 0
                };
            }
        }

        return rewards;
    }

    private static calculatePerformanceRewards(
        performanceRewards: RewardConfig["performanceRewards"],
        rankings: Array<{ uid: string; rank: number; score: number }>,
        performanceLevels: Record<string, string>
    ): Record<string, {
        coins?: number;
        monsterShards?: Array<{ monsterId: string; quantity: number }>;
        energy?: number;
    }> {
        const rewards: Record<string, {
            coins?: number;
            monsterShards?: Array<{ monsterId: string; quantity: number }>;
            energy?: number;
        }> = {};

        if (!performanceRewards) {
            return rewards;
        }

        const baseReward = performanceRewards.baseReward || {};
        for (const player of rankings) {
            rewards[player.uid] = {
                coins: baseReward.coins || 0,
                monsterShards: baseReward.monsterShards || [],
                energy: baseReward.energy || 0
            };
        }

        if (performanceRewards.levelRewards) {
            for (const player of rankings) {
                const level = performanceLevels[player.uid];
                if (level && performanceRewards.levelRewards[level]) {
                    const levelReward = performanceRewards.levelRewards[level];
                    rewards[player.uid] = {
                        coins: (rewards[player.uid]?.coins || 0) + (levelReward.coins || 0),
                        monsterShards: [
                            ...(rewards[player.uid]?.monsterShards || []),
                            ...(levelReward.monsterShards || [])
                        ],
                        energy: (rewards[player.uid]?.energy || 0) + (levelReward.energy || 0)
                    };
                }
            }
        }

        return rewards;
    }

    private static findRankReward(
        rankRewards: RewardConfig["rankRewards"],
        rank: number
    ): NonNullable<RewardConfig["rankRewards"]>[number] | undefined {
        if (!rankRewards) {
            return undefined;
        }

        return rankRewards.find(reward => {
            const [minRank, maxRank] = reward.rankRange;
            return rank >= minRank && rank <= maxRank;
        });
    }

    /**
     * 根据配置的权重选择宝箱类型（使用确定性随机数）
     */
    static selectChestType(
        chestTypeWeights: ChestTypeWeights | undefined,
        seed: string
    ): ChestType {
        const weights = chestTypeWeights || {
            silver: 0.7,
            gold: 0.25,
            purple: 0.04,
            orange: 0.01,
        };

        const random = new SeededRandom(seed);
        const randomValue = random.random();

        const weightEntries = Object.entries(weights)
            .filter(([_, weight]) => weight && weight > 0)
            .sort(([_, a], [__, b]) => (b || 0) - (a || 0));

        const totalWeight = weightEntries.reduce((sum, [_, weight]) => sum + (weight || 0), 0);

        if (totalWeight <= 0) {
            return "silver";
        }

        let cumulative = 0;
        for (const [chestType, weight] of weightEntries) {
            cumulative += (weight || 0) / totalWeight;
            if (randomValue < cumulative) {
                return chestType as ChestType;
            }
        }

        return "silver";
    }
}

