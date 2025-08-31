# 简化的管理器架构

## 概述

基于实际需求，将复杂的四个管理器简化为两个核心管理器：

- **RankingRecommendationManager**: 排名推荐管理器
- **SeedRecommendationManager**: 种子推荐管理器

## 核心功能

### 1. 排名推荐管理器 (RankingRecommendationManager)

**主要功能**：根据玩家历史数据和当前分数，智能推荐排名

**核心方法**：
```typescript
async generateMatchRankings(
    humanPlayers: HumanPlayer[],
    aiCount: number
): Promise<MatchRankingResult>
```

**推荐逻辑**：
1. 分析玩家历史表现档案
2. 评估当前分数相对表现
3. 基于段位系统计算排名概率分布
4. 考虑表现趋势调整概率
5. 生成推荐排名和信心度

**返回结果**：
```typescript
interface RankingRecommendation {
    recommendedRank: number;        // 推荐排名
    confidence: number;             // 信心度 (0-1)
    reasoning: string;              // 推理说明
    probabilityDistribution: number[]; // 概率分布
}
```

### 2. 种子推荐管理器 (SeedRecommendationManager)

**主要功能**：基于玩家历史数据，智能推荐新的比赛种子

**核心方法**：
```typescript
async recommendSeedsForPlayer(
    uid: string,
    options: {
        limit?: number;
        preferredDifficulty?: 'practice' | 'balanced' | 'challenge';
        excludeSeeds?: string[];
    } = {}
): Promise<SeedRecommendation>
```

**推荐逻辑**：
1. 分析玩家技能水平（基于历史表现）
2. 映射技能等级到目标难度
3. 获取符合难度的候选种子
4. 过滤已玩过的种子
5. 选择最佳匹配的种子

**返回结果**：
```typescript
interface SeedRecommendation {
    seeds: string[];               // 推荐种子列表
    difficultyLevel: string;       // 难度等级
    reasoning: string;             // 推荐理由
    confidence: number;            // 信心度
    metadata: {                    // 元数据
        playerSkillLevel: string;
        preferredDifficulty: string;
        totalCandidates: number;
    };
}
```

## 使用示例

### 排名推荐

```typescript
const rankingManager = new RankingRecommendationManager(ctx);

// 为玩家当前分数推荐排名
const rankingResult = await rankingManager.recommendRankingForScore(
    "player123",
    2500,  // 当前分数
    6      // 参与者数量
);

console.log(`推荐排名: ${rankingResult.recommendedRank}`);
console.log(`信心度: ${rankingResult.confidence}`);
console.log(`理由: ${rankingResult.reasoning}`);
```

### 种子推荐

```typescript
const seedManager = new SeedRecommendationManager(ctx);

// 为玩家推荐新种子
const seedResult = await seedManager.recommendSeedsForPlayer(
    "player123",
    {
        limit: 5,
        preferredDifficulty: 'balanced',
        excludeSeeds: ['seed001', 'seed002']
    }
);

console.log(`推荐种子: ${seedResult.seeds}`);
console.log(`难度等级: ${seedResult.difficultyLevel}`);
console.log(`推荐理由: ${seedResult.reasoning}`);
```

## 技术特性

### 1. 数据驱动决策
- 基于玩家历史比赛数据
- 利用种子统计缓存
- 段位系统集成

### 2. 智能算法
- 概率分布计算
- 趋势分析
- 技能等级评估

### 3. 自适应推荐
- 根据表现调整难度
- 考虑玩家偏好
- 动态过滤机制

### 4. 高性能
- 缓存机制
- 增量更新
- 批量处理

## 架构优势

### 1. 简化复杂性
- 从4个复杂manager简化为2个专门manager
- 移除冗余的协作逻辑
- 专注核心功能

### 2. 清晰职责
- 排名推荐：专注于当前比赛排名预测
- 种子推荐：专注于新比赛内容推荐
- 各自独立，互不干扰

### 3. 易于维护
- 代码结构清晰
- 功能边界明确
- 测试更容易

### 4. 性能优化
- 减少不必要的计算
- 直接访问所需数据
- 避免复杂的管理器间调用

## 数据依赖

### 数据库表
- `match_results`: 比赛结果数据
- `seed_statistics_cache`: 种子统计缓存


### 配置依赖
- 段位系统配置 (`segment/config.ts`)
- 排名概率配置

## 扩展建议

### 1. 机器学习增强
- 集成ML模型优化推荐算法
- 基于更多特征的预测

### 2. A/B测试支持
- 支持不同推荐策略的对比
- 效果监控和优化

### 3. 实时调整
- 基于实时反馈调整推荐
- 动态学习玩家偏好

### 4. 个性化深化
- 更细粒度的玩家画像
- 基于游戏风格的推荐