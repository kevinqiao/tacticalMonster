/**
 * 基于种子的确定性随机数生成器
 * 确保相同种子产生相同的随机数序列，用于保证所有玩家看到相同的随机结果
 */

export class SeededRandom {
    private seed: number;

    constructor(seed: string | number) {
        if (typeof seed === "string") {
            // 将字符串种子转换为数字
            this.seed = this.hashSeed(seed);
        } else {
            this.seed = seed;
        }
    }

    /**
     * 将字符串种子转换为数字
     */
    private hashSeed(seed: string): number {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * 生成 [0, 1) 区间的随机数
     */
    random(): number {
        // 使用线性同余生成器 (LCG)
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    /**
     * 生成 [min, max) 区间的随机整数
     */
    randomInt(min: number, max: number): number {
        return Math.floor(this.random() * (max - min)) + min;
    }

    /**
     * 生成 [min, max) 区间的随机浮点数
     */
    randomFloat(min: number, max: number): number {
        return this.random() * (max - min) + min;
    }

    /**
     * 从数组中随机选择一个元素
     */
    choice<T>(array: T[]): T {
        if (array.length === 0) {
            throw new Error("Cannot choose from empty array");
        }
        const index = this.randomInt(0, array.length);
        return array[index];
    }

    /**
     * 随机打乱数组（Fisher-Yates shuffle）
     */
    shuffle<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i + 1);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * 根据概率返回 true/false
     * @param probability 概率值 (0-1)
     */
    chance(probability: number): boolean {
        return this.random() < probability;
    }
}

/**
 * 创建确定性随机数生成器的辅助函数
 */
export function createSeededRandom(seed?: string | number): SeededRandom {
    if (seed === undefined) {
        seed = Date.now().toString() + Math.random().toString();
    }
    return new SeededRandom(seed);
}
