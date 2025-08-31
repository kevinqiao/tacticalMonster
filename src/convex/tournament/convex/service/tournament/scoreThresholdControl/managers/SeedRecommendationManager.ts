/**
 * 种子推荐管理器
 * 核心功能：基于玩家历史数据，智能推荐新的比赛种子
 */


export interface SeedRecommendation {
    seeds: string[];
    difficultyLevel: string;
    reasoning: string;
    confidence: number;
    metadata: {
        playerSkillLevel: string;
        preferredDifficulty: string;
        totalCandidates: number;
    };
}

export interface SeedStatistics {
    seed: string;
    averageScore: number;
    totalMatches: number;
    difficultyLevel: string;
    difficultyCoefficient: number;
    lastUpdated: string;
}

export class SeedRecommendationManager {
    private ctx: any;

    constructor(ctx: any) {
        this.ctx = ctx;
    }

    /**
     * 主要方法：为玩家推荐新种子
     */
    async recommendSeedsForPlayer(
        uid: string,
        options: {
            limit?: number;
            preferredDifficulty?: 'practice' | 'balanced' | 'challenge';
            excludeSeeds?: string[];
        } = {}
    ): Promise<SeedRecommendation> {
        try {
            const { limit = 5, preferredDifficulty = 'balanced', excludeSeeds = [] } = options;

            // 1. 分析玩家技能水平
            const playerSkillLevel = await this.analyzePlayerSkillLevel(uid);

            // 2. 确定目标难度等级
            const targetDifficultyLevel = this.mapSkillToTargetDifficulty(playerSkillLevel, preferredDifficulty);

            // 3. 获取候选种子
            const candidateSeeds = await this.getCandidateSeeds(targetDifficultyLevel, excludeSeeds);

            // 4. 根据玩家历史过滤和排序
            const filteredSeeds = await this.filterSeedsByPlayerHistory(uid, candidateSeeds);

            // 5. 选择最佳推荐
            const recommendedSeeds = filteredSeeds.slice(0, limit).map(s => s.seed);

            // 6. 计算信心度
            const confidence = this.calculateRecommendationConfidence(filteredSeeds, playerSkillLevel);

            // 7. 生成推理说明
            const reasoning = this.generateRecommendationReasoning(
                playerSkillLevel,
                targetDifficultyLevel,
                recommendedSeeds.length,
                candidateSeeds.length
            );

            return {
                seeds: recommendedSeeds,
                difficultyLevel: targetDifficultyLevel,
                reasoning,
                confidence,
                metadata: {
                    playerSkillLevel,
                    preferredDifficulty,
                    totalCandidates: candidateSeeds.length
                }
            };

        } catch (error) {
            console.error(`种子推荐失败: ${uid}`, error);
            return this.getDefaultRecommendation();
        }
    }

    /**
     * 分析玩家技能水平
     */
    private async analyzePlayerSkillLevel(uid: string): Promise<string> {
        try {
            // 获取最近20场比赛
            const recentMatches = await this.ctx.db
                .query("match_results")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .order("desc")
                .take(20);

            if (recentMatches.length < 5) {
                return 'bronze'; // 新玩家默认青铜
            }

            // 计算技能指标
            const ranks = recentMatches.map((m:any) => m.rank || 1);
            const scores = recentMatches.map((m:any) => m.score || 0);

            const averageRank = ranks.reduce((sum:any, rank:any) => sum + rank, 0) / ranks.length;
            const averageScore = scores.reduce((sum:any, score:any) => sum + score, 0) / scores.length;
            const winRate = ranks.filter((rank:any) => rank === 1).length / ranks.length;

            // 基于综合指标判断技能等级
            return this.calculateSkillLevel(averageRank, averageScore, winRate);

        } catch (error) {
            console.error(`分析玩家技能水平失败: ${uid}`, error);
            return 'bronze';
        }
    }

    /**
     * 计算技能等级
     */
    private calculateSkillLevel(averageRank: number, averageScore: number, winRate: number): string {
        // 综合评分系统
        let skillScore = 0;

        // 排名因子 (40%)
        if (averageRank <= 1.5) skillScore += 40;
        else if (averageRank <= 2.0) skillScore += 30;
        else if (averageRank <= 2.5) skillScore += 20;
        else if (averageRank <= 3.0) skillScore += 10;

        // 胜率因子 (30%)
        if (winRate >= 0.6) skillScore += 30;
        else if (winRate >= 0.4) skillScore += 20;
        else if (winRate >= 0.25) skillScore += 10;

        // 分数因子 (30%)
        if (averageScore >= 5000) skillScore += 30;
        else if (averageScore >= 3000) skillScore += 20;
        else if (averageScore >= 1500) skillScore += 15;
        else if (averageScore >= 800) skillScore += 10;

        // 根据总分确定等级
        if (skillScore >= 80) return 'diamond';
        if (skillScore >= 60) return 'platinum';
        if (skillScore >= 40) return 'gold';
        if (skillScore >= 20) return 'silver';
        return 'bronze';
    }

    /**
     * 映射技能等级到目标难度
     */
    private mapSkillToTargetDifficulty(skillLevel: string, preference: string): string {
        const difficultyMap: { [key: string]: { [key: string]: string } } = {
            'bronze': {
                'practice': 'very_easy',
                'balanced': 'easy',
                'challenge': 'normal'
            },
            'silver': {
                'practice': 'easy',
                'balanced': 'normal',
                'challenge': 'hard'
            },
            'gold': {
                'practice': 'normal',
                'balanced': 'hard',
                'challenge': 'very_hard'
            },
            'platinum': {
                'practice': 'normal',
                'balanced': 'hard',
                'challenge': 'very_hard'
            },
            'diamond': {
                'practice': 'hard',
                'balanced': 'very_hard',
                'challenge': 'very_hard'
            }
        };

        return difficultyMap[skillLevel]?.[preference] || 'normal';
    }

    /**
     * 获取候选种子
     */
    private async getCandidateSeeds(difficultyLevel: string, excludeSeeds: string[]): Promise<SeedStatistics[]> {
        try {
            // 从种子统计缓存获取数据
            const seedStats = await this.ctx.db
                .query("seed_statistics_cache")
                .filter((q: any) => q.gte(q.field("totalMatches"), 10)) // 至少10场比赛
                .collect();

            // 计算每个种子的难度等级并筛选
            const candidates: SeedStatistics[] = [];

            for (const stat of seedStats) {
                if (excludeSeeds.includes(stat.seed)) continue;

                const difficultyCoefficient = this.calculateDifficultyCoefficient(stat);
                const seedDifficultyLevel = this.mapCoefficientToDifficultyLevel(difficultyCoefficient);

                if (seedDifficultyLevel === difficultyLevel) {
                    candidates.push({
                        seed: stat.seed,
                        averageScore: stat.scoreStats?.averageScore || 0,
                        totalMatches: stat.totalMatches || 0,
                        difficultyLevel: seedDifficultyLevel,
                        difficultyCoefficient,
                        lastUpdated: stat.lastAnalysisTime || ''
                    });
                }
            }

            // 按匹配度和数据质量排序
            return candidates.sort((a, b) => {
                // 优先考虑数据更丰富的种子
                const scoreA = a.totalMatches * 0.7 + (new Date().getTime() - new Date(a.lastUpdated).getTime()) / (1000 * 60 * 60 * 24) * -0.3;
                const scoreB = b.totalMatches * 0.7 + (new Date().getTime() - new Date(b.lastUpdated).getTime()) / (1000 * 60 * 60 * 24) * -0.3;
                return scoreB - scoreA;
            });

        } catch (error) {
            console.error(`获取候选种子失败: ${difficultyLevel}`, error);
            return [];
        }
    }

    /**
     * 根据玩家历史过滤种子
     */
    private async filterSeedsByPlayerHistory(uid: string, candidates: SeedStatistics[]): Promise<SeedStatistics[]> {
        try {
            // 获取玩家已玩过的种子
            const playedSeeds = await this.ctx.db
                .query("match_results")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .collect();

            const playedSeedSet = new Set(playedSeeds.map((m: any) => m.seed).filter(Boolean));

            // 过滤掉已玩过的种子
            const unplayedSeeds = candidates.filter(candidate => !playedSeedSet.has(candidate.seed));

            // 如果未玩过的种子不足，补充一些玩过但表现不佳的种子
            if (unplayedSeeds.length < 3) {
                const replableSeeds = await this.getReplayableSeedsForPlayer(uid, candidates, playedSeeds);
                unplayedSeeds.push(...replableSeeds.slice(0, 5 - unplayedSeeds.length));
            }

            return unplayedSeeds;

        } catch (error) {
            console.error(`根据历史过滤种子失败: ${uid}`, error);
            return candidates;
        }
    }

    /**
     * 获取可重玩的种子（玩家表现不佳的）
     */
    private async getReplayableSeedsForPlayer(
        uid: string,
        candidates: SeedStatistics[],
        playedMatches: any[]
    ): Promise<SeedStatistics[]> {
        try {
            // 分析玩家在各种子上的表现
            const seedPerformance = new Map();

            for (const match of playedMatches) {
                if (!match.seed) continue;

                if (!seedPerformance.has(match.seed)) {
                    seedPerformance.set(match.seed, {
                        totalMatches: 0,
                        totalRanks: 0,
                        bestRank: Infinity,
                        averageScore: 0,
                        totalScore: 0
                    });
                }

                const perf = seedPerformance.get(match.seed);
                perf.totalMatches++;
                perf.totalRanks += (match.rank || 1);
                perf.bestRank = Math.min(perf.bestRank, match.rank || 1);
                perf.totalScore += (match.score || 0);
                perf.averageScore = perf.totalScore / perf.totalMatches;
            }

            // 找出表现不佳的种子（平均排名 > 3 或 最佳排名 > 2）
            const replayableSeeds = [];

            for (const candidate of candidates) {
                const perf = seedPerformance.get(candidate.seed);
                if (perf) {
                    const averageRank = perf.totalRanks / perf.totalMatches;
                    if (averageRank > 3 || perf.bestRank > 2) {
                        replayableSeeds.push(candidate);
                    }
                }
            }

            return replayableSeeds;

        } catch (error) {
            console.error('获取可重玩种子失败:', error);
            return [];
        }
    }

    /**
     * 计算难度系数
     */
    private calculateDifficultyCoefficient(seedStat: any): number {
        const averageScore = seedStat.scoreStats?.averageScore || 1000;

        // 简单的难度计算：平均分越高，难度越低
        // 基准分数1000，系数范围 0.5-2.0
        const coefficient = Math.max(0.5, Math.min(2.0, 1000 / averageScore));
        return Math.round(coefficient * 100) / 100;
    }

    /**
     * 映射系数到难度等级
     */
    private mapCoefficientToDifficultyLevel(coefficient: number): string {
        if (coefficient >= 1.8) return 'very_hard';
        if (coefficient >= 1.4) return 'hard';
        if (coefficient >= 0.8) return 'normal';
        if (coefficient >= 0.6) return 'easy';
        return 'very_easy';
    }

    /**
     * 计算推荐信心度
     */
    private calculateRecommendationConfidence(
        filteredSeeds: SeedStatistics[],
        playerSkillLevel: string
    ): number {
        let confidence = 0.5;

        // 候选数量影响信心度
        if (filteredSeeds.length >= 10) confidence += 0.2;
        else if (filteredSeeds.length >= 5) confidence += 0.1;
        else if (filteredSeeds.length < 3) confidence -= 0.2;

        // 数据质量影响信心度
        const avgMatches = filteredSeeds.reduce((sum, seed) => sum + seed.totalMatches, 0) / filteredSeeds.length;
        if (avgMatches >= 50) confidence += 0.2;
        else if (avgMatches >= 20) confidence += 0.1;

        // 技能等级确定性影响信心度
        if (playerSkillLevel !== 'bronze') confidence += 0.1;

        return Math.min(0.95, Math.max(0.1, confidence));
    }

    /**
     * 生成推荐说明
     */
    private generateRecommendationReasoning(
        skillLevel: string,
        difficultyLevel: string,
        recommendedCount: number,
        totalCandidates: number
    ): string {
        const reasons = [];

        // 技能等级说明
        const skillDesc = {
            'bronze': '新手',
            'silver': '初级',
            'gold': '中级',
            'platinum': '高级',
            'diamond': '专家'
        }[skillLevel] || '未知';

        reasons.push(`基于${skillDesc}技能等级`);

        // 难度说明
        const difficultyDesc = {
            'very_easy': '非常简单',
            'easy': '简单',
            'normal': '普通',
            'hard': '困难',
            'very_hard': '非常困难'
        }[difficultyLevel] || '普通';

        reasons.push(`推荐${difficultyDesc}难度`);

        // 数量说明
        reasons.push(`从${totalCandidates}个候选中选择${recommendedCount}个`);

        return reasons.join('，');
    }

    /**
     * 获取默认推荐
     */
    private getDefaultRecommendation(): SeedRecommendation {
        return {
            seeds: [],
            difficultyLevel: 'normal',
            reasoning: '数据不足，无法生成个性化推荐',
            confidence: 0.1,
            metadata: {
                playerSkillLevel: 'bronze',
                preferredDifficulty: 'balanced',
                totalCandidates: 0
            }
        };
    }

    /**
     * 更新种子统计（用于维护数据）
     */
    async updateSeedStatistics(seed: string): Promise<boolean> {
        try {
            // 获取该种子的所有比赛
            const matches = await this.ctx.db
                .query("match_results")
                .filter((q: any) => q.eq(q.field("seed"), seed))
                .collect();

            if (matches.length === 0) return false;

            // 计算统计数据
            const scores = matches.map((m:any) => m.score || 0).filter((s:any) => s > 0);
            const totalMatches = matches.length;
            const averageScore = scores.reduce((sum:any, score:any) => sum + score, 0) / scores.length;
            const minScore = Math.min(...scores);
            const maxScore = Math.max(...scores);

            const stats = {
                seed,
                totalMatches,
                scoreStats: {
                    totalScores: scores.reduce((sum:any, score:any) => sum + score, 0),
                    averageScore,
                    minScore,
                    maxScore,
                    scoreCount: scores.length
                },
                lastAnalysisTime: new Date().toISOString(),
                lastMatchCreatedAt: matches[matches.length - 1]?.createdAt || new Date().toISOString()
            };

            // 更新或插入缓存
            const existing = await this.ctx.db
                .query("seed_statistics_cache")
                .filter((q: any) => q.eq(q.field("seed"), seed))
                .first();

            if (existing) {
                await this.ctx.db.patch(existing._id, stats);
            } else {
                await this.ctx.db.insert("seed_statistics_cache", {
                    ...stats,
                    createdAt: new Date().toISOString()
                });
            }

            return true;

        } catch (error) {
            console.error(`更新种子统计失败: ${seed}`, error);
            return false;
        }
    }
}
