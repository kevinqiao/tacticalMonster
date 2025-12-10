/**
 * 能量服务
 * 负责能量管理（跨游戏通用资源）
 */
export class EnergyService {
    private static readonly DEFAULT_MAX_ENERGY = 130;
    private static readonly REGEN_INTERVAL_MINUTES = 3; // 每3分钟恢复1点

    /**
     * 获取玩家能量（包含自动恢复计算）
     */
    static async getPlayerEnergy(ctx: any, uid: string) {
        let energy = await ctx.db
            .query("player_energy")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!energy) {
            // 创建默认能量记录
            const now = new Date().toISOString();
            await ctx.db.insert("player_energy", {
                uid,
                current: this.DEFAULT_MAX_ENERGY,  // 默认能量上限
                max: this.DEFAULT_MAX_ENERGY,
                lastRegenAt: now,
                updatedAt: now,
            });
            energy = await ctx.db
                .query("player_energy")
                .withIndex("by_uid", (q: any) => q.eq("uid", uid))
                .first();
        }

        // 计算能量恢复
        const lastRegenTime = new Date(energy.lastRegenAt).getTime();
        const now = Date.now();
        const elapsedMinutes = Math.floor((now - lastRegenTime) / (1000 * 60));
        const regenAmount = Math.floor(elapsedMinutes / this.REGEN_INTERVAL_MINUTES);  // 每3分钟恢复1点

        if (regenAmount > 0 && energy.current < energy.max) {
            const newCurrent = Math.min(energy.current + regenAmount, energy.max);
            await ctx.db.patch(energy._id, {
                current: newCurrent,
                lastRegenAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            energy.current = newCurrent;
        }

        return energy;
    }

    /**
     * 消耗能量
     */
    static async consumeEnergy(ctx: any, uid: string, amount: number): Promise<boolean> {
        const energy = await this.getPlayerEnergy(ctx, uid);

        if (energy.current < amount) {
            return false;  // 能量不足
        }

        await ctx.db.patch(energy._id, {
            current: energy.current - amount,
            updatedAt: new Date().toISOString(),
        });

        return true;
    }

    /**
     * 添加能量
     */
    static async addEnergy(
        ctx: any,
        params: {
            uid: string;
            amount: number;
            source: string;
            sourceId?: string;
        }
    ): Promise<{ ok: boolean }> {
        const { uid, amount } = params;

        if (amount <= 0) {
            throw new Error("能量数量必须大于0");
        }

        const energy = await this.getPlayerEnergy(ctx, uid);
        const newCurrent = Math.min(energy.current + amount, energy.max);

        await ctx.db.patch(energy._id, {
            current: newCurrent,
            updatedAt: new Date().toISOString(),
        });

        return { ok: true };
    }

    /**
     * 检查是否有足够能量
     */
    static async canAffordEnergy(ctx: any, uid: string, amount: number): Promise<boolean> {
        const energy = await this.getPlayerEnergy(ctx, uid);
        return energy.current >= amount;
    }
}

