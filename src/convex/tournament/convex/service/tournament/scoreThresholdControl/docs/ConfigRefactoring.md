# Config.ts 重构说明

## 🎯 重构原因

`config.ts` 中包含了大量重复的 segment 配置，这些配置与 `tournamentConfigs.ts` 中的配置重复，违反了 DRY 原则。

### 问题分析

1. **重复配置**：`config.ts` 中定义了与 `tournamentConfigs.ts` 相同的段位积分配置
2. **维护困难**：两个地方维护相同的配置容易导致不一致
3. **职责混乱**：`config.ts` 应该专注于系统级配置，而不是业务级配置

## 🔄 重构方案

### 重构前的架构

```
config.ts (重复的段位配置)
    ↓
ScoreThresholdPlayerController
    ↓
重复的积分配置逻辑
```

### 重构后的架构

```
tournamentConfigs.ts (统一配置源)
    ↓
config.ts (系统级配置)
    ↓
ScoreThresholdPlayerController
    ↓
使用统一配置，无重复逻辑
```

## 🛠️ 具体修改

### 1. 移除的配置

#### 段位保护配置
```typescript
// 已移除
export const SEGMENT_PROTECTION_CONFIGS: Record<SegmentName, SegmentProtectionConfig> = {
    bronze: { /* ... */ },
    silver: { /* ... */ },
    // ... 其他段位配置
};
```

#### 默认分数门槛配置
```typescript
// 已移除
export const DEFAULT_SCORE_THRESHOLDS: Record<SegmentName, ScoreThreshold[]> = {
    bronze: [ /* ... */ ],
    silver: [ /* ... */ ],
    // ... 其他段位配置
};
```

#### 学习率配置
```typescript
// 已移除
export const LEARNING_RATE_CONFIGS: Record<SegmentName, number> = {
    bronze: 0.15,
    silver: 0.12,
    // ... 其他段位配置
};
```

#### 混合模式段位配置
```typescript
// 已移除
export const HYBRID_SEGMENT_CONFIGS: Record<SegmentName, { /* ... */ }> = {
    bronze: { /* ... */ },
    silver: { /* ... */ },
    // ... 其他段位配置
};
```

### 2. 保留的配置

#### 系统级配置
```typescript
export const SCORE_THRESHOLD_SYSTEM_CONFIG: ScoreThresholdSystemConfig = {
    enableAdaptiveRanking: true,
    enableSegmentIntegration: true,
    enableProtectionSystem: true,
    defaultLearningRate: 0.1,
    maxLearningRate: 0.3,
    minLearningRate: 0.01,
    rankingUpdateInterval: 1000 * 60 * 5, // 5分钟
    protectionCheckInterval: 1000 * 60 * 10, // 10分钟
    segmentChangeThreshold: 0.8 // 80%概率触发段位变化
};
```

#### 系统级默认配置
```typescript
export const DEFAULT_RANKING_MODES: Record<SegmentName, RankingMode> = {
    bronze: 'score_based',
    silver: 'hybrid',
    gold: 'hybrid',
    platinum: 'segment_based',
    diamond: 'segment_based',
    master: 'segment_based',
    grandmaster: 'segment_based'
};

export const DEFAULT_ADAPTIVE_MODES: Record<SegmentName, AdaptiveMode> = {
    bronze: 'static',
    silver: 'dynamic',
    gold: 'learning',
    platinum: 'learning',
    diamond: 'learning',
    master: 'learning',
    grandmaster: 'learning'
};
```

### 3. 更新的文件

#### ScoreThresholdPlayerController.ts
- 移除了对 `getDefaultScoreThresholds` 和 `getLearningRate` 的导入
- 添加了本地默认配置常量
- 直接使用本地配置而不是调用已删除的函数

```typescript
// 之前
import {
    getDefaultScoreThresholds,
    getLearningRate,
    // ...
} from "../config/config";

// 现在
import {
    getAdaptiveMode,
    getRankingMode
} from "../config/config";

// 添加本地默认配置
const DEFAULT_SCORE_THRESHOLDS: any[] = [ /* ... */ ];
const DEFAULT_LEARNING_RATE = 0.1;
```

## 📊 配置对比

### 重构前的重复配置

**config.ts**：
```typescript
export const DEFAULT_SCORE_THRESHOLDS: Record<SegmentName, ScoreThreshold[]> = {
    bronze: [ /* 详细的积分配置 */ ],
    silver: [ /* 详细的积分配置 */ ],
    // ...
};
```

**tournamentConfigs.ts**：
```typescript
segmentPointRules: [
    { segment: 'bronze', multiplier: 1.0, requirements: { points: 0 } },
    { segment: 'silver', multiplier: 1.1, requirements: { points: 500 } },
    // ...
]
```

### 重构后的统一配置

- **段位积分配置**：统一在 `tournamentConfigs.ts` 中管理
- **系统级配置**：保留在 `config.ts` 中
- **业务逻辑配置**：从 `tournamentConfigs.ts` 获取

## 🔧 使用方法

### 获取段位积分配置

```typescript
// 从 tournamentConfigs.ts 获取
import { getTournamentConfig } from '../../../../data/tournamentConfigs';

const config = getTournamentConfig("jackpot_solitaire_free");
const segmentRules = config?.pointRules?.segmentPointRules;
```

### 获取系统级配置

```typescript
// 从 config.ts 获取
import { 
    SCORE_THRESHOLD_SYSTEM_CONFIG,
    getRankingMode,
    getAdaptiveMode 
} from "../config/config";

const learningRate = SCORE_THRESHOLD_SYSTEM_CONFIG.defaultLearningRate;
const rankingMode = getRankingMode('gold');
const adaptiveMode = getAdaptiveMode('gold');
```

### 在 Controller 中使用

```typescript
export class ScoreThresholdPlayerController {
    // 使用本地默认配置
    private static readonly DEFAULT_SCORE_THRESHOLDS = [ /* ... */ ];
    private static readonly DEFAULT_LEARNING_RATE = 0.1;

    async createPlayerConfig(uid: string, segmentName: SegmentName) {
        const config: ScoreThresholdConfig = {
            uid,
            segmentName,
            scoreThresholds: this.DEFAULT_SCORE_THRESHOLDS,
            learningRate: this.DEFAULT_LEARNING_RATE,
            // ... 其他配置
        };
    }
}
```

## 📈 重构优势

### 1. 消除重复

- 不再有重复的段位积分配置
- 统一的配置源，避免不一致
- 减少维护成本

### 2. 职责清晰

- `tournamentConfigs.ts`：业务级配置（积分、段位等）
- `config.ts`：系统级配置（学习率、更新间隔等）
- 职责分离更加明确

### 3. 易于维护

- 段位积分配置变更只需修改 `tournamentConfigs.ts`
- 系统级配置变更只需修改 `config.ts`
- 配置变更影响范围可控

## 🚫 注意事项

### 不要做的事情

1. **不要在 config.ts 中重新添加段位积分配置**：这会导致配置重复
2. **不要在多个地方定义相同的配置**：违反 DRY 原则
3. **不要直接修改 tournamentConfigs.ts 中的配置**：应该通过配置管理工具

### 应该做的事情

1. **使用 tournamentConfigs.ts 作为段位积分配置的唯一源**
2. **在 config.ts 中只保留系统级配置**
3. **在需要的地方定义简单的本地常量**

## 📝 总结

通过重构 `config.ts`，我们实现了：

1. **统一配置源**：段位积分配置统一在 `tournamentConfigs.ts` 中管理
2. **消除重复**：不再有重复的段位积分配置定义
3. **职责清晰**：配置和系统逻辑职责分离
4. **易于维护**：配置变更只需修改一个地方

这种重构使得系统更加健壮、可维护，并且符合软件工程的最佳实践。`config.ts` 现在专注于系统级配置，而业务级配置统一在 `tournamentConfigs.ts` 中管理。
