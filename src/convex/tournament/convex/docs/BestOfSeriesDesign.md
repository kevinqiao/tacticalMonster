# Best of Series 锦标赛设计文档

## 📋 概述

Best of Series 锦标赛是一种多局制比赛模式，玩家需要进行多轮比赛，先达到指定胜局数的玩家获胜。这种模式特别适合策略性游戏，如国际象棋、拉米纸牌等。

## 🎯 核心概念

### 1. 系列赛结构
- **总局数**：可配置的总比赛局数（如3局、5局）
- **获胜条件**：先达到指定胜局数的玩家获胜（如3局中先赢2局）
- **平局处理**：当无法通过胜局数决定胜负时，按总分排名

### 2. 比赛流程
```
玩家加入 → 创建系列赛 → 进行第1局 → 记录结果 → 检查胜负
    ↓
如果未决出胜负 → 进行下一局 → 重复直到决出胜负
    ↓
系列赛完成 → 结算奖励 → 更新排名
```

## 🏗️ 技术实现

### 1. 数据库结构

#### 系列赛配置 (matches.gameData.seriesConfig)
```typescript
{
  totalGames: number,      // 总局数
  gamesToWin: number,      // 获胜所需局数
  currentGame: number,     // 当前局数
  playerScores: {          // 玩家分数统计
    [uid: string]: {
      wins: number,        // 胜局数
      losses: number,      // 负局数
      totalScore: number,  // 总分
      games: Array<{       // 每局详细记录
        gameNumber: number,
        score: number,
        timestamp: string,
        propsUsed: string[]
      }>
    }
  },
  gameResults: Array<{     // 所有游戏结果
    gameNumber: number,
    uid: string,
    score: number,
    timestamp: string,
    propsUsed: string[]
  }>,
  seriesComplete: boolean  // 系列赛是否完成
}
```

### 2. 处理器实现

#### 加入锦标赛 (join)
```typescript
// 1. 检查参赛资格
const eligibility = await checkTournamentEligibility(ctx, {...});

// 2. 查找或创建锦标赛
const tournament = await findOrCreateBestOfSeriesTournament(ctx, {...});

// 3. 创建系列赛比赛
const seriesMatchId = await MatchManager.createMatch(ctx, {
  matchType: "best_of_series",
  gameData: {
    seriesConfig: {
      totalGames: 3,
      gamesToWin: 2,
      currentGame: 1,
      playerScores: {},
      gameResults: []
    }
  }
});
```

#### 提交分数 (submitScore)
```typescript
// 1. 获取系列赛配置
const seriesConfig = seriesMatch.gameData.seriesConfig;

// 2. 记录当前游戏结果
const gameResult = {
  gameNumber: currentGame,
  uid,
  score,
  timestamp: now.iso,
  propsUsed
};

// 3. 更新玩家统计
seriesConfig.playerScores[uid].totalScore += score;
seriesConfig.playerScores[uid].games.push(gameResult);

// 4. 检查胜负条件
const maxWins = Math.max(...playerScores.map(p => p.wins));
const seriesComplete = maxWins >= gamesToWin || currentGame >= totalGames;

// 5. 如果完成则结算
if (seriesComplete) {
  await bestOfSeriesHandler.settle(ctx, tournamentId);
}
```

#### 结算锦标赛 (settle)
```typescript
// 1. 计算最终排名
const players = Object.entries(playerScores).map(([uid, stats]) => ({
  uid,
  wins: stats.wins,
  losses: stats.losses,
  totalScore: stats.totalScore,
  averageScore: stats.totalScore / stats.games.length
}));

// 2. 按胜场数和总分排序
players.sort((a, b) => {
  if (a.wins !== b.wins) return b.wins - a.wins;
  return b.totalScore - a.totalScore;
});

// 3. 分配排名和奖励
const rankedPlayers = players.map((player, index) => ({
  ...player,
  rank: index + 1
}));
```

## ⚙️ 配置示例

### 三局两胜锦标赛 (BO3)
```typescript
{
  typeId: "best_of_series_tournament",
  name: "三局两胜锦标赛",
  matchRules: {
    matchType: "best_of_series",
    minPlayers: 2,
    maxPlayers: 2,
    specialRules: [
      {
        type: "total_games",
        value: 3,
        description: "总共进行3局比赛"
      },
      {
        type: "games_to_win",
        value: 2,
        description: "先赢2局获胜"
      }
    ]
  }
}
```

### 五局三胜锦标赛 (BO5)
```typescript
{
  typeId: "bo5_tournament",
  name: "五局三胜锦标赛",
  matchRules: {
    matchType: "best_of_series",
    minPlayers: 2,
    maxPlayers: 2,
    specialRules: [
      {
        type: "total_games",
        value: 5,
        description: "总共进行5局比赛"
      },
      {
        type: "games_to_win",
        value: 3,
        description: "先赢3局获胜"
      }
    ]
  }
}
```

## 🎮 游戏流程

### 1. 玩家加入
- 检查参赛资格和尝试次数限制
- 查找现有锦标赛或创建新锦标赛
- 创建系列赛比赛实例
- 返回系列赛配置信息

### 2. 进行游戏
- 玩家进行单局游戏
- 提交单局分数
- 系统记录游戏结果
- 更新玩家统计信息

### 3. 胜负判定
- 检查是否有玩家达到获胜局数
- 如果达到，标记系列赛完成
- 如果未达到且还有剩余局数，继续下一局
- 如果所有局数完成，按总分决定胜负

### 4. 结算奖励
- 计算最终排名（胜局数优先，总分次之）
- 分配排名奖励
- 更新玩家统计
- 发送完成通知

## 🔧 特殊规则

### 1. 时间限制
- **每局时间限制**：可配置每局的最大时间
- **总时间限制**：整个系列赛的最大时间
- **超时处理**：超时自动判负

### 2. 道具使用
- 每局可独立使用道具
- 道具使用记录在游戏结果中
- 不影响系列赛整体规则

### 3. 断线重连
- 支持单局内的断线重连
- 系列赛进度保持不变
- 断线时间计入总时间限制

### 4. 平局处理
- 当胜局数相同时，按总分排名
- 总分相同时，按平均分排名
- 平均分相同时，按完成时间排名

## 📊 统计指标

### 1. 系列赛统计
- 总局数
- 实际进行局数
- 系列赛持续时间
- 玩家参与情况

### 2. 玩家统计
- 胜局数和负局数
- 总分和平均分
- 每局详细记录
- 道具使用情况

### 3. 性能指标
- 系列赛完成率
- 平均完成时间
- 玩家满意度
- 系统稳定性

## 🚀 扩展功能

### 1. 动态局数
- 根据玩家技能差异调整局数
- 支持自定义获胜条件
- 灵活的平局处理规则

### 2. 团队模式
- 支持2v2或3v3团队赛
- 团队内分数汇总
- 团队排名机制

### 3. 锦标赛模式
- 多轮系列赛
- 淘汰赛制
- 积分排名

### 4. 观战功能
- 实时观战
- 历史回放
- 精彩时刻记录

## 🔍 测试用例

### 1. 基本功能测试
- 三局两胜正常流程
- 五局三胜正常流程
- 平局处理机制
- 超时处理机制

### 2. 异常情况测试
- 玩家断线重连
- 系统异常恢复
- 数据一致性检查
- 并发访问处理

### 3. 性能测试
- 大量并发系列赛
- 长时间运行稳定性
- 数据库性能优化
- 内存使用监控

## 📝 注意事项

1. **数据一致性**：确保系列赛状态的一致性
2. **并发安全**：处理多玩家同时提交分数的情况
3. **错误恢复**：系统异常时的数据恢复机制
4. **性能优化**：大量系列赛时的性能考虑
5. **用户体验**：清晰的进度显示和状态反馈 