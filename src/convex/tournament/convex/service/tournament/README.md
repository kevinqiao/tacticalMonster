# Tournament System Documentation

## 概述

这是一个完整的锦标赛系统，支持多种锦标赛类型和远程游戏服务器集成。

## 核心组件

### 1. 锦标赛处理器 (Handlers)
- `base.ts` - 基础处理器，提供通用功能
- `dailySpecial.ts` - 每日特殊锦标赛
- `independentTournament.ts` - 独立锦标赛
- `singlePlayerTournament.ts` - 单人锦标赛
- `multiPlayerTournament.ts` - 多人锦标赛

### 2. 比赛管理
- `matchManager.ts` - 比赛管理器，处理比赛创建、加入、分数提交
- `tournamentMatchingService.ts` - 锦标赛匹配服务，处理多人匹配

### 3. 配置系统
- `configHelper.ts` - 配置辅助工具
- `ruleEngine.ts` - 规则引擎，处理奖励分配和限制验证

### 4. 统一服务
- `tournamentService.ts` - 统一锦标赛服务接口

## 主要功能

### 锦标赛类型
1. **每日特殊锦标赛** - 每日限时，丰厚奖励
2. **独立锦标赛** - 每次尝试创建独立锦标赛
3. **单人锦标赛** - 挑战自我，追求最高分
4. **多人锦标赛** - 实时对战，争夺排名

### 核心特性
- ✅ 远程游戏服务器集成
- ✅ 技能匹配算法
- ✅ 灵活的配置系统
- ✅ 完整的限制管理
- ✅ 延迟道具扣除
- ✅ 事件驱动架构

## 配置系统

### 锦标赛配置
支持完整的配置定义，包括：
- 参赛条件
- 比赛规则
- 奖励配置
- 时间安排
- 参与限制
- 高级设置

### 限制管理
支持多层级限制：
- 每日限制
- 每周限制
- 赛季限制
- 总限制
- 订阅用户特殊限制

## 架构设计

### 数据流
1. 玩家加入锦标赛
2. 验证参赛条件
3. 扣除入场费
4. 创建或加入比赛
5. 创建远程游戏
6. 提交分数
7. 结算奖励

### 事件系统
- 比赛创建事件
- 玩家加入事件
- 分数提交事件
- 比赛完成事件
- 奖励分配事件

## 使用示例

```typescript
// 加入锦标赛
const result = await TournamentService.joinTournament(ctx, {
    uid: "user123",
    gameType: "solitaire",
    tournamentType: "daily_special"
});

// 提交分数
const scoreResult = await TournamentService.submitScore(ctx, {
    tournamentId: result.tournamentId,
    uid: "user123",
    gameType: "solitaire",
    score: 1000,
    gameData: { moves: 50, time: 300 },
    propsUsed: ["hint"],
    gameId: "game_123"
});
```

## 环境变量

```bash
# 游戏服务器配置
GAME_SERVER_API=https://game-server.example.com/api/games
GAME_SERVER_TOKEN=your_game_server_token

# 事件同步配置
EVENT_SYNC_API=https://event-sync.example.com/api/events
EVENT_SYNC_TOKEN=your_event_sync_token
```

## 性能优化

- 使用索引加速查询
- 批量操作减少数据库调用
- 异步处理非关键操作
- 缓存常用配置

## 监控和日志

- 完整的错误日志记录
- 性能指标监控
- 事件追踪
- 用户行为分析

## 扩展指南

### 添加新锦标赛类型
1. 在 `handler/` 目录创建新的处理器
2. 在 `data/tournamentConfigs.ts` 添加配置
3. 在 `handler/index.ts` 注册处理器
4. 更新文档

### 添加新游戏类型
1. 更新 `matchManager.ts` 中的游戏类型映射
2. 添加相应的配置
3. 更新远程游戏服务器配置

## 故障排除

### 常见问题
1. **远程游戏创建失败** - 检查网络连接和服务器配置
2. **匹配超时** - 调整匹配超时设置
3. **奖励分配失败** - 检查库存和权限

### 调试技巧
- 查看错误日志
- 检查事件流
- 验证配置正确性
- 监控性能指标 