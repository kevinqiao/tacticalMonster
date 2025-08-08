# 游戏平台基于赛季的完整设计

## 1. 系统概述

### 1.1 设计理念
基于赛季的游戏平台设计，通过赛季积分(Season Points)作为核心经济系统，实现免费和付费玩家的平衡，提供持续的参与激励。

### 1.2 核心系统
- **赛季积分系统**: 统一的经济货币，赛季重置
- **Battle Pass系统**: 基于赛季积分的进度奖励系统
- **锦标赛系统**: 赛季积分的主要来源
- **任务系统**: 多样化的赛季积分获取方式
- **道具系统**: 增强游戏体验的辅助系统
- **门票系统**: 统一的门票管理，支持跨赛季保留

## 2. 赛季积分系统 (Season Points)

### 2.1 系统特性
```typescript
// 赛季积分特性
- 赛季性: 每个赛季重置，防止通胀
- 统一性: 所有游戏类型通用
- 稀缺性: 有限获取，需要策略分配
- 价值性: 可兑换多种奖励
```

### 2.2 获取来源
```typescript
// 赛季积分来源分配 (总计12500点/赛季)
锦标赛: 54.4% (6800点)
道具对局: 22% (2800点)
任务系统: 22% (2800点)
快速对局: 1.6% (200点)
社交活动: 0% (额外奖励)
成就系统: 0% (额外奖励)
```

### 2.3 使用场景
```typescript
// 赛季积分用途
1. Battle Pass进度 (主要用途)
2. 赛季商店购买
3. 特殊道具兑换
4. 专属物品解锁
```

## 3. Battle Pass系统

### 3.1 系统架构
```typescript
// Battle Pass配置
{
    seasonPointsPerLevel: 500, // 每级需要500赛季积分
    maxLevel: 25,              // 最大25级
    price: 500,                // 500金币购买Premium
    freeTrack: 25级免费轨道,
    premiumTrack: 25级付费轨道
}
```

### 3.2 轨道设计
```typescript
// 免费轨道奖励
- 每3级: 1张普通门票 (共16张)
- 每5级: 50金币 (共5次，250金币)
- 总计: 250金币 + 16张普通门票

// 付费轨道奖励
- 每2级: 1张普通门票 (共25张)
- 每5级: 1张高级门票 (共10张)
- 每3级: 50金币 (共8次，400金币)
- 专属物品: 头像(5级)、边框(15级)、称号(25级)
- 总计: 400金币 + 25张普通门票 + 10张高级门票 + 专属物品
```

### 3.3 玩家进度预期
```typescript
// 新玩家: 6.5级 (3250赛季积分)
- 锦标赛: 80点×28=2240点
- 任务+道具对局: 1010点
- 策略: 每日登录 + 基础任务 + 简单对局

// 休闲玩家: 16.5级 (8250赛季积分)
- 锦标赛: 80点×28=2240点
- 任务+道具对局: 6010点
- 策略: 每日任务 + 道具对局 + 社交活动

// 竞技玩家: 28级 (14000赛季积分)
- 锦标赛: 100点×28=2800点
- 任务+道具对局: 11200点
- 策略: 锦标赛前10% + 道具对局 + 所有任务
```

## 4. 锦标赛系统

### 4.1 锦标赛类型
```typescript
// 每日锦标赛
{
    type: "daily",
    entryFee: { tickets: [{ type: "bronze", quantity: 1 }] },
    rewards: { seasonPoints: 100, coins: 10 },
    rules: { scoring: "win+2, lose+0, draw+0" }
}

// 每周锦标赛
{
    type: "weekly",
    entryFee: { tickets: [{ type: "silver", quantity: 1 }] },
    rewards: { seasonPoints: 500, coins: 50 },
    rules: { scoring: "win+3, lose+1, draw+1" }
}

// 赛季锦标赛
{
    type: "seasonal",
    entryFee: { tickets: [{ type: "gold", quantity: 1 }] },
    rewards: { seasonPoints: 2000, coins: 200 },
    rules: { scoring: "win+5, lose+2, draw+2" }
}
```

### 4.2 赛季积分奖励
```typescript
// 排名奖励 (赛季积分)
前10%: 100赛季积分
前11-20%: 80赛季积分
前21-50%: 50赛季积分
后50%: 10赛季积分

// Chess首周奖励翻倍
前10%: 200赛季积分
前11-20%: 160赛季积分
前21-50%: 100赛季积分
后50%: 20赛季积分
```

### 4.3 特殊活动
```typescript
// Chess首周活动 (2025-08-01 至 2025-08-07)
- 所有奖励翻倍
- 额外门票奖励
- 专属任务系统
- 特殊道具奖励
```

## 5. 任务系统

### 5.1 任务类型
```typescript
// 任务类型定义
type TaskType = "one_time" | "daily" | "weekly" | "seasonal";

// 任务条件类型
type TaskConditionType = "simple" | "conditional" | "multi_stage" | "time_based";
```

### 5.2 赛季积分奖励
```typescript
// 每日任务
普通任务: 50-100赛季积分
道具任务: 75-150赛季积分

// 每周任务
普通任务: 200-400赛季积分
挑战任务: 300-600赛季积分

// 赛季任务
普通任务: 500-1000赛季积分
成就任务: 800-1500赛季积分

// Chess首周任务
登录任务: 100赛季积分 + 1张门票 + 1个道具
道具任务: 150赛季积分 + 2个道具
```

### 5.3 任务分配策略
```typescript
// 基于玩家属性的任务分配
{
    playerLevel: "影响任务难度",
    segmentName: "影响任务类型",
    gamePreferences: "影响游戏类型任务",
    subscriptionRequired: "影响付费任务",
    maxDailyAllocations: "每日任务数量限制"
}
```

## 6. 对局系统

### 6.1 快速对局
```typescript
// 赛季积分奖励
胜利: 10赛季积分
失败: 0赛季积分

// Chess首周奖励
胜利: 20赛季积分
5胜奖励: 1张普通门票
```

### 6.2 道具对局
```typescript
// 赛季积分奖励
胜利: 10赛季积分
道具使用: 每个道具15赛季积分
每日上限: 150赛季积分

// Chess首周奖励
胜利: 20赛季积分
道具使用: 每个道具30赛季积分
5胜奖励: 1张普通门票 + 30金币
```

### 6.3 匹配机制
```typescript
// 匹配规则
{
    skillBased: "基于技能等级匹配",
    timeBased: "基于等待时间调整",
    regionBased: "基于地区优化",
    maxWaitTime: 30秒
}
```

## 7. 道具系统

### 7.1 道具类型
```typescript
// 游戏道具
{
    hint: "提示道具",
    undo: "撤销道具",
    time: "时间道具",
    power: "强力道具"
}

// 道具获取
{
    purchase: "金币购买",
    task: "任务奖励",
    battlePass: "Battle Pass奖励",
    tournament: "锦标赛奖励"
}
```

### 7.2 道具使用
```typescript
// 使用限制
{
    dailyLimit: "每日使用限制",
    gameTypeLimit: "游戏类型限制",
    cost: "使用成本"
}
```

## 8. 门票系统

### 8.1 门票类型和跨赛季保留
```typescript
// 统一门票系统 - 支持跨赛季保留
type TicketType = "bronze" | "silver" | "gold";

const TICKET_CONFIGS = {
    bronze: {
        name: "青铜门票",
        description: "通用门票，适用于所有游戏和活动，跨赛季保留",
        price: { coins: 100 },
        maxUsagePerDay: 10,
        seasonalRetention: 1.0 // 完全保留
    },
    silver: {
        name: "白银门票", 
        description: "通用高级门票，提供更好的奖励，50%跨赛季保留",
        price: { coins: 250 },
        maxUsagePerDay: 5,
        seasonalRetention: 0.5 // 50%保留
    },
    gold: {
        name: "黄金门票",
        description: "通用顶级门票，提供最佳奖励，赛季重置",
        price: { coins: 500 },
        maxUsagePerDay: 3,
        seasonalRetention: 0.0 // 完全重置
    }
};
```

### 8.2 跨赛季保留策略
```typescript
// 门票跨赛季保留策略
{
    bronze: {
        retention: "完全保留",
        reason: "基础门票，价值较低，保留不影响平衡",
        impact: "提高新玩家体验，减少流失"
    },
    silver: {
        retention: "50%保留",
        reason: "中等价值，部分保留平衡玩家投资和系统平衡",
        impact: "鼓励适度使用，防止囤积"
    },
    gold: {
        retention: "完全重置",
        reason: "高价值门票，重置促进购买和赛季竞争",
        impact: "维持经济平衡，促进付费"
    }
}
```

### 8.3 门票用途
```typescript
// 门票使用场景
{
    tournament: "锦标赛入场",
    special: "特殊活动",
    premium: "高级功能"
}
```

## 9. 经济系统

### 9.1 货币体系
```typescript
// 主要货币
{
    coins: "金币 - 通用货币",
    seasonPoints: "赛季积分 - 赛季性货币",
    prestige: "声望 - 长期成就货币"
}

// 货币关系
{
    coins: "购买门票、道具、Battle Pass",
    seasonPoints: "Battle Pass进度、赛季商店",
    prestige: "专属物品、高级功能"
}
```

### 9.2 平衡策略
```typescript
// 免费玩家
{
    dailyCoins: "50-100金币/日",
    seasonPoints: "80-150赛季积分/日",
    battlePass: "6.5级预期"
}

// 付费玩家
{
    dailyCoins: "100-200金币/日",
    seasonPoints: "150-300赛季积分/日", 
    battlePass: "16.5级预期"
}
```

## 10. 赛季管理

### 10.1 赛季周期
```typescript
// 赛季时间
{
    duration: "1个月",
    startDate: "每月1日",
    endDate: "每月最后一日",
    resetTime: "多伦多时间00:00"
}
```

### 10.2 赛季重置
```typescript
// 重置内容
{
    seasonPoints: "完全重置",
    battlePass: "重新开始",
    tournament: "新赛季开始",
    tasks: "任务重新分配",
    tickets: "按保留策略处理"
}

// 保留内容
{
    coins: "永久保留",
    prestige: "永久保留",
    inventory: "道具保留",
    achievements: "成就保留",
    bronzeTickets: "青铜门票完全保留",
    silverTickets: "白银门票50%保留",
    goldTickets: "黄金门票完全重置"
}
```

## 11. 数据架构

### 11.1 核心表结构
```typescript
// 玩家相关
players: "玩家基础信息",
player_battle_pass: "Battle Pass进度",
player_tickets: "门票库存 (支持赛季ID)",
player_props: "道具库存",

// 赛季相关
season_point_transactions: "赛季积分交易",
battle_pass_rewards: "Battle Pass奖励记录",
battle_pass_season_points_logs: "赛季积分日志",

// 任务相关
player_tasks: "活跃任务",
completed_tasks: "已完成任务", 
expired_tasks: "过期任务",
task_events: "任务事件日志",

// 锦标赛相关
tournaments: "锦标赛信息",
tournament_participants: "参赛者",
tournament_results: "比赛结果",

// 对局相关
matches: "对局信息",
match_results: "对局结果",
prop_usage: "道具使用记录"
```

### 11.2 索引设计
```typescript
// 性能优化索引
{
    "by_uid_season": ["uid", "seasonId"],
    "by_season_totalSeasonPoints": ["seasonId", "totalSeasonPoints"],
    "by_uid_type": ["uid", "type"],
    "by_tournament_status": ["tournamentId", "status"]
}
```

## 12. API设计

### 12.1 核心API
```typescript
// Battle Pass API
getCurrentBattlePassConfig()
getPlayerBattlePass()
addBattlePassSeasonPoints()
claimBattlePassRewards()

// 任务 API
getPlayerActiveTasks()
processTaskEvent()
claimTaskRewards()

// 锦标赛 API
getTournaments()
joinTournament()
getTournamentResults()

// 门票 API
getPlayerTickets()
purchaseTicket()
useTicket()
resetSeasonTickets() // 赛季重置

// 道具 API
getPlayerProps()
useProp()
purchaseProp()
```

### 12.2 集成API
```typescript
// 自动赛季积分添加
addTournamentSeasonPoints()
addQuickMatchSeasonPoints()
addPropMatchSeasonPoints()
addTaskSeasonPoints()

// 批量操作
batchClaimBattlePassRewards()
batchAddBattlePassSeasonPoints()
batchAllocateTasks()
batchResetSeasonTickets() // 批量赛季重置
```

## 13. 运营策略

### 13.1 目标指标
```typescript
// 参与度指标
{
    dailyActiveUsers: "目标30%-40%",
    battlePassParticipation: "目标60%-70%",
    tournamentParticipation: "目标20%-30%"
}

// 付费指标
{
    battlePassConversion: "目标8%-12%",
    averageRevenuePerUser: "目标$3-$5",
    retentionRate: "新玩家流失率<15%"
}

// 平衡指标
{
    newPlayerLevel: ">10级",
    casualPlayerLevel: ">15级",
    competitivePlayerLevel: ">25级"
}
```

### 13.2 调整机制
```typescript
// 动态调整
{
    seasonPointsAdjustment: "根据参与度调整赛季积分获取",
    rewardAdjustment: "根据付费转化调整奖励价值",
    difficultyAdjustment: "根据玩家进度调整难度",
    ticketRetentionAdjustment: "根据门票使用数据调整保留比例"
}
```

## 14. 部署计划

### 14.1 第一阶段 (基础系统)
```typescript
// 核心功能
{
    seasonPoints: "赛季积分系统",
    basicBattlePass: "基础Battle Pass",
    simpleTournaments: "简单锦标赛",
    basicTasks: "基础任务系统",
    ticketSystem: "门票系统 (基础功能)"
}
```

### 14.2 第二阶段 (完善系统)
```typescript
// 高级功能
{
    premiumBattlePass: "付费Battle Pass",
    advancedTournaments: "高级锦标赛",
    complexTasks: "复杂任务系统",
    propSystem: "道具系统",
    ticketSeasonalReset: "门票跨赛季保留"
}
```

### 14.3 第三阶段 (优化系统)
```typescript
// 优化功能
{
    analytics: "数据分析",
    optimization: "性能优化",
    automation: "自动化运营",
    expansion: "功能扩展"
}
```

## 15. 总结

这个基于赛季的游戏平台设计通过统一的赛季积分系统实现了各个子系统的有机整合：

### 🎯 核心优势
1. **统一经济**: 赛季积分作为核心货币，避免多货币复杂性
2. **赛季循环**: 定期重置保持新鲜感和公平性
3. **平衡设计**: 免费和付费玩家都能获得价值
4. **参与激励**: 多样化的赛季积分获取方式
5. **运营灵活**: 可根据数据动态调整系统参数
6. **门票保留**: 跨赛季保留策略保护玩家投资

### 🔄 系统集成
- **Battle Pass** 基于赛季积分进度
- **锦标赛** 提供主要赛季积分来源
- **任务系统** 提供多样化赛季积分获取
- **道具系统** 增强游戏体验
- **门票系统** 统一管理入场券，支持跨赛季保留

### 📈 预期效果
- 新玩家6.5级，休闲玩家16.5级，竞技玩家28级
- 8%-12%的Battle Pass付费转化率
- 30%-40%的日活跃用户参与度
- 新玩家流失率控制在15%以下
- 门票跨赛季保留提高玩家留存率

### 🎫 门票跨赛季保留特色
- **青铜门票**: 完全保留，提高新玩家体验
- **白银门票**: 50%保留，平衡投资和系统平衡
- **黄金门票**: 完全重置，维持经济平衡

这个设计为游戏平台提供了可持续发展的基础，通过赛季循环、统一经济系统和门票跨赛季保留策略实现了长期运营的可行性。 