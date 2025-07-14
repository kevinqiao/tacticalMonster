# 多人共享比赛锦标赛处理器 (multiPlayerSharedMatchHandler)

## 概述

`multiPlayerSharedMatchHandler` 是一个专门处理多人共享比赛锦标赛的处理器。在这种模式下，多个玩家共享同一个比赛实例，进行实时对战和互动，最终根据对战结果进行排名和奖励分配。

## 特点

1. **共享比赛实例**: 多个玩家参与同一个实时比赛
2. **实时对战**: 玩家之间进行实时互动和竞争
3. **智能匹配**: 基于技能、段位等算法进行智能匹配
4. **队列管理**: 支持匹配队列和等待时间估算
5. **立即结算**: 比赛完成后立即进行奖励结算
6. **完整通知**: 完整的参与和完成通知系统
7. **双模式支持**: 支持传统模式和单一比赛模式

## 架构设计

### 核心组件

- **TournamentHandler 接口**: 实现标准的锦标赛处理器接口
- **TournamentMatchingService**: 处理玩家匹配和队列管理
- **MatchManager**: 管理比赛创建和分数提交
- **验证系统**: 完整的资格检查和分数验证
- **奖励系统**: 基于排名的奖励分配

### 数据流

1. **加入流程**: 验证资格 → 扣除入场费 → 创建/加入锦标赛 → 加入匹配队列 → 通知
2. **匹配流程**: 后台匹配任务 → 创建比赛 → 通知玩家 → 开始对战
3. **分数提交**: 验证分数 → 更新比赛记录 → 检查结算条件 → 记录道具使用
4. **结算流程**: 计算排名 → 分配奖励 → 更新状态 → 通知参与者

## 比赛模式

### 传统模式 (singleMatch: false)

- 先创建锦标赛实例
- 玩家加入锦标赛
- 基于锦标赛ID进行匹配
- 每个锦标赛包含多场比赛

### 单一比赛模式 (singleMatch: true)

- 不预先创建锦标赛
- 直接基于锦标赛类型进行匹配
- 匹配成功后为每场比赛创建独立锦标赛
- 每场比赛对应一个独立的锦标赛

## 配置要求

### 锦标赛类型配置

#### 传统模式配置

```json
{
  "typeId": "multi_player_shared_match",
  "name": "多人共享比赛",
  "category": "competitive",
  "gameType": "battle",
  "singleMatch": false,
  "entryRequirements": {
    "entryFee": {
      "coins": 200
    },
    "isSubscribedRequired": false
  },
  "matchRules": {
    "maxPlayers": 10,
    "minPlayers": 2,
    "maxAttempts": 1,
    "allowMultipleAttempts": false,
    "immediateSettlement": true
  },
  "rewards": {
    "baseRewards": {
      "coins": 100,
      "gamePoints": 200,
      "props": [],
      "tickets": []
    },
    "rankRewards": [
      {
        "rankRange": [1, 3],
        "multiplier": 3,
        "bonusProps": ["victory_item"],
        "bonusTickets": ["premium_ticket"]
      }
    ]
  },
  "schedule": {
    "duration": 1800
  },
  "advanced": {
    "matching": {
      "algorithm": "skill_based",
      "maxWaitTime": 300,
      "skillRange": 200,
      "eloRange": 100,
      "segmentRange": 1,
      "fallbackToAI": false
    }
  }
}
```

#### 单一比赛模式配置

```json
{
  "typeId": "single_match_battle",
  "name": "单场比赛",
  "category": "casual",
  "gameType": "battle",
  "singleMatch": true,
  "entryRequirements": {
    "entryFee": {
      "coins": 50
    },
    "isSubscribedRequired": false
  },
  "matchRules": {
    "maxPlayers": 4,
    "minPlayers": 2,
    "maxAttempts": 3,
    "allowMultipleAttempts": true,
    "immediateSettlement": true
  },
  "rewards": {
    "baseRewards": {
      "coins": 25,
      "gamePoints": 50,
      "props": [],
      "tickets": []
    },
    "rankRewards": [
      {
        "rankRange": [1, 1],
        "multiplier": 2,
        "bonusProps": ["winner_badge"],
        "bonusTickets": []
      }
    ]
  },
  "schedule": {
    "duration": 600
  },
  "advanced": {
    "matching": {
      "algorithm": "skill_based",
      "maxWaitTime": 120,
      "skillRange": 150,
      "eloRange": 75,
      "segmentRange": 1,
      "fallbackToAI": true
    }
  }
}
```

## API 接口

### join 方法

加入多人共享比赛锦标赛。

**参数**:
- `uid`: 玩家ID
- `gameType`: 游戏类型
- `typeId`: 锦标赛类型ID

**返回**:
```typescript
{
  tournamentId: string;
  queueId: string;
  status: string;
  message: string;
  waitTime: number;
  estimatedWaitTime: number;
  isSingleMatch: boolean;
  success: boolean;
}
```

### submitScore 方法

提交共享比赛的分数。

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

## 匹配系统

### 匹配流程

#### 传统模式流程

1. **加入队列**: 玩家调用 `join` 方法加入匹配队列
2. **后台匹配**: 定时任务执行匹配算法
3. **创建比赛**: 匹配成功后创建多人比赛
4. **通知玩家**: 通知所有匹配成功的玩家
5. **开始对战**: 玩家进入游戏进行对战

#### 单一比赛模式流程

1. **加入队列**: 玩家调用 `join` 方法加入匹配队列
2. **后台匹配**: 定时任务执行匹配算法
3. **创建锦标赛**: 匹配成功后为每场比赛创建独立锦标赛
4. **创建比赛**: 在独立锦标赛中创建多人比赛
5. **通知玩家**: 通知所有匹配成功的玩家
6. **开始对战**: 玩家进入游戏进行对战

### 匹配算法

支持多种匹配算法：

- **skill_based**: 基于技能值匹配
- **segment_based**: 基于段位匹配
- **elo_based**: 基于ELO评分匹配
- **random**: 随机匹配

### 匹配配置

```typescript
{
  algorithm: "skill_based",
  maxWaitTime: 300,        // 最大等待时间（秒）
  skillRange: 200,         // 技能值范围
  eloRange: 100,          // ELO评分范围
  segmentRange: 1,        // 段位范围
  fallbackToAI: false     // 是否允许AI替补
}
```

## 入场费验证

`multiPlayerSharedMatchHandler` 支持完整的入场费验证系统，包括多种类型的入场费。入场费处理逻辑被提取到独立的辅助方法中，使代码更简洁和可维护。

### 辅助方法

#### validateEntryFee
验证玩家是否满足入场费要求，不进行实际扣除。

```typescript
async function validateEntryFee(ctx: any, params: {
    uid: string;
    tournamentType: any;
    inventory: any;
})
```

#### deductEntryFee
扣除入场费并记录日志。

```typescript
async function deductEntryFee(ctx: any, params: {
    uid: string;
    tournamentType: any;
    inventory: any;
    now: any;
})
```

### 支持的入场费类型

1. **金币入场费**: 扣除玩家金币
2. **游戏点数入场费**: 扣除玩家游戏点数
3. **道具入场费**: 扣除玩家特定道具
4. **门票入场费**: 扣除玩家特定门票
5. **订阅要求**: 检查玩家是否为订阅会员

### 入场费配置示例

```typescript
// 复杂入场费配置
{
  typeId: "premium_tournament",
  name: "高级锦标赛",
  entryRequirements: {
    entryFee: {
      coins: 500,                    // 需要500金币
      gamePoints: 1000,              // 需要1000游戏点数
      props: [                       // 需要特定道具
        { id: "vip_card", name: "VIP卡" },
        { id: "lucky_charm", name: "幸运符" }
      ],
      tickets: [                     // 需要特定门票
        { id: "premium_ticket", name: "高级门票" }
      ]
    },
    isSubscribedRequired: true       // 需要订阅会员
  }
}

// 简单入场费配置
{
  typeId: "casual_tournament",
  name: "休闲锦标赛",
  entryRequirements: {
    entryFee: {
      coins: 50                      // 只需要50金币
    },
    isSubscribedRequired: false      // 不需要订阅
  }
}
```

### 验证流程

1. **验证阶段**: `validateJoin` 方法调用 `validateEntryFee` 检查玩家是否满足所有入场费要求
2. **扣除阶段**: `join` 方法调用 `deductEntryFee` 在验证通过后扣除相应的入场费
3. **日志记录**: 自动记录入场费扣除日志用于审计

### 错误处理

系统会提供详细的错误信息：

- `金币不足，需要 500 金币，当前拥有 200 金币`
- `游戏点数不足，需要 1000 点数，当前拥有 500 点数`
- `缺少必需道具: VIP卡`
- `缺少必需门票: 高级门票`
- `此锦标赛需要订阅会员才能参与`

### 使用示例

```typescript
// 前端验证入场费
const validateEntryFee = async (tournamentType: any) => {
  try {
    const result = await ctx.runMutation(validateJoin, {
      uid: "player123",
      gameType: "battle",
      tournamentType: tournamentType
    });
    
    console.log("验证通过:", result);
    return { valid: true, data: result };
  } catch (error) {
    console.log("验证失败:", error.message);
    return { valid: false, error: error.message };
  }
};

// 加入锦标赛（会自动扣除入场费）
const joinTournament = async (tournamentType: any) => {
  try {
    const result = await ctx.runMutation(joinTournament, {
      uid: "player123",
      gameType: "battle",
      typeId: tournamentType.typeId
    });
    
    console.log("加入成功:", result);
    return result;
  } catch (error) {
    console.log("加入失败:", error.message);
    throw error;
  }
};
```

### 入场费日志

系统会自动记录入场费扣除日志：

```typescript
// entry_fee_logs 表结构
{
  uid: "player123",
  tournamentType: "premium_tournament",
  gameType: "battle",
  entryFee: {
    coins: 500,
    gamePoints: 1000,
    props: [{ id: "vip_card", name: "VIP卡" }],
    tickets: [{ id: "premium_ticket", name: "高级门票" }]
  },
  deductedAt: "2024-01-01T10:00:00.000Z",
  createdAt: "2024-01-01T10:00:00.000Z"
}
```

### 代码重构优势

1. **代码复用**: 入场费验证和扣除逻辑可以在其他地方复用
2. **可维护性**: 入场费逻辑集中管理，便于修改和扩展
3. **可测试性**: 独立的辅助方法更容易进行单元测试
4. **清晰性**: 主要方法逻辑更清晰，专注于核心流程
5. **错误处理**: 统一的错误处理和日志记录

## 使用示例

### 前端调用示例

#### 传统模式

```typescript
// 加入锦标赛
const joinResult = await ctx.runMutation(joinTournament, {
  uid: "player123",
  gameType: "battle",
  typeId: "multi_player_shared_match"
});

// 轮询匹配状态
const pollMatchStatus = async () => {
  const status = await ctx.runQuery(getMatchingStatus, {
    uid: "player123",
    tournamentId: joinResult.tournamentId
  });
  
  if (status.status === "matched") {
    // 匹配成功，开始游戏
    startGame(status.matchId, status.serverUrl);
  } else if (status.status === "waiting") {
    // 继续等待
    setTimeout(pollMatchStatus, 2000);
  }
};

// 提交分数
const submitResult = await ctx.runMutation(submitScore, {
  tournamentId: joinResult.tournamentId,
  uid: "player123",
  gameType: "battle",
  score: 1500,
  gameData: { kills: 5, deaths: 2, assists: 3 },
  propsUsed: ["shield_potion"],
  gameId: "game_session_789"
});
```

#### 单一比赛模式

```typescript
// 加入单场比赛
const joinResult = await ctx.runMutation(joinTournament, {
  uid: "player123",
  gameType: "battle",
  typeId: "single_match_battle"
});

// 轮询匹配状态
const pollMatchStatus = async () => {
  const status = await ctx.runQuery(getMatchingStatus, {
    uid: "player123",
    tournamentType: "single_match_battle",
    gameType: "battle"
  });
  
  if (status.status === "matched") {
    // 匹配成功，开始游戏
    startGame(status.matchId, status.serverUrl);
  } else if (status.status === "waiting") {
    // 继续等待
    setTimeout(pollMatchStatus, 2000);
  }
};

// 提交分数（使用匹配成功后返回的tournamentId）
const submitResult = await ctx.runMutation(submitScore, {
  tournamentId: status.tournamentId, // 从匹配状态中获取
  uid: "player123",
  gameType: "battle",
  score: 1500,
  gameData: { kills: 5, deaths: 2, assists: 3 },
  propsUsed: ["shield_potion"],
  gameId: "game_session_789"
});
```

### 配置示例

```typescript
// 在 tournamentConfigs.ts 中添加配置

// 传统模式配置
{
  typeId: "multi_player_shared_match",
  name: "多人共享比赛",
  description: "多人实时对战，智能匹配",
  category: "competitive",
  gameType: "battle",
  singleMatch: false,
  timeRange: "total",
  priority: 2,
  isActive: true,
  entryRequirements: {
    entryFee: { coins: 200 },
    isSubscribedRequired: false
  },
  matchRules: {
    maxPlayers: 10,
    minPlayers: 2,
    maxAttempts: 1,
    allowMultipleAttempts: false,
    immediateSettlement: true
  },
  rewards: {
    baseRewards: {
      coins: 100,
      gamePoints: 200,
      props: [],
      tickets: []
    },
    rankRewards: [
      {
        rankRange: [1, 3],
        multiplier: 3,
        bonusProps: ["victory_item"],
        bonusTickets: ["premium_ticket"]
      }
    ]
  },
  schedule: {
    duration: 1800
  },
  advanced: {
    matching: {
      algorithm: "skill_based",
      maxWaitTime: 300,
      skillRange: 200,
      eloRange: 100,
      segmentRange: 1,
      fallbackToAI: false
    }
  }
}

// 单一比赛模式配置
{
  typeId: "single_match_battle",
  name: "单场比赛",
  description: "快速匹配，单场结算",
  category: "casual",
  gameType: "battle",
  singleMatch: true,
  timeRange: "total",
  priority: 1,
  isActive: true,
  entryRequirements: {
    entryFee: { coins: 50 },
    isSubscribedRequired: false
  },
  matchRules: {
    maxPlayers: 4,
    minPlayers: 2,
    maxAttempts: 3,
    allowMultipleAttempts: true,
    immediateSettlement: true
  },
  rewards: {
    baseRewards: {
      coins: 25,
      gamePoints: 50,
      props: [],
      tickets: []
    },
    rankRewards: [
      {
        rankRange: [1, 1],
        multiplier: 2,
        bonusProps: ["winner_badge"],
        bonusTickets: []
      }
    ]
  },
  schedule: {
    duration: 600
  },
  advanced: {
    matching: {
      algorithm: "skill_based",
      maxWaitTime: 120,
      skillRange: 150,
      eloRange: 75,
      segmentRange: 1,
      fallbackToAI: true
    }
  }
}
```

## 优势

1. **实时互动**: 玩家之间可以进行实时对战和互动
2. **智能匹配**: 基于多种算法的智能匹配系统
3. **队列管理**: 完善的队列管理和等待时间估算
4. **立即结算**: 比赛完成后立即进行奖励分配
5. **完整通知**: 完整的参与和完成通知系统
6. **灵活配置**: 支持多种匹配算法和配置选项
7. **双模式支持**: 支持传统模式和单一比赛模式

## 注意事项

1. **匹配队列**: 玩家加入后需要等待匹配，不是立即开始
2. **实时性要求**: 需要确保游戏服务器的实时性能
3. **网络稳定性**: 多人对战对网络稳定性要求较高
4. **匹配算法**: 选择合适的匹配算法以平衡等待时间和匹配质量
5. **错误处理**: 完善的错误处理和重试机制
6. **模式选择**: 根据游戏需求选择合适的比赛模式

## 与其他处理器的区别

| 特性 | 共享比赛处理器 | 独立比赛处理器 | Best of Series处理器 |
|------|----------------|----------------|---------------------|
| 比赛模式 | 多人共享比赛 | 独立单人比赛 | 多局系列赛 |
| 玩家交互 | 实时对战 | 无直接交互 | 轮流对战 |
| 匹配系统 | 智能匹配队列 | 无需匹配 | 自动匹配 |
| 排名方式 | 对战结果排名 | 分数排名 | 胜场数排名 |
| 结算时机 | 立即结算 | 可立即/延迟 | 系列赛完成 |
| 等待时间 | 需要等待匹配 | 立即开始 | 需要等待匹配 |
| 模式支持 | 传统+单一比赛 | 仅传统模式 | 仅传统模式 |

## 扩展性

该处理器设计具有良好的扩展性，可以轻松添加新功能：

1. **新的匹配算法**: 在 `TournamentMatchingService` 中添加新的匹配算法
2. **自定义匹配规则**: 扩展匹配配置选项
3. **特殊的奖励机制**: 扩展 `calculateReward` 函数
4. **额外的通知类型**: 在 `notifyTournamentChanges` 中添加新的通知类型
5. **匹配统计**: 添加匹配成功率和等待时间统计
6. **新的比赛模式**: 扩展支持更多的比赛模式

## 性能优化

1. **批量处理**: 匹配任务使用批量处理提高效率
2. **索引优化**: 使用合适的数据库索引提高查询性能
3. **缓存机制**: 对频繁查询的数据进行缓存
4. **异步处理**: 使用异步处理减少响应时间
5. **资源清理**: 定期清理过期的匹配队列数据

## 完整使用示例

### 1. 配置锦标赛类型

首先在 `tournamentConfigs.ts` 中配置单一比赛模式：

```typescript
// 快速对战模式 - 单一比赛
{
  typeId: "quick_battle",
  name: "快速对战",
  description: "快速匹配，单场结算，适合休闲玩家",
  category: "casual",
  gameType: "battle",
  singleMatch: true, // 关键：启用单一比赛模式
  timeRange: "total",
  priority: 1,
  isActive: true,
  entryRequirements: {
    entryFee: { coins: 30 },
    isSubscribedRequired: false
  },
  matchRules: {
    maxPlayers: 4,
    minPlayers: 2,
    maxAttempts: 5,
    allowMultipleAttempts: true,
    immediateSettlement: true
  },
  rewards: {
    baseRewards: {
      coins: 15,
      gamePoints: 30,
      props: [],
      tickets: []
    },
    rankRewards: [
      {
        rankRange: [1, 1],
        multiplier: 2,
        bonusProps: ["winner_badge"],
        bonusTickets: []
      },
      {
        rankRange: [2, 2],
        multiplier: 1.5,
        bonusProps: [],
        bonusTickets: []
      }
    ]
  },
  schedule: {
    duration: 900 // 15分钟
  },
  advanced: {
    matching: {
      algorithm: "skill_based",
      maxWaitTime: 60, // 1分钟最大等待时间
      skillRange: 100,
      eloRange: 50,
      segmentRange: 1,
      fallbackToAI: true // 允许AI替补
    }
  }
}
```

### 2. 前端实现

```typescript
// 快速对战组件
class QuickBattleComponent {
  private playerId: string;
  private gameType: string = "battle";
  private tournamentType: string = "quick_battle";
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  // 加入快速对战
  async joinQuickBattle() {
    try {
      console.log("加入快速对战...");
      
      const joinResult = await ctx.runMutation(joinTournament, {
        uid: this.playerId,
        gameType: this.gameType,
        typeId: this.tournamentType
      });

      console.log("加入结果:", joinResult);

      if (joinResult.success) {
        // 开始轮询匹配状态
        this.startPollingMatchStatus();
        
        // 显示等待界面
        this.showWaitingUI(joinResult.estimatedWaitTime);
        
        return joinResult;
      } else {
        throw new Error(joinResult.message || "加入失败");
      }
    } catch (error) {
      console.error("加入快速对战失败:", error);
      this.showErrorUI(error.message);
    }
  }

  // 开始轮询匹配状态
  private startPollingMatchStatus() {
    this.pollingInterval = setInterval(async () => {
      try {
        const status = await this.getMatchStatus();
        
        if (status.status === "matched") {
          // 匹配成功
          this.stopPolling();
          this.handleMatchSuccess(status);
        } else if (status.status === "cancelled") {
          // 匹配被取消
          this.stopPolling();
          this.handleMatchCancelled(status);
        } else if (status.status === "expired") {
          // 匹配超时
          this.stopPolling();
          this.handleMatchExpired(status);
        }
        // 继续等待
      } catch (error) {
        console.error("查询匹配状态失败:", error);
      }
    }, 2000); // 每2秒查询一次
  }

  // 获取匹配状态
  private async getMatchStatus() {
    return await ctx.runQuery(getMatchingStatus, {
      uid: this.playerId,
      tournamentType: this.tournamentType,
      gameType: this.gameType,
      mode: "independent"
    });
  }

  // 停止轮询
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // 处理匹配成功
  private handleMatchSuccess(status: any) {
    console.log("匹配成功!", status);
    
    // 隐藏等待界面
    this.hideWaitingUI();
    
    // 显示匹配成功界面
    this.showMatchSuccessUI({
      matchId: status.matchId,
      tournamentId: status.tournamentId,
      serverUrl: status.serverUrl,
      players: status.players
    });
    
    // 开始游戏
    this.startGame(status.matchId, status.serverUrl);
  }

  // 处理匹配取消
  private handleMatchCancelled(status: any) {
    console.log("匹配被取消:", status);
    this.hideWaitingUI();
    this.showCancelledUI(status.reason);
  }

  // 处理匹配超时
  private handleMatchExpired(status: any) {
    console.log("匹配超时:", status);
    this.hideWaitingUI();
    this.showExpiredUI();
  }

  // 取消匹配
  async cancelMatching() {
    try {
      await ctx.runMutation(cancelMatching, {
        uid: this.playerId,
        tournamentType: this.tournamentType,
        gameType: this.gameType,
        reason: "user_cancelled",
        mode: "independent"
      });
      
      this.stopPolling();
      this.hideWaitingUI();
      console.log("匹配已取消");
    } catch (error) {
      console.error("取消匹配失败:", error);
    }
  }

  // 提交游戏分数
  async submitGameScore(tournamentId: string, score: number, gameData: any) {
    try {
      const result = await ctx.runMutation(submitScore, {
        tournamentId: tournamentId,
        uid: this.playerId,
        gameType: this.gameType,
        score: score,
        gameData: gameData,
        propsUsed: [],
        gameId: `game_${Date.now()}`
      });

      console.log("分数提交结果:", result);
      
      if (result.settled) {
        // 立即结算，显示结果
        this.showGameResult(result);
      }
      
      return result;
    } catch (error) {
      console.error("提交分数失败:", error);
      throw error;
    }
  }

  // UI 方法
  private showWaitingUI(estimatedWaitTime: number) {
    // 显示等待界面
    console.log(`等待匹配中，预计等待时间: ${estimatedWaitTime}秒`);
  }

  private hideWaitingUI() {
    // 隐藏等待界面
    console.log("隐藏等待界面");
  }

  private showMatchSuccessUI(matchInfo: any) {
    // 显示匹配成功界面
    console.log("显示匹配成功界面:", matchInfo);
  }

  private showCancelledUI(reason: string) {
    // 显示取消界面
    console.log("显示取消界面:", reason);
  }

  private showExpiredUI() {
    // 显示超时界面
    console.log("显示超时界面");
  }

  private showErrorUI(message: string) {
    // 显示错误界面
    console.log("显示错误界面:", message);
  }

  private showGameResult(result: any) {
    // 显示游戏结果
    console.log("显示游戏结果:", result);
  }

  private startGame(matchId: string, serverUrl: string) {
    // 开始游戏
    console.log(`开始游戏: ${matchId} on ${serverUrl}`);
  }
}

// 使用示例
const quickBattle = new QuickBattleComponent("player123");

// 加入快速对战
quickBattle.joinQuickBattle();

// 取消匹配
// quickBattle.cancelMatching();

// 提交分数（在游戏结束后调用）
// quickBattle.submitGameScore("tournament456", 1500, { kills: 5, deaths: 2 });
```

### 3. 后台任务配置

确保后台匹配任务正在运行：

```typescript
// 在定时任务中调用
export const executeMatchingTask = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    maxProcessingTime: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    return await TournamentMatchingService.executeMatchingTask(ctx, args);
  }
});

// 清理过期队列
export const cleanupExpiredQueue = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await TournamentMatchingService.cleanupExpiredQueue(ctx);
  }
});
```

### 4. 监控和统计

```typescript
// 获取队列统计
export const getQueueStats = query({
  args: {
    tournamentType: v.optional(v.string()),
    gameType: v.optional(v.string()),
    mode: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    return await TournamentMatchingService.getQueueStats(ctx, args);
  }
});

// 使用示例
const stats = await ctx.runQuery(getQueueStats, {
  tournamentType: "quick_battle",
  mode: "independent"
});

console.log("队列统计:", stats);
// 输出示例:
// {
//   totalWaiting: 15,
//   averageWaitTime: 25,
//   matchSuccessRate: 0.85,
//   activeQueues: 3
// }
```

### 5. 优势总结

单一比赛模式的优势：

1. **快速匹配**: 无需等待锦标赛创建，直接进入匹配队列
2. **资源效率**: 只为实际匹配成功的比赛创建锦标赛
3. **用户体验**: 更快的响应时间和更流畅的匹配流程
4. **灵活性**: 支持不同的匹配配置和算法
5. **可扩展性**: 易于添加新的匹配规则和算法
6. **监控友好**: 完整的匹配统计和监控数据

这种模式特别适合：
- 休闲游戏模式
- 快速对战场景
- 需要频繁匹配的游戏
- 对响应时间要求较高的场景 