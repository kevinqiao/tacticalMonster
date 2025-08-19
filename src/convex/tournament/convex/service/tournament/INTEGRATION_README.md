# 锦标赛积分系统集成指南

## 概述

本指南说明如何将新的积分独立设计系统完全替换现有的锦标赛奖励系统。

## 已完成的工作

### 1. 数据库 Schema 更新 ✅

- 更新了 `tournament_types` 表的 `rewards` 结构
- 支持5种积分类型：
  - `rankPoints` - 段位积分
  - `seasonPoints` - 赛季积分  
  - `prestigePoints` - 声望积分
  - `achievementPoints` - 成就积分
  - `tournamentPoints` - 锦标赛积分

### 2. 新的积分规则系统 ✅

- `pointCalculationService.ts` - 核心积分计算逻辑（使用 class 包装）
- `pointCalculationExample.ts` - 使用示例和测试
- 支持段位加成、订阅加成、连胜奖励等

### 3. 完全替换现有系统 ✅

- `settleTournament` 函数完全重写，使用新积分系统
- `calculateRewards` 函数已移除，被新系统替代
- `collectRewards` 函数更新，只处理新积分类型

## 系统架构

```
┌─────────────────────┐    ┌─────────────────────┐
│   tournamentConfigs │    │   pointCalculation  │
│   (配置数据)        │    │   Service           │
├─────────────────────┤    ├─────────────────────┤
│ • rewards          │    │ • 积分计算公式      │
│   - 传统游戏奖励    │    │ • 默认规则配置      │
│   - 金币、道具      │    │ • 积分计算引擎      │
│   - 门票、段位加成  │    │ • 段位积分规则      │
│ • pointRules       │    │ • 排名积分配置      │
│   - 积分计算规则    │    │ • 积分类型开关      │
│   - 段位积分配置    │    │ • 积分倍数限制      │
└─────────────────────┘    └─────────────────────┘
```

## 配置架构说明

### **`rewards` - 传统游戏奖励系统**
- **用途**：定义传统的游戏奖励（金币、道具、门票等）
- **特点**：静态配置，基于排名范围给予固定奖励
- **结构**：
  ```typescript
  rewards: {
      baseRewards: { coins: 5 },
      rankRewards: [
          { rankRange: [1, 1], multiplier: 1.0, coins: 10 },
          { rankRange: [2, 2], multiplier: 0.5, coins: 5 }
      ],
      participationReward: { coins: 5 }
  }
  ```

### **`pointRules` - 积分计算规则系统**
- **用途**：定义积分计算的详细规则和参数
- **特点**：动态计算，支持复杂的积分公式和段位加成
- **结构**：
  ```typescript
  pointRules: {
      enableRankPoints: true,
      pointMultiplier: 1,
      rankPointConfigs: [
          {
              rank: 1,
              rankPoints: { basePoints: 100, bonusMultiplier: 1.5 }
          }
      ],
      segmentPointRules: {
          gold: { baseMultiplier: 1.2, bonusMultiplier: 1.2 }
      }
  }
  ```

## 使用方法

### 1. 直接调用 PointCalculationService 的静态方法

```typescript
import { PointCalculationService } from './pointCalculationService';

// 获取段位积分规则
const segmentRules = PointCalculationService.getSegmentPointRules("gold");

// 获取排名积分配置
const rankConfigs = PointCalculationService.getRankPointConfigs();

// 验证锦标赛规则
const validation = PointCalculationService.validateTournamentRules(rules);

// 计算玩家积分
const points = await PointCalculationService.calculatePlayerTournamentPoints(ctx, args);
```

### 2. 通过 Convex API 调用

```typescript
// 计算玩家积分
const result = await ctx.runMutation(api.pointCalculationService.calculatePlayerTournamentPoints, args);
```

### 3. 在 settleTournament 中的集成

在 `settleTournament` 函数中，我们完全使用新的积分系统：

```typescript
// 直接使用 `PointCalculationService`
const tournamentPoints = await PointCalculationService.calculatePlayerTournamentPoints(ctx, {
    tournamentId,
    uid: playerTournament.uid,
    matchRank: rank,
    matchScore: playerTournament.score || 0,
    matchDuration: tournament.duration || 0,
    segmentName: playerTournament.segment || "bronze"
});
```

## 核心组件说明

### PointCalculationService 类

| 方法 | 类型 | 说明 |
|------|------|------|
| `getSegmentPointRules` | 静态方法 | 获取段位积分规则 |
| `getRankPointConfigs` | 静态方法 | 获取排名积分配置 |
| `getRankPointConfig` | 静态方法 | 获取特定排名配置 |
| `calculatePlayerTournamentPoints` | 静态异步方法 | 计算玩家积分 |

## 配置建议

### 1. 积分平衡
- 段位积分：主要积分类型，影响游戏进度
- 赛季积分：辅助积分，支持Battle Pass
- 其他积分：奖励性质，增加游戏乐趣

### 2. 段位加成
- 低段位：1.0-1.1倍，适合新手
- 中段位：1.1-1.3倍，平衡发展
- 高段位：1.3-1.5倍，挑战性

### 3. 奖励机制
- 连胜奖励：鼓励持续参与
- 完美分数：奖励优秀表现
- 快速获胜：奖励效率

## 测试建议

- 测试 `PointCalculationService` 的各个静态方法
- 验证积分计算的准确性
- 测试默认规则回退机制
- 验证数据库记录的正确性

## 文件结构

```
src/convex/tournament/convex/service/tournament/
├── pointCalculationService.ts - 核心逻辑实现（PointCalculationService 类）
├── pointCalculationExample.ts - 使用示例和测试
├── common.ts - 公共函数（包含 settleTournament）
└── INTEGRATION_README.md - 本集成指南
```

## 架构优势

### 1. **职责分离**
- `rewards` 专注于传统游戏奖励（金币、道具、门票）
- `pointRules` 专注于积分计算规则和配置

### 2. **配置清晰**
- 传统奖励和积分规则分别配置，避免混淆
- 积分计算逻辑更加透明和可维护

### 3. **扩展性强**
- 可以独立调整传统奖励和积分规则
- 支持未来添加新的奖励类型或积分类型

### 4. **维护简单**
- 两套系统独立维护，减少相互影响
- 配置结构更加清晰，便于调试和优化
