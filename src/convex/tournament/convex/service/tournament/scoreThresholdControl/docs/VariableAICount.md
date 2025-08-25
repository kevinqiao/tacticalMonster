# 可变AI数量系统

## 概述

系统现在支持动态调整AI对手数量，玩家可以根据自己的喜好和挑战需求选择不同数量的AI对手。

## 功能特性

### 1. 智能AI数量配置

#### 技能等级对应的AI数量范围
```typescript
const difficultyConfig = {
    'beginner': { min: 600, max: 900, defaultCount: 3, maxCount: 5 },
    'normal': { min: 800, max: 1200, defaultCount: 3, maxCount: 6 },
    'advanced': { min: 1000, max: 1400, defaultCount: 4, maxCount: 7 },
    'expert': { min: 1200, max: 1600, defaultCount: 4, maxCount: 8 }
};
```

#### 动态难度分布
- **1-3个AI**: 简单难度分布 (hard, medium, easy)
- **4-5个AI**: 中等难度分布 (hard, medium_hard, medium, easy, very_easy)
- **6+个AI**: 精细难度分布 (very_hard, hard, medium_hard, medium, medium_easy, easy, very_easy)

### 2. API接口更新

#### 提交游戏分数
```typescript
// 新的参数结构
submitGameScore(
    uid: string,
    seedId: string,
    matchId: string,
    score: number,
    options?: {
        aiCount?: number;           // 指定AI数量
        playerSkillLevel?: string;  // 指定玩家技能水平
    },
    gameData?: GameFeedbackData
)
```

#### 前端调用示例
```typescript
const result = await submitScore({
    uid,
    seedId: selectedSeed,
    matchId,
    score: playerScore,
    options: {
        aiCount: 5  // 选择5个AI对手
    },
    gameData
});
```

### 3. 智能AI生成

#### 阶梯式分数分布
```typescript
// 生成阶梯式AI分数，确保有挑战性
for (let i = 0; i < clampedAICount; i++) {
    const baseScore = config.min + (config.max - config.min) * (i / (clampedAICount - 1));
    // 添加随机波动，但保持阶梯性
    const variation = (Math.random() - 0.5) * 100;
    const score = Math.max(100, Math.floor(baseScore + variation));
    aiScores.push(score);
}
```

#### 分数范围示例
- **新手玩家 (beginner)**: 600-900分，最多5个AI
- **普通玩家 (normal)**: 800-1200分，最多6个AI
- **高级玩家 (advanced)**: 1000-1400分，最多7个AI
- **专家玩家 (expert)**: 1200-1600分，最多8个AI

## 使用方法

### 1. 前端集成

#### 添加AI数量选择器
```tsx
<div className="ai-config">
    <label>AI对手数量:</label>
    <select
        value={aiCount}
        onChange={(e) => setAiCount(Number(e.target.value))}
    >
        <option value={1}>1个AI</option>
        <option value={2}>2个AI</option>
        <option value={3}>3个AI</option>
        <option value={4}>4个AI</option>
        <option value={5}>5个AI</option>
        <option value={6}>6个AI</option>
        <option value={7}>7个AI</option>
        <option value={8}>8个AI</option>
    </select>
    <small>根据你的技能等级，系统会自动调整AI难度</small>
</div>
```

#### 传递AI数量参数
```tsx
const result = await submitScore({
    uid,
    seedId: selectedSeed,
    matchId,
    score: playerScore,
    options: {
        aiCount: aiCount  // 用户选择的AI数量
    },
    gameData
});
```

### 2. 后端调用

#### 直接调用控制器
```typescript
const controller = new ScoreThresholdPlayerController(ctx);
const result = await controller.submitGameScore(
    uid,
    seedId,
    matchId,
    score,
    {
        aiCount: 6,  // 指定6个AI对手
        playerSkillLevel: 'advanced'
    },
    gameData
);
```

#### 使用Convex API
```typescript
const result = await ctx.runMutation(api.gameFlowController.submitGameScore, {
    uid,
    seedId,
    matchId,
    score,
    options: {
        aiCount: 4
    },
    gameData
});
```

## 实际效果示例

### 场景1：新手玩家选择3个AI
```
AI_1 (Hard): 820分 - 第1名
AI_2 (Medium): 750分 - 第2名  
AI_3 (Easy): 680分 - 第3名
玩家: 700分 - 第2名 (智能排名)
```

### 场景2：高级玩家选择6个AI
```
AI_1 (Very Hard): 1380分 - 第1名
AI_2 (Hard): 1320分 - 第2名
AI_3 (Medium Hard): 1260分 - 第3名
AI_4 (Medium): 1200分 - 第4名
AI_5 (Medium Easy): 1140分 - 第5名
AI_6 (Easy): 1080分 - 第6名
玩家: 1150分 - 第5名 (智能排名)
```

## 技术实现

### 1. 核心方法

#### generateIntelligentAIOpponents
```typescript
private async generateIntelligentAIOpponents(
    playerSkillLevel: string = 'normal',
    aiCount?: number
): Promise<any[]>
```

#### getDifficultyByIndex
```typescript
private getDifficultyByIndex(index: number, totalCount: number): string
```

### 2. 参数传递链
```
submitGameScore() 
  → getMatchParticipants(matchId, aiCount)
    → generateIntelligentAIOpponents(undefined, aiCount)
      → 生成指定数量的AI对手
```

### 3. 智能限制
- 根据玩家技能等级限制最大AI数量
- 确保AI数量在合理范围内 (1-8个)
- 自动调整难度分布以适应不同数量

## 优势

### 1. 灵活性
- 玩家可以根据喜好选择AI数量
- 支持1-8个AI的任意组合
- 不影响现有功能

### 2. 智能性
- 根据玩家技能自动调整AI难度
- 阶梯式分数分布确保挑战性
- 动态难度等级分配

### 3. 可扩展性
- 易于添加新的技能等级
- 支持自定义AI数量范围
- 可配置的难度分布策略

## 注意事项

### 1. 性能考虑
- AI数量越多，计算复杂度越高
- 建议在合理范围内选择AI数量
- 系统会自动限制最大数量

### 2. 游戏平衡
- 更多AI对手可能影响排名分布
- 系统会自动调整积分计算
- 建议根据游戏类型选择合适数量

### 3. 用户体验
- 提供清晰的AI数量选择界面
- 显示技能等级对应的数量限制
- 实时反馈选择的合理性

## 总结

可变AI数量系统为游戏提供了更大的灵活性和个性化体验。玩家可以根据自己的技能水平和挑战需求，选择合适数量的AI对手，系统会自动调整难度分布，确保游戏的平衡性和挑战性。
