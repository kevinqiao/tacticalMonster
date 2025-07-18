# 大规模锦标赛处理指南

## 📋 概述

当锦标赛玩家数量过多时（如超过1000人），传统的排行计算方法会遇到性能问题。本文档介绍如何使用高性能排行系统来处理大规模锦标赛。

## 🚀 性能优化策略

### 1. 分层处理策略

根据玩家数量采用不同的处理策略：

```typescript
// 玩家数量分类
const PLAYER_COUNT_THRESHOLDS = {
    SMALL: 100,      // 小规模：直接计算
    MEDIUM: 1000,    // 中等规模：缓存 + 分页
    LARGE: 10000,    // 大规模：流式处理 + 采样
    HUGE: 100000     // 超大规模：分布式处理
};
```

### 2. 缓存机制

- **缓存时间**: 5分钟
- **缓存策略**: 按排名方法分别缓存
- **自动清理**: 定期清理过期缓存

```typescript
// 缓存键格式
const cacheKey = `leaderboard_${tournamentId}_${rankingMethod}`;

// 缓存数据结构
{
    cacheKey: string;
    tournamentId: string;
    rankingMethod: string;
    data: Array<PlayerRanking>;
    totalPlayers: number;
    cacheTime: string;
    expiresAt: number;
}
```

### 3. 分页优化

- **默认页大小**: 20条记录
- **最大页大小**: 100条记录
- **智能分页**: 根据玩家数量动态调整

## 📊 不同规模的处理方案

### 小规模锦标赛 (< 100人)

**处理方式**: 直接计算
**特点**: 
- 实时计算所有玩家排名
- 无需缓存
- 响应时间 < 100ms

```typescript
// 直接使用标准排行服务
const ranking = await PlayerRankingService.getPlayerRanking(ctx, {
    tournamentId: "tournament_123",
    uid: "player_001"
});
```

### 中等规模锦标赛 (100-1000人)

**处理方式**: 缓存 + 分页
**特点**:
- 使用5分钟缓存
- 分页加载排行榜
- 响应时间 < 500ms

```typescript
// 使用高性能排行服务
const leaderboard = await HighPerformanceRankingService.getLeaderboardPaginated(ctx, {
    tournamentId: "tournament_123",
    page: 1,
    pageSize: 20,
    useCache: true
});
```

### 大规模锦标赛 (1000-10000人)

**处理方式**: 流式处理 + 采样
**特点**:
- 流式计算排行榜
- 采样估算排名
- 响应时间 < 1000ms

```typescript
// 流式处理排行榜
const leaderboard = await HighPerformanceRankingService.getLeaderboardPaginated(ctx, {
    tournamentId: "tournament_123",
    page: 1,
    pageSize: 20,
    useCache: true
});

// 采样估算玩家排名
const playerRank = await HighPerformanceRankingService.getPlayerRank(ctx, {
    tournamentId: "tournament_123",
    uid: "player_001"
});
```

### 超大规模锦标赛 (> 10000人)

**处理方式**: 分布式处理 + 预计算
**特点**:
- 预计算排行榜
- 分布式存储
- 响应时间 < 2000ms

## 🎯 API使用指南

### 1. 分页获取排行榜

```typescript
import { api } from "../_generated/api";
import { useQuery } from "convex/react";

const TournamentLeaderboard = ({ tournamentId }: { tournamentId: string }) => {
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const leaderboard = useQuery(api.highPerformanceRankingAPI.getLeaderboardPaginated, {
        tournamentId,
        page,
        pageSize,
        useCache: true
    });

    if (!leaderboard?.success) {
        return <div>加载中...</div>;
    }

    const { data } = leaderboard;
    
    return (
        <div>
            <div className="leaderboard-list">
                {data.leaderboard.map((player) => (
                    <div key={player.uid} className="leaderboard-item">
                        <span className="rank">#{player.rank}</span>
                        <span className="uid">{player.uid}</span>
                        <span className="score">{player.score}</span>
                    </div>
                ))}
            </div>
            
            <div className="pagination">
                <button 
                    disabled={!data.pagination.hasPrev}
                    onClick={() => setPage(page - 1)}
                >
                    上一页
                </button>
                <span>
                    第 {data.pagination.currentPage} / {data.pagination.totalPages} 页
                    (共 {data.pagination.totalPlayers} 人)
                </span>
                <button 
                    disabled={!data.pagination.hasNext}
                    onClick={() => setPage(page + 1)}
                >
                    下一页
                </button>
            </div>
        </div>
    );
};
```

### 2. 获取玩家排名

```typescript
const PlayerRank = ({ tournamentId, uid }: { tournamentId: string; uid: string }) => {
    const playerRank = useQuery(api.highPerformanceRankingAPI.getPlayerRank, {
        tournamentId,
        uid,
        rankingMethod: "highest_score"
    });

    if (!playerRank?.success) {
        return <div>加载中...</div>;
    }

    const { data } = playerRank;
    
    return (
        <div className="player-rank">
            <h3>我的排名</h3>
            <div className="rank-info">
                <div className="rank-number">#{data.rank}</div>
                <div className="total-players">共 {data.totalPlayers} 人参与</div>
            </div>
            <div className="stats">
                <div>分数: {data.score}</div>
                <div>比赛场数: {data.matchCount}</div>
                <div>最佳分数: {data.bestScore}</div>
                <div>平均分数: {data.averageScore.toFixed(1)}</div>
            </div>
        </div>
    );
};
```

### 3. 获取排行榜前N名

```typescript
const TopPlayers = ({ tournamentId }: { tournamentId: string }) => {
    const topPlayers = useQuery(api.highPerformanceRankingAPI.getTopPlayers, {
        tournamentId,
        topN: 10,
        includePlayerInfo: true
    });

    if (!topPlayers?.success) {
        return <div>加载中...</div>;
    }

    const { data } = topPlayers;
    
    return (
        <div className="top-players">
            <h3>🏆 前10名</h3>
            {data.topPlayers.map((player, index) => (
                <div key={player.uid} className="top-player">
                    <div className="medal">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div className="player-info">
                        <img src={player.playerInfo?.avatar} alt="avatar" />
                        <span>{player.playerInfo?.nickname || player.uid}</span>
                    </div>
                    <div className="score">{player.score}分</div>
                </div>
            ))}
        </div>
    );
};
```

### 4. 搜索玩家

```typescript
const PlayerSearch = ({ tournamentId }: { tournamentId: string }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const searchPlayers = useQuery(api.highPerformanceRankingAPI.searchPlayerInLeaderboard, {
        tournamentId,
        searchTerm,
        limit: 10
    });

    return (
        <div className="player-search">
            <input
                type="text"
                placeholder="搜索玩家ID或昵称"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {searchPlayers?.success && searchPlayers.data.results.length > 0 && (
                <div className="search-results">
                    {searchPlayers.data.results.map((result) => (
                        <div key={result.player.uid} className="search-result">
                            <div className="player-info">
                                <img src={result.player.avatar} alt="avatar" />
                                <span>{result.player.nickname}</span>
                            </div>
                            {result.ranking && (
                                <div className="ranking">
                                    排名: #{result.ranking.rank} / {result.ranking.totalPlayers}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
```

## 🔧 性能监控

### 1. 获取性能指标

```typescript
const PerformanceMonitor = ({ tournamentId }: { tournamentId: string }) => {
    const metrics = useQuery(api.highPerformanceRankingAPI.getLeaderboardPerformanceMetrics, {
        tournamentId
    });

    if (!metrics?.success) {
        return <div>加载中...</div>;
    }

    const { data } = metrics;
    
    return (
        <div className="performance-monitor">
            <h3>性能指标</h3>
            <div className="metrics">
                <div>玩家数量: {data.metrics.playerCount}</div>
                <div>比赛数量: {data.metrics.matchCount}</div>
                <div>缓存命中率: {(data.metrics.cacheHitRate * 100).toFixed(1)}%</div>
                <div>内存使用: {data.metrics.memoryUsage}KB</div>
            </div>
            
            <div className="query-times">
                <h4>查询时间</h4>
                <div>获取玩家总数: {data.metrics.queryTimes.totalPlayers}ms</div>
                <div>获取前10名: {data.metrics.queryTimes.top10}ms</div>
                <div>获取前100名: {data.metrics.queryTimes.top100}ms</div>
                <div>获取玩家排名: {data.metrics.queryTimes.playerRank}ms</div>
            </div>
        </div>
    );
};
```

### 2. 缓存管理

```typescript
// 批量更新缓存
const updateCache = async (tournamentIds: string[]) => {
    await mutation(api.highPerformanceRankingAPI.batchUpdateRankingCache, {
        tournamentIds
    });
};

// 清理过期缓存
const cleanupCache = async () => {
    await mutation(api.highPerformanceRankingAPI.cleanupExpiredCache, {});
};
```

## 📈 性能优化建议

### 1. 数据库优化

- **索引优化**: 确保 `by_tournament` 和 `by_tournament_uid` 索引存在
- **查询优化**: 使用索引查询，避免全表扫描
- **数据分片**: 对于超大规模数据，考虑按时间分片

### 2. 缓存策略

- **缓存时间**: 根据数据更新频率调整缓存时间
- **缓存大小**: 限制缓存条目数量，避免内存溢出
- **缓存预热**: 在锦标赛开始前预热缓存

### 3. 前端优化

- **虚拟滚动**: 对于长列表使用虚拟滚动
- **懒加载**: 按需加载玩家详细信息
- **防抖搜索**: 搜索功能使用防抖处理

### 4. 监控告警

```typescript
// 性能监控配置
const PERFORMANCE_THRESHOLDS = {
    queryTime: 2000,      // 查询时间阈值
    cacheHitRate: 0.7,    // 缓存命中率阈值
    memoryUsage: 10240    // 内存使用阈值 (KB)
};

// 监控告警
const checkPerformance = (metrics: any) => {
    if (metrics.queryTimes.top10 > PERFORMANCE_THRESHOLDS.queryTime) {
        console.warn('排行榜查询时间过长');
    }
    
    if (metrics.cacheHitRate < PERFORMANCE_THRESHOLDS.cacheHitRate) {
        console.warn('缓存命中率过低');
    }
    
    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.memoryUsage) {
        console.warn('内存使用过高');
    }
};
```

## 🎯 最佳实践

### 1. 选择合适的API

- **小规模**: 使用 `PlayerRankingService`
- **中等规模**: 使用 `HighPerformanceRankingService` + 缓存
- **大规模**: 使用 `HighPerformanceRankingService` + 流式处理
- **超大规模**: 考虑分布式解决方案

### 2. 合理设置分页

```typescript
// 根据玩家数量动态调整页大小
const getOptimalPageSize = (totalPlayers: number) => {
    if (totalPlayers < 100) return 50;
    if (totalPlayers < 1000) return 20;
    if (totalPlayers < 10000) return 10;
    return 5;
};
```

### 3. 缓存策略

```typescript
// 根据锦标赛状态调整缓存策略
const getCacheStrategy = (tournament: any) => {
    if (tournament.status === 'completed') {
        return { useCache: true, cacheDuration: 30 * 60 * 1000 }; // 30分钟
    }
    if (tournament.status === 'active') {
        return { useCache: true, cacheDuration: 5 * 60 * 1000 };  // 5分钟
    }
    return { useCache: false };
};
```

## 🚨 注意事项

1. **内存使用**: 监控内存使用情况，避免内存溢出
2. **查询超时**: 设置合理的查询超时时间
3. **缓存一致性**: 确保缓存数据与数据库数据一致
4. **错误处理**: 实现完善的错误处理和降级策略
5. **监控告警**: 设置性能监控和告警机制

通过以上优化策略，系统可以高效处理从几十人到几十万人的各种规模锦标赛，确保良好的用户体验。 