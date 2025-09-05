# 段位排名概率集成指南

## 🎯 **问题背景**

在之前的实现中，`RankingRecommendationManager` 的 `generateMatchRankings` 方法没有使用 `SEGMENT_RULES` 中定义的 `rankingProbabilities`，这是一个重要的功能缺失。

## 🔧 **解决方案**

### **1. 集成段位排名概率**

#### **导入配置函数**
```typescript
import { getSegmentRankingProbabilities } from "../../../segment/config";
```

#### **在排名推荐中集成概率**
```typescript
// 🆕 获取段位排名概率分布
const segmentRankingProbabilities = this.getSegmentRankingProbabilities(
    humanPlayers,
    playerProfiles,
    totalParticipants
);

// 🆕 考虑段位排名概率的调整排名
const segmentAdjustedRank = this.calculateSegmentAdjustedRank(
    player,
    profile,
    humanRank,
    totalParticipants,
    segmentRankingProbabilities
);
```

### **2. 新增核心方法**

#### **获取段位排名概率分布**
```typescript
private getSegmentRankingProbabilities(
    humanPlayers: HumanPlayer[],
    playerProfiles: Map<string, PlayerPerformanceProfile>,
    totalParticipants: number
): Map<string, number[]> {
    const probabilities = new Map<string, number[]>();

    for (const player of humanPlayers) {
        const profile = playerProfiles.get(player.uid)!;
        const segmentName = profile.segmentName;

        // 获取该段位的排名概率分布
        const segmentProbabilities = getSegmentRankingProbabilities(segmentName, totalParticipants);
        probabilities.set(player.uid, segmentProbabilities);
    }

    return probabilities;
}
```

#### **计算段位调整排名**
```typescript
private calculateSegmentAdjustedRank(
    player: HumanPlayer,
    profile: PlayerPerformanceProfile,
    humanRank: number,
    totalParticipants: number,
    segmentRankingProbabilities: Map<string, number[]>
): number {
    const segmentName = profile.segmentName;
    const probabilities = segmentRankingProbabilities.get(player.uid) || [];

    if (probabilities.length === 0) {
        return humanRank; // 如果没有概率配置，返回原始排名
    }

    // 根据段位概率分布调整排名
    const segmentAdjustedRank = this.applySegmentProbabilityAdjustment(
        humanRank,
        probabilities,
        totalParticipants,
        segmentName
    );

    return segmentAdjustedRank;
}
```

#### **应用段位概率调整**
```typescript
private applySegmentProbabilityAdjustment(
    originalRank: number,
    probabilities: number[],
    totalParticipants: number,
    segmentName: SegmentName
): number {
    // 计算段位优势系数
    const segmentAdvantage = this.calculateSegmentAdvantage(segmentName);
    
    // 根据段位优势调整概率权重
    const adjustedProbabilities = probabilities.map((prob, index) => {
        const rank = index + 1;
        const distanceFromOriginal = Math.abs(rank - originalRank);
        
        // 段位优势影响：高段位玩家更容易获得好排名
        const advantageMultiplier = 1 + (segmentAdvantage * (1 - distanceFromOriginal / totalParticipants));
        
        return prob * advantageMultiplier;
    });

    // 归一化概率并选择排名
    const totalProb = adjustedProbabilities.reduce((sum, prob) => sum + prob, 0);
    const normalizedProbabilities = adjustedProbabilities.map(prob => prob / totalProb);

    // 根据调整后的概率分布选择排名
    const randomValue = Math.random();
    let cumulativeProb = 0;

    for (let i = 0; i < normalizedProbabilities.length; i++) {
        cumulativeProb += normalizedProbabilities[i];
        if (randomValue <= cumulativeProb) {
            return i + 1;
        }
    }

    return originalRank; // 兜底返回原始排名
}
```

#### **计算段位优势系数**
```typescript
private calculateSegmentAdvantage(segmentName: SegmentName): number {
    const segmentTiers = {
        'bronze': 1,
        'silver': 2,
        'gold': 3,
        'platinum': 4,
        'diamond': 5,
        'master': 6,
        'grandmaster': 7
    };

    const tier = segmentTiers[segmentName] || 1;
    const maxTier = 7;

    // 段位优势系数：0-0.3，高段位有更大优势
    return (tier - 1) / (maxTier - 1) * 0.3;
}
```

### **3. 增强推理说明**

#### **包含段位排名概率信息**
```typescript
// 🆕 段位排名概率影响
const segmentName = profile.segmentName;
const segmentAdvantage = this.calculateSegmentAdvantage(segmentName);
if (segmentAdvantage > 0.1) {
    const advantageDesc = {
        'bronze': '青铜段位',
        'silver': '白银段位',
        'gold': '黄金段位',
        'platinum': '铂金段位',
        'diamond': '钻石段位',
        'master': '大师段位',
        'grandmaster': '宗师段位'
    }[segmentName] || '当前段位';
    
    reasons.push(`基于${advantageDesc}的排名概率优势`);
}
```

## 📊 **段位排名概率配置**

### **青铜段位 (Bronze)**
```typescript
rankingProbabilities: {
    4: [0.25, 0.25, 0.25, 0.25],      // 4人比赛：均等概率
    6: [0.20, 0.20, 0.20, 0.20, 0.10, 0.10],  // 6人比赛：前4名概率较高
    8: [0.18, 0.18, 0.18, 0.18, 0.12, 0.08, 0.05, 0.03]  // 8人比赛：前4名优势明显
}
```

### **白银段位 (Silver)**
```typescript
rankingProbabilities: {
    4: [0.30, 0.25, 0.25, 0.20],      // 4人比赛：第1名优势
    6: [0.25, 0.22, 0.20, 0.18, 0.10, 0.05],  // 6人比赛：前3名优势
    8: [0.22, 0.20, 0.18, 0.16, 0.12, 0.08, 0.03, 0.01]  // 8人比赛：前4名优势
}
```

### **黄金段位 (Gold)**
```typescript
rankingProbabilities: {
    4: [0.35, 0.30, 0.25, 0.10],      // 4人比赛：前2名优势明显
    6: [0.30, 0.25, 0.20, 0.15, 0.07, 0.03],  // 6人比赛：前3名优势明显
    8: [0.25, 0.22, 0.20, 0.18, 0.10, 0.04, 0.01, 0.00]  // 8人比赛：前4名优势明显
}
```

### **钻石段位 (Diamond)**
```typescript
rankingProbabilities: {
    4: [0.40, 0.35, 0.20, 0.05],      // 4人比赛：前2名优势极大
    6: [0.35, 0.30, 0.20, 0.10, 0.04, 0.01],  // 6人比赛：前3名优势极大
    8: [0.30, 0.25, 0.22, 0.15, 0.06, 0.02, 0.00, 0.00]  // 8人比赛：前4名优势极大
}
```

## 🎯 **段位优势系数**

| 段位 | 等级 | 优势系数 | 说明 |
|------|------|----------|------|
| 青铜 | 1 | 0.000 | 无优势 |
| 白银 | 2 | 0.050 | 轻微优势 |
| 黄金 | 3 | 0.100 | 小优势 |
| 铂金 | 4 | 0.150 | 中等优势 |
| 钻石 | 5 | 0.200 | 较大优势 |
| 大师 | 6 | 0.250 | 大优势 |
| 宗师 | 7 | 0.300 | 极大优势 |

## 🧪 **测试验证**

### **运行集成测试**
```typescript
// 在 Convex 中运行
export const runSegmentRankingProbabilityTest = mutation({
    args: {},
    handler: async (ctx) => {
        await runSegmentRankingProbabilityTests();
    }
});
```

### **测试覆盖**
- ✅ 段位排名概率配置验证
- ✅ 不同段位水平的排名推荐
- ✅ 不同参与者数量的排名概率
- ✅ 段位优势系数计算
- ✅ 段位排名概率实际影响分析

## 📈 **集成效果**

### **集成前的问题**
- ❌ 没有使用段位排名概率配置
- ❌ 排名推荐不考虑段位优势
- ❌ 推理说明缺少段位信息

### **集成后的优势**
- ✅ 充分利用段位排名概率配置
- ✅ 高段位玩家获得排名优势
- ✅ 推理说明包含段位信息
- ✅ 更符合段位系统的设计理念

## 🔄 **工作流程**

### **1. 获取段位概率**
```typescript
const segmentProbabilities = getSegmentRankingProbabilities(segmentName, totalParticipants);
```

### **2. 计算段位优势**
```typescript
const segmentAdvantage = this.calculateSegmentAdvantage(segmentName);
```

### **3. 调整概率权重**
```typescript
const advantageMultiplier = 1 + (segmentAdvantage * (1 - distanceFromOriginal / totalParticipants));
const adjustedProbabilities = probabilities.map(prob => prob * advantageMultiplier);
```

### **4. 选择最终排名**
```typescript
const randomValue = Math.random();
let cumulativeProb = 0;
for (let i = 0; i < normalizedProbabilities.length; i++) {
    cumulativeProb += normalizedProbabilities[i];
    if (randomValue <= cumulativeProb) {
        return i + 1;
    }
}
```

## ✅ **总结**

通过集成 `SEGMENT_RULES` 中的 `rankingProbabilities`，`RankingRecommendationManager` 现在能够：

1. **利用段位配置**：根据段位和参与者数量获取排名概率分布
2. **体现段位优势**：高段位玩家更容易获得好排名
3. **增强推理说明**：在推荐理由中包含段位信息
4. **保持随机性**：通过概率分布保持排名的随机性
5. **符合设计理念**：与段位系统的整体设计保持一致

这个集成确保了排名推荐系统能够充分利用段位系统的配置，为不同段位的玩家提供更合理、更符合预期的排名推荐！🎯
