/**
 * 段位系统与锦标赛系统集成服务
 * 处理锦标赛结束后的段位更新逻辑
 */

import { SegmentManager } from "./SegmentManager";
import { DatabaseContext } from "./dataAccess";
import { SegmentChangeResult } from "./types";

export class TournamentSegmentIntegration {
    private ctx: DatabaseContext;
    private segmentManager: SegmentManager;

    constructor(ctx: DatabaseContext) {
        this.ctx = ctx;
        this.segmentManager = new SegmentManager(ctx);
    }

    /**
     * 处理锦标赛结束后的段位更新
     * @param tournamentId 锦标赛ID
     * @param results 比赛结果数组
     */
    async handleTournamentCompletion(
        tournamentId: string,
        results: Array<{
            uid: string;
            matchRank: number;
            score: number;
            segmentName?: string;
        }>
    ): Promise<{
        success: boolean;
        processedPlayers: number;
        segmentChanges: SegmentChangeResult[];
        errors: Array<{ uid: string; error: string }>;
    }> {
        const segmentChanges: SegmentChangeResult[] = [];
        const errors: Array<{ uid: string; error: string }> = [];
        let processedPlayers = 0;

        console.log(`开始处理锦标赛 ${tournamentId} 的段位更新，共 ${results.length} 名玩家`);

        for (const result of results) {
            try {
                // 获取玩家当前段位
                const playerSegment = await this.segmentManager.getPlayerSegmentInfo(result.uid);
                if (!playerSegment) {
                    console.warn(`玩家 ${result.uid} 没有段位数据，跳过处理`);
                    continue;
                }

                // 计算积分奖励
                const pointsReward = this.calculatePointsReward(result, playerSegment.currentSegment);

                // 检查段位变化
                const segmentChange = await this.segmentManager.updatePoints(
                    result.uid,
                    pointsReward
                );

                if (segmentChange.changed) {
                    segmentChanges.push(segmentChange);
                    console.log(`玩家 ${result.uid} 段位变化: ${segmentChange.message}`);
                }

                processedPlayers++;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push({ uid: result.uid, error: errorMessage });
                console.error(`处理玩家 ${result.uid} 段位更新失败:`, error);
            }
        }

        console.log(`锦标赛 ${tournamentId} 段位更新完成，处理 ${processedPlayers} 名玩家，${segmentChanges.length} 个段位变化`);

        return {
            success: errors.length === 0,
            processedPlayers,
            segmentChanges,
            errors
        };
    }

    /**
     * 计算积分奖励
     * @param result 比赛结果
     * @param currentSegment 当前段位
     */
    private calculatePointsReward(
        result: { matchRank: number; score: number },
        currentSegment: string
    ): number {
        // 基础积分计算
        let basePoints = 0;

        // 根据排名计算基础积分
        switch (result.matchRank) {
            case 1: basePoints = 100; break;
            case 2: basePoints = 80; break;
            case 3: basePoints = 60; break;
            case 4: basePoints = 40; break;
            default: basePoints = 20; break;
        }

        // 根据段位调整积分倍数
        const segmentMultiplier = this.getSegmentMultiplier(currentSegment);

        // 根据分数调整（可选）
        const scoreBonus = Math.floor(result.score / 100) * 5; // 每100分额外5积分

        const totalPoints = Math.floor((basePoints + scoreBonus) * segmentMultiplier);

        console.log(`玩家积分计算: 基础${basePoints} + 分数奖励${scoreBonus} * 段位倍数${segmentMultiplier} = ${totalPoints}`);

        return totalPoints;
    }

    /**
     * 获取段位积分倍数
     * @param segmentName 段位名称
     */
    private getSegmentMultiplier(segmentName: string): number {
        const multipliers: Record<string, number> = {
            bronze: 1.0,
            silver: 1.2,
            gold: 1.5,
            platinum: 1.8,
            diamond: 2.0,
            master: 2.5,
            grandmaster: 3.0
        };

        return multipliers[segmentName] || 1.0;
    }

    /**
     * 批量处理多个锦标赛的段位更新
     * @param tournaments 锦标赛结果数组
     */
    async batchProcessTournaments(
        tournaments: Array<{
            tournamentId: string;
            results: Array<{
                uid: string;
                matchRank: number;
                score: number;
                segmentName?: string;
            }>;
        }>
    ): Promise<{
        totalProcessed: number;
        totalChanges: number;
        totalErrors: number;
        results: Array<{
            tournamentId: string;
            success: boolean;
            processedPlayers: number;
            segmentChanges: number;
            errors: number;
        }>;
    }> {
        const results = [];
        let totalProcessed = 0;
        let totalChanges = 0;
        let totalErrors = 0;

        for (const tournament of tournaments) {
            const result = await this.handleTournamentCompletion(
                tournament.tournamentId,
                tournament.results
            );

            results.push({
                tournamentId: tournament.tournamentId,
                success: result.success,
                processedPlayers: result.processedPlayers,
                segmentChanges: result.segmentChanges.length,
                errors: result.errors.length
            });

            totalProcessed += result.processedPlayers;
            totalChanges += result.segmentChanges.length;
            totalErrors += result.errors.length;
        }

        return {
            totalProcessed,
            totalChanges,
            totalErrors,
            results
        };
    }

    /**
     * 获取段位统计信息
     */
    async getSegmentStatistics(): Promise<any> {
        return await this.segmentManager.getSegmentStatistics();
    }

    /**
     * 重置所有玩家段位（用于赛季重置）
     * @param targetSegment 目标段位，默认为 bronze
     */
    async resetAllPlayerSegments(targetSegment: string = "bronze"): Promise<{
        success: boolean;
        resetCount: number;
        errors: string[];
    }> {
        try {
            // 获取所有玩家段位数据
            const allPlayers = await this.ctx.db
                .query("player_segments")
                .withIndex("by_season", (q: any) => q.eq("seasonId", "current"))
                .collect();

            let resetCount = 0;
            const errors: string[] = [];

            for (const player of allPlayers) {
                try {
                    // 重置玩家段位
                    await this.ctx.db.patch(player._id, {
                        segmentName: targetSegment,
                        rankPoints: 0,
                        lastUpdated: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });

                    resetCount++;
                } catch (error) {
                    const errorMessage = `重置玩家 ${player.uid} 段位失败: ${error instanceof Error ? error.message : String(error)}`;
                    errors.push(errorMessage);
                    console.error(errorMessage);
                }
            }

            return {
                success: errors.length === 0,
                resetCount,
                errors
            };

        } catch (error) {
            return {
                success: false,
                resetCount: 0,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }
}
