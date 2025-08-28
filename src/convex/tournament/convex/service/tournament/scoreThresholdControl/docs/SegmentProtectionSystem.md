# 段位保护系统文档

## 🎯 系统概述

段位保护系统是为了防止玩家频繁升降级，提供稳定的游戏体验而设计的智能保护机制。系统通过多种保护策略，确保玩家在段位变化时有足够的时间适应和稳定。

## 🏗️ 架构设计

### 核心组件

1. **IntelligentExperienceManager** - 智能体验管理器
   - 负责段位保护逻辑
   - 管理保护状态更新
   - 提供保护建议

2. **PlayerHistoricalDataManager** - 历史数据管理器
   - 提供玩家表现数据
   - 支持保护决策分析

3. **ScoreThresholdPlayerController** - 玩家控制器
   - 集成保护机制
   - 自动触发保护状态更新

## 🛡️ 保护机制类型

### 1. 新段位保护（New Segment Protection）

**保护条件**：
- 玩家刚晋升到新段位
- 保护期：7天
- 保护等级：高级（Level 2）

**保护逻辑**：
```typescript
const NEW_SEGMENT_PROTECTION_DAYS = 7;
const daysSincePromotion = Math.floor((currentDate - lastPromotion) / (1000 * 60 * 60 * 24));

if (daysSincePromotion < NEW_SEGMENT_PROTECTION_DAYS) {
    // 给予保护
    return {
        isProtected: true,
        protectionLevel: 2,
        remainingProtectionDays: NEW_SEGMENT_PROTECTION_DAYS - daysSincePromotion,
        reason: `新段位保护期，剩余 ${remainingDays} 天`
    };
}
```

**使用场景**：
- 玩家从白银晋升到黄金
- 给予7天时间熟悉新段位
- 避免因不适应而立即降级

### 2. 表现保护（Performance Protection）

**保护条件**：
- 最近3场比赛表现优秀
- 平均排名 ≤ 3
- 平均分数 ≥ 3000
- 排名波动 ≤ 1.5
- 有持续改进趋势

**保护逻辑**：
```typescript
const hasGoodPerformance = averageRank <= 3 && averageScore >= 3000;
const hasStablePerformance = rankVolatility <= 1.5;
const hasRecentImprovement = recentScores[recentScores.length - 1] > recentScores[0];

if (hasGoodPerformance && hasStablePerformance && hasRecentImprovement) {
    return {
        isProtected: true,
        protectionLevel: 1,
        remainingProtectionDays: 3,
        reason: '表现优秀，给予短期保护'
    };
}
```

**使用场景**：
- 玩家表现稳定且优秀
- 给予3天短期保护
- 鼓励保持良好状态

### 3. 宽限期保护（Grace Period Protection）

**保护条件**：
- 玩家刚降级到较低段位
- 宽限期：5天
- 保护等级：基础（Level 1）

**保护逻辑**：
```typescript
const GRACE_PERIOD_DAYS = 5;
const daysInGrace = Math.floor((currentDate - graceStart) / (1000 * 60 * 60 * 24));

if (daysInGrace < GRACE_PERIOD_DAYS) {
    return {
        isProtected: true,
        protectionLevel: 1,
        remainingProtectionDays: GRACE_PERIOD_DAYS - daysInGrace,
        reason: `段位适应宽限期，剩余 ${remainingDays} 天`
    };
}
```

**使用场景**：
- 玩家从黄金降级到白银
- 给予5天时间调整策略
- 避免连续降级

## 📊 保护等级系统

| 保护等级 | 保护类型 | 持续时间 | 说明 |
|----------|----------|----------|------|
| **Level 0** | 无保护 | 0天 | 正常状态，无特殊保护 |
| **Level 1** | 基础保护 | 3-5天 | 表现保护或宽限期保护 |
| **Level 2** | 高级保护 | 7天 | 新段位保护 |

## 🔧 使用方法

### 1. 检查保护状态

```typescript
import { IntelligentExperienceManager } from '../managers/IntelligentExperienceManager';

const experienceManager = new IntelligentExperienceManager(ctx);

// 检查玩家保护状态
const protectionResult = await experienceManager.checkSegmentProtection(
    uid,
    currentSegment,
    recentMatchResults
);

if (protectionResult.isProtected) {
    console.log(`玩家处于保护状态: ${protectionResult.reason}`);
    console.log(`保护类型: ${protectionResult.protectionType}`);
    console.log(`剩余天数: ${protectionResult.remainingProtectionDays}`);
    console.log(`建议: ${protectionResult.recommendations.join(', ')}`);
}
```

### 2. 更新保护状态

```typescript
// 在段位变化后自动更新保护状态
await experienceManager.updatePlayerProtectionStatus(
    uid,
    oldSegment,
    newSegment,
    changeType // 'promotion' | 'demotion'
);
```

### 3. 集成到段位检查流程

```typescript
// 在 ScoreThresholdPlayerController 中
async checkSegmentChanges(rankings: RankingResult[], matchId: string): Promise<any[]> {
    for (const ranking of rankings) {
        // ... 段位变化检查逻辑
        
        if (changeResult.changed) {
            // 更新保护状态
            await this.intelligentExperienceManager.updatePlayerProtectionStatus(
                ranking.uid,
                changeResult.oldSegment,
                changeResult.newSegment,
                changeResult.changeType as 'promotion' | 'demotion'
            );
        }
    }
}
```

## 📈 保护效果

### 1. 晋升保护效果

- **减少回退率**：新段位玩家有7天时间适应
- **提升信心**：避免因不适应而立即降级
- **学习机会**：给予时间调整游戏策略

### 2. 表现保护效果

- **鼓励稳定**：优秀表现获得短期保护
- **防止波动**：避免因偶然因素降级
- **保持动力**：持续优秀表现得到认可

### 3. 宽限期保护效果

- **缓冲期**：降级后有时间调整
- **防止连续降级**：避免恶性循环
- **策略调整**：给予时间重新评估

## 🔮 未来扩展

### 1. 数据库表设计

```sql
-- 玩家保护状态表
CREATE TABLE player_protection_status (
    uid VARCHAR(255) PRIMARY KEY,
    current_segment VARCHAR(50),
    last_promotion_date TIMESTAMP,
    promotion_segment VARCHAR(50),
    grace_period_start TIMESTAMP,
    grace_period_segment VARCHAR(50),
    protection_history JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. 高级保护功能

- **段位保护券**：玩家可主动使用的保护道具
- **团队保护**：团队比赛中的特殊保护机制
- **季节性保护**：特定时期的保护政策

### 3. 智能保护调整

- **动态保护期**：根据玩家历史调整保护时间
- **个性化保护**：基于玩家特点定制保护策略
- **保护效果分析**：分析保护机制的实际效果

## 🧪 测试验证

运行测试文件验证保护机制：

```bash
cd develop/src/convex/tournament/convex/service/tournament/scoreThresholdControl/test
node segmentProtectionTest.ts
```

测试覆盖：
- ✅ 新段位保护检查
- ✅ 表现保护检查
- ✅ 宽限期保护检查
- ✅ 保护状态更新
- ✅ 无保护状态处理

## 📝 总结

段位保护系统通过多层次、智能化的保护机制，为玩家提供了稳定的游戏体验：

1. **新段位保护**：7天适应期，避免立即回退
2. **表现保护**：优秀表现获得短期保护
3. **宽限期保护**：降级后有时间调整策略
4. **自动管理**：保护状态自动更新和维护
5. **智能建议**：为玩家提供个性化的改进建议

这个系统既保护了玩家的游戏体验，又鼓励了持续改进，是一个平衡且智能的段位管理解决方案。
