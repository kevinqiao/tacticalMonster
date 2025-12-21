/**
 * 队伍管理服务
 * 管理玩家的上场队伍（最多4个怪物）
 * 
 * 设计说明：
 * - teamPosition: Hex坐标对象 { q: number, r: number }，直接存储队伍位置
 * - 使用 inTeam 字段标识怪物是否在队伍中（0: 不在，1: 在）
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { calculatePower } from "../../data/monsterConfigs";

export class TeamService {
    private static readonly MAX_TEAM_SIZE = 4;

    /**
     * 标准的队伍初始位置（Hex 坐标）
     * 用于战棋游戏中玩家队伍的初始站位
     * 按顺序分配给队伍中的怪物
     */
    private static readonly DEFAULT_TEAM_POSITIONS: Array<{ q: number; r: number }> = [
        { q: 0, r: 0 },  // 位置 0
        { q: 1, r: 0 },  // 位置 1
        { q: 0, r: 1 },  // 位置 2
        { q: 1, r: 1 },  // 位置 3
    ];

    /**
     * 根据索引获取默认 Hex 坐标
     * @param index 位置索引（0-3）
     * @returns Hex 坐标，如果索引无效则返回默认位置 {q: 0, r: 0}
     */
    static getDefaultPosition(index: number): { q: number; r: number } {
        if (index < 0 || index >= this.MAX_TEAM_SIZE) {
            return this.DEFAULT_TEAM_POSITIONS[0] || { q: 0, r: 0 };
        }
        return this.DEFAULT_TEAM_POSITIONS[index] || { q: 0, r: 0 };
    }

    /**
     * 获取玩家的上场队伍
     * 返回按坐标排序的队伍（teamPosition 为 Hex 坐标对象）
     * 使用 inTeam 字段查询队伍中的怪物
     */
    static async getPlayerTeam(ctx: any, uid: string) {
        // 查询所有在队伍中的怪物（inTeam === 1）
        const allMonsters = await ctx.db
            .query("mr_player_monsters")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();

        // 过滤出在队伍中的怪物
        const teamMonsters = allMonsters.filter((m: any) => m.inTeam === 1);

        // 按坐标排序（先按 q，再按 r）并限制最多4个
        const sortedTeam = teamMonsters
            .sort((a: any, b: any) => {
                const posA = a.teamPosition || { q: 999, r: 999 };
                const posB = b.teamPosition || { q: 999, r: 999 };
                if (posA.q !== posB.q) {
                    return posA.q - posB.q;
                }
                return posA.r - posB.r;
            })
            .slice(0, this.MAX_TEAM_SIZE);

        // 关联怪物配置信息（从配置文件读取）
        const { MONSTER_CONFIGS_MAP } = await import("../../data/monsterConfigs");
        const monstersWithConfig = sortedTeam.map((monster: any) => {
            const config = MONSTER_CONFIGS_MAP[monster.monsterId];
            return {
                ...monster,
                config: config || null,
            };
        });

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
            if (monster.inTeam === 1) {
                await ctx.db.patch(monster._id, {
                    teamPosition: undefined,
                    inTeam: 0,
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        // 4. 设置新的队伍位置（使用 Hex 坐标）
        for (let i = 0; i < monsterIds.length; i++) {
            const monsterId = monsterIds[i];
            const monster = monsterMap.get(monsterId);
            if (!monster || !monster._id) {
                throw new Error(`怪物不存在或无效: ${monsterId}`);
            }
            if (i >= this.MAX_TEAM_SIZE) {
                throw new Error(`位置索引超出范围: ${i}，最大为 ${this.MAX_TEAM_SIZE - 1}`);
            }
            const position = this.getDefaultPosition(i);
            await ctx.db.patch(monster._id, {
                teamPosition: position,  // 使用 Hex 坐标对象
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
     * @param positionIndex 可选，指定位置索引（0-3），如果不指定则自动找到空位
     */
    static async addMonsterToTeam(
        ctx: any,
        params: {
            uid: string;
            monsterId: string;
            positionIndex?: number; // 可选，指定位置索引（0-3），如果不指定则自动找到空位
        }
    ) {
        const { uid, monsterId, positionIndex } = params;

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

        // 4. 确定位置坐标
        let targetPosition: { q: number; r: number };
        if (positionIndex !== undefined) {
            // 验证位置索引范围
            if (positionIndex < 0 || positionIndex >= this.MAX_TEAM_SIZE) {
                throw new Error(`位置索引必须在 0-${this.MAX_TEAM_SIZE - 1} 之间`);
            }
            // 检查位置是否已被占用
            const targetPos = this.getDefaultPosition(positionIndex);
            const existingAtPosition = currentTeam.find((m: any) => {
                const pos = m.teamPosition;
                return pos && pos.q === targetPos.q && pos.r === targetPos.r;
            });
            if (existingAtPosition) {
                throw new Error(`位置索引 ${positionIndex} (Hex: ${targetPos.q}, ${targetPos.r}) 已被占用`);
            }
            targetPosition = targetPos;
        } else {
            // 自动找到第一个空位（使用默认位置）
            const usedPositions = new Set(
                currentTeam
                    .map((m: any) => {
                        const pos = m.teamPosition;
                        return pos ? `${pos.q},${pos.r}` : null;
                    })
                    .filter((p: any) => p !== null)
            );
            let foundIndex: number | undefined = undefined;
            for (let i = 0; i < this.MAX_TEAM_SIZE; i++) {
                const pos = this.getDefaultPosition(i);
                const posKey = `${pos.q},${pos.r}`;
                if (!usedPositions.has(posKey)) {
                    foundIndex = i;
                    break;
                }
            }
            if (foundIndex === undefined) {
                throw new Error("无法找到空位");
            }
            targetPosition = this.getDefaultPosition(foundIndex);
        }

        // 5. 更新怪物
        await ctx.db.patch(monster._id, {
            teamPosition: targetPosition,  // 使用 Hex 坐标对象
            inTeam: 1,
            updatedAt: new Date().toISOString(),
        });

        return {
            ok: true,
            positionIndex: positionIndex,
            hexPosition: targetPosition,
            message: `怪物已添加到队伍位置 (Hex: ${targetPosition.q}, ${targetPosition.r})`,
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

        if (monster.inTeam !== 1) {
            throw new Error(`怪物不在队伍中: ${monsterId}`);
        }

        await ctx.db.patch(monster._id, {
            teamPosition: undefined,
            inTeam: 0,
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

        if (!position1 || !position2) {
            throw new Error("无法交换位置：怪物不在队伍中或位置格式无效");
        }

        // 交换位置坐标
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

        // 检查位置坐标是否有效
        const invalidPositions = team.filter((m: any) => {
            const pos = m.teamPosition;
            return !pos || typeof pos.q !== 'number' || typeof pos.r !== 'number';
        });
        if (invalidPositions.length > 0) {
            return {
                valid: false,
                reason: `队伍中存在无效的位置坐标`,
                teamSize: team.length,
            };
        }

        return {
            valid: true,
            teamSize: team.length,
        };
    }

    /**
     * 计算队伍总战力
     * 战力计算公式：每个怪物的 Power = (HP + Attack * 2 + Defense * 1.5) * StarMultiplier
     * 其中：
     * - HP/Attack/Defense 根据等级计算：baseValue * (1 + (level - 1) * growthRate)
     * - HP增长率：15%每级
     * - Attack增长率：10%每级
     * - Defense增长率：12%每级
     * - StarMultiplier：1 + (stars - 1) * 0.1（每星增加10%）
     * 
     * @param ctx Convex context
     * @param uid 玩家UID
     * @returns 队伍总战力
     */
    static async getTeamPower(ctx: any, uid: string): Promise<number> {
        // 1. 获取玩家的上场队伍
        const team = await this.getPlayerTeam(ctx, uid);

        if (team.length === 0) {
            return 0;
        }

        // 2. 计算每个怪物的战力并累加
        let totalPower = 0;

        for (const monster of team) {
            // 检查怪物配置是否存在
            if (!monster.config) {
                // 如果配置不存在，跳过该怪物（或抛出错误）
                continue;
            }

            const config = monster.config;
            const level = monster.level || 1;
            const stars = monster.stars || 1;

            // 计算等级加成的实际属性
            const hpGrowthRate = 0.15;      // 每级增长15%基础HP
            const damageGrowthRate = 0.10;  // 每级增长10%基础伤害
            const defenseGrowthRate = 0.12; // 每级增长12%基础防御

            const actualHp = config.baseHp * (1 + (level - 1) * hpGrowthRate);
            const actualAttack = config.baseDamage * (1 + (level - 1) * damageGrowthRate);
            const actualDefense = config.baseDefense * (1 + (level - 1) * defenseGrowthRate);

            // 星级倍数（每星增加10%）
            const starMultiplier = 1 + (stars - 1) * 0.1;

            // 使用统一的 calculatePower 函数计算战力
            // 公式: (damage * 2 + defense * 1.5 + hp) * multiplier
            const monsterPower = Math.floor(
                calculatePower(actualAttack, actualDefense, actualHp, starMultiplier)
            );
            totalPower += monsterPower;
        }

        return totalPower;
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
        positionIndex: v.optional(v.number()), // 位置索引（0-3）
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

/**
 * 获取队伍总战力
 */
export const getTeamPower = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TeamService.getTeamPower(ctx, args.uid);
    },
});

