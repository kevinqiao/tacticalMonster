/**
 * 队伍管理服务
 * 管理玩家的上场队伍（最多4个怪物）
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

export class TeamService {
    private static readonly MAX_TEAM_SIZE = 4;

    /**
     * 标准的队伍初始位置（Hex 坐标）
     * 用于战棋游戏中玩家队伍的初始站位
     */
    private static readonly DEFAULT_TEAM_POSITIONS: Array<{ q: number; r: number }> = [
        { q: 0, r: 0 },  // 位置 0
        { q: 1, r: 0 },  // 位置 1
        { q: 0, r: 1 },  // 位置 2
        { q: 1, r: 1 },  // 位置 3
    ];

    /**
     * 获取玩家的上场队伍
     * 返回按位置排序的队伍（teamPosition 为 Hex 坐标 {q, r}）
     * 使用 inTeam 字段判断是否在队伍中
     */
    static async getPlayerTeam(ctx: any, uid: string) {
        // 查询所有在队伍中的怪物（inTeam === 1）
        const teamMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .filter((q: any) => q.eq(q.field("inTeam"), 1))
            .collect();

        // 按位置排序（先按 q 再按 r）
        const sortedTeam = teamMonsters
            .sort((a: any, b: any) => {
                const posA = a.teamPosition || { q: 0, r: 0 };
                const posB = b.teamPosition || { q: 0, r: 0 };
                if (posA.q !== posB.q) {
                    return posA.q - posB.q;
                }
                return posA.r - posB.r;
            })
            .slice(0, this.MAX_TEAM_SIZE);

        // 关联怪物配置信息
        const monstersWithConfig = await Promise.all(
            sortedTeam.map(async (monster: any) => {
                const config = await ctx.db
                    .query("mr_monster_configs")
                    .withIndex("by_monsterId", (q: any) => q.eq("monsterId", monster.monsterId))
                    .first();
                return {
                    ...monster,
                    config: config || null,
                };
            })
        );

        return monstersWithConfig;
    }

    /**
     * 设置上场队伍
     * @param monsterIds 怪物ID数组，最多4个，按位置顺序排列
     */
    static async setPlayerTeam(
        ctx: any,
        params: {
            uid: string;
            monsterIds: string[]; // 最多4个怪物ID
        }
    ) {
        const { uid, monsterIds } = params;

        // 1. 验证队伍数量
        if (monsterIds.length > this.MAX_TEAM_SIZE) {
            throw new Error(`队伍最多只能有 ${this.MAX_TEAM_SIZE} 个怪物`);
        }

        // 2. 验证怪物是否属于玩家
        const allMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();
        console.log("allMonsters:", allMonsters);

        const monsterMap = new Map<string, any>(allMonsters.map((m: any) => [m.monsterId, m]));

        for (const monsterId of monsterIds) {
            if (!monsterMap.has(monsterId)) {
                throw new Error(`玩家不拥有怪物: ${monsterId}`);
            }
        }

        // 3. 清除所有怪物的队伍位置
        for (const monster of allMonsters) {
            if (monster.teamPosition !== null && monster.teamPosition !== undefined) {
                await ctx.db.patch(monster._id, {
                    teamPosition: undefined,
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        // 4. 设置新的队伍位置（使用标准的 Hex 坐标）
        for (let i = 0; i < monsterIds.length; i++) {
            const monsterId = monsterIds[i];
            const monster = monsterMap.get(monsterId);
            if (!monster || !monster._id) {
                throw new Error(`怪物不存在或无效: ${monsterId}`);
            }
            const position = this.DEFAULT_TEAM_POSITIONS[i];
            if (!position) {
                throw new Error(`位置索引超出范围: ${i}`);
            }
            await ctx.db.patch(monster._id, {
                teamPosition: position,
                inTeam: 1,
                updatedAt: new Date().toISOString(),
            });
        }

        return {
            ok: true,
            teamSize: monsterIds.length,
            message: `队伍设置成功，共 ${monsterIds.length} 个怪物`,
        };
    }

    /**
     * 添加怪物到队伍
     * 如果队伍已满，返回错误
     */
    static async addMonsterToTeam(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
            position?: { q: number; r: number }; // 可选，指定 Hex 坐标位置，如果不指定则自动找到空位
        }
    ) {
        const { uid, monsterId, position } = params;

        // 1. 获取当前队伍
        const currentTeam = await this.getPlayerTeam(ctx, uid);

        // 2. 检查队伍是否已满
        if (currentTeam.length >= this.MAX_TEAM_SIZE) {
            throw new Error(`队伍已满，最多只能有 ${this.MAX_TEAM_SIZE} 个怪物`);
        }

        // 3. 验证怪物是否属于玩家
        const monster = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid_monsterId", (q: any) => q.eq("uid", uid).eq("monsterId", monsterId))
            .first();

        if (!monster) {
            throw new Error(`玩家不拥有怪物: ${monsterId}`);
        }

        // 4. 确定位置
        let targetPosition: { q: number; r: number };
        if (position !== undefined) {
            // 检查位置是否已被占用
            const existingAtPosition = currentTeam.find((m: any) =>
                m.teamPosition &&
                m.teamPosition.q === position.q &&
                m.teamPosition.r === position.r
            );
            if (existingAtPosition) {
                throw new Error(`位置 (${position.q}, ${position.r}) 已被占用`);
            }
            targetPosition = position;
        } else {
            // 自动找到第一个空位（使用标准位置）
            const usedPositions = new Set(
                currentTeam.map((m: any) =>
                    m.teamPosition ? `${m.teamPosition.q},${m.teamPosition.r}` : null
                ).filter(Boolean)
            );
            let foundPosition: { q: number; r: number } | undefined = undefined;
            for (const defaultPos of this.DEFAULT_TEAM_POSITIONS) {
                const posKey = `${defaultPos.q},${defaultPos.r}`;
                if (!usedPositions.has(posKey)) {
                    foundPosition = defaultPos;
                    break;
                }
            }
            if (foundPosition === undefined) {
                throw new Error("无法找到空位");
            }
            targetPosition = foundPosition;
        }

        // 5. 更新怪物
        await ctx.db.patch(monster._id, {
            teamPosition: targetPosition,
            inTeam: 1,
            updatedAt: new Date().toISOString(),
        });

        return {
            ok: true,
            position: targetPosition,
            message: `怪物已添加到队伍位置 (${targetPosition.q}, ${targetPosition.r})`,
        };
    }

    /**
     * 从队伍中移除怪物
     */
    static async removeMonsterFromTeam(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
        }
    ) {
        const { uid, monsterId } = params;

        const monster = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid_monsterId", (q: any) => q.eq("uid", uid).eq("monsterId", monsterId))
            .first();

        if (!monster) {
            throw new Error(`玩家不拥有怪物: ${monsterId}`);
        }

        if (monster.teamPosition === null || monster.teamPosition === undefined) {
            throw new Error(`怪物不在队伍中: ${monsterId}`);
        }

        await ctx.db.patch(monster._id, {
            teamPosition: undefined,
            updatedAt: new Date().toISOString(),
        });

        return {
            ok: true,
            message: `怪物已从队伍中移除`,
        };
    }

    /**
     * 交换队伍位置
     */
    static async swapTeamPositions(
        ctx: any,
        params: {
            uid: string;
            monsterId1: string;
            monsterId2: string;
        }
    ) {
        const { uid, monsterId1, monsterId2 } = params;

        const allMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        const monster1 = allMonsters.find((m: any) => m.monsterId === monsterId1);
        const monster2 = allMonsters.find((m: any) => m.monsterId === monsterId2);

        if (!monster1 || !monster2) {
            throw new Error("怪物不存在或不属于玩家");
        }

        const position1 = monster1.teamPosition;
        const position2 = monster2.teamPosition;

        // 交换位置
        await ctx.db.patch(monster1._id, {
            teamPosition: position2,
            updatedAt: new Date().toISOString(),
        });

        await ctx.db.patch(monster2._id, {
            teamPosition: position1,
            updatedAt: new Date().toISOString(),
        });

        return {
            ok: true,
            message: `位置已交换`,
        };
    }

    /**
     * 验证队伍是否有效
     * 用于匹配前验证
     */
    static async validateTeam(ctx: any, uid: string): Promise<{
        valid: boolean;
        reason?: string;
        teamSize?: number;
    }> {
        const team = await this.getPlayerTeam(ctx, uid);

        if (team.length === 0) {
            return {
                valid: false,
                reason: "队伍为空，请至少添加1个怪物到队伍",
                teamSize: 0,
            };
        }

        if (team.length > this.MAX_TEAM_SIZE) {
            return {
                valid: false,
                reason: `队伍怪物数量超过限制（${this.MAX_TEAM_SIZE}个）`,
                teamSize: team.length,
            };
        }

        // 检查位置是否有效（可选，根据需求决定）
        // 注意：对于 Hex 坐标，不需要检查连续性，只需要确保位置有效即可

        return {
            valid: true,
            teamSize: team.length,
        };
    }
}

// ============================================
// Convex API 接口
// ============================================

/**
 * 获取玩家的上场队伍
 */
export const getPlayerTeam = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TeamService.getPlayerTeam(ctx, args.uid);
    },
});

/**
 * 设置上场队伍
 */
export const setPlayerTeam = mutation({
    args: {
        uid: v.string(),
        monsterIds: v.array(v.string()), // 最多4个
    },
    handler: async (ctx, args) => {
        return await TeamService.setPlayerTeam(ctx, args);
    },
});

/**
 * 添加怪物到队伍
 */
export const addMonsterToTeam = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
        position: v.optional(v.object({
            q: v.number(),
            r: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        return await TeamService.addMonsterToTeam(ctx, args);
    },
});

/**
 * 从队伍中移除怪物
 */
export const removeMonsterFromTeam = mutation({
    args: {
        uid: v.string(),
        monsterId: v.string(),
    },
    handler: async (ctx, args) => {
        return await TeamService.removeMonsterFromTeam(ctx, args);
    },
});

/**
 * 交换队伍位置
 */
export const swapTeamPositions = mutation({
    args: {
        uid: v.string(),
        monsterId1: v.string(),
        monsterId2: v.string(),
    },
    handler: async (ctx, args) => {
        return await TeamService.swapTeamPositions(ctx, args);
    },
});

/**
 * 验证队伍是否有效
 */
export const validateTeam = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TeamService.validateTeam(ctx, args.uid);
    },
});

