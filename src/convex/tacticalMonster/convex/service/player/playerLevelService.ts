/**
 * 玩家等级服务
 * 处理玩家经验值和等级升级（TacticalMonster 游戏特定）
 */

export class PlayerLevelService {
    /**
     * 计算升级所需经验值
     * 公式：每级所需经验 = 基础经验 * (等级 ^ 1.5)
     */
    private static getRequiredExpForLevel(level: number): number {
        const baseExp = 100; // 基础经验值
        return Math.floor(baseExp * Math.pow(level, 1.5));
    }

    /**
     * 根据经验值计算等级
     */
    static calculateLevelFromExp(totalExp: number): number {
        let level = 1;
        let requiredExp = 0;

        while (requiredExp <= totalExp) {
            level++;
            requiredExp += this.getRequiredExpForLevel(level);
            if (level >= 100) break; // 最大等级100
        }

        return Math.min(level - 1, 100);
    }

    /**
     * 获取当前等级到下一级所需经验值
     */
    static getExpToNextLevel(currentLevel: number, currentExp: number): number {
        if (currentLevel >= 100) {
            return 0; // 已满级
        }

        const nextLevel = currentLevel + 1;
        const expForNextLevel = this.getRequiredExpForLevel(nextLevel);
        
        // 计算当前等级已获得的经验值
        let expForCurrentLevel = 0;
        for (let i = 1; i < currentLevel; i++) {
            expForCurrentLevel += this.getRequiredExpForLevel(i);
        }

        const totalExpNeeded = expForCurrentLevel + expForNextLevel;
        return Math.max(0, totalExpNeeded - currentExp);
    }

    /**
     * 添加玩家经验值
     */
    static async addExperience(
        ctx: any,
        params: {
            uid: string;
            exp: number;
            source: string;
            sourceId?: string;
        }
    ): Promise<{
        success: boolean;
        message: string;
        oldLevel?: number;
        newLevel?: number;
        oldExp?: number;
        newExp?: number;
        levelUp?: boolean;
    }> {
        try {
            const { uid, exp, source, sourceId } = params;

            // 获取玩家信息（从 Tournament 模块的 players 表）
            // 架构说明：
            // - 如果 Tournament 和 TacticalMonster 在同一个 Convex 项目中，可以直接访问 players 表
            // - 如果是独立部署，需要通过 HTTP 调用 Tournament 模块的更新端点
            // 当前实现假设两个模块在同一个项目中，共享 players 表
            const player = await ctx.db
                .query("players")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .unique();

            if (!player) {
                return {
                    success: false,
                    message: "玩家不存在",
                };
            }

            const oldLevel = player.level || 1;
            const oldExp = player.exp || 0;
            const newExp = oldExp + exp;
            const newLevel = this.calculateLevelFromExp(newExp);
            const levelUp = newLevel > oldLevel;

            // 更新玩家等级和经验值
            await ctx.db.patch(player._id, {
                level: newLevel,
                exp: newExp,
                updatedAt: new Date().toISOString(),
            });

            return {
                success: true,
                message: levelUp 
                    ? `获得 ${exp} 经验值，等级提升到 ${newLevel} 级！`
                    : `获得 ${exp} 经验值`,
                oldLevel,
                newLevel,
                oldExp,
                newExp,
                levelUp,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `添加经验值失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取玩家等级信息
     */
    static async getPlayerLevelInfo(ctx: any, uid: string): Promise<{
        level: number;
        exp: number;
        expToNextLevel: number;
        requiredExpForNextLevel: number;
    } | null> {
        const player = await ctx.db
            .query("players")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        if (!player) {
            return null;
        }

        const level = player.level || 1;
        const exp = player.exp || 0;
        const expToNextLevel = this.getExpToNextLevel(level, exp);
        const requiredExpForNextLevel = this.getRequiredExpForLevel(level + 1);

        return {
            level,
            exp,
            expToNextLevel,
            requiredExpForNextLevel,
        };
    }
}

