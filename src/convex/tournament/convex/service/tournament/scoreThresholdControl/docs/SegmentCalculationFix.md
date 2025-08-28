# 段位计算修复文档

## 问题描述

在修复 `PlayerHistoricalDataManager` 的段位计算时，发现了一个架构问题：

**重复定义问题**：新创建的 `pointRules.ts` 文件中的排名积分配置（`RANK_POINT_CONFIGS`）和段位倍数配置（`SEGMENT_MULTIPLIERS`）与现有的 `tournamentConfigs.ts` 文件中的配置重复。

## 解决方案

### 重构策略：统一配置源

1. **移除重复定义**：删除 `pointRules.ts` 中的硬编码配置常量
2. **导入现有配置**：从 `tournamentConfigs.ts` 导入配置
3. **保持接口一致**：确保所有函数调用方式保持不变
4. **增强灵活性**：支持不同锦标赛类型的积分配置

### 具体修改

#### 1. 配置获取函数重构

**之前**：
```typescript
export const RANK_POINT_CONFIGS: { [key: number]: number } = {
    1: 100, 2: 80, 3: 60, 4: 40, 5: 20, 6: 10, 7: 5, 8: 1
};

export function getRankPoints(rank: number): number {
    return RANK_POINT_CONFIGS[rank] || 0;
}
```

**现在**：
```typescript
export function getRankPoints(rank: number, tournamentTypeId: string = "jackpot_solitaire_free"): number {
    const config = getTournamentConfig(tournamentTypeId);
    if (!config?.pointRules?.rankPointConfigs) {
        // 默认配置作为后备
        const defaultRankPoints: { [key: number]: number } = {
            1: 100, 2: 80, 3: 60, 4: 40, 5: 20, 6: 10, 7: 5, 8: 1
        };
        return defaultRankPoints[rank] || 0;
    }
    
    const rankConfig = config.pointRules.rankPointConfigs.find(r => r.rank === rank);
    return rankConfig?.rankPoints.basePoints || 0;
}
```

#### 2. 段位倍数配置重构

**之前**：
```typescript
export const SEGMENT_MULTIPLIERS: { [key: string]: number } = {
    'bronze': 1.0, 'silver': 1.1, 'gold': 1.2, 'platinum': 1.3, 'diamond': 1.5
};
```

**现在**：
```typescript
export function getSegmentMultiplier(segmentName: string, tournamentTypeId: string = "jackpot_solitaire_free"): number {
    const config = getTournamentConfig(tournamentTypeId);
    if (!config?.pointRules?.segmentPointRules) {
        // 默认配置作为后备
        const defaultMultipliers: { [key: string]: number } = {
            'bronze': 1.0, 'silver': 1.1, 'gold': 1.2, 'platinum': 1.3, 'diamond': 1.5
        };
        return defaultMultipliers[segmentName] || 1.0;
    }
    
    const segmentRule = config.pointRules.segmentPointRules.find(s => s.segment === segmentName);
    return segmentRule?.multiplier || 1.0;
}
```

## 重构的好处

### 1. 避免重复定义
- **单一数据源**：所有积分配置都来自 `tournamentConfigs.ts`
- **维护一致性**：修改配置只需要在一个地方进行
- **减少错误**：避免配置不同步导致的系统不一致

### 2. 增强灵活性
- **多锦标赛支持**：支持不同锦标赛类型的积分配置
- **动态配置**：可以根据锦标赛类型动态调整积分规则
- **扩展性**：新增锦标赛类型时无需修改 `pointRules.ts`

### 3. 保持向后兼容
- **接口不变**：所有现有函数调用方式保持不变
- **默认值支持**：当配置不可用时，使用合理的默认值
- **渐进式迁移**：可以逐步添加锦标赛类型支持

## 配置结构对比

### tournamentConfigs.ts 的完整配置
```typescript
rankPointConfigs: [
    {
        rank: 1,
        rankPoints: { basePoints: 100, bonusMultiplier: 1.5, maxPoints: 1000, minPoints: 0 },
        seasonPoints: { basePoints: 50, bonusMultiplier: 1.2, maxPoints: 1000, minPoints: 0 },
        prestigePoints: { basePoints: 20, bonusMultiplier: 1.1, maxPoints: 1000, minPoints: 0 },
        achievementPoints: { basePoints: 10, bonusMultiplier: 1.0, maxPoints: 1000, minPoints: 0 },
        tournamentPoints: { basePoints: 5, bonusMultiplier: 1.0, maxPoints: 1000, minPoints: 0 }
    }
    // ... 更多排名配置
]
```

### pointRules.ts 的简化接口
```typescript
// 只需要调用 getRankPoints(rank, tournamentTypeId)
// 内部自动从 tournamentConfigs 获取完整配置
```

## 使用方式

### 基本用法（保持兼容）
```typescript
import { getRankPoints, getSegmentMultiplier } from './config/pointRules';

// 使用默认锦标赛类型
const points = getRankPoints(1);  // 100
const multiplier = getSegmentMultiplier('gold');  // 1.2
```

### 指定锦标赛类型
```typescript
// 指定特定锦标赛类型
const points = getRankPoints(1, 'quick_match_solitaire_ticket1');
const multiplier = getSegmentMultiplier('diamond', 'jackpot_solitaire_free');
```

### 积分计算
```typescript
import { calculateMatchPoints } from './config/pointRules';

// 计算比赛积分（支持锦标赛类型）
const matchPoints = calculateMatchPoints(1, 'gold', 'jackpot_solitaire_free');
```

### 使用示例

```typescript
// 直接使用 tournamentConfigs 中的配置
import { getTournamentConfig } from '../../../../data/tournamentConfigs';

// 获取特定锦标赛的积分配置
const config = getTournamentConfig("jackpot_solitaire_free");
const rankPoints = config?.pointRules?.rankPointConfigs?.find(r => r.rank === 1)?.rankPoints?.basePoints || 100;
const segmentMultiplier = config?.pointRules?.segmentPointRules?.find(s => s.segment === 'gold')?.multiplier || 1.2;

// 计算比赛积分
const matchPoints = rankPoints * segmentMultiplier;
```

## 测试验证

运行测试文件验证重构后的功能：
```bash
cd develop/src/convex/tournament/convex/service/tournament/scoreThresholdControl/test
node segmentCalculationTest.ts
```

测试将验证：
1. 从 `tournamentConfigs.ts` 成功获取配置
2. 不同锦标赛类型的积分差异
3. 默认配置作为后备机制
4. 所有函数接口保持兼容

## 总结

这次重构解决了重复定义问题，实现了：

1. **配置统一**：所有积分配置来自单一数据源
2. **功能增强**：支持多锦标赛类型的积分规则
3. **维护简化**：避免配置同步问题
4. **向后兼容**：现有代码无需修改

这是一个典型的"DRY"（Don't Repeat Yourself）原则应用，提高了代码质量和系统一致性。
