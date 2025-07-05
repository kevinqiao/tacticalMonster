# 锦标赛系统设计文档

## 概述

本文档描述了完整的锦标赛系统实现，包括架构设计、核心功能、数据模型、调度机制和测试框架。

## 系统架构

### 核心组件

1. **TournamentService** - 统一锦标赛服务
2. **TournamentScheduler** - 锦标赛调度器
3. **MatchManager** - 比赛管理器
4. **TournamentMatchingService** - 锦标赛匹配服务
5. **RuleEngine** - 规则引擎

### 数据模型

#### 主要表结构

```typescript
// 锦标赛表
tournaments: {
  _id: Id<"tournaments">;
  seasonId: Id<"seasons">;
  gameType: string;
  segmentName: string;
  status: "open" | "in_progress" | "completed" | "expired";
  playerUids: string[];
  tournamentType: string;
  isSubscribedRequired: boolean;
  isSingleMatch: boolean;
  prizePool: number;
  config: any;
  createdAt: string;
  updatedAt: string;
  endTime: string;
}

// 比赛表
matches: {
  _id: Id<"matches">;
  tournamentId: Id<"tournaments">;
  gameType: string;
  matchType: string;
  status: "pending" | "in_progress" | "completed";
  maxPlayers: number;
  minPlayers: number;
  startTime?: string;
  endTime?: string;
  gameData: any;
  createdAt: string;
  updatedAt: string;
}

// 玩家比赛表
player_matches: {
  _id: Id<"player_matches">;
  matchId: Id<"matches">;
  tournamentId: Id<"tournaments">;
  uid: string;
  gameType: string;
  score: number;
  rank?: number;
  completed: boolean;
  attemptNumber: number;
  propsUsed: string[];
  playerGameData: any;
  joinTime: string;
  leaveTime?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 核心功能

### 1. 锦标赛服务 (TournamentService)

#### 主要方法

- `joinTournament()` - 加入锦标赛
- `submitScore()` - 提交分数
- `settleTournament()` - 结算锦标赛
- `getTournamentDetails()` - 获取锦标赛详情
- `getPlayerTournamentHistory()` - 获取玩家锦标赛历史
- `cleanupExpiredTournaments()` - 清理过期锦标赛
- `settleCompletedTournaments()` - 结算完成的锦标赛

#### 使用示例

```typescript
// 加入锦标赛
const result = await TournamentService.joinTournament(ctx, {
  uid: "user123",
  gameType: "solitaire",
  tournamentType: "daily_special"
});

// 提交分数
const submitResult = await TournamentService.submitScore(ctx, {
  tournamentId: "tournament_123",
  uid: "user123",
  gameType: "solitaire",
  score: 1000,
  gameData: { moves: 50, time: 300 },
  propsUsed: ["hint", "undo"],
  gameId: "game_456"
});
```

### 2. 锦标赛调度器 (TournamentScheduler)

#### 自动创建功能

- **每日锦标赛** - 每天凌晨00:00自动创建
- **每周锦标赛** - 每周一凌晨00:00自动创建
- **赛季锦标赛** - 每月第一天凌晨00:00自动创建

#### 限制重置功能

- **每日限制** - 每天凌晨00:01重置
- **每周限制** - 每周一凌晨00:01重置
- **赛季限制** - 每月第一天凌晨00:01重置

#### 使用示例

```typescript
// 手动创建每日锦标赛
const result = await TournamentScheduler.createDailyTournaments(ctx);

// 手动重置每日限制
const resetResult = await TournamentScheduler.resetDailyLimits(ctx);
```

### 3. 比赛管理器 (MatchManager)

#### 主要功能

- 创建比赛
- 玩家加入比赛
- 提交分数
- 结束比赛
- 创建远程游戏

#### 使用示例

```typescript
// 创建比赛
const matchId = await MatchManager.createMatch(ctx, {
  tournamentId: "tournament_123",
  gameType: "solitaire",
  matchType: "single_match",
  maxPlayers: 1,
  minPlayers: 1
});

// 玩家加入比赛
const playerMatchId = await MatchManager.joinMatch(ctx, {
  matchId,
  tournamentId: "tournament_123",
  uid: "user123",
  gameType: "solitaire"
});
```

### 4. 锦标赛匹配服务 (TournamentMatchingService)

#### 功能特性

- 技能匹配
- 段位匹配
- 等待队列管理
- 自动匹配

#### 使用示例

```typescript
// 加入匹配队列
const matchResult = await TournamentMatchingService.joinTournamentMatch(ctx, {
  uid: "user123",
  tournamentId: "tournament_123",
  gameType: "rummy",
  player: playerData,
  config: tournamentConfig
});
```

## 锦标赛类型

### 1. 每日锦标赛 (Daily Tournaments)

- **特点**: 每日重置，限时参与
- **持续时间**: 24小时
- **参与限制**: 每日3次（订阅用户5次）
- **奖励**: 基础奖励 + 排名奖励

### 2. 每周锦标赛 (Weekly Tournaments)

- **特点**: 每周重置，多人对战
- **持续时间**: 7天
- **参与限制**: 每周21次（订阅用户35次）
- **奖励**: 丰厚奖励 + 段位加成

### 3. 赛季锦标赛 (Seasonal Tournaments)

- **特点**: 赛季级别，最高荣誉
- **持续时间**: 30天
- **参与限制**: 赛季90次（订阅用户150次）
- **奖励**: 最高奖励 + 特殊道具

### 4. 单人锦标赛 (Single Player Tournaments)

- **特点**: 独立尝试，挑战自我
- **匹配**: 无需等待，立即开始
- **结算**: 完成后立即结算
- **奖励**: 基于分数阈值

### 5. 多人锦标赛 (Multi Player Tournaments)

- **特点**: 实时对战，技能匹配
- **匹配**: 等待其他玩家
- **结算**: 所有比赛完成后结算
- **奖励**: 基于排名

## 配置系统

### 锦标赛配置 (tournamentConfigs.ts)

```typescript
interface TournamentConfig {
  typeId: string;
  name: string;
  description: string;
  category: TournamentCategory;
  gameType: GameType;
  isActive: boolean;
  priority: number;
  
  entryRequirements: EntryRequirements;
  matchRules: MatchRules;
  rewards: RewardConfig;
  schedule: ScheduleConfig;
  limits: LimitConfig;
  advanced: AdvancedConfig;
}
```

### 配置管理

- **获取配置**: `getTournamentConfig(typeId)`
- **验证配置**: `validateTournamentConfig(config)`
- **创建配置**: `createDefaultTournamentConfig()`

## 调度系统

### Cron 任务配置

```typescript
// 每日任务
crons.daily("create daily tournaments", { hourUTC: 0, minuteUTC: 0 }, ...);
crons.daily("reset daily limits", { hourUTC: 0, minuteUTC: 1 }, ...);

// 每周任务
crons.weekly("create weekly tournaments", { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 }, ...);
crons.weekly("reset weekly limits", { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 1 }, ...);

// 每月任务
crons.monthly("create seasonal tournaments", { day: 1, hourUTC: 0, minuteUTC: 0 }, ...);
crons.monthly("reset seasonal limits", { day: 1, hourUTC: 0, minuteUTC: 1 }, ...);

// 清理任务
crons.daily("cleanup expired tournaments", { hourUTC: 2, minuteUTC: 0 }, ...);
crons.hourly("settle completed tournaments", { minuteUTC: 0 }, ...);
```

## 测试框架

### 测试类型

1. **单元测试** - 测试单个函数
2. **集成测试** - 测试组件交互
3. **端到端测试** - 测试完整流程
4. **性能测试** - 测试系统性能
5. **场景测试** - 测试业务场景

### 测试工具

- **简单测试框架** - `simpleTestFramework.ts`
- **测试运行器** - `testRunner.ts`
- **模拟数据** - `mockData.ts`
- **测试工具** - `testUtils.ts`

### 运行测试

```typescript
// 运行所有测试
await runAllTournamentTests();

// 运行特定测试
await runSpecificTournamentTest("testCreateDailyTournaments");

// 运行锦标赛调度器测试
await runTournamentSchedulerTests();
```

## 错误处理

### 错误类型

1. **验证错误** - 参赛条件不满足
2. **限制错误** - 超出参与限制
3. **系统错误** - 数据库或网络错误
4. **业务错误** - 业务逻辑错误

### 错误处理策略

- **优雅降级** - 系统错误时保持基本功能
- **重试机制** - 网络错误时自动重试
- **错误日志** - 记录详细错误信息
- **用户通知** - 向用户显示友好错误信息

## 性能优化

### 数据库优化

- **索引优化** - 为常用查询创建索引
- **查询优化** - 减少不必要的数据库查询
- **批量操作** - 使用批量操作提高效率

### 缓存策略

- **配置缓存** - 缓存锦标赛配置
- **结果缓存** - 缓存计算结果
- **状态缓存** - 缓存系统状态

### 并发处理

- **异步处理** - 使用异步操作提高响应速度
- **队列处理** - 使用队列处理大量请求
- **负载均衡** - 分散系统负载

## 监控和日志

### 监控指标

- **参与率** - 锦标赛参与情况
- **完成率** - 锦标赛完成情况
- **奖励分布** - 奖励发放情况
- **系统性能** - 响应时间和错误率

### 日志记录

- **操作日志** - 记录用户操作
- **错误日志** - 记录系统错误
- **性能日志** - 记录性能指标
- **审计日志** - 记录重要事件

## 安全考虑

### 数据安全

- **输入验证** - 验证所有用户输入
- **权限控制** - 控制数据访问权限
- **数据加密** - 加密敏感数据

### 业务安全

- **防作弊** - 检测和防止作弊行为
- **限制控制** - 严格控制参与限制
- **审计追踪** - 追踪所有重要操作

## 扩展性

### 水平扩展

- **微服务架构** - 支持服务拆分
- **负载均衡** - 支持多实例部署
- **数据库分片** - 支持数据分片

### 功能扩展

- **插件系统** - 支持功能插件
- **配置驱动** - 通过配置扩展功能
- **API扩展** - 支持API版本管理

## 部署指南

### 环境要求

- **Node.js** - 版本 18+
- **Convex** - 最新版本
- **数据库** - Convex 内置数据库

### 部署步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   ```bash
   CONVEX_DEPLOY_KEY=your_deploy_key
   ```

3. **部署到 Convex**
   ```bash
   npx convex deploy
   ```

4. **验证部署**
   ```bash
   npx convex dev
   ```

## 维护指南

### 日常维护

- **监控系统状态** - 定期检查系统运行状态
- **清理过期数据** - 定期清理过期数据
- **更新配置** - 根据需要更新锦标赛配置

### 故障处理

- **错误诊断** - 分析错误日志
- **系统恢复** - 执行恢复操作
- **预防措施** - 实施预防措施

## 总结

本锦标赛系统提供了完整的锦标赛管理功能，包括：

1. **完整的生命周期管理** - 从创建到结算
2. **灵活的配置系统** - 支持多种锦标赛类型
3. **自动调度机制** - 减少人工干预
4. **完善的测试框架** - 确保系统质量
5. **良好的扩展性** - 支持未来功能扩展

系统设计考虑了性能、安全、可维护性等多个方面，为游戏平台提供了稳定可靠的锦标赛服务。 