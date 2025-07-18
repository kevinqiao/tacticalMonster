import { findTypeById } from "../../../dao/tournamentDao";
import { getTorontoDate } from "../../utils";
import {
    TournamentHandler,
} from "../common";
import { TournamentMatchingService } from "../tournamentMatchingService";
import { multiPlayerHandler } from "./multiPlayerHandler";

/**
 * 多人共享比赛锦标赛处理器
 * 特点：
 * 1. 多个玩家共享同一个比赛实例
 * 2. 支持独立锦标赛（一个比赛实例对应一个锦标赛）和共享锦标赛（多个比赛实例对应一个锦标赛）
 * 3. 实时对战和互动
 * 4. 基于对战结果进行排名
 * 5. 支持智能匹配和队列管理，
 * 5. 立即奖励结算
 */
export const multiPlayerSharedMatchHandler: TournamentHandler = {
    ...multiPlayerHandler,



    /**
     * 加入锦标赛
     */
    join: async (ctx: any, params: {
        uid: string;
        gameType: string;
        typeId: string;
    }) => {
        const { uid, gameType, typeId } = params;
        const now = getTorontoDate();
        // 获取玩家信息
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!player) {
            throw new Error("玩家不存在");
        }
        // 获取锦标赛类型配置
        const tournamentType = await ctx.runQuery(findTypeById, { typeId });
        if (!tournamentType) {
            throw new Error("锦标赛类型不存在");
        }
        // 验证加入资格
        await multiPlayerSharedMatchHandler.validateJoin(ctx, {
            uid,
            gameType,
            tournamentType
        });

        // 获取玩家库存并处理入场费
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        // 扣除入场费
        await multiPlayerSharedMatchHandler.deductJoinCost(ctx, { uid, tournamentType, inventory, now });

        // 检查是否为单一比赛模式
        const isSingleMatch = tournamentType.singleMatch || false;

        let tournament: any;
        let matchResult: any;
        const config = {
            entryRequirements: tournamentType.entryRequirements,
            matchRules: tournamentType.matchRules,
            rewards: tournamentType.rewards,
            schedule: tournamentType.schedule,
            limits: tournamentType.limits,
            advanced: tournamentType.advanced
        }
        if (isSingleMatch) {
            // 单一比赛模式：直接基于tournamentType进行匹配，不创建锦标赛
            console.log(`单一比赛模式：基于tournamentType ${typeId} 进行匹配`);

            matchResult = await TournamentMatchingService.joinMatchingQueue(ctx, {
                uid,
                tournamentId: undefined, // 单一比赛模式下不需要tournamentId
                gameType,
                tournamentType: typeId,
                player,
                config,
                mode: "independent" // 使用独立模式
            });

            // 单一比赛模式下，tournamentId将在匹配成功后由后台任务创建
            tournament = {
                _id: "pending", // 临时ID，将在匹配成功后更新
                tournamentType: typeId
            };
        } else {
            // 传统模式：先创建锦标赛，再进行匹配
            console.log(`传统模式：创建锦标赛后进行匹配`);

            // 查找或创建锦标赛
            tournament = await multiPlayerSharedMatchHandler.findAndJoinTournament!(ctx, {
                uid,
                gameType,
                tournamentType
            });

            // 使用匹配服务加入队列
            matchResult = await TournamentMatchingService.joinMatchingQueue(ctx, {
                uid,
                tournamentId: tournament._id,
                gameType,
                tournamentType: typeId,
                player,
                config,
                mode: "traditional"
            });
        }



        return {
            tournamentId: tournament._id,
            queueId: matchResult.queueId,
            status: matchResult.status,
            message: matchResult.message,
            waitTime: matchResult.waitTime,
            estimatedWaitTime: matchResult.estimatedWaitTime,
            isSingleMatch: isSingleMatch,
            success: true
        };
    },
}