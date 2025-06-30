# 锦标赛系统详细设计文档

## 1. 系统概述

### 1.1 设计目标
- 支持多种类型的锦标赛配置
- 灵活的参与限制和奖励机制
- 实时排行榜和结算系统
- 与道具、门票、任务系统的深度集成
- 支持单人、多人、精英挑战等多种模式

### 1.2 核心特性
- **多类型支持**: 普通、练习、精英、每日挑战等
- **灵活配置**: 参与限制、奖励设置、结算规则
- **实时结算**: 自动结算和手动结算支持
- **积分系统**: 与赛季积分系统集成
- **道具集成**: 支持道具使用和延迟扣除
- **门票系统**: 与门票系统深度集成

## 2. 系统架构

### 2.1 核心组件
```
tournament/
├── convex/
│   ├── schema.ts              # 数据库模式定义
│   ├── tournaments.ts         # 主要API接口
│   ├── service/
│   │   ├── tournament/
│   │   │   ├── handler/       # 锦标赛处理器
│   │   │   ├── ruleEngine/    # 规则引擎
│   │   │   └── settlement/    # 结算系统
│   │   ├── prop/              # 道具系统集成
│   │   ├── ticket/            # 门票系统集成
│   │   └── task/              # 任务系统集成
│   └── data/
│       └── tournamentTypes.json # 锦标赛类型配置
```

### 2.2 数据流
1. **创建阶段**: 根据类型配置创建锦标赛
2. **参与阶段**: 验证参与条件，分配门票/道具
3. **游戏阶段**: 记录游戏数据和道具使用
4. **结算阶段**: 计算排名，分配奖励，更新积分

## 3. 数据库模式

### 3.1 核心表结构

#### tournaments (锦标赛主表)
```typescript
{
  _id: Id<"tournaments">,
  typeId: string,              // 锦标赛类型ID
  name: string,                // 锦标赛名称
  description: string,         // 描述
  gameType: string,            // 游戏类型
  status: "pending" | "active" | "completed" | "cancelled",
  startTime: string,           // 开始时间
  endTime: string,             // 结束时间
  minPlayers: number,          // 最少玩家数
  maxPlayers: number,          // 最大玩家数
  currentPlayers: number,      // 当前玩家数
  entryFee: {                  // 入场费
    coins: number,
    tickets: Array<{type: string, quantity: number}>,
    props: Array<{type: string, quantity: number}>
  },
  rewards: {                   // 奖励配置
    coins: Array<{rank: number, amount: number}>,
    props: Array<{rank: number, props: Array<{type: string, quantity: number}>}>,
    tickets: Array<{rank: number, tickets: Array<{type: string, quantity: number}>}>,
    gamePoints: Array<{rank: number, points: number}>
  },
  config: {                    // 类型特定配置
    allowReuse: boolean,       // 允许重复参与
    allowMultipleSubmissions: boolean, // 允许多次提交
    maxSubmissionsPerTournament: number, // 每次锦标赛最大提交次数
    maxAttempts: number,       // 最大尝试次数
    dailyLimit: number,        // 每日限制
    independentAttempts: boolean, // 独立尝试
    isEliteChallenge: boolean, // 精英挑战
    requiresMasterSegment: boolean, // 需要大师段位
    minSegment: string,        // 最低段位要求
    maxSegment: string,        // 最高段位限制
    skillBasedMatching: boolean, // 技能匹配
    eloRange: number,          // ELO范围
    timeLimit: number,         // 时间限制(分钟)
    practiceMode: boolean,     // 练习模式
    instantSettlement: boolean // 即时结算
  },
  createdAt: string,
  updatedAt: string
}
```

#### tournament_participants (参与者表)
```typescript
{
  _id: Id<"tournament_participants">,
  tournamentId: Id<"tournaments">,
  uid: string,
  joinedAt: string,
  status: "active" | "completed" | "disqualified",
  score: number,
  rank: number,
  attemptsUsed: number,
  lastAttemptAt: string,
  propsUsed: string[],
  ticketsUsed: Array<{type: string, quantity: number}>
}
```

#### matches (比赛记录表)
```typescript
{
  _id: Id<"matches">,
  tournamentId: Id<"tournaments">,
  gameType: string,
  uid: string,
  score: number,
  completed: boolean,
  attemptNumber: number,
  propsUsed: string[],
  gameData: any,
  createdAt: string,
  updatedAt: string
}
```

## 4. 锦标赛类型配置

### 4.1 普通锦标赛 (normal)
```json
{
  "typeId": "normal",
  "name": "普通锦标赛",
  "description": "标准多人锦标赛",
  "config": {
    "allowReuse": false,
    "maxSubmissionsPerTournament": 1,
    "maxAttempts": 1,
    "dailyLimit": 5,
    "independentAttempts": false,
    "isEliteChallenge": false,
    "requiresMasterSegment": false,
    "skillBasedMatching": true,
    "eloRange": 200,
    "timeLimit": 30,
    "practiceMode": false,
    "instantSettlement": false
  },
  "entryFee": {
    "coins": 100,
    "tickets": [{"type": "normal", "quantity": 1}],
    "props": []
  },
  "rewards": {
    "coins": [
      {"rank": 1, "amount": 1000},
      {"rank": 2, "amount": 500},
      {"rank": 3, "amount": 250}
    ],
    "gamePoints": [
      {"rank": 1, "points": 100},
      {"rank": 2, "points": 50},
      {"rank": 3, "points": 25}
    ]
  }
}
```

### 4.2 练习锦标赛 (practice)
```json
{
  "typeId": "practice",
  "name": "练习锦标赛",
  "description": "无奖励练习模式",
  "config": {
    "allowReuse": true,
    "maxSubmissionsPerTournament": 3,
    "maxAttempts": 3,
    "dailyLimit": 10,
    "independentAttempts": false,
    "isEliteChallenge": false,
    "requiresMasterSegment": false,
    "skillBasedMatching": false,
    "timeLimit": 20,
    "practiceMode": true,
    "instantSettlement": true
  },
  "entryFee": {
    "coins": 0,
    "tickets": [],
    "props": []
  },
  "rewards": {
    "coins": [],
    "gamePoints": []
  }
}
```

### 4.3 精英挑战 (elite)
```json
{
  "typeId": "elite",
  "name": "精英挑战",
  "description": "高难度单人挑战",
  "config": {
    "allowReuse": false,
    "maxSubmissionsPerTournament": 1,
    "maxAttempts": 3,
    "dailyLimit": 2,
    "independentAttempts": true,
    "isEliteChallenge": true,
    "requiresMasterSegment": false,
    "minSegment": "gold",
    "skillBasedMatching": false,
    "timeLimit": 45,
    "practiceMode": false,
    "instantSettlement": true
  },
  "entryFee": {
    "coins": 500,
    "tickets": [{"type": "advanced", "quantity": 1}],
    "props": []
  },
  "rewards": {
    "coins": [
      {"rank": 1, "amount": 5000},
      {"rank": 2, "amount": 2500},
      {"rank": 3, "amount": 1000}
    ],
    "props": [
      {"rank": 1, "props": [{"type": "shield", "quantity": 3}]}
    ],
    "gamePoints": [
      {"rank": 1, "points": 500},
      {"rank": 2, "points": 250},
      {"rank": 3, "points": 100}
    ]
  }
}
```

### 4.4 每日挑战 (daily_challenge)
```json
{
  "typeId": "daily_challenge",
  "name": "每日挑战",
  "description": "每日限时挑战",
  "config": {
    "allowReuse": false,
    "maxSubmissionsPerTournament": 1,
    "maxAttempts": 2,
    "dailyLimit": 1,
    "independentAttempts": false,
    "isEliteChallenge": false,
    "requiresMasterSegment": false,
    "skillBasedMatching": true,
    "eloRange": 150,
    "timeLimit": 25,
    "practiceMode": false,
    "instantSettlement": false
  },
  "entryFee": {
    "coins": 50,
    "tickets": [{"type": "normal", "quantity": 1}],
    "props": []
  },
  "rewards": {
    "coins": [
      {"rank": 1, "amount": 300},
      {"rank": 2, "amount": 150},
      {"rank": 3, "amount": 75}
    ],
    "gamePoints": [
      {"rank": 1, "points": 50},
      {"rank": 2, "points": 25},
      {"rank": 3, "points": 10}
    ]
  }
}
```

### 4.5 无限练习 (unlimited_practice)
```json
{
  "typeId": "unlimited_practice",
  "name": "无限练习",
  "description": "无限制练习模式",
  "config": {
    "allowReuse": true,
    "maxSubmissionsPerTournament": -1,
    "maxAttempts": -1,
    "dailyLimit": -1,
    "independentAttempts": true,
    "isEliteChallenge": false,
    "requiresMasterSegment": false,
    "skillBasedMatching": false,
    "timeLimit": 15,
    "practiceMode": true,
    "instantSettlement": true
  },
  "entryFee": {
    "coins": 0,
    "tickets": [],
    "props": []
  },
  "rewards": {
    "coins": [],
    "gamePoints": []
  }
}
```

### 4.6 每日特赛 (daily_special)
```json
{
  "typeId": "daily_special",
  "name": "每日特赛",
  "description": "特殊奖励每日比赛",
  "config": {
    "allowReuse": false,
    "maxSubmissionsPerTournament": 1,
    "maxAttempts": 1,
    "dailyLimit": 1,
    "independentAttempts": false,
    "isEliteChallenge": false,
    "requiresMasterSegment": false,
    "skillBasedMatching": true,
    "eloRange": 100,
    "timeLimit": 35,
    "practiceMode": false,
    "instantSettlement": false
  },
  "entryFee": {
    "coins": 200,
    "tickets": [{"type": "event", "quantity": 1}],
    "props": []
  },
  "rewards": {
    "coins": [
      {"rank": 1, "amount": 800},
      {"rank": 2, "amount": 400},
      {"rank": 3, "amount": 200}
    ],
    "props": [
      {"rank": 1, "props": [{"type": "boost", "quantity": 2}]},
      {"rank": 2, "props": [{"type": "shield", "quantity": 1}]}
    ],
    "tickets": [
      {"rank": 1, "tickets": [{"type": "advanced", "quantity": 1}]}
    ],
    "gamePoints": [
      {"rank": 1, "points": 150},
      {"rank": 2, "points": 75},
      {"rank": 3, "points": 35}
    ]
  }
}
```

### 4.7 多次尝试排名赛 (multi_attempt_ranked)
```json
{
  "typeId": "multi_attempt_ranked",
  "name": "多次尝试排名赛",
  "description": "允许多次尝试的排名锦标赛",
  "config": {
    "allowReuse": false,
    "maxSubmissionsPerTournament": 5,
    "maxAttempts": 5,
    "dailyLimit": 3,
    "independentAttempts": false,
    "isEliteChallenge": false,
    "requiresMasterSegment": false,
    "skillBasedMatching": true,
    "eloRange": 180,
    "timeLimit": 40,
    "practiceMode": false,
    "instantSettlement": false
  },
  "entryFee": {
    "coins": 150,
    "tickets": [{"type": "normal", "quantity": 1}],
    "props": []
  },
  "rewards": {
    "coins": [
      {"rank": 1, "amount": 1200},
      {"rank": 2, "amount": 600},
      {"rank": 3, "amount": 300}
    ],
    "gamePoints": [
      {"rank": 1, "points": 200},
      {"rank": 2, "points": 100},
      {"rank": 3, "points": 50}
    ]
  }
}
```

### 4.8 大师挑战 (master_challenge)
```json
{
  "typeId": "master_challenge",
  "name": "大师挑战",
  "description": "仅限大师段位的精英挑战",
  "config": {
    "allowReuse": false,
    "maxSubmissionsPerTournament": 1,
    "maxAttempts": 2,
    "dailyLimit": 1,
    "independentAttempts": true,
    "isEliteChallenge": true,
    "requiresMasterSegment": true,
    "minSegment": "master",
    "skillBasedMatching": false,
    "timeLimit": 60,
    "practiceMode": false,
    "instantSettlement": true
  },
  "entryFee": {
    "coins": 1000,
    "tickets": [{"type": "exclusive", "quantity": 1}],
    "props": []
  },
  "rewards": {
    "coins": [
      {"rank": 1, "amount": 10000},
      {"rank": 2, "amount": 5000},
      {"rank": 3, "amount": 2500}
    ],
    "props": [
      {"rank": 1, "props": [{"type": "legendary_boost", "quantity": 1}]}
    ],
    "tickets": [
      {"rank": 1, "tickets": [{"type": "exclusive", "quantity": 2}]}
    ],
    "gamePoints": [
      {"rank": 1, "points": 1000},
      {"rank": 2, "points": 500},
      {"rank": 3, "points": 250}
    ]
  }
}
```

## 5. 配置参数详解

### 5.1 参与控制参数
- **allowReuse**: 是否允许重复参与同一锦标赛
- **maxSubmissionsPerTournament**: 每次锦标赛最大提交次数 (-1表示无限制)
- **maxAttempts**: 最大尝试次数 (-1表示无限制)
- **dailyLimit**: 每日参与限制 (-1表示无限制)
- **independentAttempts**: 是否为独立尝试(单人模式)

### 5.2 段位控制参数
- **requiresMasterSegment**: 是否需要大师段位
- **minSegment**: 最低段位要求
- **maxSegment**: 最高段位限制

### 5.3 匹配参数
- **skillBasedMatching**: 是否启用技能匹配
- **eloRange**: ELO评分范围
- **timeLimit**: 时间限制(分钟)

### 5.4 模式参数
- **isEliteChallenge**: 是否为精英挑战
- **practiceMode**: 是否为练习模式
- **instantSettlement**: 是否即时结算

## 6. 系统流程

### 6.1 锦标赛创建流程
1. 验证创建者权限
2. 检查类型配置有效性
3. 创建锦标赛记录
4. 初始化参与者列表
5. 设置定时任务(结束时间)

### 6.2 参与流程
1. 验证参与条件(段位、门票、道具)
2. 扣除入场费
3. 创建参与者记录
4. 更新锦标赛状态
5. 发送参与确认

### 6.3 游戏流程
1. 验证游戏权限
2. 记录游戏开始
3. 处理道具使用
4. 提交分数
5. 更新排行榜

### 6.4 结算流程
1. 检查结算条件
2. 计算最终排名
3. 分配奖励
4. 更新积分
5. 记录结算日志

## 7. 集成系统

### 7.1 道具系统集成
- 支持道具使用验证
- 延迟扣除机制
- 道具使用日志记录
- 道具效果应用

### 7.2 门票系统集成
- 门票验证和扣除
- 门票类型匹配
- 门票使用统计
- 门票奖励分配

### 7.3 任务系统集成
- 锦标赛参与任务
- 胜利任务
- 道具使用任务
- 积分获得任务

### 7.4 段位系统集成
- 段位验证
- 积分计算
- 段位变化记录
- 段位奖励

## 8. 监控和分析

### 8.1 关键指标
- 锦标赛参与率
- 完成率统计
- 奖励分配统计
- 道具使用统计
- 门票消耗统计

### 8.2 异常处理
- 参与条件验证
- 结算异常处理
- 道具扣除失败处理
- 网络异常恢复

## 9. 扩展性设计

### 9.1 新类型支持
- 配置驱动的类型定义
- 插件式处理器
- 动态规则引擎
- 自定义奖励机制

### 9.2 国际化支持
- 多语言配置
- 时区处理
- 本地化奖励
- 区域限制

### 9.3 性能优化
- 数据库索引优化
- 缓存策略
- 异步处理
- 批量操作

## 10. 安全考虑

### 10.1 数据验证
- 输入参数验证
- 权限检查
- 状态一致性
- 防作弊机制

### 10.2 审计日志
- 操作记录
- 变更追踪
- 异常监控
- 数据备份

这个设计文档提供了锦标赛系统的完整架构和配置方案，支持灵活的类型定义和系统集成。 