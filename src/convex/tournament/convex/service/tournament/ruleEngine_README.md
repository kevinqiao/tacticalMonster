# ruleEngine.ts 详细说明

`ruleEngine.ts` 是锦标赛系统的核心规则引擎，负责处理所有与锦标赛规则相关的逻辑，包括限制验证、费用扣除、奖励分配等。

## 📋 文件结构概览

### 1. 类型定义

```typescript
export interface TournamentRules {
  // 基础限制
  maxAttempts?: number;        // 总尝试次数限制
  dailyLimit?: number;         // 每日参与次数限制

  // 锦标赛模式选择
  allowReuse?: boolean;        // 是否允许复用锦标赛（多人共享）
  independentAttempts?: boolean; // 每次尝试创建独立锦标赛

  // 提交次数控制
  maxSubmissionsPerTournament?: number; // 单个锦标赛中最大提交次数

  // 每日限制
  maxTournamentsPerDay?: number; // 每日最大锦标赛参与数量

  // 其他规则
  createInitialMatch?: boolean; // 是否创建初始match记录
  minPlayers?: number;         // 最小玩家数
  maxPlayers?: number;         // 最大玩家数
  timeLimit?: number;          // 时间限制（分钟）
  autoClose?: boolean;         // 是否自动关闭
  autoCloseDelay?: number;     // 自动关闭延迟（分钟）
}
```

## 🔧 核心功能模块

### 1. 限制验证系统 (`validateLimits`)

这是规则引擎的核心功能，支持多层级限制验证：

#### 验证流程
```typescript
export async function validateLimits(ctx: any, { 
  uid, gameType, tournamentType, isSubscribed, limits, seasonId 
}: any)
```

**验证层级**：
1. **每日限制** - 检查玩家今日参与次数
2. **每周限制** - 检查玩家本周参与次数  
3. **赛季限制** - 检查玩家本赛季参与次数
4. **总限制** - 检查玩家总参与次数

#### 每日限制验证 (`validateDailyLimits`)
```typescript
async function validateDailyLimits(ctx: any, { 
  uid, gameType, tournamentType, isSubscribed, limits, today 
}: any)
```

**功能**：
- 查询玩家今日参与记录
- 检查是否超过每日限制
- 自动更新参与计数
- 支持订阅用户特殊限制

**数据库操作**：
```typescript
const dailyLimit = await ctx.db
  .query("player_tournament_limits")
  .withIndex("by_uid_tournament_date", (q: any) =>
    q.eq("uid", uid).eq("tournamentType", tournamentType).eq("date", today)
  )
  .first();
```

#### 每周限制验证 (`validateWeeklyLimits`)
```typescript
async function validateWeeklyLimits(ctx: any, { 
  uid, gameType, tournamentType, isSubscribed, limits, weekStart 
}: any)
```

**功能**：
- 以周一为周开始日期
- 检查本周参与次数
- 支持订阅用户更高限制

#### 赛季限制验证 (`validateSeasonalLimits`)
```typescript
async function validateSeasonalLimits(ctx: any, { 
  uid, gameType, tournamentType, isSubscribed, limits, seasonId 
}: any)
```

**功能**：
- 基于赛季ID验证
- 检查本赛季参与次数
- 支持订阅用户特殊待遇

#### 总限制验证 (`validateTotalLimits`)
```typescript
async function validateTotalLimits(ctx: any, { 
  uid, gameType, tournamentType, isSubscribed, limits 
}: any)
```

**功能**：
- 统计所有历史参与记录
- 检查总参与次数上限
- 防止过度参与

### 2. 费用扣除系统

#### 入场费扣除 (`deductEntryFee`)
```typescript
export async function deductEntryFee(ctx: any, { 
  uid, gameType, tournamentType, entryFee, inventory 
}: any)
```

**功能**：
- 优先使用门票支付
- 门票不足时使用金币
- 自动更新玩家库存
- 返回扣除方式和数量

**支付优先级**：
1. 门票支付（如果配置了门票）
2. 金币支付（如果金币足够）
3. 抛出错误（如果都不足）

**实现逻辑**：
```typescript
const ticket = entryFee.ticket
  ? inventory.tickets?.find(
    (t: any) => t.gameType === gameType && 
               t.tournamentType === tournamentType && 
               t.quantity >= entryFee.ticket.quantity
  )
  : null;

if (ticket) {
  // 使用门票支付
  await ctx.db.patch(inventory._id, {
    tickets: inventory.tickets.map((t: any) =>
      t.gameType === gameType && t.tournamentType === tournamentType
        ? { ...t, quantity: t.quantity - entryFee.ticket.quantity }
        : t
    ),
    updatedAt: now.iso,
  });
  return { method: "ticket", amount: entryFee.ticket.quantity };
} else if (inventory.coins >= entryFee.coins) {
  // 使用金币支付
  await ctx.db.patch(inventory._id, {
    coins: inventory.coins - entryFee.coins,
    updatedAt: now.iso,
  });
  return { method: "coins", amount: entryFee.coins };
} else {
  throw new Error("金币或门票不足");
}
```

#### 道具扣除 (`deductProps`)
```typescript
export async function deductProps(ctx: any, { 
  uid, gameType, propsUsed, inventory 
}: any)
```

**功能**：
- 批量扣除使用的道具
- 验证道具数量是否足够
- 自动更新库存记录

**实现逻辑**：
```typescript
const propCounts = new Map<string, number>();
for (const prop of propsUsed) {
  propCounts.set(prop, (propCounts.get(prop) || 0) + 1);
}

const updatedProps = inventory.props.map((p: any) => {
  if (p.gameType === gameType && propCounts.has(p.propType)) {
    const used = propCounts.get(p.propType)!;
    if (p.quantity < used) throw new Error(`道具 ${p.propType} 不足`);
    return { ...p, quantity: p.quantity - used };
  }
  return p;
});
```

### 3. 奖励分配系统 (`applyRules`)

这是最复杂的核心功能，负责计算和分配奖励：

```typescript
export async function applyRules(ctx: any, { 
  tournament, uid, matches, player, inventory, playerSeason 
}: any)
```

#### 排名计算
支持两种排名方式：

**阈值排名 (`threshold`)**：
```typescript
if (config.rules.ranking === "threshold") {
  rank = highestScore >= config.rules.scoreThreshold ? 1 : 2;
  pointsEarned = highestScore >= config.rules.scoreThreshold ? 
    config.rewards[0].gamePoints : config.rewards[1].gamePoints;
  reward = config.rewards.find((r: any) => r.rankRange[0] === rank);
}
```

**最高分排名 (`highest_score`)**：
```typescript
else if (config.rules.ranking === "highest_score") {
  const playerScores = new Map<string, number>();
  for (const match of matches) {
    const currentScore = playerScores.get(match.uid) || 0;
    playerScores.set(match.uid, Math.max(currentScore, match.score));
  }
  const sortedPlayers = [...playerScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([uid], index) => ({ uid, rank: index + 1 }));
  const playerRank = sortedPlayers.find((p: any) => p.uid === uid);
  rank = playerRank?.rank || 0;
  reward = config.rewards.find((r: any) => rank >= r.rankRange[0] && rank <= r.rankRange[1]);
  pointsEarned = reward.gamePoints;
}
```

#### 奖励计算
**基础奖励**：
- 根据排名获取基础奖励
- 包含金币、游戏积分、道具、门票

**订阅加成**：
```typescript
if (player.isSubscribed) {
  finalReward.coins *= config.subscriberBonus?.coins || 1.2;
  finalReward.gamePoints *= config.subscriberBonus?.gamePoints || 1.5;
}
```

**段位加成**：
```typescript
if (player.segmentName === "Gold") {
  finalReward.coins *= 1.1;
  finalReward.gamePoints *= 1.1;
} else if (player.segmentName === "Platinum") {
  finalReward.coins *= 1.2;
  finalReward.gamePoints *= 1.2;
}
```

#### 数据更新
**库存更新**：
```typescript
await ctx.db.patch(inventory._id, {
  coins: inventory.coins + finalReward.coins,
  props: updateProps(inventory.props, finalReward.props),
  tickets: updateTickets(inventory.tickets, finalReward.tickets ? finalReward.tickets : []),
  updatedAt: now.iso,
});
```

**赛季数据更新**：
```typescript
await ctx.db.patch(playerSeason._id, {
  seasonPoints: playerSeason.seasonPoints + finalReward.gamePoints,
  gamePoints: {
    ...playerSeason.gamePoints,
    [tournament.gameType]: playerSeason.gamePoints[tournament.gameType] + finalReward.gamePoints,
  },
  updatedAt: now.iso,
});
```

**段位升级**：
```typescript
const newSegment = determineSegment(playerSeason.gamePoints[tournament.gameType]);
if (newSegment !== player.segmentName) {
  await ctx.db.patch(player._id, { segmentName: newSegment });
}
```

#### 社交分享
```typescript
if (config.share && Math.random() < config.share.probability && 
    rank >= config.share.rankRange[0] && rank <= config.share.rankRange[1]) {
  await ctx.db.insert("player_shares", {
    uid,
    gameType: tournament.gameType,
    content: `我在 ${tournament.gameType} ${tournament.tournamentType} 锦标赛中排名第${rank}！#GamePlatform`,
    platform: "x",
    createdAt: now.iso,
  });
}
```

### 4. 赛季奖励分配 (`distributeSeasonRewards`)

```typescript
export async function distributeSeasonRewards(ctx: any, seasonId: string)
```

**功能**：
- 获取赛季前10名玩家
- 分配赛季结束奖励
- 给予额外金币和门票

**实现逻辑**：
```typescript
const playerSeasons = await ctx.db
  .query("player_seasons")
  .filter((q: any) => q.eq(q.field("seasonId"), seasonId))
  .order("desc")
  .take(10); // Top 10 玩家

let rewardedPlayers = 0;
for (const ps of playerSeasons) {
  const inventory = await ctx.db
    .query("player_inventory")
    .withIndex("by_uid", (q: any) => q.eq("uid", ps.uid))
    .first();
  await ctx.db.patch(inventory._id, {
    coins: inventory.coins + 1000,
    tickets: updateTickets(inventory.tickets, [
      { gameType: "solitaire", tournamentType: "daily_special", quantity: 2 },
    ]),
    updatedAt: now.iso,
  });
  rewardedPlayers++;
}
```

## 🛠️ 辅助功能

### 1. 时间计算 (`getWeekStart`)
```typescript
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - (day - 1));
  return date.toISOString().split("T")[0];
}
```

**功能**：计算指定日期所在周的开始日期（周一）

### 2. 道具更新 (`updateProps`)
```typescript
function updateProps(existing: any[], newProps: any[]) {
  const propMap = new Map(existing.map((p) => [`${p.gameType}_${p.propType}`, p.quantity]));
  for (const prop of newProps) {
    const key = `${prop.gameType}_${prop.propType}`;
    propMap.set(key, (propMap.get(key) || 0) + prop.quantity);
  }
  return Array.from(propMap.entries()).map((entry: any) => {
    const [key, quantity] = entry;
    const [gameType, propType] = key.split("_");
    return { gameType, propType, quantity };
  });
}
```

**功能**：合并现有道具和新获得道具

### 3. 门票更新 (`updateTickets`)
```typescript
function updateTickets(existing: any[], newTickets: any[]) {
  const ticketMap = new Map(existing.map((t) => [`${t.gameType}_${t.tournamentType}`, t.quantity]));
  for (const ticket of newTickets) {
    const key = `${ticket.gameType}_${ticket.tournamentType}`;
    ticketMap.set(key, (ticketMap.get(key) || 0) + ticket.quantity);
  }
  return Array.from(ticketMap.entries()).map((entry: any) => {
    const [key, quantity] = entry;
    const [gameType, tournamentType] = key.split("_");
    return { gameType, tournamentType, quantity };
  });
}
```

**功能**：合并现有门票和新获得门票

### 4. 段位判断 (`determineSegment`)
```typescript
function determineSegment(gamePoints: number): string {
  if (gamePoints >= 10000) return "Platinum";
  if (gamePoints >= 5000) return "Gold";
  if (gamePoints >= 1000) return "Silver";
  return "Bronze";
}
```

**功能**：根据游戏积分判断玩家段位

## 🔄 使用流程

### 1. 加入锦标赛时
```typescript
// 1. 验证参与限制
await validateLimits(ctx, { 
  uid, gameType, tournamentType, isSubscribed, limits, seasonId 
});

// 2. 扣除入场费
await deductEntryFee(ctx, { 
  uid, gameType, tournamentType, entryFee, inventory 
});
```

### 2. 提交分数时
```typescript
// 1. 扣除使用的道具
await deductProps(ctx, { 
  uid, gameType, propsUsed, inventory 
});

// 2. 应用规则并分配奖励
const result = await applyRules(ctx, { 
  tournament, uid, matches, player, inventory, playerSeason 
});
```

### 3. 赛季结束时
```typescript
// 分配赛季奖励
const rewardedPlayers = await distributeSeasonRewards(ctx, seasonId);
```

## 🎯 设计特点

### 1. 灵活性
- 支持多种排名方式（阈值排名、最高分排名）
- 可配置的限制层级（每日、每周、赛季、总限制）
- 灵活的奖励结构（金币、积分、道具、门票）

### 2. 公平性
- 多层级限制防止刷分
- 订阅用户特殊待遇
- 段位加成鼓励进步
- 随机社交分享增加趣味性

### 3. 可扩展性
- 模块化设计
- 清晰的接口定义
- 易于添加新规则
- 支持自定义配置

### 4. 数据一致性
- 事务性操作
- 原子性更新
- 错误回滚机制
- 数据完整性保证

## ⚡ 性能优化

### 1. 索引使用
- 使用数据库索引加速查询
- 避免全表扫描
- 优化查询性能

### 2. 批量操作
- 减少数据库调用次数
- 批量更新数据
- 提高操作效率

### 3. 缓存策略
- 缓存常用配置
- 减少重复计算
- 优化响应时间

## 🚨 错误处理

### 1. 限制验证错误
```typescript
throw new Error(`今日 ${tournamentType} 已达最大参与次数 (${maxDailyParticipations})`);
throw new Error(`本周 ${tournamentType} 已达最大参与次数 (${maxWeeklyParticipations})`);
throw new Error(`本赛季 ${tournamentType} 已达最大参与次数 (${maxSeasonalParticipations})`);
throw new Error(`总参与次数已达上限 (${maxTotalParticipations})`);
```

### 2. 费用不足错误
```typescript
throw new Error("金币或门票不足");
throw new Error(`道具 ${p.propType} 不足`);
```

### 3. 数据验证错误
- 检查必要参数是否存在
- 验证数据类型和格式
- 确保数据完整性

## 📊 监控和日志

### 1. 操作日志
- 记录所有限制验证操作
- 记录费用扣除操作
- 记录奖励分配操作

### 2. 性能监控
- 监控函数执行时间
- 监控数据库查询性能
- 监控错误率

### 3. 业务指标
- 参与次数统计
- 奖励分配统计
- 段位升级统计

## 🔧 配置示例

### 1. 基础限制配置
```typescript
const limits = {
  daily: {
    maxParticipations: 3,
    maxTournaments: 1,
    maxAttempts: 3
  },
  weekly: {
    maxParticipations: 21,
    maxTournaments: 7,
    maxAttempts: 21
  },
  seasonal: {
    maxParticipations: 90,
    maxTournaments: 30,
    maxAttempts: 90
  },
  total: {
    maxParticipations: 1000,
    maxTournaments: 500,
    maxAttempts: 3000
  }
};
```

### 2. 奖励配置
```typescript
const rewards = [
  {
    rankRange: [1, 1],
    coins: 200,
    gamePoints: 100,
    props: [
      {
        gameType: "solitaire",
        propType: "hint",
        quantity: 2
      }
    ]
  },
  {
    rankRange: [2, 3],
    coins: 100,
    gamePoints: 50,
    props: []
  }
];
```

### 3. 订阅加成配置
```typescript
const subscriberBonus = {
  coins: 1.2,
  gamePoints: 1.5
};
```

## 📝 总结

`ruleEngine.ts` 是整个锦标赛系统的核心组件，它：

1. **确保公平性** - 通过多层级限制和验证机制
2. **提供灵活性** - 支持多种配置和规则
3. **保证一致性** - 通过事务性操作和数据验证
4. **优化性能** - 使用索引和批量操作
5. **支持扩展** - 模块化设计便于维护和扩展

这个规则引擎确保了所有游戏规则的公平执行和奖励的准确分配，是整个锦标赛系统稳定运行的重要保障。 