# 完整项目系统架构设计

## 📋 项目概述

基于现有代码分析，这是一个多功能的游戏平台系统，采用微服务架构，使用 Convex 作为后端数据库和实时通信平台。系统集成了任务系统、门票系统、Battle Pass系统、段位系统、排行榜系统等多个核心模块。

## 🏗️ 整体架构

### **技术栈**
```
前端: React + TypeScript
后端: Convex (实时数据库 + API)
部署: Netlify
游戏引擎: 自定义游戏引擎
3D渲染: Three.js (部分模块)
```

### **系统架构图**
```
┌─────────────────────────────────────────────────────────────┐
│                    前端层 (React + TypeScript)              │
├─────────────────────────────────────────────────────────────┤
│  Game Launcher  │  Lobby System  │  Battle System  │  UI  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API层 (Convex Functions)                │
├─────────────────────────────────────────────────────────────┤
│  Tournament  │  Task  │  BattlePass  │  Segment  │  Ticket │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  数据层 (Convex Database)                  │
├─────────────────────────────────────────────────────────────┤
│  player_*  │  tournament_*  │  task_*  │  battle_pass_*  │
└─────────────────────────────────────────────────────────────┘
```

## 🎮 核心系统模块

### **1. 游戏系统 (Game System)**

#### **游戏类型**
- **Solitaire**: 纸牌游戏
- **Chess**: 国际象棋
- **Ludo**: 飞行棋
- **其他游戏**: 可扩展的游戏类型

#### **游戏引擎架构**
```typescript
// 游戏启动器
GameLauncher.tsx
├── SolitaireLauncher.tsx
├── ChessLauncher.tsx
└── LudoLauncher.tsx

// 游戏核心
PlayGround.tsx
├── battle/          // 战斗系统
├── map.css          // 地图样式
└── util/            // 工具函数
```

#### **游戏流程**
```
1. 玩家选择游戏类型
2. 进入游戏大厅
3. 匹配对手或AI
4. 开始游戏对局
5. 结算奖励和积分
6. 更新排行榜和段位
```

### **2. 锦标赛系统 (Tournament System)**

#### **锦标赛类型**
```typescript
// 快速对局 (Quick Match)
quick_match_solitaire_free    // 免费快速对局
quick_match_solitaire_ticket  // 门票快速对局

// 特殊锦标赛
daily_special                 // 每日特殊赛
weekly_championship          // 每周锦标赛
seasonal_tournament          // 赛季锦标赛
```

#### **核心功能**
- **匹配系统**: 基于技能和段位的智能匹配
- **奖励系统**: 金币、赛季积分、段位积分
- **排行榜**: 实时排行榜更新
- **限制系统**: 每日/每周参与限制

#### **数据流**
```
玩家参与 → 匹配对手 → 开始对局 → 结算结果 → 更新积分 → 更新排行榜
```

### **3. 任务系统 (Task System)**

#### **任务类型**
```typescript
// 任务类型
one_time    // 一次性任务
daily       // 每日任务
weekly      // 每周任务
seasonal    // 赛季任务

// 任务条件
simple       // 简单条件
multi_stage  // 多阶段条件
conditional  // 条件任务
time_based   // 时间任务
```

#### **任务分类**
- **gameplay**: 游戏相关任务
- **social**: 社交任务
- **collection**: 收集任务
- **challenge**: 挑战任务
- **tournament**: 锦标赛任务
- **achievement**: 成就任务

#### **三表设计**
```typescript
// 活跃任务
player_tasks: {
    uid: string,
    templateId: string,
    currentValue: number,
    isCompleted: boolean,
    dueTime: string
}

// 已完成任务
completed_tasks: {
    uid: string,
    templateId: string,
    completedAt: string,
    rewards: TaskRewards
}

// 过期任务
expired_tasks: {
    uid: string,
    templateId: string,
    expiredAt: string,
    lastValue: number
}
```

### **4. Battle Pass系统 (Battle Pass System)**

#### **系统设计**
```typescript
// 25级进度系统
seasonPointsPerLevel: 100
maxLevel: 25

// 双轨道设计
freeTrack:     // 免费轨道
premiumTrack:  // 付费轨道 (500金币)
```

#### **积分来源**
- **任务奖励**: 30%
- **快速对局**: 20%
- **每日/每周排行榜**: 25%
- **段位升级**: 10%
- **社交活动**: 10%
- **成就解锁**: 5%

#### **奖励结构**
```typescript
// 免费轨道总奖励
{
    coins: 2500,
    tickets: [
        { type: "bronze", quantity: 8 },
        { type: "silver", quantity: 3 },
        { type: "gold", quantity: 1 }
    ]
}

// 付费轨道总奖励
{
    coins: 5000,
    tickets: [
        { type: "bronze", quantity: 15 },
        { type: "silver", quantity: 8 },
        { type: "gold", quantity: 6 }
    ],
    exclusiveItems: [
        {
            itemId: "premium_avatar_25",
            itemType: "avatar",
            name: "宗师头像",
            rarity: "legendary"
        }
    ]
}
```

### **5. 段位系统 (Segment System)**

#### **段位等级**
```typescript
// 7个段位等级
bronze      // 青铜 (0-999积分)
silver      // 白银 (1000-1999积分)
gold        // 黄金 (2000-2999积分)
platinum    // 铂金 (3000-3999积分)
diamond     // 钻石 (4000-4999积分)
master      // 大师 (5000-5999积分)
grandmaster // 宗师 (6000+积分)
```

#### **升级奖励**
```typescript
// 段位升级奖励
upgradeRewards: {
    coins: number,
    seasonPoints: number,
    tickets: Ticket[],
    props: Prop[]
}
```

#### **积分来源**
- **锦标赛**: 根据排名获得积分
- **快速对局**: 胜利获得积分
- **排行榜奖励**: 排名奖励积分
- **任务奖励**: 任务完成获得积分

### **6. 门票系统 (Ticket System)**

#### **门票类型**
```typescript
// 三种门票类型
bronze: {
    price: { coins: 100 },
    maxUsagePerDay: 10,
    seasonalRetention: 1.0  // 100%跨赛季保留
},
silver: {
    price: { coins: 250 },
    maxUsagePerDay: 5,
    seasonalRetention: 0.5  // 50%跨赛季保留
},
gold: {
    price: { coins: 500 },
    maxUsagePerDay: 3,
    seasonalRetention: 0.0  // 0%跨赛季保留
}
```

#### **跨赛季保留策略**
- **青铜门票**: 完全保留，适合长期投资
- **白银门票**: 50%保留，平衡策略
- **黄金门票**: 完全重置，短期使用

### **7. 排行榜系统 (Leaderboard System)**

#### **排行榜类型**
```typescript
// 每日排行榜
daily_leaderboard_points           // 综合排行榜
daily_leaderboard_points_by_game  // 游戏特定排行榜

// 每周排行榜
weekly_leaderboard_points          // 综合排行榜
weekly_leaderboard_points_by_game // 游戏特定排行榜
```

#### **积分计算**
```typescript
// 每局积分规则
matchPoints: {
    "1": 3,  // 第1名获得3分
    "2": 2,  // 第2名获得2分
    "3": 1,  // 第3名获得1分
    "4": 0   // 第4名获得0分
}
```

#### **奖励结构**
```typescript
// 排行榜奖励
rewards: [
    {
        rankRange: [1, 1],     // 第1名
        rankPoints: 100,
        seasonPoints: 50,
        coins: 200
    },
    {
        rankRange: [2, 3],     // 第2-3名
        rankPoints: 50,
        seasonPoints: 25,
        coins: 100
    }
]
```

## 🗄️ 数据库架构

### **核心表结构**

#### **玩家相关表**
```typescript
players: {
    uid: string,
    username: string,
    coins: number,
    gamePoints: GamePoints,
    seasonPoints: number,
    rankPoints: number,
    segmentName: string
}

player_segments: {
    uid: string,
    segmentName: string,
    rankPoints: number,
    seasonId: string,
    upgradeHistory: SegmentUpgradeHistory[]
}

player_battle_pass: {
    uid: string,
    seasonId: string,
    currentLevel: number,
    currentSeasonPoints: number,
    totalSeasonPoints: number,
    isPremium: boolean,
    claimedLevels: number[]
}
```

#### **游戏相关表**
```typescript
tournaments: {
    tournamentId: string,
    typeId: string,
    gameType: string,
    status: string,
    participants: Participant[],
    results: Result[]
}

matches: {
    matchId: string,
    tournamentId: string,
    gameType: string,
    players: Player[],
    status: string,
    result: MatchResult
}
```

#### **任务相关表**
```typescript
task_templates: {
    templateId: string,
    name: string,
    type: string,
    category: string,
    condition: TaskCondition,
    rewards: TaskRewards
}

player_tasks: {
    uid: string,
    templateId: string,
    currentValue: number,
    isCompleted: boolean,
    dueTime: string
}
```

#### **门票相关表**
```typescript
player_tickets: {
    uid: string,
    type: string,
    quantity: number,
    seasonId: string
}

ticket_usage_stats: {
    uid: string,
    type: string,
    totalUsed: number,
    totalWon: number,
    winRate: number
}
```

#### **排行榜相关表**
```typescript
daily_leaderboard_points: {
    date: string,
    uid: string,
    totalScore: number,
    matchesPlayed: number
}

weekly_leaderboard_points: {
    weekStart: string,
    uid: string,
    totalScore: number,
    matchesPlayed: number
}
```

## 🔄 系统集成流程

### **1. 玩家登录流程**
```
1. 玩家登录
2. 检查并分配任务
3. 处理过期任务
4. 初始化Battle Pass
5. 检查段位状态
6. 返回玩家数据
```

### **2. 游戏完成流程**
```
1. 游戏对局结束
2. 结算游戏结果
3. 更新段位积分
4. 更新赛季积分
5. 更新排行榜
6. 检查任务进度
7. 发放奖励
```

### **3. 任务完成流程**
```
1. 任务进度更新
2. 检查任务完成
3. 发放任务奖励
4. 更新赛季积分
5. 检查Battle Pass升级
6. 记录完成日志
```

### **4. 赛季重置流程**
```
1. 赛季结束
2. 结算排行榜奖励
3. 处理门票跨赛季保留
4. 重置Battle Pass
5. 重置段位积分
6. 开始新赛季
```

## 🎯 业务逻辑

### **经济系统**
```typescript
// 货币类型
coins:        // 通用货币，可购买门票和道具
seasonPoints: // 赛季积分，驱动Battle Pass
rankPoints:   // 段位积分，驱动段位系统
gamePoints:   // 游戏积分，游戏内使用

// 积分来源
coins:        任务奖励、排行榜奖励、段位升级
seasonPoints: 任务奖励、快速对局、排行榜、段位升级
rankPoints:   锦标赛、快速对局、排行榜、任务
```

### **平衡性设计**
```typescript
// 每日限制
dailyLimits: {
    quickMatch: 10,    // 免费快速对局
    tournament: 5,     // 锦标赛参与
    taskClaims: 20,    // 任务领取
    ticketUsage: 10    // 门票使用
}

// 每周限制
weeklyLimits: {
    leaderboardRewards: 1,  // 排行榜奖励
    segmentUpgrades: 3      // 段位升级
}
```

### **奖励机制**
```typescript
// 奖励优先级
1. 基础奖励 (金币、积分)
2. 段位奖励 (段位积分、升级奖励)
3. Battle Pass奖励 (赛季积分、等级奖励)
4. 特殊奖励 (专属物品、稀有道具)
```

## 🔧 技术实现

### **API设计**
```typescript
// 查询接口
getPlayerBattlePass(uid: string)
getPlayerTasks(uid: string)
getSeasonLeaderboard(limit: number)
getSegmentDistribution()

// 修改接口
addSeasonPoints(uid, amount, source)
claimTaskRewards(uid, taskId)
purchaseTicket(uid, type, quantity)
```

### **性能优化**
```typescript
// 索引策略
by_uid_season: ["uid", "seasonId"]
by_season_totalSeasonPoints: ["seasonId", "totalSeasonPoints"]
by_date_score: ["date", "totalScore"]

// 缓存策略
configCache: Map<string, BattlePassConfig>
leaderboardCache: Map<string, any[]>
statsCache: Map<string, BattlePassStats>
```

### **监控指标**
```typescript
// 关键指标
totalPlayers: number,
averageLevel: number,
premiumConversionRate: number,
completionRate: number,
averageSeasonPoints: number

// 来源分布
sourceDistribution: {
    tournament: number,
    quickMatch: number,
    task: number,
    social: number,
    achievement: number,
    segmentUpgrade: number
}
```

## 🚀 扩展性设计

### **新游戏类型支持**
```typescript
// 游戏类型扩展
interface GameType {
    type: string,
    name: string,
    rules: GameRules,
    rewards: GameRewards
}

// 新增游戏
const newGame: GameType = {
    type: "puzzle",
    name: "益智游戏",
    rules: { /* 游戏规则 */ },
    rewards: { /* 奖励配置 */ }
}
```

### **新任务类型支持**
```typescript
// 任务条件扩展
interface ExtendedTaskCondition extends TaskCondition {
    newConditionType?: NewConditionType;
    customLogic?: CustomLogic;
}
```

### **新奖励类型支持**
```typescript
// 奖励类型扩展
interface ExtendedRewards extends BattlePassRewards {
    newRewardType?: NewRewardType[];
    customItems?: CustomItem[];
    specialEffects?: SpecialEffect[];
}
```

## 📊 部署架构

### **开发环境**
```
本地开发 → Convex Dev → 测试数据库
```

### **生产环境**
```
Netlify → Convex Production → 生产数据库
```

### **数据备份**
```
实时备份 → 定期快照 → 灾难恢复
```

这个完整的系统架构设计涵盖了游戏平台的所有核心功能，提供了可扩展、高性能、用户友好的游戏体验！ 