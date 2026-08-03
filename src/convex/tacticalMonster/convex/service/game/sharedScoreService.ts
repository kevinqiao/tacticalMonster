/**
 * 共享计分服务（前后端通用）
 * 纯逻辑实现，不依赖数据库
 */

import { getDefaultScoringConfig, ScoringConfig } from "../../data/scoringConfigs";
import { GameBoss, GameMonster } from "../../types/monsterTypes";

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

/** 终局计分输入 */
export interface EndGameScoreInput {
    roundsUsed: number;
    gameResult: GameResult;
    survivalStats: CharacterSurvivalStats;
}

/** 得分计算结果 */
export interface ScoreResult {
    roundBonus: number;
    survivalBonus: number;
    resultScore: number;
    totalScore: number;
    breakdown: {
        gameResult: GameResult;
        perfectSurvival: boolean;
        survivalRate: number;
        averageHp: number;
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
    /** 当前唯一计分表（`scoringConfigVersion` 仅作记录，不区分多版本） */
    getConfig(_version?: string): ScoringConfig {
        return getDefaultScoringConfig();
    }

    /** 局内不按行动记分 */
    calculateActionScore(_actionData: ActionData, _configVersion?: string): number {
        return 0;
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
            team: GameMonster[];
            boss: GameBoss;
            createdAt: string;
        },
        configVersion?: string,
        options?: {
            winOnBossKill?: boolean;
            /** 仅教学关传入 */
            tutorialWinMode?: "boss_only" | "boss_and_guide" | "guide_only";
            tutorialGuideComplete?: boolean;
        }
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

        const mode = options?.tutorialWinMode;
        const guideComplete = options?.tutorialGuideComplete ?? true;

        if (mode === "guide_only") {
            if (guideComplete) {
                return {
                    result: GameResult.WIN,
                    reason: "完成教学引导",
                    isGameOver: true
                };
            }
            if (bossHp <= 0 && !guideComplete) {
                return {
                    result: GameResult.DRAW,
                    reason: "击败Boss但未完成教学步骤",
                    isGameOver: true
                };
            }
        } else if (mode === "boss_and_guide") {
            if (bossHp <= 0 && guideComplete && (options?.winOnBossKill || aliveMinions.length === 0)) {
                return {
                    result: GameResult.WIN,
                    reason: "完成教学并击败Boss",
                    isGameOver: true
                };
            }
            if (bossHp <= 0 && !guideComplete) {
                return {
                    result: GameResult.DRAW,
                    reason: "击败Boss但未完成教学步骤",
                    isGameOver: true
                };
            }
        } else if (bossHp <= 0 && (options?.winOnBossKill || aliveMinions.length === 0)) {
            return {
                result: GameResult.WIN,
                reason: options?.winOnBossKill ? "击败Boss，玩家胜利" : "击败所有Boss角色，玩家胜利",
                isGameOver: true
            };
        }

        if (mode === "guide_only" || mode === "boss_and_guide") {
            return {
                result: GameResult.DRAW,
                reason: "游戏进行中",
                isGameOver: false
            };
        }

        // 4. 游戏进行中
        return {
            result: GameResult.DRAW,
            reason: '游戏进行中',
            isGameOver: false
        };
    }

    calculateCompleteScore(
        stats: EndGameScoreInput,
        configVersion?: string
    ): ScoreResult {
        const config = this.getConfig(configVersion);
        return this.calculateCompleteScoreWithConfig(stats, config);
    }

    private calculateCompleteScoreWithConfig(
        stats: EndGameScoreInput,
        config: ScoringConfig
    ): ScoreResult {
        const { roundsUsed, gameResult, survivalStats } = stats;
        const { efficiency, survival, resultScores } = config;

        let roundBonus = 0;
        if (gameResult === GameResult.WIN) {
            const roundRatio = Math.max(0, 1 - (roundsUsed / efficiency.targetRounds));
            roundBonus = Math.floor(roundRatio * efficiency.maxRoundBonus);
        }

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

        const totalScore = roundBonus + survivalBonus + resultScore;

        return {
            roundBonus,
            survivalBonus,
            resultScore,
            totalScore: Math.max(0, totalScore),
            breakdown: {
                gameResult,
                perfectSurvival: survivalStats.perfectSurvival,
                survivalRate: survivalStats.aliveCharacters / survivalStats.totalCharacters,
                averageHp: survivalStats.averageHpPercentage,
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
        _events: Array<{ _id?: string; time: number; name: string; data?: any }>,
        _configVersion?: string
    ): {
        eventScores: Map<string, number>;
        cumulativeScores: Map<string, number>;
        totalBaseScore: number;
    } {
        return {
            eventScores: new Map(),
            cumulativeScores: new Map(),
            totalBaseScore: 0
        };
    }
}

// ✅ 导出单例实例（前后端共享）
export const sharedScoreService = new SharedScoreService();

/**
 * 终局计分（与 `gameScoreService` / 结算处共用）
 * 不使用 `game.score` 局内累加；总分仅含回合效率 + 存活 + 胜败。
 */
export function buildEndGameScoreResult(
    game: {
        scoringConfigVersion?: string;
        currentRound?: { no: number };
        team?: Array<{ stats?: { hp?: { current: number; max: number } } }>;
    },
    gameResult: GameResult
): ScoreResult {
    return sharedScoreService.calculateCompleteScore(
        {
            roundsUsed: game.currentRound?.no ?? 0,
            gameResult,
            survivalStats: sharedScoreService.calculateSurvivalStats(game.team || []),
        },
        game.scoringConfigVersion
    );
}

