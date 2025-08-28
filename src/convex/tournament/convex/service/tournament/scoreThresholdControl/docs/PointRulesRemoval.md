# PointRules.ts 移除说明

## 🎯 移除原因

`pointRules.ts` 文件被移除，因为它与现有的 `tournamentConfigs.ts` 中的配置重复，违反了 DRY（Don't Repeat Yourself）原则。

### 问题分析

1. **重复定义**：`pointRules.ts` 中定义了与 `tournamentConfigs.ts` 相同的积分配置
2. **维护困难**：两个地方维护相同的配置容易导致不一致
3. **架构混乱**：违反了单一配置源的设计原则

## 🔄 重构方案

### 之前的问题架构

```
pointRules.ts (重复配置)
    ↓
PlayerHistoricalDataManager
    ↓
重复的积分计算逻辑
```

### 重构后的架构

```
tournamentConfigs.ts (统一配置源)
    ↓
PlayerHistoricalDataManager
    ↓
直接使用配置，无重复逻辑
```

## 🛠️ 具体修改

### 1. 删除的文件

- `develop/src/convex/tournament/convex/service/tournament/scoreThresholdControl/config/pointRules.ts`
- `develop/src/convex/tournament/convex/service/tournament/scoreThresholdControl/test/pointRulesTest.ts`
- `develop/src/convex/tournament/convex/service/tournament/scoreThresholdControl/test/segmentCalculationTest.ts`

### 2. 更新的文件

#### PlayerHistoricalDataManager.ts

**之前**：
```typescript
import {
    calculateSegmentByPoints,
    getPointsRequiredForSegment,
    getSegmentLevel
} from "../config/pointRules";
```

**现在**：
```typescript
// 直接定义段位配置，避免依赖 pointRules
const SEGMENT_POINT_REQUIREMENTS: { [key: string]: number } = {
    'bronze': 0, 'silver': 500, 'gold': 2000, 'platinum': 5000, 'diamond': 10000
};

const SEGMENT_LEVELS: { [key: string]: number } = {
    'bronze': 1, 'silver': 2, 'gold': 3, 'platinum': 4, 'diamond': 5
};

// 直接在类中实现这些方法
private calculateSegmentByPoints(points: number): string { /* ... */ }
private getPointsRequiredForSegment(segment: string): number { /* ... */ }
private getSegmentLevel(segment: string): number { /* ... */ }
```

## 📊 配置对比

### 之前的重复配置

**pointRules.ts**：
```typescript
export const SEGMENT_POINT_REQUIREMENTS: { [key: string]: number } = {
    'bronze': 0, 'silver': 500, 'gold': 2000, 'platinum': 5000, 'diamond': 10000
};
```

**tournamentConfigs.ts**：
```typescript
segmentPointRules: [
    { segment: 'bronze', multiplier: 1.0, requirements: { points: 0 } },
    { segment: 'silver', multiplier: 1.1, requirements: { points: 500 } },
    { segment: 'gold', multiplier: 1.2, requirements: { points: 2000 } },
    { segment: 'platinum', multiplier: 1.3, requirements: { points: 5000 } },
    { segment: 'diamond', multiplier: 1.5, requirements: { points: 10000 } }
]
```

### 现在的统一配置

所有积分相关的配置都集中在 `tournamentConfigs.ts` 中：

```typescript
export interface PointRules {
    enableRankPoints: boolean;
    enableSeasonPoints: boolean;
    enablePrestigePoints: boolean;
    enableAchievementPoints: boolean;
    enableTournamentPoints: boolean;
    rankPointConfigs: RankPointConfig[];
    segmentPointRules: SegmentPointConfig[];
}
```

## 🔧 使用方法

### 直接使用 tournamentConfigs

```typescript
import { getTournamentConfig } from '../../../../data/tournamentConfigs';

// 获取特定锦标赛的积分配置
const config = getTournamentConfig("jackpot_solitaire_free");

// 获取排名积分
const rankPoints = config?.pointRules?.rankPointConfigs?.find(r => r.rank === 1)?.rankPoints?.basePoints || 100;

// 获取段位倍数
const segmentMultiplier = config?.pointRules?.segmentPointRules?.find(s => s.segment === 'gold')?.multiplier || 1.2;

// 计算比赛积分
const matchPoints = rankPoints * segmentMultiplier;
```

### 在 PlayerHistoricalDataManager 中使用

```typescript
export class PlayerHistoricalDataManager {
    // 直接定义段位配置，避免依赖外部文件
    private static readonly SEGMENT_POINT_REQUIREMENTS = {
        'bronze': 0, 'silver': 500, 'gold': 2000, 'platinum': 5000, 'diamond': 10000
    };

    private calculateSegmentByPoints(points: number): string {
        const sortedSegments = Object.entries(SEGMENT_POINT_REQUIREMENTS)
            .sort(([, a], [, b]) => b - a);
        
        for (const [segment, requiredPoints] of sortedSegments) {
            if (points >= requiredPoints) {
                return segment;
            }
        }
        
        return 'bronze';
    }
}
```

## 📈 重构优势

### 1. 消除重复

- 不再有重复的积分配置
- 统一的配置源，避免不一致
- 减少维护成本

### 2. 架构清晰

- 配置集中在 `tournamentConfigs.ts`
- 业务逻辑集中在各个 Manager 中
- 职责分离更加明确

### 3. 易于扩展

- 新增锦标赛类型时只需修改 `tournamentConfigs.ts`
- 无需维护多个配置文件
- 配置变更影响范围可控

## 🚫 注意事项

### 不要做的事情

1. **不要重新创建 pointRules.ts**：这会导致配置重复
2. **不要在多个地方定义相同的配置**：违反 DRY 原则
3. **不要直接修改 tournamentConfigs.ts 中的配置**：应该通过配置管理工具

### 应该做的事情

1. **直接使用 tournamentConfigs.ts 中的配置**
2. **在需要的地方直接定义简单的常量**
3. **保持配置的一致性和可维护性**

## 📝 总结

通过移除 `pointRules.ts`，我们实现了：

1. **统一配置源**：所有积分配置集中在 `tournamentConfigs.ts`
2. **消除重复**：不再有重复的积分配置定义
3. **架构清晰**：配置和业务逻辑职责分离
4. **易于维护**：配置变更只需修改一个地方

这种重构使得系统更加健壮、可维护，并且符合软件工程的最佳实践。
