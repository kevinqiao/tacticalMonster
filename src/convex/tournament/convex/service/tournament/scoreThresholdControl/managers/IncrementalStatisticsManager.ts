/**
 * 简化的增量统计管理器
 * 负责管理seed统计的缓存和增量更新
 */
export class IncrementalStatisticsManager {
    private ctx: any;

    constructor(ctx: any) {
        this.ctx = ctx;
    }

    /**
     * 增量更新seed统计
     */
    async incrementalUpdateSeedStatistics(seed: string): Promise<{
        updated: boolean;
        newStats: any;
        newMatchesCount: number;
    }> {
        try {
            // 1. 获取缓存数据
            const cachedStats = await this.getCachedSeedStatistics(seed);

            // 2. 获取增量数据（基于时间戳）
            const incrementalData = await this.getIncrementalMatches(seed, cachedStats?.lastMatchCreatedAt);

            if (incrementalData.matches.length === 0) {
                return {
                    updated: false,
                    newStats: cachedStats,
                    newMatchesCount: 0
                };
            }

            // 3. 合并历史统计和增量数据
            const mergedStats = await this.mergeSeedStatisticsWithTime(cachedStats, incrementalData);

            // 4. 更新缓存
            await this.updateSeedStatisticsCache(seed, mergedStats);

            return {
                updated: true,
                newStats: mergedStats,
                newMatchesCount: incrementalData.matches.length
            };

        } catch (error) {
            console.error(`增量更新seed统计失败: ${seed}`, error);
            throw error;
        }
    }

    /**
     * 获取缓存的seed统计
     */
    private async getCachedSeedStatistics(seed: string): Promise<any> {
        try {
            const cached = await this.ctx.db
                .query("seed_statistics_cache")
                .filter((q: any) => q.eq(q.field("seed"), seed))
                .first();

            return cached || null;
        } catch (error) {
            console.error(`获取缓存统计失败: ${seed}`, error);
            return null;
        }
    }

    /**
     * 获取增量比赛数据
     */
    private async getIncrementalMatches(seed: string, lastCreatedAt?: string): Promise<{
        matches: any[];
        timeRange: { start: string; end: string };
    }> {
        try {
            let query = this.ctx.db
                .query("match_results")
                .filter((q: any) => q.eq(q.field("seed"), seed));

            // 如果有上次更新时间，只获取新数据
            if (lastCreatedAt) {
                query = query.filter((q: any) => q.gt(q.field("createdAt"), lastCreatedAt));
            }

            const matches = await query.collect();

            return {
                matches,
                timeRange: {
                    start: lastCreatedAt || 'unknown',
                    end: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error(`获取增量比赛数据失败: ${seed}`, error);
            return { matches: [], timeRange: { start: 'unknown', end: 'unknown' } };
        }
    }

    /**
     * 合并统计数据和增量数据
     */
    private async mergeSeedStatisticsWithTime(cachedStats: any, incrementalData: any): Promise<any> {
        try {
            const newMatches = incrementalData.matches;

            if (!cachedStats) {
                // 首次统计
                return this.calculateInitialStatistics(newMatches);
            }

            // 合并现有统计和新数据
            const mergedStats = { ...cachedStats };

            // 更新基础统计
            mergedStats.totalMatches = (cachedStats.totalMatches || 0) + newMatches.length;
            mergedStats.lastAnalysisTime = new Date().toISOString();
            mergedStats.lastMatchCreatedAt = this.getLatestCreatedAt(newMatches);

            // 更新分数统计
            if (newMatches.length > 0) {
                mergedStats.scoreStats = this.updateScoreStatistics(cachedStats.scoreStats, newMatches);
            }

            return mergedStats;

        } catch (error) {
            console.error("合并统计数据失败:", error);
            return cachedStats;
        }
    }

    /**
     * 计算初始统计数据
     */
    private calculateInitialStatistics(matches: any[]): any {
        const scores = matches.map((m: any) => m.score || 0).filter(s => s > 0);

        return {
            totalMatches: matches.length,
            lastAnalysisTime: new Date().toISOString(),
            lastMatchCreatedAt: this.getLatestCreatedAt(matches),
            scoreStats: {
                totalScores: scores.reduce((sum: number, score: number) => sum + score, 0),
                averageScore: scores.length > 0 ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length : 0,
                minScore: scores.length > 0 ? Math.min(...scores) : 0,
                maxScore: scores.length > 0 ? Math.max(...scores) : 0,
                scoreCount: scores.length
            }
        };
    }

    /**
     * 更新分数统计
     */
    private updateScoreStatistics(existingStats: any, newMatches: any[]): any {
        const newScores = newMatches.map((m: any) => m.score || 0).filter(s => s > 0);

        if (!existingStats) {
            return this.calculateInitialStatistics(newMatches).scoreStats;
        }

        const totalScores = existingStats.totalScores + newScores.reduce((sum: number, score: number) => sum + score, 0);
        const totalCount = existingStats.scoreCount + newScores.length;

        return {
            totalScores,
            averageScore: totalCount > 0 ? totalScores / totalCount : 0,
            minScore: Math.min(existingStats.minScore, ...newScores),
            maxScore: Math.max(existingStats.maxScore, ...newScores),
            scoreCount: totalCount
        };
    }

    /**
     * 获取最新的创建时间
     */
    private getLatestCreatedAt(matches: any[]): string {
        if (matches.length === 0) return new Date().toISOString();

        const timestamps = matches
            .map((m: any) => m.createdAt)
            .filter(t => t)
            .sort()
            .reverse();

        return timestamps[0] || new Date().toISOString();
    }

    /**
     * 更新缓存
     */
    private async updateSeedStatisticsCache(seed: string, stats: any): Promise<void> {
        try {
            const existing = await this.ctx.db
                .query("seed_statistics_cache")
                .filter((q: any) => q.eq(q.field("seed"), seed))
                .first();

            if (existing) {
                await this.ctx.db.patch(existing._id, stats);
            } else {
                await this.ctx.db.insert("seed_statistics_cache", {
                    seed,
                    ...stats,
                    createdAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`更新缓存失败: ${seed}`, error);
        }
    }

    /**
     * 获取种子难度系数
     */
    async getSeedDifficultyCoefficient(seed: string): Promise<number> {
        try {
            const stats = await this.getCachedSeedStatistics(seed);
            if (!stats || !stats.scoreStats) return 1.0;

            const { averageScore, scoreCount } = stats.scoreStats;
            if (scoreCount < 10) return 1.0; // 数据不足

            // 简单的难度计算：平均分越高，难度越低
            const difficulty = Math.max(0.5, Math.min(2.0, 1000 / averageScore));
            return Math.round(difficulty * 100) / 100;

        } catch (error) {
            console.error(`获取难度系数失败: ${seed}`, error);
            return 1.0;
        }
    }

    /**
     * 获取种子难度等级
     */
    async getSeedDifficultyLevel(seed: string): Promise<string> {
        try {
            const coefficient = await this.getSeedDifficultyCoefficient(seed);

            if (coefficient < 0.7) return 'very_hard';
            if (coefficient < 0.9) return 'hard';
            if (coefficient < 1.1) return 'normal';
            if (coefficient < 1.3) return 'easy';
            return 'very_easy';
        } catch (error) {
            return 'normal';
        }
    }

    /**
     * 根据难度等级获取种子列表
     */
    async getSeedsByDifficultyLevel(difficultyLevel: string, limit: number = 10): Promise<string[]> {
        try {
            const allSeeds = await this.ctx.db
                .query("seed_statistics_cache")
                .filter((q: any) => q.gte(q.field("scoreStats.scoreCount"), 10)) // 至少10场比赛
                .collect();

            const seedsWithDifficulty = await Promise.all(
                allSeeds.map(async (seedData: any) => ({
                    seed: seedData.seed,
                    level: await this.getSeedDifficultyLevel(seedData.seed)
                }))
            );

            return seedsWithDifficulty
                .filter(item => item.level === difficultyLevel)
                .slice(0, limit)
                .map(item => item.seed);

        } catch (error) {
            console.error(`获取难度等级种子失败: ${difficultyLevel}`, error);
            return [];
        }
    }

    /**
     * 根据玩家技能等级推荐种子
     */
    async recommendSeedsByPlayerSkill(
        playerSkillLevel: string,
        preferredDifficulty: 'challenge' | 'balanced' | 'practice' = 'balanced',
        limit: number = 5
    ): Promise<{
        seeds: string[];
        difficultyLevel: string;
        reasoning: string;
    }> {
        try {
            // 根据玩家技能等级和偏好确定目标难度
            const targetDifficulty = this.mapPlayerSkillToDifficulty(playerSkillLevel, preferredDifficulty);

            // 获取该难度的种子
            const seeds = await this.getSeedsByDifficultyLevel(targetDifficulty, limit);

            // 如果没有找到，降级到相近难度
            if (seeds.length === 0) {
                const fallbackDifficulty = this.getFallbackDifficulty(targetDifficulty);
                const fallbackSeeds = await this.getSeedsByDifficultyLevel(fallbackDifficulty, limit);

                return {
                    seeds: fallbackSeeds,
                    difficultyLevel: fallbackDifficulty,
                    reasoning: `未找到${targetDifficulty}难度的种子，使用${fallbackDifficulty}难度作为备选`
                };
            }

            return {
                seeds,
                difficultyLevel: targetDifficulty,
                reasoning: `基于玩家${playerSkillLevel}技能等级和${preferredDifficulty}偏好推荐`
            };

        } catch (error) {
            console.error('推荐种子失败:', error);
            return {
                seeds: [],
                difficultyLevel: 'normal',
                reasoning: '推荐失败，使用默认难度'
            };
        }
    }

    /**
     * 映射玩家技能等级到种子难度
     */
    private mapPlayerSkillToDifficulty(
        playerSkillLevel: string,
        preferredDifficulty: 'challenge' | 'balanced' | 'practice'
    ): string {
        const skillMap: { [key: string]: { [key: string]: string } } = {
            'bronze': {
                'challenge': 'normal',
                'balanced': 'easy',
                'practice': 'very_easy'
            },
            'silver': {
                'challenge': 'hard',
                'balanced': 'normal',
                'practice': 'easy'
            },
            'gold': {
                'challenge': 'very_hard',
                'balanced': 'hard',
                'practice': 'normal'
            },
            'platinum': {
                'challenge': 'very_hard',
                'balanced': 'hard',
                'practice': 'normal'
            },
            'diamond': {
                'challenge': 'very_hard',
                'balanced': 'hard',
                'practice': 'normal'
            }
        };

        return skillMap[playerSkillLevel]?.[preferredDifficulty] || 'normal';
    }

    /**
     * 获取备选难度等级
     */
    private getFallbackDifficulty(targetDifficulty: string): string {
        const fallbackMap: { [key: string]: string } = {
            'very_hard': 'hard',
            'hard': 'normal',
            'normal': 'easy',
            'easy': 'very_easy',
            'very_easy': 'easy'
        };

        return fallbackMap[targetDifficulty] || 'normal';
    }

    /**
     * 获取玩家技能等级（基于历史表现）
     */
    async getPlayerSkillLevel(uid: string): Promise<string> {
        try {
            // 获取玩家最近的比赛记录 - 使用统一的 match_results 表
            const recentMatches = await this.ctx.db
                .query("match_results")
                .filter((q: any) => q.eq(q.field("uid"), uid))
                .order("desc", "createdAt")
                .take(20);

            if (recentMatches.length < 5) return 'bronze'; // 数据不足

            // 计算平均排名和胜率
            const ranks = recentMatches.map((m: any) => m.rank);
            const averageRank = ranks.reduce((sum: number, rank: number) => sum + rank, 0) / ranks.length;
            const wins = ranks.filter((rank: number) => rank === 1).length;
            const winRate = wins / ranks.length;

            // 基于排名和胜率判断技能等级
            if (averageRank <= 1.5 && winRate >= 0.6) return 'diamond';
            if (averageRank <= 2.0 && winRate >= 0.5) return 'platinum';
            if (averageRank <= 2.5 && winRate >= 0.4) return 'gold';
            if (averageRank <= 3.0 && winRate >= 0.3) return 'silver';
            return 'bronze';

        } catch (error) {
            console.error(`获取玩家技能等级失败: ${uid}`, error);
            return 'bronze';
        }
    }

    /**
     * 清理过期缓存
     */
    async cleanupExpiredCache(daysToKeep: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const expired = await this.ctx.db
                .query("seed_statistics_cache")
                .filter((q: any) => q.lt(q.field("lastAnalysisTime"), cutoffDate.toISOString()))
                .collect();

            let deletedCount = 0;
            for (const item of expired) {
                await this.ctx.db.delete(item._id);
                deletedCount++;
            }

            return deletedCount;
        } catch (error) {
            console.error("清理过期缓存失败:", error);
            return 0;
        }
    }
} 
