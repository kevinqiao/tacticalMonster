/**
 * 体力服务（关卡体力与奖励机制设计）
 * 体力消耗、恢复、上限
 */

import { getStageRuleConfig } from "../../data/stageRuleConfigs";

const DEFAULT_MAX_STAMINA = 100;
const DEFAULT_RECOVER_MINUTES = 5;  // 每 5 分钟恢复 1 点
const DEFAULT_RECOVER_PERIOD_MS = DEFAULT_RECOVER_MINUTES * 60 * 1000;

export class StaminaService {
    /**
     * 获取玩家当前体力（含自然恢复）
     */
    static async getCurrentStamina(ctx: any, uid: string): Promise<{
        current: number;
        maxStamina: number;
        nextRecoverAt?: string;
    }> {
        const doc = await ctx.db
            .query("mr_player_stamina")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        const maxStamina = doc?.maxStamina ?? DEFAULT_MAX_STAMINA;
        const lastRecoveredAt = doc?.lastRecoveredAt
            ? new Date(doc.lastRecoveredAt).getTime()
            : Date.now();
        let current = doc?.current ?? maxStamina;

        // 计算自然恢复
        const now = Date.now();
        const elapsed = now - lastRecoveredAt;
        const recoverCount = Math.floor(elapsed / DEFAULT_RECOVER_PERIOD_MS);
        if (recoverCount > 0) {
            current = Math.min(maxStamina, current + recoverCount);
            const newLastRecovered = new Date(lastRecoveredAt + recoverCount * DEFAULT_RECOVER_PERIOD_MS).toISOString();
            if (doc) {
                await ctx.db.patch(doc._id, {
                    current,
                    lastRecoveredAt: newLastRecovered,
                });
            } else {
                await ctx.db.insert("mr_player_stamina", {
                    uid,
                    current,
                    lastRecoveredAt: newLastRecovered,
                    maxStamina,
                });
            }
        }

        const nextRecoverMs = DEFAULT_RECOVER_PERIOD_MS - (elapsed % DEFAULT_RECOVER_PERIOD_MS);
        const nextRecoverAt = current < maxStamina
            ? new Date(now + nextRecoverMs).toISOString()
            : undefined;

        return {
            current: Math.min(current, maxStamina),
            maxStamina,
            nextRecoverAt,
        };
    }

    /**
     * 消耗体力（挑战开始时调用）
     * @returns 是否消耗成功
     */
    static async consumeStamina(
        ctx: any,
        uid: string,
        ruleId: string
    ): Promise<{ ok: boolean; current: number; error?: string }> {
        const config = getStageRuleConfig(ruleId);
        const cost = config?.staminaCost ?? 0;
        if (cost <= 0) {
            return { ok: true, current: (await this.getCurrentStamina(ctx, uid)).current };
        }

        const { current, maxStamina } = await this.getCurrentStamina(ctx, uid);
        if (current < cost) {
            return {
                ok: false,
                current,
                error: `体力不足：需要 ${cost}，当前 ${current}`,
            };
        }

        const doc = await ctx.db
            .query("mr_player_stamina")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .unique();

        const newCurrent = current - cost;
        const now = new Date().toISOString();
        if (doc) {
            await ctx.db.patch(doc._id, {
                current: newCurrent,
                lastRecoveredAt: now,
            });
        } else {
            await ctx.db.insert("mr_player_stamina", {
                uid,
                current: newCurrent,
                lastRecoveredAt: now,
                maxStamina: maxStamina ?? DEFAULT_MAX_STAMINA,
            });
        }

        return { ok: true, current: newCurrent };
    }

    /**
     * 检查是否有足够体力挑战
     */
    static async hasEnoughStamina(ctx: any, uid: string, ruleId: string): Promise<boolean> {
        const config = getStageRuleConfig(ruleId);
        const cost = config?.staminaCost ?? 0;
        if (cost <= 0) return true;
        const { current } = await this.getCurrentStamina(ctx, uid);
        return current >= cost;
    }
}
