# 段位系统架构说明

## 🏆 段位系统概述

本系统包含两套独立的段位系统，各自服务于不同的目的：

### 1. 实时技能段位（UnifiedSkillAssessment）
- **用途**：内部排名推荐和技能评估
- **计算方式**：基于最近50场比赛实时计算
- **可见性**：对玩家不透明，仅系统内部使用
- **更新频率**：每次排名推荐时重新计算
- **段位等级**：`bronze` | `silver` | `gold` | `platinum` | `diamond`

### 2. 积分累积段位（SegmentManager）
- **用途**：玩家可见的段位系统
- **计算方式**：基于锦标赛奖励积分累积
- **可见性**：玩家可见，显示在UI上
- **更新频率**：每次积分变化时检查
- **段位等级**：`bronze` | `silver` | `gold` | `platinum` | `diamond` | `master` | `grandmaster`

## 🔄 两套系统的关系

### 实时技能段位 → 积分累积段位
```typescript
// 实时技能段位影响积分奖励
const skillLevel = unifiedSkillAssessment.assessPlayerSkill(profile);
const pointsReward = calculatePointsReward(score, skillLevel.level);
await segmentManager.updatePoints(uid, pointsReward);
```

### 积分累积段位 → 实时技能段位
```typescript
// 积分累积段位提供基础参考
const playerSegment = await segmentManager.getPlayerSegmentInfo(uid);
const skillAssessment = unifiedSkillAssessment.assessPlayerSkill(profile);
// 但最终排名推荐使用实时计算的技能段位
```

## 📊 使用场景对比

| 场景 | 使用系统 | 原因 |
|------|----------|------|
| 排名推荐 | 实时技能段位 | 反映当前真实技能水平 |
| 种子推荐 | 实时技能段位 | 基于历史表现匹配对手 |
| 段位概率 | 实时技能段位 | 基于当前技能水平调整概率 |
| UI显示 | 积分累积段位 | 玩家可见的成就系统 |
| 积分奖励 | 积分累积段位 | 基于段位规则计算奖励 |
| 段位保护 | 积分累积段位 | 保护玩家已获得的段位 |

## 🛠️ 技术实现

### 实时技能段位计算
```typescript
// 在 RankingRecommendationManager 中
const skillAssessment = this.skillAssessment.assessPlayerSkill({
    uid,
    segmentName: 'bronze', // 临时值
    averageScore,
    averageRank,
    winRate,
    totalMatches: recentMatches.length,
    recentPerformance: {
        last10Matches,
        trendDirection,
        consistency
    }
});
const segmentName = skillAssessment.level as SegmentName;
```

### 积分累积段位管理
```typescript
// 在 SegmentManager 中
const segmentChangeResult = await segmentManager.updatePoints(uid, pointsDelta);
if (segmentChangeResult.changed) {
    // 更新玩家可见的段位
    await updatePlayerVisibleSegment(uid, segmentChangeResult.newSegment);
}
```

## 🎯 段位概率配置

### 支持的参与者数量
- **4人比赛**：`[0.25, 0.25, 0.25, 0.25]` 到 `[0.55, 0.25, 0.15, 0.05]`
- **6人比赛**：`[0.20, 0.20, 0.20, 0.20, 0.10, 0.10]` 到 `[0.50, 0.25, 0.15, 0.08, 0.01, 0.01]`
- **8人比赛**：`[0.18, 0.18, 0.18, 0.18, 0.12, 0.08, 0.05, 0.03]` 到 `[0.48, 0.25, 0.15, 0.10, 0.01, 0.01, 0.00, 0.00]`

### 使用条件
- **单真人玩家**：`humanPlayerCount === 1`
- **支持的参与者数量**：`totalParticipants` 在 `[4, 6, 8]` 中
- **使用实时技能段位**：基于 `UnifiedSkillAssessment` 计算的段位

## 🔧 配置管理

### 实时技能段位配置
```typescript
// 在 UnifiedSkillAssessment 中
const defaultThresholds = {
    diamond: 0.9,    // 90%以上为钻石
    platinum: 0.75,  // 75%以上为铂金
    gold: 0.6,       // 60%以上为黄金
    silver: 0.4,     // 40%以上为白银
    bronze: 0.0      // 其他为青铜
};
```

### 积分累积段位配置
```typescript
// 在 segment/config.ts 中
export const SEGMENT_RULES: Record<SegmentName, SegmentRule> = {
    bronze: {
        promotion: { pointsRequired: 1000, winRateRequired: 0.4, ... },
        demotion: { pointsThreshold: -200, consecutiveLosses: 5, ... },
        rankingProbabilities: { 4: [...], 6: [...], 8: [...] }
    },
    // ... 其他段位
};
```

## 📈 性能考虑

### 实时技能段位
- **优点**：准确反映当前技能水平
- **缺点**：每次都需要重新计算
- **优化**：可以添加缓存机制

### 积分累积段位
- **优点**：计算简单，性能好
- **缺点**：可能滞后于真实技能水平
- **优化**：定期同步两套系统

## 🎮 用户体验

### 玩家视角
- 看到的是积分累积段位（UI显示）
- 感受到的是基于实时技能段位的排名推荐
- 获得的是基于积分累积段位的奖励和保护

### 系统视角
- 使用实时技能段位进行内部计算
- 使用积分累积段位进行用户交互
- 两套系统相互独立但协调工作

## 🔮 未来扩展

### 可能的改进
1. **段位同步机制**：定期同步两套系统
2. **混合段位系统**：结合两套系统的优势
3. **动态权重调整**：根据玩家类型调整权重
4. **个性化配置**：允许玩家自定义段位偏好

### 配置灵活性
- 支持动态调整段位阈值
- 支持添加新的段位等级
- 支持自定义段位概率分布
- 支持A/B测试不同的段位策略
