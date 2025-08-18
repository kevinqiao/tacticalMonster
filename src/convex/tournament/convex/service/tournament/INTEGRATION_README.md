# 锦标赛积分系统集成指南

## 概述

本指南说明如何将新的积分独立设计系统集成到现有的锦标赛系统中。

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

- `tournamentRules.ts` - 核心积分计算逻辑（使用 class 包装）
- `tournamentRulesExample.ts` - 使用示例和测试
- 支持段位加成、订阅加成、连胜奖励等

### 3. 集成接口 ✅

- `tournamentService.ts` 中添加了新的积分计算函数
- 支持从现有配置调用新的积分系统

## 系统架构

```
┌─────────────────────┐    ┌─────────────────────┐
│   tournamentConfigs │    │   tournamentRules   │
│   (配置数据)        │    │   (业务逻辑)        │
├─────────────────────┤    ├─────────────────────┤
│ • 积分基础值        │    │ • 积分计算公式      │
│ • 段位倍数          │    │ • 奖励计算逻辑      │
│ • 限制条件          │    │ • 验证规则          │
│ • 时间设置          │    │ • 数据库操作        │
└─────────────────────┘    └─────────────────────┘
           │                           │
           └───────────┬───────────────┘
                       │
              ┌─────────────────┐
              │  业务执行层      │
              │ (使用配置+规则)  │
              └─────────────────┘
```

## 使用方法

### 1. 直接调用 Class 方法（推荐）

```typescript
// 直接调用 TournamentRulesService 的静态方法
import { TournamentRulesService } from './tournamentRules';

// 获取段位积分规则
const segmentRules = TournamentRulesService.getSegmentPointRules("gold");

// 获取排名积分配置
const rankConfigs = TournamentRulesService.getRankPointConfigs();

// 验证锦标赛规则
const validation = TournamentRulesService.validateTournamentRules(rules);

// 计算积分（在 Convex 函数中）
const points = await TournamentRulesService.calculatePlayerTournamentPoints(ctx, {
    tournamentId: "daily_tournament",
    uid: "player123",
    matchRank: 1,
    matchScore: 1500,
    matchDuration: 300,
    segmentName: "gold",
    isPerfectScore: true,
    isQuickWin: false,
    isComebackWin: false,
    winningStreak: 3
});
```

### 2. 通过 Convex 函数调用

```typescript
// 调用 Convex 函数
const result = await ctx.runMutation(api.tournamentRules.calculatePlayerTournamentPoints, {
    tournamentId: "daily_tournament",
    uid: "player123",
    matchRank: 1,
    matchScore: 1500,
    matchDuration: 300,
    segmentName: "gold",
    isPerfectScore: true,
    isQuickWin: false,
    isComebackWin: false,
    winningStreak: 3
});
```

### 3. 获取积分规则

```typescript
// 获取锦标赛的积分规则配置
const rules = await ctx.runQuery(api.tournamentService.getTournamentPointRules, {
    tournamentId: "daily_tournament"
});
```

### 4. 创建新的锦标赛配置

```typescript
// 在 tournamentConfigs.ts 中添加新配置
{
    typeId: "new_tournament",
    name: "新锦标赛",
    // ... 其他配置
    rewards: {
        baseRewards: {
            rankPoints: 100,        // 段位积分
            seasonPoints: 50,       // 赛季积分
            prestigePoints: 20,     // 声望积分
            achievementPoints: 10,  // 成就积分
            tournamentPoints: 200   // 锦标赛积分
        },
        segmentBonus: {
            bronze: {
                rankPoints: 1.0,
                seasonPoints: 1.0,
                prestigePoints: 1.0,
                achievementPoints: 1.0,
                tournamentPoints: 1.0
            },
            gold: {
                rankPoints: 1.2,
                seasonPoints: 1.2,
                prestigePoints: 1.2,
                achievementPoints: 1.2,
                tournamentPoints: 1.2
            }
            // ... 其他段位
        }
    }
}
```

## Class 结构优势

### 1. **一致性**
- 与 `tournamentService.ts` 保持相同的代码风格
- 统一的调用方式和命名规范

### 2. **可维护性**
- 所有相关功能集中在 `TournamentRulesService` 类中
- 便于代码组织和重构

### 3. **可扩展性**
- 易于添加新的方法和功能
- 支持继承和多态

### 4. **测试友好**
- 可以直接测试 class 方法，无需 Convex 环境
- 支持单元测试和集成测试

## 核心方法说明

### TournamentRulesService 类

| 方法 | 类型 | 说明 |
|------|------|------|
| `getSegmentPointRules` | 静态方法 | 获取段位积分规则 |
| `getRankPointConfigs` | 静态方法 | 获取排名积分配置 |
| `getRankPointConfig` | 静态方法 | 获取特定排名配置 |
| `validateTournamentRules` | 静态方法 | 验证锦标赛规则 |
| `createCustomTournamentRules` | 静态异步方法 | 创建自定义规则 |
| `getTournamentRules` | 静态异步方法 | 获取锦标赛规则 |
| `getAvailableSegments` | 静态方法 | 获取可用段位 |
| `getSegmentInfo` | 静态方法 | 获取段位信息 |
| `calculatePlayerTournamentPoints` | 静态异步方法 | 计算玩家积分 |

## 积分类型说明

### 1. 段位积分 (rankPoints)
- **用途**: 段位升降级
- **获取**: 通过比赛排名和表现
- **消耗**: 段位升级时扣除

### 2. 赛季积分 (seasonPoints)  
- **用途**: Battle Pass 升级
- **获取**: 通过比赛参与和成就
- **特点**: 每个赛季重置

### 3. 声望积分 (prestigePoints)
- **用途**: 特殊成就和奖励
- **获取**: 通过完美表现和连胜
- **特点**: 永久保留

### 4. 成就积分 (achievementPoints)
- **用途**: 成就系统解锁
- **获取**: 通过特定成就达成
- **特点**: 累积型积分

### 5. 锦标赛积分 (tournamentPoints)
- **用途**: 锦标赛排名和奖励
- **获取**: 通过锦标赛表现
- **特点**: 锦标赛专用

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

### 1. 单元测试
- 测试 `TournamentRulesService` 的各个静态方法
- 验证积分计算逻辑正确性
- 检查段位加成和奖励机制

### 2. 集成测试
- 测试与现有系统的兼容性
- 验证数据库操作正确性
- 检查性能表现

### 3. 用户测试
- 验证积分获取逻辑合理性
- 检查段位升级体验
- 评估奖励系统吸引力

## 注意事项

1. **向后兼容**: 新系统完全兼容现有配置
2. **性能考虑**: 积分计算已优化，支持高并发
3. **扩展性**: 系统设计支持未来添加新的积分类型
4. **数据一致性**: 所有积分操作都有事务保护
5. **Class 调用**: 推荐直接调用 class 方法，性能更好

## 下一步计划

1. **监控系统**: 添加积分获取和使用统计
2. **平衡调整**: 基于用户反馈调整积分参数
3. **新功能**: 支持积分交易、积分商城等
4. **国际化**: 支持多语言和地区化配置

## 技术支持

如有问题，请参考：
- `tournamentRules.ts` - 核心逻辑实现（TournamentRulesService 类）
- `tournamentRulesExample.ts` - 使用示例和测试
- `TOURNAMENT_RULES_README.md` - 详细文档
