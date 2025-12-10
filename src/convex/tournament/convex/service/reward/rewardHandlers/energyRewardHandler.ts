/**
 * 能量奖励处理器
 */
import { EnergyService } from "../../resource/energyService";

export class EnergyRewardHandler {
    static async grant(ctx: any, params: {
        uid: string;
        energy: number;
        source: string;
        sourceId?: string;
    }): Promise<{ success: boolean; message: string; grantedEnergy?: number }> {
        try {
            if (params.energy <= 0) {
                return {
                    success: false,
                    message: "能量数量必须大于0",
                };
            }

            // 使用 EnergyService 添加能量
            const result = await EnergyService.addEnergy(ctx, {
                uid: params.uid,
                amount: params.energy,
                source: params.source,
                sourceId: params.sourceId,
            });

            if (!result.ok) {
                return {
                    success: false,
                    message: "添加能量失败",
                };
            }

            return {
                success: true,
                message: `成功发放 ${params.energy} 能量`,
                grantedEnergy: params.energy,
            };
        } catch (error: any) {
            return {
                success: false,
                message: `发放能量失败: ${error.message}`,
            };
        }
    }

    /**
     * 获取当前能量
     */
    static async getCurrent(ctx: any, uid: string): Promise<number> {
        try {
            const energy = await EnergyService.getPlayerEnergy(ctx, uid);
            return energy?.current || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 检查是否有足够能量
     */
    static async canAfford(ctx: any, uid: string, amount: number): Promise<boolean> {
        try {
            return await EnergyService.canAffordEnergy(ctx, uid, amount);
        } catch (error) {
            return false;
        }
    }
}

