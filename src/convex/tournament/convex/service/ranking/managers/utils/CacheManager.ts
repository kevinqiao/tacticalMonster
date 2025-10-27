/**
 * 缓存管理器
 */

import { CacheItem } from '../types/CommonTypes';
import { RankingConfig } from '../types/RankingConfig';

export class CacheManager {
    private cache = new Map<string, CacheItem<any>>();
    private config: RankingConfig;

    constructor(config: RankingConfig) {
        this.config = config;
    }

    /**
     * 获取缓存数据
     */
    get<T>(key: string): T | null {
        if (!this.config.cacheEnabled) return null;

        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.config.cacheExpiration) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    /**
     * 设置缓存数据
     */
    set<T>(key: string, data: T): void {
        if (!this.config.cacheEnabled) return;

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * 删除指定缓存
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * 清空所有缓存
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * 获取缓存大小
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * 检查缓存是否存在且有效
     */
    has(key: string): boolean {
        if (!this.config.cacheEnabled) return false;

        const item = this.cache.get(key);
        if (!item) return false;

        if (Date.now() - item.timestamp > this.config.cacheExpiration) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * 清理过期缓存
     */
    cleanExpired(): number {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.config.cacheExpiration) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * 获取缓存统计信息
     */
    getStats(): {
        size: number;
        hitRate: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    } {
        const entries = Array.from(this.cache.values());
        const timestamps = entries.map(item => item.timestamp);

        return {
            size: this.cache.size,
            hitRate: 0, // 需要在实际使用中统计
            oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
            newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null
        };
    }
}
