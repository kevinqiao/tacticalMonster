# 多人独立比赛锦标赛处理器 (multiPlayerIndependentMatchHandler)

## 概述

`multiPlayerIndependentMatchHandler` 是一个专门处理多人独立比赛锦标赛的处理器。在这种模式下，多个玩家共享同一个锦标赛实例，但每个玩家进行独立的单人比赛，最终根据所有玩家的独立比赛成绩进行排名。

## 特点

1. **共享锦标赛实例**: 多个玩家参与同一个锦标赛
2. **独立比赛**: 每个玩家进行独立的单人比赛
3. **统一排名**: 根据所有玩家的独立比赛成绩进行排名
4. **支持多次尝试**: 支持玩家多次参与和每场奖励
5. **灵活配置**: 支持入场费、尝试次数限制等配置

## 架构设计

### 核心组件

- **TournamentHandler 接口**: 实现标准的锦标赛处理器接口
- **MatchManager**: 管理比赛创建和分数提交
- **验证系统**: 完整的资格检查和分数验证
- **奖励系统**: 基于排名的奖励分配

### 数据流

1. **加入流程**: 验证资格 → 扣除入场费 → 创建/加入锦标赛 → 创建独立比赛 → 通知
2. **分数提交**: 验证分数 → 更新比赛记录 → 检查结算条件 → 记录道具使用
3. **结算流程**: 计算排名 → 分配奖励 → 更新状态 → 通知参与者

## 配置要求

### 锦标赛类型配置

```json
{
  "typeId": "multi_player_independent_match",
  "name": "多人独立比赛",
  "category": "casual",
  "gameType": "puzzle",
  "entryRequirements": {
    "entryFee": {
      "coins": 100
    },
    "isSubscribedRequired": false
  },
  "matchRules": {
    "maxPlayers": 50,
    "maxAttempts": 3,
    "allowMultipleAttempts": true,
    "isSingleMatch": false
  },
  "rewards": {
    "baseRewards": {
      "coins": 50,
      "gamePoints": 100,
      "props": [],
      "tickets": []
    },
    "rankRewards": [
      {
        "rankRange": [1, 3],
        "multiplier": 3,
        "bonusProps": ["special_item"],
        "bonusTickets": ["premium_ticket"]
      }
    ]
  },
  "schedule": {
    "duration": 3600
  }
}
```

## API 接口

### join 方法

加入多人独立比赛锦标赛。

**参数**:
- `uid`: 玩家ID
- `gameType`: 游戏类型
- `typeId`: 锦标赛类型ID

**返回**:
```typescript
{
  tournamentId: string;
  attemptNumber: number;
  matchId: string;
  playerMatchId: string;
  gameId: string;
  serverUrl: string;
  matchStatus: string;
  success: boolean;
}
```

### submitScore 方法

提交独立比赛的分数。

**参数**:
- `tournamentId`: 锦标赛ID
- `uid`: 玩家ID
- `gameType`: 游戏类型
- `score`: 分数
- `gameData`: 游戏数据
- `propsUsed`: 使用的道具
- `gameId`: 游戏ID（可选）

**返回**:
```typescript
{
  success: boolean;
  matchId: string;
  score: number;
  deductionResult: any;
  message: string;
  settled: boolean;
  settleReason: string;
}
```

### settle 方法

结算锦标赛，计算排名并分配奖励。

**参数**:
- `tournamentId`: 锦标赛ID

## 使用示例

### 前端调用示例

```typescript
// 加入锦标赛
const joinResult = await ctx.runMutation(joinTournament, {
  uid: "player123",
  gameType: "puzzle",
  typeId: "multi_player_independent_match"
});

// 提交分数
const submitResult = await ctx.runMutation(submitScore, {
  tournamentId: joinResult.tournamentId,
  uid: "player123",
  gameType: "puzzle",
  score: 1500,
  gameData: { level: 5, timeSpent: 120 },
  propsUsed: ["boost_item"],
  gameId: "game_session_456"
});
```

### 配置示例

```typescript
// 在 tournamentConfigs.ts 中添加配置
{
  typeId: "multi_player_independent_match",
  name: "多人独立比赛",
  description: "多个玩家独立比赛，统一排名",
  category: "casual",
  gameType: "puzzle",
  timeRange: "total",
  priority: 3,
  isActive: true,
  entryRequirements: {
    entryFee: { coins: 100 },
    isSubscribedRequired: false
  },
  matchRules: {
    maxPlayers: 50,
    maxAttempts: 3,
    allowMultipleAttempts: true,
    isSingleMatch: false
  },
  rewards: {
    baseRewards: {
      coins: 50,
      gamePoints: 100,
      props: [],
      tickets: []
    },
    rankRewards: [
      {
        rankRange: [1, 3],
        multiplier: 3,
        bonusProps: ["special_item"],
        bonusTickets: ["premium_ticket"]
      }
    ]
  },
  schedule: {
    duration: 3600
  }
}
```

## 优势

1. **简单易用**: 玩家可以独立参与，不受其他玩家影响
2. **公平竞争**: 每个玩家在相同条件下进行比赛
3. **灵活配置**: 支持多种配置选项
4. **完整验证**: 包含完整的资格检查和分数验证
5. **自动结算**: 支持立即结算和延迟结算
6. **通知系统**: 完整的参与和完成通知

## 注意事项

1. **入场费处理**: 确保在验证通过后再扣除入场费
2. **尝试次数限制**: 正确统计和限制玩家的尝试次数
3. **比赛状态管理**: 确保比赛状态的正确更新
4. **奖励分配**: 确保奖励分配的准确性和一致性
5. **错误处理**: 完善的错误处理和回滚机制

## 与其他处理器的区别

| 特性 | 独立比赛处理器 | 共享比赛处理器 | Best of Series处理器 |
|------|----------------|----------------|---------------------|
| 比赛模式 | 独立单人比赛 | 多人共享比赛 | 多局系列赛 |
| 玩家交互 | 无直接交互 | 实时对战 | 轮流对战 |
| 排名方式 | 分数排名 | 对战结果排名 | 胜场数排名 |
| 尝试次数 | 支持多次 | 单次 | 系列赛内多次 |
| 结算时机 | 可立即/延迟 | 立即 | 系列赛完成 |

## 扩展性

该处理器设计具有良好的扩展性，可以轻松添加新功能：

1. **新的验证规则**: 在 `validateJoin` 中添加新的验证逻辑
2. **自定义排名算法**: 修改 `calculatePlayerRankings` 函数
3. **特殊奖励机制**: 扩展 `calculateReward` 函数
4. **额外的通知类型**: 在 `notifyTournamentChanges` 中添加新的通知类型 