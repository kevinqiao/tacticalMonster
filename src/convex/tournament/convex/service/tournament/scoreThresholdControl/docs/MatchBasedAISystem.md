# 基于Match的AI数量系统

## 概述

系统现在采用**基于Match的AI数量确定机制**，AI数量在创建比赛时就已确定，而不是在提交分数时动态生成。这确保了比赛的公平性和一致性。

## 系统架构

### 1. AI数量确定时机

```
创建Match → 确定AI数量 → 生成AI对手 → 玩家游戏 → 提交分数 → 计算排名
```

- **创建Match阶段**: 系统根据游戏规则、种子难度、玩家技能等级确定AI数量
- **游戏进行阶段**: AI数量和配置保持不变
- **提交分数阶段**: 使用已确定的AI配置计算排名

### 2. 核心设计原则

#### **一致性保证**
- 同一场比赛的AI数量固定不变
- 所有参与者面对相同的AI配置
- 确保比赛结果的公平性

#### **智能配置**
- 根据种子难度自动调整AI数量
- 考虑玩家技能等级优化AI难度分布
- 支持不同游戏类型的AI配置策略

## 技术实现

### 1. 核心方法

#### **generateIntelligentAIOpponents**
```typescript
private async generateIntelligentAIOpponents(
    playerSkillLevel: string = 'normal',
    aiCount: number = 3  // AI数量在创建match时已确定
): Promise<any[]>
```

#### **getMatchParticipants**
```typescript
private async getMatchParticipants(matchId: string): Promise<any[]>
// 从match配置中获取已确定的AI数量
```

### 2. 数据流程

```
1. 创建Match → 确定AI数量 → 存储到match配置
2. 玩家游戏 → 从match配置读取AI数量
3. 生成AI对手 → 基于确定的AI数量生成分数
4. 提交分数 → 计算最终排名
```

## 配置策略

### 1. 默认AI数量配置

```typescript
// 不同技能等级的默认AI数量
const defaultAICounts = {
    'beginner': 3,    // 新手：3个AI，避免过于复杂
    'normal': 3,      // 普通：3个AI，平衡挑战性
    'advanced': 4,    // 高级：4个AI，增加挑战
    'expert': 4       // 专家：4个AI，高难度挑战
};
```

### 2. 种子难度影响

```typescript
// 种子难度对AI数量的影响
const seedDifficultyImpact = {
    'easy': -1,       // 简单种子：减少1个AI
    'normal': 0,      // 普通种子：保持默认数量
    'hard': +1,       // 困难种子：增加1个AI
    'expert': +2      // 专家种子：增加2个AI
};
```

### 3. 游戏类型调整

```typescript
// 不同游戏类型的AI数量策略
const gameTypeStrategy = {
    'practice': 'minimal',     // 练习模式：最少AI
    'competitive': 'balanced', // 竞技模式：平衡AI数量
    'challenge': 'maximum'     // 挑战模式：最多AI
};
```

## 实际应用场景

### 1. 新手玩家 + 简单种子
```
AI数量: 2个 (3 - 1)
配置: 1个中等AI + 1个简单AI
目的: 帮助新手建立信心
```

### 2. 专家玩家 + 困难种子
```
AI数量: 6个 (4 + 2)
配置: 阶梯式难度分布
目的: 提供高难度挑战
```

### 3. 竞技比赛模式
```
AI数量: 5个 (固定配置)
配置: 平衡的难度分布
目的: 确保比赛公平性
```

## 优势

### 1. 公平性
- 所有玩家面对相同的AI配置
- 比赛结果具有可比性
- 避免随机性影响排名

### 2. 一致性
- AI数量在比赛期间保持不变
- 支持比赛回放和分析
- 便于调试和问题排查

### 3. 可预测性
- 玩家可以了解比赛配置
- 便于制定游戏策略
- 提高游戏体验质量

## 使用方法

### 1. 创建Match时确定AI数量

```typescript
// 在创建match时，系统自动确定AI数量
const matchConfig = {
    matchId: 'match_123',
    seedId: 'seed_456',
    seedDifficulty: 'hard',
    playerSkillLevel: 'advanced',
    aiCount: 5,  // 系统自动计算：4(默认) + 1(困难种子)
    // ... 其他配置
};
```

### 2. 游戏进行中使用已确定的AI数量

```typescript
// 获取match参与者时，使用已确定的AI数量
const participants = await getMatchParticipants(matchId);
// AI数量已在创建match时确定，这里直接使用
```

### 3. 提交分数时计算排名

```typescript
// 提交分数时，基于已确定的AI配置计算排名
const result = await submitGameScore(uid, seedId, matchId, score, gameData);
// 系统自动使用match中已确定的AI配置
```

## 配置示例

### 1. 基础配置
```typescript
const baseConfig = {
    beginner: { defaultCount: 3, maxCount: 4 },
    normal: { defaultCount: 3, maxCount: 5 },
    advanced: { defaultCount: 4, maxCount: 6 },
    expert: { defaultCount: 4, maxCount: 7 }
};
```

### 2. 难度调整规则
```typescript
const difficultyRules = {
    easy: { aiCountAdjustment: -1, difficultyMultiplier: 0.8 },
    normal: { aiCountAdjustment: 0, difficultyMultiplier: 1.0 },
    hard: { aiCountAdjustment: +1, difficultyMultiplier: 1.2 },
    expert: { aiCountAdjustment: +2, difficultyMultiplier: 1.5 }
};
```

### 3. 游戏类型策略
```typescript
const gameTypeStrategies = {
    practice: { aiCountMultiplier: 0.7, focusOnLearning: true },
    competitive: { aiCountMultiplier: 1.0, focusOnBalance: true },
    challenge: { aiCountMultiplier: 1.3, focusOnDifficulty: true }
};
```

## 注意事项

### 1. 性能考虑
- AI数量在创建match时确定，避免运行时计算
- 支持AI配置的缓存和复用
- 确保系统响应速度

### 2. 配置一致性
- 同一match的AI配置必须保持一致
- 支持配置的版本控制和回滚
- 便于监控和调试

### 3. 用户体验
- 玩家可以提前了解比赛配置
- 支持AI配置的预览和说明
- 提供配置建议和优化提示

## 总结

基于Match的AI数量系统确保了比赛的公平性、一致性和可预测性。AI数量在创建比赛时就已确定，系统根据多种因素智能配置，为不同技能水平的玩家提供合适的挑战。这种设计既保证了游戏的平衡性，又提供了个性化的游戏体验。
