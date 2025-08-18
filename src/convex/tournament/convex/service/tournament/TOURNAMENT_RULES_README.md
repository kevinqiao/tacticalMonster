# 锦标赛规则系统 - 积分独立设计

## 📋 系统概述

本系统重新定义了锦标赛规则，支持段位和Battle Pass积分的完全独立设计。每种积分类型都有独立的计算规则、分配策略和用途，为玩家提供更灵活和公平的游戏体验。

## 🎯 核心设计理念

### 积分独立原则
- **段位积分 (Rank Points)**: 专门用于段位升降级，与Battle Pass完全分离
- **赛季积分 (Season Points)**: 专门用于Battle Pass升级，与段位系统完全分离
- **声望积分 (Prestige Points)**: 用于特殊成就和高级奖励
- **成就积分 (Achievement Points)**: 用于成就系统解锁
- **锦标赛积分 (Tournament Points)**: 用于锦标赛内部排名

### 段位影响机制
- 不同段位有不同的积分获取倍数
- 高段位玩家获得更多积分，但面临更大的挑战
- 低段位玩家积分获取较慢，但学习曲线更平缓

## 🏗️ 系统架构

### 1. 规则配置层
```
TournamentBaseRules (锦标赛基础规则)
├── 参与规则 (minPlayers, maxPlayers, timeLimit)
├── 积分规则 (pointMultiplier, enableRankPoints, enableSeasonPoints, ...)
├── 段位规则 (segmentBasedScoring, segmentBonusMultiplier)
├── 限制规则 (maxAttemptsPerPlayer, dailyLimit, weeklyLimit)
└── 时间规则 (startTime, endTime, registrationDeadline)
```

### 2. 积分计算层
```
PointCalculationRules (积分计算规则)
├── 基础积分计算 (useRankBased, useScoreBased, useTimeBased, usePerformanceBased)
├── 奖励积分计算 (enableStreakBonus, enablePerfectBonus, enableSpeedBonus, ...)
└── 惩罚规则 (enableDemotionPenalty, enableInactivityPenalty, enableCheatingPenalty)
```

### 3. 段位规则层
```
SegmentPointRules (段位积分规则)
├── 基础配置 (baseMultiplier, bonusMultiplier, protectionBonus, demotionPenalty)
├── 段位特定配置 (rankPointsConfig, seasonPointsConfig)
└── 升降级规则 (promotion, demotion, nextSegment, previousSegment)
```

## 📊 积分类型详解

### 1. 段位积分 (Rank Points)
- **用途**: 段位升降级
- **特点**: 与Battle Pass完全独立
- **获取**: 锦标赛排名、连胜奖励、完美表现
- **消耗**: 段位升级时消耗

### 2. 赛季积分 (Season Points)
- **用途**: Battle Pass升级
- **特点**: 与段位系统完全独立
- **获取**: 锦标赛参与、任务完成、每日登录
- **消耗**: Battle Pass等级提升

### 3. 声望积分 (Prestige Points)
- **用途**: 特殊成就和高级奖励
- **特点**: 稀有且珍贵
- **获取**: 完美表现、连胜、特殊事件
- **消耗**: 解锁稀有物品、特殊权限

### 4. 成就积分 (Achievement Points)
- **用途**: 成就系统解锁
- **特点**: 累积性奖励
- **获取**: 完成各种成就
- **消耗**: 成就等级提升

### 5. 锦标赛积分 (Tournament Points)
- **用途**: 锦标赛内部排名
- **特点**: 锦标赛专用
- **获取**: 锦标赛表现
- **消耗**: 锦标赛奖励兑换

## 🔧 配置示例

### 基础锦标赛规则
```typescript
const tournamentRules = {
    tournamentId: "daily_challenge_001",
    gameType: "solitaire",
    tournamentType: "daily_challenge",
    
    // 参与规则
    minPlayers: 4,
    maxPlayers: 16,
    timeLimit: 30,
    
    // 积分规则 - 启用所有积分类型
    pointMultiplier: 1.0,
    enableRankPoints: true,      // 启用段位积分
    enableSeasonPoints: true,    // 启用赛季积分
    enablePrestigePoints: true,  // 启用声望积分
    enableAchievementPoints: true, // 启用成就积分
    enableTournamentPoints: true,  // 启用锦标赛积分
    
    // 段位相关规则
    segmentBasedScoring: true,   // 基于段位调整积分
    segmentBonusMultiplier: 1.2, // 段位奖励倍数
    
    // 限制规则
    maxAttemptsPerPlayer: 3,
    dailyLimit: 5,
    weeklyLimit: 20
};
```

### 段位积分规则
```typescript
const segmentRules = {
    bronze: {
        baseMultiplier: 1.0,
        bonusMultiplier: 1.2,
        rankPointsConfig: {
            basePoints: 10,
            bonusMultiplier: 1.5,
            maxPoints: 50
        },
        seasonPointsConfig: {
            basePoints: 5,
            bonusMultiplier: 1.3,
            maxPoints: 25
        }
    },
    diamond: {
        baseMultiplier: 1.4,
        bonusMultiplier: 1.6,
        rankPointsConfig: {
            basePoints: 30,
            bonusMultiplier: 1.9,
            maxPoints: 150
        },
        seasonPointsConfig: {
            basePoints: 18,
            bonusMultiplier: 1.7,
            maxPoints: 70
        }
    }
};
```

## 📈 积分计算流程

### 1. 基础积分计算
```typescript
// 段位积分计算
function calculateRankPoints(config, segmentRules, tournamentRules, matchScore, isPerfectScore, isQuickWin, winningStreak) {
    let points = config.basePoints * segmentRules.rankPointsConfig.basePoints;
    
    // 应用段位倍数
    points *= segmentRules.baseMultiplier;
    
    // 应用全局倍数
    points *= tournamentRules.pointMultiplier;
    
    // 应用奖励倍数
    if (isPerfectScore) points *= 1.5;
    if (isQuickWin) points *= 1.3;
    if (winningStreak >= 3) points *= 1.2;
    
    // 应用段位奖励倍数
    points *= segmentRules.rankPointsConfig.bonusMultiplier;
    
    // 限制在配置范围内
    return Math.max(config.minPoints, Math.min(config.maxPoints, Math.round(points)));
}
```

### 2. 奖励积分计算
```typescript
// 连胜奖励
if (winningStreak >= 3) {
    rankPoints *= 1.2;
    seasonPoints *= 1.1;
}

// 完美分数奖励
if (isPerfectScore) {
    rankPoints *= 1.5;
    seasonPoints *= 1.4;
    prestigePoints *= 2.0;
}

// 快速获胜奖励
if (isQuickWin) {
    rankPoints *= 1.3;
    seasonPoints *= 1.2;
    prestigePoints *= 1.5;
}
```

## 🎮 使用场景

### 1. 新手玩家
- **段位积分**: 获取较慢，学习曲线平缓
- **赛季积分**: 正常获取，快速升级Battle Pass
- **策略**: 专注于学习和技能提升

### 2. 中级玩家
- **段位积分**: 中等获取速度，平衡发展
- **赛季积分**: 稳定获取，Battle Pass进度正常
- **策略**: 平衡段位提升和Battle Pass进度

### 3. 高级玩家
- **段位积分**: 快速获取，挑战高段位
- **赛季积分**: 大量获取，快速完成Battle Pass
- **策略**: 追求段位极限和赛季成就

### 4. 竞技玩家
- **段位积分**: 主要目标，追求最高段位
- **赛季积分**: 次要目标，作为额外奖励
- **策略**: 专注于竞技表现和段位提升

## 🔄 系统集成

### 1. 与段位系统集成
```typescript
// 段位升级检查
const segmentChange = await SegmentPromotionDemotionManager.checkSegmentChange(
    ctx,
    uid,
    points.rankPoints,
    playerData.performanceMetrics
);

if (segmentChange.changed) {
    await handleSegmentChange(ctx, uid, segmentChange);
}
```

### 2. 与Battle Pass系统集成
```typescript
// Battle Pass升级
if (points.seasonPoints > 0) {
    await BattlePassSystem.addSeasonPoints(ctx, uid, points.seasonPoints, "tournament");
}
```

### 3. 与成就系统集成
```typescript
// 成就检查
if (points.achievementPoints > 0) {
    await AchievementSystem.checkAchievements(ctx, uid, "tournament_points", points.achievementPoints);
}
```

## 📊 数据表结构

### 1. 锦标赛规则表 (tournament_rules)
- 存储锦标赛基础规则和积分配置
- 支持动态规则修改和版本管理

### 2. 积分记录表 (tournament_point_records)
- 记录每次比赛的详细积分信息
- 支持积分追踪和审计

### 3. 段位积分规则表 (segment_point_rules)
- 存储各段位的积分配置
- 支持段位特定的积分调整

### 4. 排名积分配置表 (rank_point_configs)
- 存储各排名的积分配置
- 支持动态排名配置

### 5. 玩家积分统计表 (player_point_stats)
- 汇总玩家的各类积分统计
- 支持积分分析和报告

## 🚀 性能优化

### 1. 数据库索引
- 为常用查询字段创建复合索引
- 支持高效的积分统计和段位查询

### 2. 缓存策略
- 缓存段位规则和积分配置
- 减少重复计算和数据库查询

### 3. 批量操作
- 支持批量积分计算和更新
- 提高系统处理效率

## 🔧 扩展性设计

### 1. 新积分类型支持
```typescript
// 添加新的积分类型
export enum PointType {
    // ... 现有类型
    NEW_POINT_TYPE = "newPointType"
}
```

### 2. 新段位支持
```typescript
// 添加新段位配置
const newSegmentRules = {
    newSegment: {
        baseMultiplier: 1.7,
        bonusMultiplier: 1.9,
        // ... 其他配置
    }
};
```

### 3. 新奖励规则支持
```typescript
// 添加新的奖励规则
const newBonusRule = {
    type: "new_bonus_type",
    condition: { type: "score", value: 5000, operator: "greater_than" },
    rewards: [{ pointType: PointType.PRESTIGE_POINTS, amount: 100 }]
};
```

## 📝 最佳实践

### 1. 规则配置
- 保持积分平衡，避免某种积分过于容易或困难获取
- 根据玩家反馈调整段位倍数和奖励配置
- 定期审查和更新积分规则

### 2. 性能考虑
- 使用批量操作处理大量积分更新
- 合理设置缓存策略，平衡性能和一致性
- 监控积分计算性能，优化计算算法

### 3. 数据一致性
- 使用事务确保积分更新的原子性
- 定期验证积分数据的准确性
- 提供积分修正和回滚机制

## 🔮 未来发展方向

### 1. 智能积分调整
- 基于玩家表现动态调整积分规则
- 机器学习优化积分分配策略

### 2. 社交积分系统
- 团队合作积分奖励
- 社交互动积分机制

### 3. 跨游戏积分
- 支持多种游戏类型的积分统一
- 跨游戏段位和Battle Pass系统

这个系统为锦标赛提供了灵活、公平和可扩展的积分管理方案，确保段位和Battle Pass系统的完全独立，同时保持良好的游戏平衡性。
