# 🏆 段位升降系统使用说明

## 📋 系统概述

段位升降系统是一个完整的玩家段位管理解决方案，支持自动和手动的段位升级、降级，以及完善的保护机制。

## 🎯 核心特性

### 1. 完整的段位体系
- **7个段位等级**: Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster
- **段位特性**: 每个段位都有独特的颜色、图标和等级
- **升级路径**: 清晰的段位晋升路线

### 2. 智能升降机制
- **自动升级**: 基于积分、胜率、比赛场次等条件
- **自动降级**: 基于积分阈值、连续失败等条件
- **保护机制**: 防止玩家快速降级

### 3. 灵活配置
- **段位规则**: 每个段位都有独立的升级和降级规则
- **保护配置**: 可配置的保护等级和宽限期
- **动态调整**: 支持运行时调整段位规则

## 🚀 快速开始

### 1. 基本使用

```typescript
// 导入段位管理器
import { SegmentPromotionDemotionManager } from './segmentPromotionDemotionManager';

// 检查段位变化
const segmentChange = await SegmentPromotionDemotionManager.checkSegmentChange(
    ctx,
    playerUid,
    newPoints,
    performanceMetrics
);

if (segmentChange.changed) {
    console.log(`段位变化: ${segmentChange.message}`);
}
```

### 2. 获取段位信息

```typescript
// 获取段位信息
const segmentInfo = SegmentPromotionDemotionManager.getSegmentInfo("gold");
console.log(`段位等级: ${segmentInfo.tier}`);
console.log(`段位颜色: ${segmentInfo.color}`);
console.log(`段位图标: ${segmentInfo.icon}`);

// 检查升级可能性
const canPromote = SegmentPromotionDemotionManager.canPromote("gold");
const nextSegment = SegmentPromotionDemotionManager.getNextSegment("gold");
```

## 📊 段位规则详解

### Bronze (青铜) - 新手段位
- **升级条件**: 1000积分 + 40%胜率 + 10场比赛 + 2连胜
- **降级保护**: 5场宽限期 + 2级保护
- **特色**: 适合新手玩家，升级门槛较低

### Silver (白银) - 进阶段位
- **升级条件**: 2500积分 + 45%胜率 + 15场比赛 + 3连胜
- **降级保护**: 4场宽限期 + 2级保护
- **特色**: 需要一定技巧，开始有竞争性

### Gold (黄金) - 熟练段位
- **升级条件**: 5000积分 + 50%胜率 + 20场比赛 + 3连胜
- **降级保护**: 3场宽限期 + 1级保护
- **特色**: 技能要求较高，竞争激烈

### Platinum (铂金) - 精英段位
- **升级条件**: 10000积分 + 55%胜率 + 25场比赛 + 4连胜
- **降级保护**: 2场宽限期 + 1级保护
- **特色**: 高端玩家聚集地

### Diamond (钻石) - 大师段位
- **升级条件**: 20000积分 + 60%胜率 + 30场比赛 + 4连胜
- **降级保护**: 3场宽限期 + 3级保护
- **特色**: 顶级玩家，不主动降级

### Master (大师) - 宗师段位
- **升级条件**: 50000积分 + 65%胜率 + 40场比赛 + 5连胜
- **降级保护**: 2场宽限期 + 2级保护
- **特色**: 需要保持高积分

### Grandmaster (宗师) - 传奇段位
- **升级条件**: 100000积分 + 70%胜率 + 50场比赛 + 6连胜
- **降级保护**: 1场宽限期 + 1级保护
- **特色**: 最高段位，传奇玩家

## 🔧 配置选项

### 段位保护配置

```typescript
export const SEGMENT_CONFIGS = {
    bronze: {
        protectionThreshold: 3,        // 保护阈值
        demotionGracePeriod: 5,       // 降级宽限期
        promotionStabilityPeriod: 3,  // 升级稳定期
        maxProtectionLevel: 2         // 最大保护等级
    }
    // ... 其他段位配置
};
```

### 段位规则配置

```typescript
export const SEGMENT_PROMOTION_DEMOTION_RULES = {
    bronze: {
        promotion: {
            pointsRequired: 1000,           // 升级所需积分
            winRateRequired: 0.4,           // 最低胜率要求
            stabilityPeriod: 3,             // 稳定期
            minMatches: 10,                 // 最少比赛场次
            consecutiveWinsRequired: 2      // 连续胜利要求
        },
        demotion: {
            pointsThreshold: -200,          // 降级积分阈值
            consecutiveLosses: 5,           // 连续失败次数
            gracePeriod: 5,                 // 宽限期
            protectionLevels: 2,            // 保护等级数量
            winRateThreshold: 0.3           // 最低胜率阈值
        }
    }
    // ... 其他段位规则
};
```

## 📱 Convex函数使用

### 查询函数

```typescript
// 获取段位信息
const segmentInfo = await ctx.runQuery(api.segmentManagerFunctions.getSegmentInfo, {
    segmentName: "gold"
});

// 获取所有可用段位
const segments = await ctx.runQuery(api.segmentManagerFunctions.getAvailableSegments);

// 获取段位分布统计
const distribution = await ctx.runQuery(api.segmentManagerFunctions.getSegmentDistribution);
```

### 管理函数

```typescript
// 手动检查段位变化
const change = await ctx.runMutation(api.segmentManagerFunctions.checkSegmentChange, {
    uid: "player123",
    newPoints: 1500
});

// 手动升级玩家段位
const result = await ctx.runMutation(api.segmentManagerFunctions.promotePlayerSegment, {
    uid: "player123",
    targetSegment: "silver"
});
```

### 统计函数

```typescript
// 获取升级统计
const promotionStats = await ctx.runQuery(api.segmentManagerFunctions.getPromotionStatistics, {
    timeRange: "week"
});

// 获取降级统计
const demotionStats = await ctx.runQuery(api.segmentManagerFunctions.getDemotionStatistics, {
    timeRange: "month"
});
```

## 🧪 测试和调试

### 测试段位系统

```typescript
// 运行完整测试
const testResult = await ctx.runMutation(api.segmentManagerFunctions.testSegmentSystem);

console.log("测试结果:", testResult);
console.log(`通过测试: ${testResult.summary.passedTests}/${testResult.summary.totalTests}`);
```

### 清理测试数据

```typescript
// 清理测试数据
const cleanupResult = await ctx.runMutation(api.segmentManagerFunctions.cleanupTestData, {
    pattern: "test_"
});

console.log(`已清理 ${cleanupResult.deletedCount} 条测试数据`);
```

## 🔄 集成到现有系统

### 1. 锦标赛结束后自动检查

```typescript
// 在锦标赛结束后调用
export class TournamentCompletionHandler {
    static async handleTournamentCompletion(ctx, tournamentId, results) {
        for (const result of results) {
            const { uid, matchRank, score } = result;
            
            // 获取玩家数据
            const playerData = await this.getPlayerData(ctx, uid);
            
            // 计算积分奖励
            const pointsReward = await this.calculatePointsReward(result);
            
            // 检查段位变化
            const segmentChange = await SegmentPromotionDemotionManager.checkSegmentChange(
                ctx,
                uid,
                pointsReward.rankPoints,
                playerData.performanceMetrics
            );
            
            if (segmentChange.changed) {
                // 处理段位变化
                await this.handleSegmentChange(ctx, uid, segmentChange);
            }
        }
    }
}
```

### 2. 定期段位检查

```typescript
// 定期检查段位变化
export const scheduledSegmentCheck = cronJob({
    schedule: "0 2 * * *", // 每天凌晨2点
    handler: async (ctx) => {
        const players = await ctx.db.query("player_performance_metrics").collect();
        
        for (const player of players) {
            // 检查是否需要降级
            const segmentChange = await SegmentPromotionDemotionManager.checkSegmentChange(
                ctx,
                player.uid,
                player.totalPoints,
                player
            );
            
            if (segmentChange.changed) {
                console.log(`玩家 ${player.uid} 段位变化: ${segmentChange.message}`);
            }
        }
    }
});
```

## 📈 性能优化建议

### 1. 数据库索引
- 确保 `player_performance_metrics` 表有 `by_uid` 索引
- 为 `segment_change_history` 表添加时间索引

### 2. 批量操作
- 对于大量玩家的段位检查，使用批量查询
- 考虑使用队列处理段位变化通知

### 3. 缓存策略
- 缓存段位规则配置
- 缓存玩家段位信息

## 🚨 注意事项

### 1. 数据一致性
- 段位变化必须在事务中处理
- 确保积分扣除和段位更新同步

### 2. 保护机制
- 不要频繁手动调整段位
- 保护机制是为了防止玩家流失

### 3. 监控告警
- 监控段位变化频率
- 设置异常段位变化的告警

## 🔮 未来扩展

### 1. 段位特权系统
- 高段位玩家获得特殊权限
- 段位专属奖励和称号

### 2. 段位联赛
- 同段位玩家之间的竞技
- 段位内部排名系统

### 3. 段位历史记录
- 详细的段位变化轨迹
- 段位成就系统

## 📞 技术支持

如果在使用过程中遇到问题，请检查：

1. **数据库连接**: 确保Convex数据库正常
2. **权限设置**: 检查函数调用权限
3. **数据完整性**: 验证玩家数据是否完整
4. **日志输出**: 查看控制台错误信息

段位系统设计为完全可配置和可扩展，如有特殊需求，可以调整配置参数或扩展功能。
