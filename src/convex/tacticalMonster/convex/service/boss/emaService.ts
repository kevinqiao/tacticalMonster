/**
 * EMA (Exponential Moving Average) 服务
 * 用于平滑平均Tier Power，支持Boss自适应缩放
 * 
 * 设计说明：
 * - 每个Tier每天维护一个EMA值
 * - 使用指数移动平均算法平滑Power波动
 * - 用于计算房间平均Tier Power（0.8×房间均值 + 0.2×EMA）
 */

/**
 * EMA配置
 */
export interface EMAConfig {
    alpha: number;  // 平滑系数（默认0.15）
}

/**
 * EMA记录
 */
export interface EMARecord {
    tier: string;
    date: string;  // YYYY-MM-DD格式
    emaPower: number;
    updatedAt: string;
}

/**
 * EMA服务
 */
export class EMAService {
    private static readonly DEFAULT_ALPHA = 0.15;

    /**
     * 获取指定日期和Tier的EMA值
     * 
     * @param ctx Convex上下文
     * @param tier Tier名称
     * @param date 日期字符串（YYYY-MM-DD）
     * @returns EMA值，如果不存在则返回undefined
     */
    static async getEMAForDate(
        ctx: any,
        tier: string,
        date: string
    ): Promise<number | undefined> {
        // TODO: 实现EMA表查询
        // 如果表存在，查询：mr_tier_ema 表，通过 by_tier_date 索引查询
        // 如果不存在，返回undefined，系统将使用房间均值
        
        // 临时实现：返回undefined，让系统使用房间均值
        // 后续可以实现EMA表的存储和查询
        return undefined;
    }

    /**
     * 计算新的EMA值
     * 
     * @param currentEMA 当前EMA值（如果没有，使用初始值）
     * @param newValue 新的房间均值
     * @param alpha 平滑系数（默认0.15）
     * @returns 新的EMA值
     */
    static calculateEMA(
        currentEMA: number | undefined,
        newValue: number,
        alpha: number = this.DEFAULT_ALPHA
    ): number {
        if (currentEMA === undefined) {
            // 第一次计算，使用新值作为初始EMA
            return newValue;
        }

        // EMA公式：newEMA = alpha × newValue + (1 - alpha) × currentEMA
        return alpha * newValue + (1 - alpha) * currentEMA;
    }

    /**
     * 更新或创建EMA记录
     * 
     * @param ctx Convex上下文
     * @param tier Tier名称
     * @param date 日期字符串（YYYY-MM-DD）
     * @param newRoomMean 新的房间均值
     * @param alpha 平滑系数（默认0.15）
     * @returns 更新后的EMA值
     */
    static async updateEMAForDate(
        ctx: any,
        tier: string,
        date: string,
        newRoomMean: number,
        alpha: number = this.DEFAULT_ALPHA
    ): Promise<number> {
        // 1. 获取前一天的EMA值（用于计算）
        const prevDate = this.getPreviousDate(date);
        const prevEMA = await this.getEMAForDate(ctx, tier, prevDate);

        // 2. 计算新的EMA
        const newEMA = this.calculateEMA(prevEMA, newRoomMean, alpha);

        // TODO: 实现EMA表存储
        // 如果表存在，更新或插入：mr_tier_ema 表
        // await ctx.db.insert("mr_tier_ema", {
        //     tier,
        //     date,
        //     emaPower: newEMA,
        //     updatedAt: new Date().toISOString(),
        // });

        return newEMA;
    }

    /**
     * 获取前一天的日期字符串
     * 
     * @param date 当前日期字符串（YYYY-MM-DD）
     * @returns 前一天的日期字符串
     */
    private static getPreviousDate(date: string): string {
        const d = new Date(date + "T00:00:00Z");
        d.setDate(d.getDate() - 1);
        return d.toISOString().split("T")[0];
    }

    /**
     * 获取今天的日期字符串
     * 
     * @returns 今天的日期字符串（YYYY-MM-DD）
     */
    static getTodayDateString(): string {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, "0");
        const day = String(now.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
}

