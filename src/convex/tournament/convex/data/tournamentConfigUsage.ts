import {
    createDefaultTournamentConfig,
    GameType,
    getActiveTournamentConfigs,
    getTournamentConfig,
    getTournamentConfigsByGameType,
    TournamentCategory,
    TournamentConfig,
    validateTournamentConfig
} from "./tournamentConfigs";

/**
 * 锦标赛配置使用示例
 */
export class TournamentConfigManager {

    /**
     * 获取特定锦标赛配置
     */
    static getConfig(typeId: string): TournamentConfig | undefined {
        return getTournamentConfig(typeId);
    }

    /**
     * 获取所有活跃配置
     */
    static getActiveConfigs(): TournamentConfig[] {
        return getActiveTournamentConfigs();
    }

    /**
     * 按游戏类型获取配置
     */
    static getConfigsByGameType(gameType: GameType): TournamentConfig[] {
        return getTournamentConfigsByGameType(gameType);
    }

    /**
     * 验证配置
     */
    static validateConfig(config: TournamentConfig): { valid: boolean; errors: string[] } {
        return validateTournamentConfig(config);
    }

    /**
     * 创建新配置
     */
    static createConfig(
        typeId: string,
        name: string,
        gameType: GameType,
        category: TournamentCategory
    ): TournamentConfig {
        return createDefaultTournamentConfig(typeId, name, gameType, category);
    }

    /**
     * 检查玩家是否符合参赛条件
     */
    static checkEligibility(
        config: TournamentConfig,
        player: {
            uid: string;
            segmentName: string;
            isSubscribed: boolean;
            level: number;
            totalPoints: number;
        },
        inventory: {
            coins: number;
            tickets: Array<{
                gameType: GameType;
                tournamentType: string;
                quantity: number;
            }>;
            props: Array<{
                gameType: GameType;
                propType: string;
                quantity: number;
            }>;
        }
    ): { eligible: boolean; reasons: string[] } {
        const reasons: string[] = [];
        const requirements = config.entryRequirements;

        // 检查段位要求
        if (requirements.minSegment) {
            const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
            const playerIndex = segments.indexOf(player.segmentName);
            const minIndex = segments.indexOf(requirements.minSegment);
            if (playerIndex < minIndex) {
                reasons.push(`需要至少 ${requirements.minSegment} 段位`);
            }
        }

        if (requirements.maxSegment) {
            const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
            const playerIndex = segments.indexOf(player.segmentName);
            const maxIndex = segments.indexOf(requirements.maxSegment);
            if (playerIndex > maxIndex) {
                reasons.push(`段位不能超过 ${requirements.maxSegment}`);
            }
        }

        // 检查订阅要求
        if (requirements.isSubscribedRequired && !player.isSubscribed) {
            reasons.push("需要订阅会员");
        }

        // 检查等级要求
        if (requirements.minLevel && player.level < requirements.minLevel) {
            reasons.push(`需要至少 ${requirements.minLevel} 级`);
        }

        if (requirements.maxLevel && player.level > requirements.maxLevel) {
            reasons.push(`等级不能超过 ${requirements.maxLevel}`);
        }

        // 检查积分要求
        if (requirements.minPoints && player.totalPoints < requirements.minPoints) {
            reasons.push(`需要至少 ${requirements.minPoints} 积分`);
        }

        if (requirements.maxPoints && player.totalPoints > requirements.maxPoints) {
            reasons.push(`积分不能超过 ${requirements.maxPoints}`);
        }

        // 检查入场费
        const entryFee = requirements.entryFee;

        if (entryFee.coins && inventory.coins < entryFee.coins) {
            reasons.push(`需要 ${entryFee.coins} 金币`);
        }

        if (entryFee.tickets) {
            const ticket = inventory.tickets.find(t =>
                t.gameType === entryFee.tickets!.gameType &&
                t.tournamentType === entryFee.tickets!.tournamentType
            );
            if (!ticket || ticket.quantity < entryFee.tickets!.quantity) {
                reasons.push(`需要 ${entryFee.tickets!.quantity} 张门票`);
            }
        }

        if (entryFee.props) {
            for (const requiredProp of entryFee.props) {
                const prop = inventory.props.find(p =>
                    p.gameType === requiredProp.gameType &&
                    p.propType === requiredProp.propType
                );
                if (!prop || prop.quantity < requiredProp.quantity) {
                    reasons.push(`需要 ${requiredProp.quantity} 个 ${requiredProp.propType}`);
                }
            }
        }

        return {
            eligible: reasons.length === 0,
            reasons
        };
    }

    /**
     * 计算奖励
     */
    static calculateRewards(
        config: TournamentConfig,
        rank: number,
        score: number,
        playerSegment: string,
        isSubscribed: boolean
    ): {
        coins: number;
        gamePoints: number;
        props: Array<{
            gameType: GameType;
            propType: string;
            quantity: number;
            rarity: string;
        }>;
        tickets: Array<{
            gameType: GameType;
            tournamentType: string;
            quantity: number;
        }>;
    } {
        const rewards = config.rewards;
        const baseRewards = rewards.baseRewards;

        // 找到对应的排名奖励
        const rankReward = rewards.rankRewards.find(r =>
            rank >= r.rankRange[0] && rank <= r.rankRange[1]
        );

        const multiplier = rankReward?.multiplier || 1.0;

        // 计算基础奖励
        let coins = Math.floor(baseRewards.coins * multiplier);
        let gamePoints = Math.floor(baseRewards.gamePoints * multiplier);

        // 应用段位加成
        const segmentMultiplier = rewards.segmentBonus[playerSegment as keyof typeof rewards.segmentBonus] || 1.0;
        coins = Math.floor(coins * segmentMultiplier);
        gamePoints = Math.floor(gamePoints * segmentMultiplier);

        // 应用订阅加成
        if (isSubscribed) {
            coins = Math.floor(coins * rewards.subscriptionBonus);
            gamePoints = Math.floor(gamePoints * rewards.subscriptionBonus);
        }

        // 收集道具奖励
        const props = [...baseRewards.props];
        if (rankReward?.bonusProps) {
            props.push(...rankReward.bonusProps.map((p: any) => ({
                ...p,
                rarity: "rare" // 默认稀有度
            })));
        }

        // 收集门票奖励
        const tickets = [...baseRewards.tickets];
        if (rankReward?.bonusTickets) {
            tickets.push(...rankReward.bonusTickets);
        }

        return {
            coins,
            gamePoints,
            props,
            tickets
        };
    }

    /**
     * 检查参与限制
     */
    static checkParticipationLimits(
        config: TournamentConfig,
        currentStats: {
            dailyParticipations: number;
            weeklyParticipations: number;
            seasonalParticipations: number;
            totalParticipations: number;
            dailyTournaments: number;
            weeklyTournaments: number;
            seasonalTournaments: number;
            totalTournaments: number;
            dailyAttempts: number;
            weeklyAttempts: number;
            seasonalAttempts: number;
            totalAttempts: number;
        },
        isSubscribed: boolean
    ): { canParticipate: boolean; reasons: string[] } {
        const reasons: string[] = [];
        const limits = isSubscribed ? config.limits.subscribed : config.limits;

        // 检查每日限制
        if (currentStats.dailyParticipations >= limits.daily.maxParticipations) {
            reasons.push("今日参与次数已达上限");
        }

        if (currentStats.dailyTournaments >= limits.daily.maxTournaments) {
            reasons.push("今日锦标赛数量已达上限");
        }

        if (currentStats.dailyAttempts >= limits.daily.maxAttempts) {
            reasons.push("今日尝试次数已达上限");
        }

        // 检查每周限制
        if (currentStats.weeklyParticipations >= limits.weekly.maxParticipations) {
            reasons.push("本周参与次数已达上限");
        }

        if (currentStats.weeklyTournaments >= limits.weekly.maxTournaments) {
            reasons.push("本周锦标赛数量已达上限");
        }

        if (currentStats.weeklyAttempts >= limits.weekly.maxAttempts) {
            reasons.push("本周尝试次数已达上限");
        }

        // 检查赛季限制
        if (currentStats.seasonalParticipations >= limits.seasonal.maxParticipations) {
            reasons.push("本赛季参与次数已达上限");
        }

        if (currentStats.seasonalTournaments >= limits.seasonal.maxTournaments) {
            reasons.push("本赛季锦标赛数量已达上限");
        }

        if (currentStats.seasonalAttempts >= limits.seasonal.maxAttempts) {
            reasons.push("本赛季尝试次数已达上限");
        }

        // 检查总限制（仅对非订阅用户）
        if (!isSubscribed) {
            if (currentStats.totalParticipations >= config.limits.total.maxParticipations) {
                reasons.push("总参与次数已达上限");
            }

            if (currentStats.totalTournaments >= config.limits.total.maxTournaments) {
                reasons.push("总锦标赛数量已达上限");
            }

            if (currentStats.totalAttempts >= config.limits.total.maxAttempts) {
                reasons.push("总尝试次数已达上限");
            }
        }

        return {
            canParticipate: reasons.length === 0,
            reasons
        };
    }

    /**
     * 获取匹配配置
     */
    static getMatchingConfig(config: TournamentConfig) {
        return config.advanced.matching;
    }

    /**
     * 获取结算配置
     */
    static getSettlementConfig(config: TournamentConfig) {
        return config.advanced.settlement;
    }

    /**
     * 获取通知配置
     */
    static getNotificationConfig(config: TournamentConfig) {
        return config.advanced.notifications;
    }

    /**
     * 获取监控配置
     */
    static getMonitoringConfig(config: TournamentConfig) {
        return config.advanced.monitoring;
    }
}

/**
 * 使用示例
 */
export function tournamentConfigUsageExamples() {
    console.log("=== 锦标赛配置使用示例 ===");

    // 1. 获取特定配置
    const dailyConfig = TournamentConfigManager.getConfig("daily_special");
    console.log("每日特殊锦标赛配置:", dailyConfig?.name);

    // 2. 获取所有活跃配置
    const activeConfigs = TournamentConfigManager.getActiveConfigs();
    console.log("活跃锦标赛数量:", activeConfigs.length);

    // 3. 按游戏类型获取配置
    const solitaireConfigs = TournamentConfigManager.getConfigsByGameType("solitaire");
    console.log("单人纸牌锦标赛数量:", solitaireConfigs.length);

    // 4. 检查参赛资格
    if (dailyConfig) {
        const eligibility = TournamentConfigManager.checkEligibility(
            dailyConfig,
            {
                uid: "user123",
                segmentName: "gold",
                isSubscribed: true,
                level: 10,
                totalPoints: 500
            },
            {
                coins: 100,
                tickets: [
                    {
                        gameType: "solitaire",
                        tournamentType: "daily_special",
                        quantity: 2
                    }
                ],
                props: []
            }
        );
        console.log("参赛资格检查:", eligibility);
    }

    // 5. 计算奖励
    if (dailyConfig) {
        const rewards = TournamentConfigManager.calculateRewards(
            dailyConfig,
            1, // 第一名
            1000, // 分数
            "gold", // 段位
            true // 订阅用户
        );
        console.log("奖励计算:", rewards);
    }

    // 6. 检查参与限制
    if (dailyConfig) {
        const limits = TournamentConfigManager.checkParticipationLimits(
            dailyConfig,
            {
                dailyParticipations: 1,
                weeklyParticipations: 5,
                seasonalParticipations: 20,
                totalParticipations: 100,
                dailyTournaments: 1,
                weeklyTournaments: 3,
                seasonalTournaments: 10,
                totalTournaments: 50,
                dailyAttempts: 2,
                weeklyAttempts: 10,
                seasonalAttempts: 40,
                totalAttempts: 200
            },
            true // 订阅用户
        );
        console.log("参与限制检查:", limits);
    }

    // 7. 创建新配置
    const newConfig = TournamentConfigManager.createConfig(
        "custom_tournament",
        "自定义锦标赛",
        "puzzle",
        "special"
    );
    console.log("新配置:", newConfig.name);

    // 8. 验证配置
    const validation = TournamentConfigManager.validateConfig(newConfig);
    console.log("配置验证:", validation);
} 