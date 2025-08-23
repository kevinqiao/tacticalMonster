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
     * 增量更新玩家技能等级统计
     */
    async incrementalUpdatePlayerSkillStatistics(uid: string): Promise<{
        updated: boolean;
        newStats: any;
        newMatchesCount: number;
    }> {
        try {
            // 1. 获取缓存数据
            const cachedStats = await this.getCachedPlayerSkillStatistics(uid);

            // 2. 获取增量数据（基于时间戳）
            const incrementalData = await this.getIncrementalPlayerMatches(uid, cachedStats?.lastMatchCreatedAt);

            if (incrementalData.matches.length === 0) {
                return {
                    updated: false,
                    newStats: cachedStats,
                    newMatchesCount: 0
                };
            }

            // 3. 合并历史统计和增量数据
            const mergedStats = await this.mergePlayerSkillStatistics(cachedStats, incrementalData);

            // 4. 更新缓存
            await this.updatePlayerSkillCache(uid, mergedStats);

            return {
                updated: true,
                newStats: mergedStats,
                newMatchesCount: incrementalData.matches.length
            };

        } catch (error) {
            console.error(`增量更新玩家技能统计失败: ${uid}`, error);
            throw error;
        }
    }

    /**
     * 获取缓存的玩家技能统计
     */
    private async getCachedPlayerSkillStatistics(uid: string): Promise<any> {
        try {
            const cached = await this.ctx.db
                .query("player_skill_cache")
                .filter((q: any) => q.eq(q.field("uid"), uid))
                .first();

            return cached || null;
        } catch (error) {
            console.error(`获取玩家技能缓存失败: ${uid}`, error);
            return null;
        }
    }

    /**
     * 获取增量比赛数据
     */
    private async getIncrementalPlayerMatches(uid: string, lastCreatedAt?: string): Promise<{
        matches: any[];
        timeRange: { start: string; end: string };
    }> {
        try {
            let query = this.ctx.db
                .query("match_results")
                .filter((q: any) => q.eq(q.field("uid"), uid));

            // 如果有上次更新时间，只获取新数据
            if (lastCreatedAt) {
                query = query.filter((q: any) => q.gt(q.field("createdAt"), lastCreatedAt));
            }

            const matches = await query.order("desc").order("createdAt").take(50);

            return {
                matches,
                timeRange: {
                    start: lastCreatedAt || 'unknown',
                    end: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error(`获取增量玩家比赛数据失败: ${uid}`, error);
            return { matches: [], timeRange: { start: 'unknown', end: 'unknown' } };
        }
    }

    /**
     * 合并玩家技能统计和增量数据
     */
    private async mergePlayerSkillStatistics(cachedStats: any, incrementalData: any): Promise<any> {
        try {
            const newMatches = incrementalData.matches;

            if (!cachedStats) {
                // 首次统计
                return this.calculateInitialPlayerSkillStatistics(newMatches);
            }

            // 合并现有统计和新数据
            const mergedStats = { ...cachedStats };

            // 更新基础统计
            mergedStats.totalMatches = (cachedStats.totalMatches || 0) + newMatches.length;
            mergedStats.lastAnalysisTime = new Date().toISOString();
            mergedStats.lastMatchCreatedAt = this.getLatestCreatedAt(newMatches);

            // 更新技能统计
            if (newMatches.length > 0) {
                mergedStats.skillStats = this.updatePlayerSkillStatistics(cachedStats.skillStats, newMatches);
            }

            return mergedStats;

        } catch (error) {
            console.error("合并玩家技能统计数据失败:", error);
            return cachedStats;
        }
    }

    /**
     * 计算初始玩家技能统计数据
     */
    private calculateInitialPlayerSkillStatistics(matches: any[]): any {
        const ranks = matches.map((m: any) => m.rank || 1);
        const scores = matches.map((m: any) => m.score || 0);
        const wins = ranks.filter((rank: number) => rank === 1).length;

        return {
            totalMatches: matches.length,
            lastAnalysisTime: new Date().toISOString(),
            lastMatchCreatedAt: this.getLatestCreatedAt(matches),
            skillStats: {
                totalRanks: ranks.reduce((sum: number, rank: number) => sum + rank, 0),
                averageRank: ranks.length > 0 ? ranks.reduce((sum: number, rank: number) => sum + rank, 0) / ranks.length : 0,
                totalScores: scores.reduce((sum: number, score: number) => sum + score, 0),
                averageScore: scores.length > 0 ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length : 0,
                wins,
                winRate: ranks.length > 0 ? wins / ranks.length : 0,
                rankCount: ranks.length
            }
        };
    }

    /**
     * 更新玩家技能统计
     */
    private updatePlayerSkillStatistics(existingStats: any, newMatches: any[]): any {
        const newRanks = newMatches.map((m: any) => m.rank || 1);
        const newScores = newMatches.map((m: any) => m.score || 0);
        const newWins = newRanks.filter((rank: number) => rank === 1).length;

        if (!existingStats) {
            return this.calculateInitialPlayerSkillStatistics(newMatches).skillStats;
        }

        const totalRanks = existingStats.totalRanks + newRanks.reduce((sum: number, rank: number) => sum + rank, 0);
        const totalScores = existingStats.totalScores + newScores.reduce((sum: number, score: number) => sum + score, 0);
        const totalRankCount = existingStats.rankCount + newRanks.length;
        const totalWins = existingStats.wins + newWins;

        return {
            totalRanks,
            averageRank: totalRankCount > 0 ? totalRanks / totalRankCount : 0,
            totalScores,
            averageScore: totalRankCount > 0 ? totalScores / totalRankCount : 0,
            wins: totalWins,
            winRate: totalRankCount > 0 ? totalWins / totalRankCount : 0,
            rankCount: totalRankCount
        };
    }

    /**
     * 更新玩家技能缓存
     */
    private async updatePlayerSkillCache(uid: string, stats: any): Promise<void> {
        try {
            const existing = await this.ctx.db
                .query("player_skill_cache")
                .filter((q: any) => q.eq(q.field("uid"), uid))
                .first();

            if (existing) {
                await this.ctx.db.patch(existing._id, stats);
            } else {
                await this.ctx.db.insert("player_skill_cache", {
                    uid,
                    ...stats,
                    createdAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`更新玩家技能缓存失败: ${uid}`, error);
        }
    }

    /**
     * 获取玩家技能等级（基于历史表现）
     */
    async getPlayerSkillLevel(uid: string): Promise<string> {
        try {
            // 1. 先尝试从缓存获取
            const cachedStats = await this.getCachedPlayerSkillStatistics(uid);

            if (cachedStats && cachedStats.skillStats) {
                // 2. 检查缓存是否过期（比如超过1小时）
                const lastUpdate = new Date(cachedStats.lastAnalysisTime);
                const now = new Date();
                const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

                if (hoursSinceUpdate < 1) {
                    // 缓存有效，直接计算技能等级
                    return this.calculateSkillLevelFromStats(cachedStats.skillStats);
                }
            }

            // 3. 缓存过期或不存在，执行增量更新
            const updateResult = await this.incrementalUpdatePlayerSkillStatistics(uid);

            if (updateResult.updated && updateResult.newStats.skillStats) {
                return this.calculateSkillLevelFromStats(updateResult.newStats.skillStats);
            }

            // 4. 如果增量更新失败，回退到实时计算
            return this.calculatePlayerSkillLevelRealtime(uid);

        } catch (error) {
            console.error(`获取玩家技能等级失败: ${uid}`, error);
            return 'bronze';
        }
    }

    /**
     * 从统计数据计算技能等级
     */
    private calculateSkillLevelFromStats(skillStats: any): string {
        const { averageRank, winRate } = skillStats;

        if (averageRank <= 1.5 && winRate >= 0.6) return 'diamond';
        if (averageRank <= 2.0 && winRate >= 0.5) return 'platinum';
        if (averageRank <= 2.5 && winRate >= 0.4) return 'gold';
        if (averageRank <= 3.0 && winRate >= 0.3) return 'silver';
        return 'bronze';
    }

    /**
     * 实时计算玩家技能等级（回退方案）
     */
    private async calculatePlayerSkillLevelRealtime(uid: string): Promise<string> {
        try {
            const recentMatches = await this.ctx.db
                .query("match_results")
                .filter((q: any) => q.eq(q.field("uid"), uid))
                .order("desc").order("createdAt")
                .take(20);

            if (recentMatches.length < 5) return 'bronze';

            const ranks = recentMatches.map((m: any) => m.rank);
            const averageRank = ranks.reduce((sum: number, rank: number) => sum + rank, 0) / ranks.length;
            const wins = ranks.filter((rank: number) => rank === 1).length;
            const winRate = wins / ranks.length;

            return this.calculateSkillLevelFromStats({ averageRank, winRate });

        } catch (error) {
            console.error(`实时计算玩家技能等级失败: ${uid}`, error);
            return 'bronze';
        }
    }

    /**
     * 批量更新玩家技能等级统计
     */
    async batchUpdatePlayerSkillStatistics(uids: string[]): Promise<{
        total: number;
        successful: number;
        updated: number;
        results: Array<{
            uid: string;
            success: boolean;
            updated?: boolean;
            newMatchesCount?: number;
            error?: string;
        }>;
    }> {
        try {
            const results = [];

            for (const uid of uids) {
                try {
                    const result = await this.incrementalUpdatePlayerSkillStatistics(uid);
                    results.push({
                        uid,
                        success: true,
                        updated: result.updated,
                        newMatchesCount: result.newMatchesCount
                    });
                } catch (error) {
                    results.push({
                        uid,
                        success: false,
                        error: String(error)
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const updatedCount = results.filter(r => r.success && r.updated).length;

            return {
                total: uids.length,
                successful: successCount,
                updated: updatedCount,
                results
            };

        } catch (error) {
            console.error('批量更新玩家技能统计失败:', error);
            throw error;
        }
    }

    /**
     * 清理过期缓存
     */
    async cleanupExpiredCache(daysToKeep: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            let totalDeletedCount = 0;

            // 清理种子统计缓存
            const expiredSeedCache = await this.ctx.db
                .query("seed_statistics_cache")
                .filter((q: any) => q.lt(q.field("lastAnalysisTime"), cutoffDate.toISOString()))
                .collect();

            for (const item of expiredSeedCache) {
                await this.ctx.db.delete(item._id);
                totalDeletedCount++;
            }

            // 清理玩家技能缓存
            const expiredPlayerCache = await this.ctx.db
                .query("player_skill_cache")
                .filter((q: any) => q.lt(q.field("lastAnalysisTime"), cutoffDate.toISOString()))
                .collect();

            for (const item of expiredPlayerCache) {
                await this.ctx.db.delete(item._id);
                totalDeletedCount++;
            }

            return totalDeletedCount;
        } catch (error) {
            console.error("清理过期缓存失败:", error);
            return 0;
        }
    }
} 
