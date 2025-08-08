# 快速对局作为锦标赛single_match类型设计文档

## 概述

快速对局系统已重新设计为锦标赛的特殊形式，使用`single_match`类型。这种设计保持了系统的一致性，同时提供了快速对局的轻量级体验。

## 设计理念

### 统一架构
- **快速对局 = 锦标赛的single_match类型**
- 使用相同的配置结构、API接口和数据库schema
- 保持代码的一致性和可维护性

### 特殊配置
- `type: "single_match"` - 标识为快速对局
- `maxParticipants: 4` - 限制为2-4人
- `timeLimit: 300` - 5分钟时间限制
- `dailyLimits` - 每日参与限制

## 锦标赛配置

### 免费快速对局锦标赛

```typescript
{
    tournamentId: "quick_match_solitaire_free",
    name: "Solitaire快速对局(免费)",
    description: "2-4人Solitaire快速对局，免费模式，基于分数排名",
    type: "single_match", // 关键标识
    gameType: "solitaire",
    startTime: "2025-08-01T00:00:00.000Z",
    endTime: "2025-12-31T23:59:59.000Z",
    maxParticipants: 4,
    entryFee: { coins: 0 }, // 免费
    rewards: { 
        seasonPoints: 20, 
        coins: 5,
        rankPoints: 10
    },
    rules: {
        scoring: "基于分数排名",
        ranking: "第1名×1.0，第2名×0.5，第3-4名×0",
        maxParticipants: 4,
        minParticipants: 2,
        timeLimit: 300, // 5分钟
        dailyLimits: {
            free: 10, // 免费10局/日
            perType: 2 // 每种2局上限
        }
    }
}
```

### 门票快速对局锦标赛

```typescript
{
    tournamentId: "quick_match_solitaire_ticket",
    name: "Solitaire快速对局(门票)",
    description: "2-4人Solitaire快速对局，门票模式，基于分数排名",
    type: "single_match", // 关键标识
    gameType: "solitaire",
    startTime: "2025-08-01T00:00:00.000Z",
    endTime: "2025-12-31T23:59:59.000Z",
    maxParticipants: 4,
    entryFee: { coins: 10 }, // 门票10金币/局
    rewards: { 
        seasonPoints: 20, 
        coins: 15,
        rankPoints: 10
    },
    rules: {
        scoring: "基于分数排名",
        ranking: "第1名×1.0，第2名×0.5，第3-4名×0",
        maxParticipants: 4,
        minParticipants: 2,
        timeLimit: 300, // 5分钟
        dailyLimits: {
            ticket: 5, // 门票5局/日
            perType: 2 // 每种2局上限
        }
    }
}
```

## 系统架构

### 核心组件

1. **锦标赛配置** (`tournamentConfig.ts`)
   - 包含`single_match`类型的快速对局配置
   - 支持免费和门票两种模式
   - 统一的配置结构

2. **锦标赛系统** (`tournamentSystem.ts`)
   - 处理所有类型的锦标赛，包括`single_match`
   - 统一的会话管理和奖励发放
   - 支持快速对局的特殊逻辑

3. **API接口** (`tournaments.ts`)
   - 统一的锦标赛API
   - 支持快速对局的特殊查询
   - 排行榜管理

4. **数据库Schema** (`tournamentSchema.ts`)
   - 统一的锦标赛数据表
   - 支持快速对局的数据结构
   - 排行榜和统计表

## 快速对局特性

### 特殊规则

1. **参与限制**
   - 免费模式：每日10局
   - 门票模式：每日5局
   - 每种类型：每日2局上限

2. **时间限制**
   - 单局时间：5分钟
   - 快速匹配：30秒等待时间
   - 自动开始：达到最少玩家数时

3. **奖励机制**
   - 第1名：rankPoints×10、seasonPoints×20
   - 第2名：rankPoints×5、seasonPoints×10
   - 第3-4名：rankPoints×2、seasonPoints×5

### 排行榜支持

1. **每日排行榜**
   - 基于当日快速对局结果
   - 免费玩家：第1名(50 rankPoints, 100 coins)，第2名(25 rankPoints, 50 coins)
   - 门票玩家：第1名(100 rankPoints, 200 coins)，第2名(50 rankPoints, 100 coins)，第3名(25 rankPoints, 50 coins)，第4名(10 rankPoints, 20 coins)

2. **每周排行榜**
   - 基于当周快速对局结果
   - 免费玩家：第1名(200 rankPoints, 500 coins)，第2名(100 rankPoints, 250 coins)
   - 门票玩家：第1名(500 rankPoints, 1000 coins)，第2名(250 rankPoints, 500 coins)，第3名(100 rankPoints, 250 coins)，第4名(50 rankPoints, 100 coins)

## API使用

### 获取快速对局锦标赛

```typescript
// 获取所有快速对局锦标赛
const quickMatchTournaments = getQuickMatchTournaments();

// 获取免费快速对局配置
const freeConfig = getFreeQuickMatchConfig();

// 获取门票快速对局配置
const ticketConfig = getTicketQuickMatchConfig();
```

### 参与快速对局

```typescript
// 创建快速对局会话
const result = await createTournamentSession({
    uid: "player123",
    tournamentId: "quick_match_solitaire_free", // 或 "quick_match_solitaire_ticket"
    gameType: "solitaire"
});

// 加入快速对局
const joinResult = await joinTournament({
    uid: "player123",
    tournamentId: "quick_match_solitaire_free",
    sessionId: "session123"
});
```

### 完成快速对局

```typescript
// 完成快速对局
const completeResult = await completeTournament({
    tournamentId: "quick_match_solitaire_free",
    sessionId: "session123",
    results: [
        { uid: "player1", score: 100, rank: 1 },
        { uid: "player2", score: 80, rank: 2 },
        { uid: "player3", score: 60, rank: 3 },
        { uid: "player4", score: 40, rank: 4 }
    ]
});
```

## 数据流程

### 快速对局流程

1. **创建会话**
   - 检查玩家资格（每日限制、金币）
   - 查找现有等待中的会话或创建新会话
   - 扣除入场费（门票模式）
   - 更新玩家统计

2. **加入会话**
   - 检查会话状态和玩家数量
   - 验证玩家资格
   - 添加玩家到会话

3. **开始对局**
   - 检查最少玩家数（2人）
   - 更新会话状态为"playing"
   - 记录开始时间

4. **完成对局**
   - 计算排名和奖励
   - 更新会话状态为"completed"
   - 发放奖励（金币、rankPoints、seasonPoints）
   - 更新排行榜
   - 更新玩家统计

## 优势

### 架构优势

1. **代码复用**
   - 使用相同的锦标赛系统
   - 减少重复代码
   - 统一的API接口

2. **配置灵活性**
   - 基于锦标赛配置结构
   - 易于扩展新游戏类型
   - 统一的规则管理

3. **数据一致性**
   - 统一的数据模型
   - 一致的统计和排行榜
   - 简化的数据管理

### 功能优势

1. **快速体验**
   - 5分钟单局时间
   - 快速匹配机制
   - 即时奖励发放

2. **灵活参与**
   - 免费和门票两种模式
   - 合理的每日限制
   - 公平的奖励机制

3. **完整统计**
   - 玩家对局统计
   - 排行榜参与
   - 奖励记录追踪

## 扩展性

### 支持新游戏类型

1. 在`tournamentConfig.ts`中添加新的`single_match`配置
2. 更新游戏类型处理逻辑
3. 扩展排行榜支持

### 支持新奖励类型

1. 在锦标赛配置中添加新的奖励字段
2. 更新奖励计算逻辑
3. 扩展数据库schema

### 支持新排行榜类型

1. 创建新的排行榜配置
2. 添加相应的数据库表
3. 实现排行榜更新逻辑

## 总结

快速对局作为锦标赛的`single_match`类型，提供了：

- **统一的架构**：使用相同的锦标赛系统
- **灵活的配置**：基于锦标赛配置结构
- **完整的体验**：从创建到完成的完整流程
- **丰富的功能**：排行榜、统计、奖励系统
- **良好的扩展性**：支持新游戏类型和功能

这种设计确保了系统的一致性，同时为玩家提供了快速、公平、有奖励的对局体验。 