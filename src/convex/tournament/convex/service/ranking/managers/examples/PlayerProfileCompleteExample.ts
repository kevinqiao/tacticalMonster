/**
 * 玩家画像完整使用流程示例
 * 演示：创建数据 → 生成画像 → 保存到数据库 → 使用画像的完整过程
 */

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { action, internalAction, internalMutation, internalQuery } from "../../../../_generated/server";
import { RankingRecommendationManagerOptimized } from '../RankingRecommendationManagerOptimized';
import * as playerProfileService from '../services/playerPersonalizationProfileService';
const DB = (internal as any)['service']['ranking']['managers']['database']['playerProfileDB'];
const getDbApi = () => ((internal as any)['service']['ranking']['managers']['database']['playerProfileDB']);
const getExampleApi = () => ((internal as any)['service']['ranking']['managers']['examples']['PlayerProfileCompleteExample']);

// 辅助：插入比赛结果（供 Action 使用）
export const insertMatchResult = internalMutation({
    args: {
        matchId: v.string(),
        seed: v.string(),
        uid: v.string(),
        score: v.number(),
        rank: v.number(),
        createdAt: v.string()
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("player_matches", {
            ...args,
            status: 0
        });
    }
});

// 辅助：仅更新画像的 lastUpdated（演示用）
export const patchProfileLastUpdated = internalMutation({
    args: {
        id: v.id("player_profiles"),
        lastUpdated: v.string()
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { lastUpdated: args.lastUpdated });
    }
});

// 辅助：统计画像（供 Action 获取）
export const getProfilesStats = internalQuery({
    args: {},
    handler: async (ctx) => {
        const allProfiles = await ctx.db.query("player_profiles").collect();
        const now = new Date();
        const recentlyUpdated = allProfiles.filter((p: any) => {
            const lu = new Date(p.lastUpdated);
            const hours = (now.getTime() - lu.getTime()) / (1000 * 60 * 60);
            return hours < 24;
        }).length;
        return {
            totalProfiles: allProfiles.length,
            recentlyUpdated,
            updateFrequency: {
                high: allProfiles.filter((p: any) => p.updateCount > 10).length,
                medium: allProfiles.filter((p: any) => p.updateCount > 5 && p.updateCount <= 10).length,
                low: allProfiles.filter((p: any) => p.updateCount <= 5).length
            },
            dataQualityDistribution: {
                high: allProfiles.filter((p: any) => p.dataQuality === 'high').length,
                medium: allProfiles.filter((p: any) => p.dataQuality === 'medium').length,
                low: allProfiles.filter((p: any) => p.dataQuality === 'low').length
            },
            averageConfidence: allProfiles.length > 0 ?
                allProfiles.reduce((sum: number, p: any) => sum + p.confidence, 0) / allProfiles.length : 0
        };
    }
});

/**
 * 完整流程示例：从创建数据到使用画像
 */
export const completePlayerProfileExample = internalMutation({
    args: {
        uid: v.string()
    },
    handler: async (ctx, args): Promise<any> => {
        const { uid } = args;

        console.log(`\n========== 玩家画像完整流程示例：${uid} ==========\n`);

        // ========== 步骤 1: 创建历史游戏数据 ==========
        console.log('步骤 1: 创建历史游戏数据...');

        // 创建比赛结果数据
        const matchResults = [];
        for (let i = 0; i < 20; i++) {
            const matchId = `match_${uid}_${i}`;
            const score = 1500 + Math.random() * 300 - 150; // 1350-1650 分
            const rank = Math.floor(Math.random() * 4) + 1; // 1-4 名

            await ctx.runMutation(
                getExampleApi().insertMatchResult,
                {
                    matchId,
                    seed: `seed_${i}`,
                    uid,
                    score,
                    rank,
                    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
                }
            );

            matchResults.push({ matchId, score, rank });
        }

        console.log(`✅ 创建了 ${matchResults.length} 条比赛记录`);

        // ========== 步骤 2: 记录行为事件 ==========
        console.log('\n步骤 2: 记录玩家行为事件...');

        // 记录登录事件（调用 DB 层）
        await ctx.runMutation(
            getDbApi().recordBehaviorEvent,
            {
                uid,
                eventType: "session_start",
                eventData: {
                    matchId: undefined,
                    score: undefined,
                    rank: undefined,
                    sessionDuration: undefined,
                    retryCount: undefined,
                    quitReason: undefined
                }
            });

        // 记录游戏开始事件
        for (let i = 0; i < 10; i++) {
            await ctx.runMutation(
                getDbApi().recordBehaviorEvent,
                {
                    uid,
                    eventType: "match_start",
                    eventData: {
                        matchId: `match_${uid}_${i}`
                    }
                });
        }

        // 记录游戏结束事件（包含结果）
        for (const match of matchResults.slice(0, 10)) {
            await ctx.runMutation(
                getDbApi().recordBehaviorEvent,
                {
                    uid,
                    eventType: "match_end",
                    eventData: {
                        matchId: match.matchId,
                        score: match.score,
                        rank: match.rank
                    }
                });
        }

        // 记录重试行为（模拟玩家喜欢重试）
        for (let i = 0; i < 5; i++) {
            await ctx.runMutation(
                getDbApi().recordBehaviorEvent,
                {
                    uid,
                    eventType: "retry",
                    eventData: {
                        matchId: `match_${uid}_${i}`,
                        retryCount: i + 1
                    }
                });
        }

        console.log('✅ 记录了多种行为事件（登录、游戏开始、游戏结束、重试）');

        // ========== 步骤 3: 生成并存储玩家画像 ==========
        console.log('\n步骤 3: 生成并存储玩家画像...');

        // 生成并存储画像（调用 DB 层）
        const profileId: any = await ctx.runMutation(
            getDbApi().generateAndStorePlayerPersonalizationProfile,
            { uid }
        );

        console.log(`✅ 画像已生成并保存，Profile ID: ${profileId}`);

        // ========== 步骤 4: 查询并查看画像详情 ==========
        console.log('\n步骤 4: 查询画像详情...');

        const dbProfile: any = await ctx.runQuery(getDbApi().getPlayerPersonalizationProfile, { uid });

        if (dbProfile) {
            console.log('📊 画像详情:');
            console.log(`   - 数据质量: ${dbProfile.dataQuality}`);
            console.log(`   - 置信度: ${dbProfile.confidence.toFixed(2)}`);
            console.log(`   - 更新次数: ${dbProfile.updateCount}`);
            console.log(`\n🎮 游戏偏好:`);
            console.log(`   - 挑战等级: ${dbProfile.preferences.challengeLevel}`);
            console.log(`   - 竞争风格: ${dbProfile.preferences.competitionStyle}`);
            console.log(`   - 专注领域: ${dbProfile.preferences.focusArea}`);
            console.log(`   - 风险承受度: ${dbProfile.preferences.riskTolerance}`);
            console.log(`\n📈 行为模式:`);
            console.log(`   - 游戏频率: ${dbProfile.behavioralPatterns.playFrequency}`);
            console.log(`   - 重试行为: ${dbProfile.behavioralPatterns.retryBehavior}`);
            console.log(`   - 目标导向: ${dbProfile.behavioralPatterns.goalOrientation}`);
            console.log(`   - 学习风格: ${dbProfile.behavioralPatterns.learningStyle}`);
            console.log(`\n📊 表现历史:`);
            console.log(`   - 最佳排名: ${dbProfile.performanceHistory.bestRank}`);
            console.log(`   - 最差排名: ${dbProfile.performanceHistory.worstRank}`);
            console.log(`   - 平均排名: ${dbProfile.performanceHistory.averageRank.toFixed(2)}`);
            console.log(`   - 排名趋势: ${dbProfile.performanceHistory.rankingTrend}`);
            console.log(`   - 一致性: ${dbProfile.performanceHistory.consistency.toFixed(2)}`);
            console.log(`\n🧠 心理画像:`);
            console.log(`   - 动机类型: ${dbProfile.psychologicalProfile.motivationType}`);
            console.log(`   - 反馈偏好: ${dbProfile.psychologicalProfile.feedbackPreference}`);
            console.log(`   - 社交互动: ${dbProfile.psychologicalProfile.socialInteraction}`);
        }

        // ========== 步骤 5: 验证画像质量 ==========
        console.log('\n步骤 5: 验证画像质量...');

        const isValid = playerProfileService.isProfileQualitySufficient(dbProfile, 0.6);
        console.log(`✅ 画像质量验证: ${isValid ? '通过' : '未通过'}`);

        // ========== 步骤 6: 转换画像格式并用于策略 ==========
        console.log('\n步骤 6: 转换画像格式用于个性化策略...');

        const validatedProfile = await playerProfileService.getValidatedPersonalizationProfileInternal(
            ctx,
            uid,
            0.6
        );

        if (validatedProfile) {
            console.log('✅ 画像验证并转换成功，可用于个性化策略');
            console.log(`   - 玩家 ID: ${validatedProfile.uid}`);
            console.log(`   - 挑战偏好: ${validatedProfile.preferences.challengeLevel}`);
            console.log(`   - 竞争风格: ${validatedProfile.preferences.competitionStyle}`);
        } else {
            console.log('⚠️ 画像质量不足，将使用默认策略');
        }

        // ========== 步骤 7: 在实际排名系统中使用画像 ==========
        console.log('\n步骤 7: 在排名系统中使用画像...');

        const rankingManager = new RankingRecommendationManagerOptimized(ctx, {
            personalizedStrategy: {
                enabled: true,
                minMatchesForPersonalization: 15,
                profileUpdateInterval: 24,
                maxAdjustmentRange: 0.3,
                confidenceThreshold: 0.6,
                fallbackToVeteran: true
            }
        });

        // 模拟一些人类玩家
        const humanPlayers = [
            { uid, score: 1600 },  // 当前玩家
            { uid: 'player_2', score: 1400 },
            { uid: 'player_3', score: 1500 }
        ];

        const rankingResult = await rankingManager.generateMatchRankings(
            humanPlayers,
            3 // 3 个 AI 对手
        );

        // 查找当前玩家的排名推荐
        const playerRanking = rankingResult.humanPlayerRankings.find(r => r.uid === uid);

        if (playerRanking) {
            console.log('✅ 排名推荐生成成功:');
            console.log(`   - 推荐排名: ${playerRanking.recommendedRank}`);
            console.log(`   - 置信度: ${playerRanking.confidence.toFixed(2)}`);
            console.log(`   - 相对表现: ${playerRanking.relativePerformance}`);
            console.log(`   - 推荐理由: ${playerRanking.reasoning.substring(0, 100)}...`);
        }

        // ========== 步骤 8: 检查是否需要更新 ==========
        console.log('\n步骤 8: 检查画像是否需要更新...');

        const shouldUpdate: any = await ctx.runQuery(getDbApi().shouldUpdatePersonalizationProfile, { uid });
        console.log(`✅ 是否需要更新: ${shouldUpdate ? '是' : '否'}`);

        if (shouldUpdate) {
            console.log('   画像已过期，可以触发更新');
        }

        // ========== 步骤 9: 获取画像统计信息 ==========
        console.log('\n步骤 9: 获取系统画像统计信息...');

        const stats: any = await ctx.runQuery(getExampleApi().getProfilesStats, {});
        console.log('📊 系统统计:');
        console.log(`   - 总画像数: ${stats.totalProfiles}`);
        console.log(`   - 最近更新: ${stats.recentlyUpdated} 个（24小时内）`);
        console.log(`   - 平均置信度: ${stats.averageConfidence.toFixed(2)}`);
        console.log(`   - 数据质量分布:`);
        console.log(`     * 高质量: ${stats.dataQualityDistribution.high}`);
        console.log(`     * 中等质量: ${stats.dataQualityDistribution.medium}`);
        console.log(`     * 低质量: ${stats.dataQualityDistribution.low}`);

        console.log(`\n========== 完整流程示例完成 ==========\n`);

        return {
            success: true,
            uid,
            profileId,
            profile: dbProfile,
            validatedProfile: validatedProfile !== null,
            rankingRecommended: playerRanking !== undefined,
            shouldUpdate,
            stats
        };
    }
});

/**
 * 场景示例：新玩家首次创建画像
 */
export const newPlayerProfileExample = action({
    args: {
        uid: v.string()
    },
    handler: async (ctx: any, args: { uid: string }) => {
        const { uid } = args;
        console.log('L1', Object.keys((internal as any)));
        console.log('L2', Object.keys((internal as any)['service'] || {}));
        console.log('L3', Object.keys((internal as any)['service']?.['ranking'] || {}));

        console.log(`\n========== 新玩家画像创建示例：${uid} ==========\n`);

        // 1. 检查是否已有画像
        const existingProfile: any = await ctx.runQuery(DB.getPlayerPersonalizationProfile, { uid });
        if (existingProfile) {
            console.log('⚠️ 玩家已有画像，跳过创建');
            return { success: false, reason: 'Profile already exists' };
        }

        // 2. 为新玩家创建一些初始数据（只有几场比赛）
        console.log('步骤 1: 为新玩家创建初始游戏数据...');

        for (let i = 0; i < 5; i++) {
            await ctx.runMutation(
                getExampleApi().insertMatchResult,
                {
                    matchId: `new_match_${uid}_${i}`,
                    seed: `seed_${i}`,
                    uid,
                    score: 1200 + Math.random() * 400,
                    rank: Math.floor(Math.random() * 4) + 1,
                    createdAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000).toISOString()
                }
            );
        }

        // 3. 记录少量行为事件
        await ctx.runMutation(
            DB.recordBehaviorEvent,
            {
                uid,
                eventType: "session_start",
                eventData: {}
            });

        // 4. 生成初始画像（即使数据较少也会创建）
        console.log('步骤 2: 生成初始画像...');
        const profileId: any = await ctx.runMutation(DB.generateAndStorePlayerPersonalizationProfile, { uid });

        // 5. 查看初始画像（数据质量应该较低）
        const profile: any = await ctx.runQuery(DB.getPlayerPersonalizationProfile, { uid });
        console.log(`✅ 初始画像已创建`);
        console.log(`   - 数据质量: ${profile?.dataQuality}（预期: low）`);
        console.log(`   - 置信度: ${profile?.confidence.toFixed(2)}（预期: < 0.5）`);

        return {
            success: true,
            uid,
            profileId,
            dataQuality: profile?.dataQuality,
            confidence: profile?.confidence
        };
    }
});

/**
 * 场景示例：更新过期画像
 */
export const updateExpiredProfileExample = internalAction({
    args: {
        uid: v.string()
    },
    handler: async (ctx, args) => {
        const { uid } = args;

        console.log(`\n========== 更新过期画像示例：${uid} ==========\n`);

        // 1. 检查是否需要更新
        const existing: any = await ctx.runQuery(getDbApi().getPlayerPersonalizationProfile, { uid });

        const shouldUpdate = existing ? (() => {
            const now = new Date();
            const lastUpdated = new Date(existing.lastUpdated);
            const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
            const updateInterval = {
                high: 24,
                medium: 12,
                low: 6
            };
            const interval = updateInterval[existing.dataQuality as keyof typeof updateInterval];
            return hoursSinceUpdate >= interval;
        })() : true;

        console.log(`当前状态: ${shouldUpdate ? '需要更新' : '不需要更新'}`);

        if (!shouldUpdate && existing) {
            // 手动创建一个过期画像用于演示
            console.log('创建过期画像用于演示...');
            await ctx.runMutation(
                getExampleApi().patchProfileLastUpdated,
                {
                    id: existing._id,
                    lastUpdated: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
                }
            );
        }

        // 2. 添加新的游戏数据（模拟玩家继续游戏）
        console.log('添加新的游戏数据...');
        for (let i = 0; i < 3; i++) {
            await ctx.runMutation(
                getExampleApi().insertMatchResult,
                {
                    matchId: `new_match_${uid}_${Date.now()}_${i}`,
                    seed: `seed_${i}`,
                    uid,
                    score: 1500 + Math.random() * 200,
                    rank: Math.floor(Math.random() * 4) + 1,
                    createdAt: new Date().toISOString()
                }
            );
        }

        // 3. 更新画像
        console.log('更新过期画像...');
        await ctx.runMutation(getDbApi().generateAndStorePlayerPersonalizationProfile, { uid });

        // 4. 查看更新后的画像
        const updatedProfile: any = await ctx.runQuery(getDbApi().getPlayerPersonalizationProfile, { uid });

        const updateResult = {
            updated: updatedProfile ? 1 : 0,
            processed: updatedProfile ? [uid] : []
        };

        console.log(`✅ 更新完成`);
        console.log(`   - 更新数量: ${updateResult.updated}`);
        console.log(`   - 更新的玩家: ${updateResult.processed.join(', ')}`);

        console.log(`更新后的画像:`);
        console.log(`   - 更新次数: ${updatedProfile?.updateCount}`);
        console.log(`   - 最后更新: ${updatedProfile?.lastUpdated}`);

        return {
            success: true,
            updated: updateResult.updated,
            updateCount: updatedProfile?.updateCount
        };
    }
});

/**
 * 场景示例：批量更新多个玩家画像
 */
export const batchUpdateProfilesExample = internalAction({
    args: {
        uids: v.array(v.string()),
        maxUpdates: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const { uids, maxUpdates = 10 } = args;

        console.log(`\n========== 批量更新画像示例 ==========\n`);
        console.log(`目标玩家数: ${uids.length}`);
        console.log(`最大更新数: ${maxUpdates}\n`);

        const results = [];

        for (const uid of uids) {
            try {
                // 1. 检查是否需要更新
                const existing: any = await ctx.runQuery(getDbApi().getPlayerPersonalizationProfile, { uid });

                const shouldUpdate = existing ? (() => {
                    const now = new Date();
                    const lastUpdated = new Date(existing.lastUpdated);
                    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
                    const updateInterval = {
                        high: 24,
                        medium: 12,
                        low: 6
                    };
                    const interval = updateInterval[existing.dataQuality as keyof typeof updateInterval];
                    return hoursSinceUpdate >= interval;
                })() : true;

                if (shouldUpdate) {
                    // 2. 更新画像
                    const profileId: any = await ctx.runMutation(getDbApi().generateAndStorePlayerPersonalizationProfile, { uid });

                    results.push({
                        uid,
                        success: true,
                        profileId,
                        action: 'updated'
                    });

                    console.log(`✅ ${uid}: 画像已更新`);
                } else {
                    results.push({
                        uid,
                        success: true,
                        action: 'skipped',
                        reason: 'Not expired'
                    });
                    console.log(`⏭️  ${uid}: 跳过（未过期）`);
                }

                // 限制批量更新数量
                if (results.filter(r => r.action === 'updated').length >= maxUpdates) {
                    console.log(`\n达到最大更新数量限制 (${maxUpdates})，停止批量更新`);
                    break;
                }
            } catch (error) {
                results.push({
                    uid,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
                console.error(`❌ ${uid}: 更新失败`, error);
            }
        }

        const summary = {
            total: uids.length,
            updated: results.filter(r => r.action === 'updated').length,
            skipped: results.filter(r => r.action === 'skipped').length,
            failed: results.filter(r => !r.success).length
        };

        console.log(`\n========== 批量更新完成 ==========`);
        console.log(`总计: ${summary.total}`);
        console.log(`更新: ${summary.updated}`);
        console.log(`跳过: ${summary.skipped}`);
        console.log(`失败: ${summary.failed}`);

        return {
            success: true,
            summary,
            results
        };
    }
});

/**
 * 使用示例汇总
 */
export const runAllExamples = internalAction({
    args: {},
    handler: async (ctx) => {
        const testUid = 'example_player_' + Date.now();

        console.log('\n\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('          玩家画像完整流程示例汇总');
        console.log('═══════════════════════════════════════════════════════');

        const results: any = {};

        try {
            // 示例 1: 完整流程
            console.log('\n\n【示例 1】完整流程');
            // 由于 runAllExamples 本身也是 internalMutation，我们需要通过 ctx.runMutation 调用
            // 但为了简化，这里直接创建一个测试用的 uid，跳过实际调用
            // 实际使用时，应该通过 Convex Dashboard 分别调用各个示例函数
            results.complete = { note: 'Call completePlayerProfileExample separately' };

            // 示例 2: 新玩家
            const newPlayerUid = 'new_player_' + Date.now();
            console.log('\n\n【示例 2】新玩家创建');
            results.newPlayer = { note: 'Call newPlayerProfileExample separately', uid: newPlayerUid };

            // 示例 3: 更新过期画像
            console.log('\n\n【示例 3】更新过期画像');
            results.updateExpired = { note: 'Call updateExpiredProfileExample separately', uid: testUid };

            console.log('\n\n═══════════════════════════════════════════════════════');
            console.log('          所有示例执行完成');
            console.log('═══════════════════════════════════════════════════════\n\n');

            return {
                success: true,
                results
            };
        } catch (error) {
            console.error('示例执行失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                results
            };
        }
    }
});
