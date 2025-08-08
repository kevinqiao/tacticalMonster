# Battle Pass 系统设计文档 - 基于Season Points

## 1. 系统概述

Battle Pass系统是基于GamePlatformDesign.markdown设计的核心付费系统，旨在平衡免费和付费玩家的游戏体验，提供持续的参与激励。

### 1.1 设计目标
- **公平性**: 免费玩家也能获得基础奖励，付费玩家获得额外价值
- **参与度**: 通过赛季积分进度系统激励每日参与
- **营收**: 通过Premium Battle Pass实现8%-12%的付费转化
- **平衡**: 新玩家6.5级，休闲玩家16.5级，竞技玩家28级

### 1.2 核心特性
- **双轨道设计**: 免费轨道(25级) + 付费轨道(25级)
- **赛季积分进度系统**: 500点/级，总计12500点
- **多来源赛季积分**: 锦标赛、快速对局、道具对局、任务、社交、成就
- **赛季重置**: 每月重置，保持新鲜感

## 2. 系统架构

### 2.1 核心组件
```
Battle Pass System
├── BattlePassSystem (核心服务)
├── battlePassSchema (数据库Schema)
├── battlePass.ts (API接口)
├── 配置数据
└── 集成接口
```

### 2.2 数据模型
```typescript
// 主要接口
interface BattlePassConfig {
    seasonId: string;
    seasonName: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    freeTrack: BattlePassTrack;
    premiumTrack: BattlePassTrack;
    seasonPointsPerLevel: number;
    maxLevel: number;
    price: number;
}

interface PlayerBattlePass {
    uid: string;
    seasonId: string;
    currentLevel: number;
    currentSeasonPoints: number;
    totalSeasonPoints: number;
    isPremium: boolean;
    purchasedAt?: string;
    lastUpdated: string;
    progress: BattlePassProgress;
}
```

## 3. 轨道设计

### 3.1 免费轨道 (Free Track)
- **等级**: 25级
- **价格**: 免费
- **主要奖励**:
  - 每3级: 1张普通门票 (共16张)
  - 每5级: 50金币 (共5次，250金币)
  - 总计: 250金币 + 16张普通门票

### 3.2 付费轨道 (Premium Track)
- **等级**: 25级
- **价格**: 500金币 (≈$5)
- **主要奖励**:
  - 每2级: 1张普通门票 (共25张)
  - 每5级: 1张高级门票 (共10张)
  - 每3级: 50金币 (共8次，400金币)
  - 专属物品: 头像(5级)、边框(15级)、称号(25级)
  - 总计: 400金币 + 25张普通门票 + 10张高级门票 + 专属物品

## 4. 赛季积分来源设计

### 4.1 赛季积分分配比例
- **锦标赛**: 54.4% (6800点，80-100点/日×28)
- **道具对局**: 22% (2800点，75-150点/日×28)
- **任务**: 22% (2800点，50-100点/日×28)
- **快速对局**: 1.6% (200点，5-10点/日×28)

### 4.2 各来源详细配置

#### 4.2.1 锦标赛赛季积分
```typescript
// 每日锦标赛
- 前10%: 100赛季积分
- 前11-20%: 80赛季积分
- 前21-50%: 50赛季积分
- 后50%: 10赛季积分

// Chess首周奖励翻倍
- 前10%: 200赛季积分
- 前11-20%: 160赛季积分
- 前21-50%: 100赛季积分
- 后50%: 20赛季积分
```

#### 4.2.2 快速对局赛季积分
```typescript
// 胜利奖励
- 基础: 10赛季积分
- Chess首周: 20赛季积分

// 5胜奖励
- 基础: 1张普通门票
- Chess首周: 80%概率获得门票
```

#### 4.2.3 道具对局赛季积分
```typescript
// 胜利奖励
- 基础: 10赛季积分
- Chess首周: 20赛季积分

// 道具使用奖励
- 每个道具: 15赛季积分
- 每日上限: 150赛季积分

// 5胜奖励
- 基础: 1张普通门票 + 30金币
- Chess首周: 2张门票 + 60金币
```

#### 4.2.4 任务赛季积分
```typescript
// 每日任务
- 普通任务: 50-100赛季积分
- 道具任务: 75-150赛季积分

// Chess首周任务
- 登录任务: 100赛季积分 + 1张门票 + 1个道具
- 道具任务: 150赛季积分 + 2个道具
```

## 5. 玩家进度预期

### 5.1 新玩家 (6.5级)
- **赛季积分来源**: 锦标赛80点×28=2240点，任务+道具对局1010点
- **总赛季积分**: 3250点
- **策略**: 每日登录 + 基础任务 + 简单对局

### 5.2 休闲玩家 (16.5级)
- **赛季积分来源**: 锦标赛80点×28=2240点，任务+道具对局6010点
- **总赛季积分**: 8250点
- **策略**: 每日任务 + 道具对局 + 社交活动

### 5.3 竞技玩家 (28级)
- **赛季积分来源**: 锦标赛100点×28=2800点，任务+道具对局11200点
- **总赛季积分**: 14000点
- **策略**: 锦标赛前10% + 道具对局 + 所有任务

## 6. 奖励设计

### 6.1 免费轨道奖励
```typescript
// 等级奖励分布
Level 3:  1张普通门票
Level 5:  50金币
Level 6:  1张普通门票
Level 9:  1张普通门票
Level 10: 50金币
Level 12: 1张普通门票
Level 15: 1张普通门票 + 50金币
Level 18: 1张普通门票
Level 20: 50金币
Level 21: 1张普通门票
Level 24: 1张普通门票
Level 25: 50金币
```

### 6.2 付费轨道奖励
```typescript
// 等级奖励分布
Level 2:  1张普通门票
Level 3:  50金币
Level 4:  1张普通门票
Level 5:  1张高级门票 + 专属头像
Level 6:  1张普通门票
Level 8:  1张普通门票
Level 9:  50金币
Level 10: 1张高级门票
Level 12: 1张普通门票
Level 14: 1张普通门票
Level 15: 1张高级门票 + 专属边框
Level 16: 1张普通门票
Level 18: 1张普通门票
Level 20: 1张高级门票
Level 21: 50金币
Level 22: 1张普通门票
Level 24: 1张普通门票
Level 25: 1张高级门票 + 专属称号
```

## 7. 技术实现

### 7.1 核心服务
```typescript
// BattlePassSystem 主要方法
- getCurrentBattlePassConfig(): 获取当前赛季配置
- getPlayerBattlePass(): 获取玩家Battle Pass信息
- initializePlayerBattlePass(): 初始化玩家Battle Pass
- purchasePremiumBattlePass(): 购买Premium Battle Pass
- addSeasonPoints(): 添加赛季积分到玩家Battle Pass
- claimBattlePassRewards(): 领取Battle Pass奖励
```

### 7.2 API接口
```typescript
// 查询接口
- getCurrentBattlePassConfig: 获取当前赛季配置
- getPlayerBattlePass: 获取玩家Battle Pass信息
- getPlayerBattlePassStats: 获取玩家统计
- getSeasonLeaderboard: 获取赛季排行榜

// 修改接口
- initializePlayerBattlePass: 初始化玩家Battle Pass
- purchasePremiumBattlePass: 购买Premium Battle Pass
- addBattlePassSeasonPoints: 添加赛季积分
- claimBattlePassRewards: 领取奖励

// 集成接口
- addTournamentSeasonPoints: 锦标赛赛季积分
- addQuickMatchSeasonPoints: 快速对局赛季积分
- addPropMatchSeasonPoints: 道具对局赛季积分
- addTaskSeasonPoints: 任务赛季积分
- addSocialSeasonPoints: 社交赛季积分
- addAchievementSeasonPoints: 成就赛季积分
```

### 7.3 数据库设计
```typescript
// 主要表结构
player_battle_pass: {
    uid: string,
    seasonId: string,
    currentLevel: number,
    currentSeasonPoints: number,
    totalSeasonPoints: number,
    isPremium: boolean,
    purchasedAt?: string,
    lastUpdated: string,
    progress: BattlePassProgress
}

battle_pass_rewards: {
    uid: string,
    seasonId: string,
    level: number,
    rewards: BattlePassRewards,
    claimedAt: string,
    createdAt: string
}

battle_pass_season_points_logs: {
    uid: string,
    seasonId: string,
    seasonPointsAmount: number,
    source: string,
    sourceDetails?: object,
    previousLevel: number,
    newLevel: number,
    previousTotalSeasonPoints: number,
    newTotalSeasonPoints: number,
    createdAt: string
}
```

## 8. 运营策略

### 8.1 平衡策略
- **免费玩家**: 通过基础奖励保持参与度
- **付费玩家**: 通过专属物品和额外奖励提供价值
- **差距控制**: 新玩家与竞技玩家差距控制在11级以内

### 8.2 监控指标
- **参与率**: 目标30%-40%
- **付费转化**: 目标8%-12%
- **平均等级**: 新玩家>10级，休闲玩家>15级
- **留存率**: 新玩家流失率<15%

### 8.3 调整机制
- **赛季积分调整**: 根据参与度调整赛季积分获取难度
- **奖励调整**: 根据付费转化调整奖励价值
- **活动调整**: 根据数据调整特殊活动奖励

## 9. 集成配置

### 9.1 与任务系统集成
```typescript
// 任务完成时自动添加赛季积分
await addTaskSeasonPoints({
    uid: playerId,
    taskId: taskId,
    taskType: taskType,
    seasonPointsAmount: calculatedSeasonPoints
});
```

### 9.2 与锦标赛系统集成
```typescript
// 锦标赛结束时自动添加赛季积分
await addTournamentSeasonPoints({
    uid: playerId,
    tournamentId: tournamentId,
    gameType: gameType,
    rank: playerRank,
    totalParticipants: totalPlayers
});
```

### 9.3 与对局系统集成
```typescript
// 对局结束时自动添加赛季积分
await addQuickMatchSeasonPoints({
    uid: playerId,
    gameType: gameType,
    isWin: isWin,
    matchId: matchId
});
```

## 10. 测试策略

### 10.1 功能测试
- Battle Pass购买流程
- 赛季积分获取和进度更新
- 奖励领取机制
- 赛季重置功能

### 10.2 平衡测试
- 不同玩家类型的进度预期
- 赛季积分来源的合理性验证
- 奖励价值的平衡性

### 10.3 性能测试
- 大量玩家同时使用Battle Pass
- 赛季积分日志记录的性能影响
- 排行榜查询的性能

## 11. 部署计划

### 11.1 第一阶段
- 部署Battle Pass基础系统
- 实现免费轨道功能
- 集成赛季积分获取机制

### 11.2 第二阶段
- 实现Battle Pass付费轨道
- 添加专属物品系统
- 完善奖励发放机制

### 11.3 第三阶段
- 添加统计和分析功能
- 实现运营工具
- 优化用户体验

## 12. 总结

Battle Pass系统是游戏平台的核心付费系统，通过精心设计的赛季积分来源和奖励分配，实现了免费和付费玩家的平衡。系统提供了持续的参与激励，同时为付费玩家提供了明显的价值提升，预期能够实现8%-12%的付费转化率。 