/**
 * 共享计分服务（前后端通用）
 * 纯逻辑实现，不依赖数据库
 */

import { 
    getScoringConfig, 
    getDefaultScoringConfig,
    DEFAULT_SCORING_CONFIG_VERSION,
    ScoringConfig
} from "../../data/scoringConfigs";

/**
 * 行动数据
 */
export interface ActionData {
    actionType: 'attack' | 'skill' | 'walk';
    killed?: boolean;
    killedType?: 'boss' | 'minion';
    skillId?: string;
}

/**
 * 游戏结果
 */
export enum GameResult {
    WIN = 1,
    LOSE = 2,
    DRAW = 3
}

/**
 * 角色存活统计
 */
export interface CharacterSurvivalStats {
    totalCharacters: number;
    aliveCharacters: number;
    deadCharacters: number;
    averageHpPercentage: number;
    minHpPercentage: number;
    perfectSurvival: boolean;
}

/**
 * 游戏统计数据
 */
export interface GameStatistics {
    baseScore: number;
    timeElapsed: number;  // 毫秒
    roundsUsed: number;
    damageDealt: number;
    skillsUsed: number;
    gameResult: GameResult;
    survivalStats: CharacterSurvivalStats;
}

/**
 * 得分计算结果
 */
export interface ScoreResult {
    baseScore: number;
    timeBonus: number;
    roundBonus: number;
    survivalBonus: number;
    resultScore: number;
    totalScore: number;
    breakdown: {
        gameResult: GameResult;
        perfectSurvival: boolean;
        survivalRate: number;
        averageHp: number;
        timeEfficiency: number;
        roundEfficiency: number;
    };
}

/**
 * 游戏结果判断结果
 */
export interface GameResultCheck {
    result: GameResult;
    reason: string;
    isGameOver: boolean;
}

/**
 * 共享计分服务（前后端通用）
 */
export class SharedScoreService {
    private configCache: Map<string, ScoringConfig> = new Map();
    
    /**
     * 获取指定版本的配置（带缓存）
     */
    getConfig(version?: string): ScoringConfig {
        const configVersion = version || DEFAULT_SCORING_CONFIG_VERSION;
        
        // 检查缓存
        if (this.configCache.has(configVersion)) {
            return this.configCache.get(configVersion)!;
        }
        
        // 从配置文件读取
        const config = getScoringConfig(configVersion);
        
        if (!config) {
            console.warn(`配置版本 ${configVersion} 不存在，使用默认配置`);
            const defaultConfig = getDefaultScoringConfig();
            this.configCache.set(configVersion, defaultConfig);
            return defaultConfig;
        }
        
        // 缓存配置
        this.configCache.set(configVersion, config);
        return config;
    }
    
    /**
     * 计算行动得分
     */
    calculateActionScore(
        actionData: ActionData,
        configVersion?: string
    ): number {
        const config = this.getConfig(configVersion);
        return this.calculateActionScoreWithConfig(actionData, config);
    }
    
    /**
     * 使用指定配置计算行动得分（内部方法）
     */
    private calculateActionScoreWithConfig(
        actionData: ActionData,
        config: ScoringConfig
    ): number {
        const { actionScores } = config;
        let score = 0;
        
        switch (actionData.actionType) {
            case 'attack':
                if (actionData.killed) {
                    if (actionData.killedType === 'boss') {
                        score += actionScores.defeatBoss;
                    } else if (actionData.killedType === 'minion') {
                        score += actionScores.defeatMinion;
                    }
                } else {
                    score += actionScores.attack;
                }
                break;
                
            case 'skill':
                score += actionScores.skillUse;
                if (actionData.killed) {
                    if (actionData.killedType === 'boss') {
                        score += actionScores.defeatBoss;
                    } else if (actionData.killedType === 'minion') {
                        score += actionScores.defeatMinion;
                    }
                }
                break;
                
            case 'walk':
                score += actionScores.walk;
                break;
        }
        
        return score;
    }
    
    /**
     * 计算角色存活统计
     */
    calculateSurvivalStats(team: Array<{ stats?: { hp?: { current: number; max: number } } }>): CharacterSurvivalStats {
        let aliveCount = 0;
        let totalHp = 0;
        let maxHp = 0;
        let minHpPercentage = 1.0;
        
        team.forEach(character => {
            const currentHp = character.stats?.hp?.current ?? 0;
            const maxCharacterHp = character.stats?.hp?.max ?? 1;
            
            if (currentHp > 0) {
                aliveCount++;
            }
            
            totalHp += currentHp;
            maxHp += maxCharacterHp;
            
            const hpPercentage = currentHp / maxCharacterHp;
            minHpPercentage = Math.min(minHpPercentage, hpPercentage);
        });
        
        const averageHpPercentage = maxHp > 0 ? totalHp / maxHp : 0;
        const perfectSurvival = aliveCount === team.length && minHpPercentage > 0;
        
        return {
            totalCharacters: team.length,
            aliveCharacters: aliveCount,
            deadCharacters: team.length - aliveCount,
            averageHpPercentage,
            minHpPercentage,
            perfectSurvival
        };
    }
    
    /**
     * 判断游戏结果
     */
    determineGameResult(
        game: {
            team: Array<{ stats?: { hp?: { current: number } } }>;
            boss: { stats?: { hp?: { current: number } }; minions?: Array<{ stats?: { hp?: { current: number } }> };
            createdAt: string;
        },
        configVersion?: string
    ): GameResultCheck {
        const config = this.getConfig(configVersion);
        const timeLimit = config.timeLimit.totalTime;
        
        const gameStartTime = game.createdAt 
            ? new Date(game.createdAt).getTime() 
            : Date.now();
        const elapsed = (Date.now() - gameStartTime) / 1000;
        
        // 1. 检查超时（DRAW）
        if (elapsed > timeLimit) {
            return {
                result: GameResult.DRAW,
                reason: '游戏超时',
                isGameOver: true
            };
        }
        
        // 2. 检查失败（LOSE）
        const playerTeam = game.team || [];
        const alivePlayerChars = playerTeam.filter(
            character => (character.stats?.hp?.current ?? 0) > 0
        );
        
        if (alivePlayerChars.length === 0) {
            return {
                result: GameResult.LOSE,
                reason: '玩家角色全灭',
                isGameOver: true
            };
        }
        
        // 3. 检查胜利（WIN）
        const bossHp = game.boss.stats?.hp?.current ?? 0;
        const minions = game.boss.minions || [];
        const aliveMinions = minions.filter(
            minion => (minion.stats?.hp?.current ?? 0) > 0
        );
        
        if (bossHp <= 0 && aliveMinions.length === 0) {
            return {
                result: GameResult.WIN,
                reason: '击败所有Boss角色，玩家胜利',
                isGameOver: true
            };
        }
        
        // 4. 游戏进行中
        return {
            result: GameResult.DRAW,
            reason: '游戏进行中',
            isGameOver: false
        };
    }
    
    /**
     * 计算完整得分
     */
    calculateCompleteScore(
        stats: GameStatistics,
        configVersion?: string
    ): ScoreResult {
        const config = this.getConfig(configVersion);
        return this.calculateCompleteScoreWithConfig(stats, config);
    }
    
    /**
     * 使用指定配置计算完整得分（内部方法）
     */
    private calculateCompleteScoreWithConfig(
        stats: GameStatistics,
        config: ScoringConfig
    ): ScoreResult {
        const { baseScore, timeElapsed, roundsUsed, gameResult, survivalStats } = stats;
        const { efficiency, survival, resultScores } = config;
        
        // 时间效率奖励（仅胜利时）
        let timeBonus = 0;
        if (gameResult === GameResult.WIN) {
            const timeRatio = Math.max(0, 1 - (timeElapsed / efficiency.targetTime));
            timeBonus = Math.floor(timeRatio * efficiency.maxTimeBonus);
        }
        
        // 回合效率奖励（仅胜利时）
        let roundBonus = 0;
        if (gameResult === GameResult.WIN) {
            const roundRatio = Math.max(0, 1 - (roundsUsed / efficiency.targetRounds));
            roundBonus = Math.floor(roundRatio * efficiency.maxRoundBonus);
        }
        
        // 存活奖励（仅胜利时）
        let survivalBonus = 0;
        if (gameResult === GameResult.WIN) {
            if (survivalStats.perfectSurvival) {
                survivalBonus += survival.perfectBonus;
            }
            
            const survivalRate = survivalStats.aliveCharacters / survivalStats.totalCharacters;
            survivalBonus += Math.floor(survivalRate * survival.survivalRateBonus);
            
            if (survivalStats.averageHpPercentage >= survival.highHpThreshold) {
                const hpExcess = survivalStats.averageHpPercentage - survival.highHpThreshold;
                survivalBonus += Math.floor(hpExcess * 5 * survival.highHpBonus);
            }
        }
        
        // 结果得分
        let resultScore = 0;
        switch (gameResult) {
            case GameResult.WIN:
                resultScore = resultScores.win;
                break;
            case GameResult.LOSE:
                resultScore = resultScores.lose;
                break;
            case GameResult.DRAW:
                resultScore = resultScores.draw;
                break;
        }
        
        // 计算总分
        const totalScore = baseScore + timeBonus + roundBonus + survivalBonus + resultScore;
        
        return {
            baseScore,
            timeBonus,
            roundBonus,
            survivalBonus,
            resultScore,
            totalScore: Math.max(0, totalScore),
            breakdown: {
                gameResult,
                perfectSurvival: survivalStats.perfectSurvival,
                survivalRate: survivalStats.aliveCharacters / survivalStats.totalCharacters,
                averageHp: survivalStats.averageHpPercentage,
                timeEfficiency: gameResult === GameResult.WIN 
                    ? Math.max(0, 1 - (timeElapsed / efficiency.targetTime))
                    : 0,
                roundEfficiency: gameResult === GameResult.WIN
                    ? Math.max(0, 1 - (roundsUsed / efficiency.targetRounds))
                    : 0
            }
        };
    }
    
    /**
     * 从事件中提取行动数据
     */
    extractActionDataFromEvent(event: {
        name: string;
        data?: any;
    }): ActionData | null {
        if (event.name === 'use_skill') {
            const data = event.data;
            const killed = data?.result?.killed || false;
            const killedType = data?.result?.killedType as 'boss' | 'minion' | undefined;
            const skillId = data?.skillId;
            const isBasicAttack = skillId === 'basic_attack';
            
            return {
                actionType: isBasicAttack ? 'attack' : 'skill',
                killed,
                killedType,
                skillId: isBasicAttack ? undefined : skillId
            };
        } else if (event.name === 'attack') {
            const data = event.data;
            const killed = data?.killed || false;
            const killedType = data?.killedType as 'boss' | 'minion' | undefined;
            
            return {
                actionType: 'attack',
                killed,
                killedType
            };
        } else if (event.name === 'walk') {
            return {
                actionType: 'walk'
            };
        }
        
        return null;
    }
    
    /**
     * 重播时重新计算所有事件的得分
     */
    recalculateScoresForReplay(
        events: Array<{ _id?: string; time: number; name: string; data?: any }>,
        configVersion?: string
    ): {
        eventScores: Map<string, number>;
        cumulativeScores: Map<string, number>;
        totalBaseScore: number;
    } {
        const config = this.getConfig(configVersion);
        const eventScores = new Map<string, number>();
        const cumulativeScores = new Map<string, number>();
        let cumulativeScore = 0;
        
        for (const event of events) {
            const actionData = this.extractActionDataFromEvent(event);
            
            if (actionData) {
                const score = this.calculateActionScoreWithConfig(actionData, config);
                const eventKey = event._id || event.time.toString();
                eventScores.set(eventKey, score);
                cumulativeScore += score;
                cumulativeScores.set(eventKey, cumulativeScore);
            }
        }
        
        return {
            eventScores,
            cumulativeScores,
            totalBaseScore: cumulativeScore
        };
    }
}

// ✅ 导出单例实例（前后端共享）
export const sharedScoreService = new SharedScoreService();

