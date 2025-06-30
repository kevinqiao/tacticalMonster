import { internalMutation } from "../../_generated/server";

/**
 * 迁移脚本：将现有的 matches 表数据迁移到新的 matches 和 player_matches 表结构
 * 
 * 迁移策略：
 * 1. 为每个现有的 match 记录创建一个新的 match 记录（基础信息）
 * 2. 为每个现有的 match 记录创建一个 player_match 记录（玩家表现）
 * 3. 保持数据完整性和关联关系
 */
export const migrateMatchesToPlayerMatches = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = new Date().toISOString();
        let migratedCount = 0;
        let errorCount = 0;

        try {
            // 获取所有现有的 matches 记录
            const oldMatches = await ctx.db.query("matches").collect();
            console.log(`开始迁移 ${oldMatches.length} 条 matches 记录`);

            for (const oldMatch of oldMatches) {
                try {
                    // 1. 创建新的 match 记录（基础信息）
                    const newMatchId = await ctx.db.insert("matches", {
                        tournamentId: oldMatch.tournamentId,
                        gameType: oldMatch.gameType,
                        matchType: "single_player", // 默认为单人比赛，可根据需要调整
                        status: oldMatch.completed ? "completed" : "in_progress",
                        maxPlayers: 1, // 默认为1，可根据需要调整
                        minPlayers: 1,
                        startTime: oldMatch.createdAt,
                        endTime: oldMatch.completed ? oldMatch.updatedAt : undefined,
                        gameData: {}, // 空的游戏通用数据
                        createdAt: oldMatch.createdAt,
                        updatedAt: oldMatch.updatedAt,
                    });

                    // 2. 创建 player_match 记录（玩家表现）
                    await ctx.db.insert("player_matches", {
                        matchId: newMatchId,
                        tournamentId: oldMatch.tournamentId,
                        uid: oldMatch.uid,
                        gameType: oldMatch.gameType,
                        score: oldMatch.score,
                        rank: undefined, // 排名将在结算时计算
                        completed: oldMatch.completed,
                        attemptNumber: oldMatch.attemptNumber,
                        propsUsed: oldMatch.propsUsed,
                        playerGameData: oldMatch.gameData, // 将原来的 gameData 移到 playerGameData
                        joinTime: oldMatch.createdAt,
                        leaveTime: oldMatch.completed ? oldMatch.updatedAt : undefined,
                        createdAt: oldMatch.createdAt,
                        updatedAt: oldMatch.updatedAt,
                    });

                    // 3. 创建比赛事件记录
                    await ctx.db.insert("match_events", {
                        matchId: newMatchId,
                        tournamentId: oldMatch.tournamentId,
                        uid: oldMatch.uid,
                        eventType: "score_submit",
                        eventData: {
                            score: oldMatch.score,
                            propsUsed: oldMatch.propsUsed,
                            attemptNumber: oldMatch.attemptNumber,
                        },
                        timestamp: oldMatch.updatedAt,
                        createdAt: now,
                    });

                    if (oldMatch.completed) {
                        await ctx.db.insert("match_events", {
                            matchId: newMatchId,
                            tournamentId: oldMatch.tournamentId,
                            uid: oldMatch.uid,
                            eventType: "match_end",
                            eventData: {
                                finalScore: oldMatch.score,
                                completed: true,
                            },
                            timestamp: oldMatch.updatedAt,
                            createdAt: now,
                        });
                    }

                    migratedCount++;
                    console.log(`成功迁移 match ${oldMatch._id} -> 新 match ${newMatchId}`);

                } catch (error) {
                    errorCount++;
                    console.error(`迁移 match ${oldMatch._id} 失败:`, error);

                    // 记录错误日志
                    await ctx.db.insert("error_logs", {
                        error: `迁移 match 失败: ${error instanceof Error ? error.message : String(error)}`,
                        context: "migrateMatchesToPlayerMatches",
                        uid: oldMatch.uid,
                        createdAt: now,
                    });
                }
            }

            console.log(`迁移完成: 成功 ${migratedCount} 条，失败 ${errorCount} 条`);

            return {
                success: true,
                migratedCount,
                errorCount,
                message: `成功迁移 ${migratedCount} 条记录，失败 ${errorCount} 条`,
            };

        } catch (error) {
            console.error("迁移过程发生错误:", error);

            await ctx.db.insert("error_logs", {
                error: `迁移过程错误: ${error instanceof Error ? error.message : String(error)}`,
                context: "migrateMatchesToPlayerMatches",
                createdAt: now,
            });

            throw error;
        }
    },
});

/**
 * 验证迁移结果
 */
export const validateMigration = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = new Date().toISOString();

        try {
            // 获取原始 matches 记录数量
            const oldMatchesCount = await ctx.db.query("matches").collect().then(matches => matches.length);

            // 获取新的 player_matches 记录数量
            const newPlayerMatchesCount = await ctx.db.query("player_matches").collect().then(matches => matches.length);

            // 获取新的 match_events 记录数量
            const newEventsCount = await ctx.db.query("match_events").collect().then(events => events.length);

            const validationResult = {
                oldMatchesCount,
                newPlayerMatchesCount,
                newEventsCount,
                isConsistent: oldMatchesCount === newPlayerMatchesCount,
                timestamp: now,
            };

            console.log("迁移验证结果:", validationResult);

            // 记录验证结果
            await ctx.db.insert("error_logs", {
                error: `迁移验证: 原始记录 ${oldMatchesCount}，新记录 ${newPlayerMatchesCount}，事件记录 ${newEventsCount}`,
                context: "validateMigration",
                createdAt: now,
            });

            return validationResult;

        } catch (error) {
            console.error("验证迁移结果失败:", error);
            throw error;
        }
    },
});

/**
 * 清理旧的 matches 表数据（谨慎使用）
 * 注意：此操作不可逆，请在确认迁移成功后使用
 */
export const cleanupOldMatches = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = new Date().toISOString();

        try {
            // 获取所有旧的 matches 记录
            const oldMatches = await ctx.db.query("matches").collect();
            let deletedCount = 0;

            console.log(`开始清理 ${oldMatches.length} 条旧的 matches 记录`);

            for (const oldMatch of oldMatches) {
                try {
                    // 删除旧的 match 记录
                    await ctx.db.delete(oldMatch._id);
                    deletedCount++;
                    console.log(`已删除旧 match ${oldMatch._id}`);
                } catch (error) {
                    console.error(`删除旧 match ${oldMatch._id} 失败:`, error);
                }
            }

            console.log(`清理完成: 删除了 ${deletedCount} 条记录`);

            // 记录清理操作
            await ctx.db.insert("error_logs", {
                error: `清理旧 matches 记录: 删除了 ${deletedCount} 条记录`,
                context: "cleanupOldMatches",
                createdAt: now,
            });

            return {
                success: true,
                deletedCount,
                message: `成功清理 ${deletedCount} 条旧记录`,
            };

        } catch (error) {
            console.error("清理过程发生错误:", error);
            throw error;
        }
    },
}); 