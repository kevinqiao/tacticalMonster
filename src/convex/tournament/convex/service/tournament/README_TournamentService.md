# TournamentService 设计文档

## 概述

`TournamentService` 是一个统一的锦标赛服务类，为整个锦标赛系统提供核心功能。它支持单人锦标赛、多人锦标赛，并集成了远程游戏服务器。

## 架构设计

### 核心组件

```
TournamentService
├── 锦标赛管理 (Tournament Management)
├── 比赛管理 (Match Management) 
├── 分数处理 (Score Processing)
├── 奖励分配 (Reward Distribution)
└── 远程游戏集成 (Remote Game Integration)
```

### 设计模式

- **策略模式**: 使用不同的处理器处理不同类型的锦标赛
- **工厂模式**: 通过 `getHandler()` 创建对应的锦标赛处理器
- **单例模式**: 服务类提供静态方法，无需实例化

## 核心功能

### 1. 锦标赛加入 (Join Tournament)

**功能描述**: 玩家加入指定类型的锦标赛

**处理流程**:
1. 验证玩家信息
2. 获取当前活跃赛季
3. 根据锦标赛类型选择对应处理器
4. 执行加入逻辑
5. 返回加入结果

**接口**:
```typescript
static async joinTournament(ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: string;
}): Promise<JoinResult>
```

**返回数据**:
```typescript
{
    success: boolean;
    tournamentId: string;
    matchId: string;
    playerMatchId: string;
    gameId?: string;
    serverUrl?: string;
    message: string;
}
```

### 2. 分数提交 (Submit Score)

**功能描述**: 提交玩家在锦标赛中的游戏分数

**处理流程**:
1. 获取锦标赛信息
2. 选择对应的处理器
3. 执行分数提交逻辑
4. 处理道具使用和延迟扣除
5. 检查是否需要立即结算

**接口**:
```typescript
static async submitScore(ctx: any, params: {
    tournamentId: string;
    uid: string;
    gameType: string;
    score: number;
    gameData: any;
    propsUsed: string[];
    gameId?: string;
}): Promise<SubmitScoreResult>
```

**返回数据**:
```typescript
{
    success: boolean;
    matchId: string;
    score: number;
    deductionResult?: any;
    settleResult?: any;
    message: string;
}
```

### 3. 锦标赛结算 (Settle Tournament)

**功能描述**: 结算锦标赛并分配奖励

**处理流程**:
1. 获取锦标赛信息
2. 选择对应的处理器
3. 执行结算逻辑
4. 计算排名和分配奖励

**接口**:
```typescript
static async settleTournament(ctx: any, tournamentId: string): Promise<SettleResult>
```

### 4. 锦标赛详情查询 (Get Tournament Details)

**功能描述**: 获取锦标赛的详细信息

**返回数据**:
```typescript
{
    tournament: Tournament;
    matches: Match[];
    players: PlayerStats[];
    totalMatches: number;
    totalPlayers: number;
}
```

### 5. 玩家锦标赛历史 (Player Tournament History)

**功能描述**: 获取玩家参与的锦标赛历史记录

**接口**:
```typescript
static async getPlayerTournamentHistory(ctx: any, params: {
    uid: string;
    limit?: number;
}): Promise<TournamentHistory[]>
```

### 6. 匹配队列管理 (Match Queue Management)

**功能描述**: 管理多人锦标赛的匹配队列

**包含功能**:
- 创建匹配队列
- 加入匹配队列
- 获取队列状态

## 处理器系统

### 处理器类型

1. **单人锦标赛处理器** (`singlePlayerTournamentHandler`)
   - 处理单人游戏锦标赛
   - 支持多次尝试
   - 立即结算

2. **多人锦标赛处理器** (`multiPlayerTournamentHandler`)
   - 处理多人游戏锦标赛
   - 支持匹配队列
   - 延迟结算

### 处理器选择逻辑

```typescript
function getHandler(tournamentType: string): TournamentHandler {
    switch (tournamentType) {
        case "single_player_tournament":
            return singlePlayerTournamentHandler;
        case "multi_player_tournament":
            return multiPlayerTournamentHandler;
        default:
            throw new Error(`未知的锦标赛类型: ${tournamentType}`);
    }
}
```

## 数据流

### 锦标赛创建流程

```
玩家请求 → 验证条件 → 选择处理器 → 创建锦标赛 → 创建比赛 → 返回结果
```

### 分数提交流程

```
分数提交 → 验证数据 → 选择处理器 → 提交分数 → 处理道具 → 检查结算 → 返回结果
```

### 结算流程

```
触发结算 → 选择处理器 → 计算排名 → 分配奖励 → 更新状态 → 完成结算
```

## 错误处理

### 错误类型

1. **验证错误**
   - 玩家不存在
   - 锦标赛不存在
   - 参赛条件不满足

2. **业务错误**
   - 分数不匹配
   - 道具使用超限
   - 赛季信息不存在

3. **系统错误**
   - 数据库操作失败
   - 远程服务调用失败

### 错误处理策略

- 使用 try-catch 包装关键操作
- 提供详细的错误信息
- 支持错误日志记录
- 实现优雅降级

## 性能优化

### 数据库优化

1. **索引使用**
   - 使用复合索引加速查询
   - 避免全表扫描

2. **批量操作**
   - 批量插入比赛记录
   - 批量更新玩家状态

### 缓存策略

1. **配置缓存**
   - 缓存锦标赛配置
   - 减少重复查询

2. **状态缓存**
   - 缓存活跃锦标赛状态
   - 提高响应速度

## 安全考虑

### 数据验证

1. **输入验证**
   - 验证玩家身份
   - 验证分数合理性
   - 验证道具使用

2. **权限控制**
   - 检查参赛权限
   - 验证操作权限

### 防作弊机制

1. **分数验证**
   - 验证分数计算逻辑
   - 检测异常分数

2. **行为监控**
   - 监控异常操作
   - 记录操作日志

## 监控和日志

### 监控指标

1. **性能指标**
   - 响应时间
   - 吞吐量
   - 错误率

2. **业务指标**
   - 参与人数
   - 完成率
   - 奖励分配

### 日志记录

1. **操作日志**
   - 记录关键操作
   - 追踪操作流程

2. **错误日志**
   - 记录错误信息
   - 便于问题排查

## 扩展性设计

### 新锦标赛类型

1. **添加新处理器**
   - 实现 `TournamentHandler` 接口
   - 注册到处理器选择器

2. **配置扩展**
   - 扩展配置结构
   - 支持新规则

### 新游戏类型

1. **游戏适配**
   - 实现游戏特定逻辑
   - 添加游戏配置

2. **分数计算**
   - 实现游戏特定分数计算
   - 支持不同评分规则

## 使用示例

### 基本使用

```typescript
// 加入锦标赛
const joinResult = await TournamentService.joinTournament(ctx, {
    uid: "player123",
    gameType: "solitaire",
    tournamentType: "single_player_tournament"
});

// 提交分数
const submitResult = await TournamentService.submitScore(ctx, {
    tournamentId: joinResult.tournamentId,
    uid: "player123",
    gameType: "solitaire",
    score: 1000,
    gameData: { moves: 50, timeTaken: 300 },
    propsUsed: []
});

// 结算锦标赛
const settleResult = await TournamentService.settleTournament(ctx, joinResult.tournamentId);
```

### 高级使用

```typescript
// 获取锦标赛详情
const details = await TournamentService.getTournamentDetails(ctx, tournamentId);

// 获取玩家历史
const history = await TournamentService.getPlayerTournamentHistory(ctx, {
    uid: "player123",
    limit: 20
});

// 创建匹配队列
const queue = await TournamentService.createMatchQueue(ctx, {
    tournamentId: tournamentId,
    gameType: "rummy",
    maxPlayers: 4,
    minPlayers: 2
});
```

## 测试策略

### 单元测试

1. **功能测试**
   - 测试各个方法的功能
   - 验证返回结果

2. **边界测试**
   - 测试边界条件
   - 测试异常情况

### 集成测试

1. **端到端测试**
   - 测试完整流程
   - 验证系统集成

2. **性能测试**
   - 测试并发性能
   - 测试负载能力

## 部署和运维

### 部署要求

1. **环境依赖**
   - Convex 平台
   - 数据库连接
   - 远程游戏服务

2. **配置管理**
   - 环境变量配置
   - 功能开关配置

### 运维监控

1. **健康检查**
   - 服务可用性检查
   - 数据库连接检查

2. **告警机制**
   - 错误率告警
   - 性能告警

## 版本历史

### v1.0.0 (当前版本)
- 基础锦标赛功能
- 单人/多人锦标赛支持
- 远程游戏集成
- 奖励分配系统

### 计划功能
- 实时匹配优化
- 高级统计功能
- 社交功能集成
- 移动端优化

## 总结

`TournamentService` 提供了一个完整、可扩展的锦标赛解决方案，支持多种游戏类型和锦标赛模式。通过模块化设计和清晰的接口，系统具有良好的可维护性和扩展性。

该服务采用现代化的架构模式，集成了错误处理、性能优化、安全控制等最佳实践，为游戏平台提供了稳定可靠的锦标赛服务。 