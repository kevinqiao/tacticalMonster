# 多人单场比赛多次参与锦标赛设计文档

## 概述

本设计文档说明如何使用现有的 `multiPlayerSingleMatchHandler` 来实现支持多次参与且每场比赛都有积分奖励的锦标赛模式。

## 核心特性

### 1. 多人单场比赛
- 多个玩家参与同一场比赛
- 同时开始，同时结束
- 实时竞争和排名

### 2. 多次参与机制
- 每个玩家最多可以进行10次尝试
- 每次尝试都是独立的比赛
- 系统记录所有尝试的历史和成绩

### 3. 每场比赛积分奖励
- 基础积分：30分
- 分数倍数：游戏分数 × 0.05
- 最小/最大限制：5-200积分
- 额外奖励条件：
  - 分数超过800：额外50积分
  - 完美分数1200：额外100积分

### 4. 双重奖励系统
- **即时奖励**：每场比赛完成后立即获得积分、金币和游戏积分
- **最终奖励**：锦标赛结束后根据最佳分数排名获得最终奖励

## 配置详解

### 锦标赛配置
```typescript
{
    typeId: "multi_player_single_match_tournament",
    name: "多人单场比赛锦标赛",
    description: "多个玩家参与同一场比赛，支持多次参与",
    category: "tournament",
    gameType: "solitaire",
    
    // 参赛条件
    entryRequirements: {
        minSegment: "bronze",
        isSubscribedRequired: false,
        entryFee: {
            coins: 40,
            tickets: {
                gameType: "solitaire",
                tournamentType: "multi_player_single_match_tournament",
                quantity: 1
            }
        }
    },
    
    // 比赛规则
    matchRules: {
        matchType: "single_match",
        minPlayers: 2,                   // 最少2人开始比赛
        maxPlayers: 8,                   // 最多8人参与
        isSingleMatch: true,
        maxAttempts: 10,                 // 每个玩家最多尝试10次
        allowMultipleAttempts: true,     // 允许多次尝试
        rankingMethod: "highest_score",  // 取最高分排名
        timeLimit: {
            perMatch: 900,               // 每场比赛15分钟
            total: 900                   // 总时间15分钟
        }
    },
    
    // 奖励配置
    rewards: {
        // 基础奖励
        baseRewards: {
            coins: 80,
            gamePoints: 40,
            props: [...],
            tickets: []
        },
        
        // 排名奖励
        rankRewards: [
            { rankRange: [1, 1], multiplier: 2.5 },
            { rankRange: [2, 2], multiplier: 1.8 },
            { rankRange: [3, 3], multiplier: 1.5 },
            { rankRange: [4, 5], multiplier: 1.2 }
        ],
        
        // 每场比赛奖励配置
        perMatchRewards: {
            enabled: true,
            basePoints: 30, // 基础积分
            scoreMultiplier: 0.05, // 分数倍数
            minPoints: 5, // 最少积分
            maxPoints: 200, // 最多积分
            bonusConditions: [
                {
                    type: "score_threshold",
                    value: 800,
                    bonusPoints: 50,
                    description: "分数超过800获得额外50积分"
                },
                {
                    type: "perfect_score",
                    value: 1200,
                    bonusPoints: 100,
                    description: "完美分数1200获得额外100积分"
                }
            ]
        }
    }
}
```

## 实现逻辑

### 1. 加入锦标赛流程
```typescript
async join(ctx, { uid, gameType, tournamentType, player, season }) {
    // 1. 验证加入条件
    // 2. 扣除入场费
    // 3. 检查尝试次数限制
    // 4. 查找或创建多人单场比赛
    // 5. 玩家加入比赛
    // 6. 返回比赛信息
}
```

### 2. 多次参与逻辑
```typescript
// 在 findOrCreateMultiPlayerMatch 中
if (existingParticipation) {
    // 如果支持多次参与，允许玩家再次加入
    if (config.matchRules?.allowMultipleAttempts) {
        // 检查是否还有尝试次数
        const currentAttempts = await ctx.db
            .query("player_matches")
            .withIndex("by_tournament_uid", (q: any) =>
                q.eq("tournamentId", existingMatch.tournamentId).eq("uid", uid)
            )
            .collect();

        if (currentAttempts.length >= (config.matchRules?.maxAttempts || 1)) {
            throw new Error("已达最大尝试次数");
        }
    } else {
        throw new Error("您已经参与了这个比赛");
    }
}
```

### 3. 分数提交流程
```typescript
async submitScore(ctx, { tournamentId, uid, gameType, score, gameData, propsUsed, gameId }) {
    // 1. 验证分数提交
    // 2. 更新比赛记录
    // 3. 计算并分配每场比赛奖励
    // 4. 检查是否需要立即结算
    // 5. 记录道具使用日志
    // 6. 返回结果
}
```

### 4. 每场比赛奖励计算
```typescript
async calculateAndDistributeMatchRewards(ctx, { uid, score, tournament, playerMatch, now }) {
    // 1. 检查是否启用每场比赛奖励
    // 2. 计算基础积分: basePoints + (score * scoreMultiplier)
    // 3. 应用最小/最大限制
    // 4. 检查额外奖励条件
    // 5. 计算金币和游戏积分
    // 6. 更新玩家库存
    // 7. 记录奖励分配
}
```

### 5. 锦标赛结算流程
```typescript
async settle(ctx, tournamentId) {
    // 1. 验证锦标赛状态
    // 2. 获取完成的比赛
    // 3. 计算玩家排名（基于最佳分数）
    // 4. 分配最终排名奖励
    // 5. 完成锦标赛
}
```

## 数据库设计

### 新增表结构

#### 1. match_rewards (每场比赛奖励记录)
```sql
{
    _id: Id,
    uid: string,                    // 玩家ID
    tournamentId: Id,               // 锦标赛ID
    matchId: Id,                    // 比赛ID
    score: number,                  // 游戏分数
    points: number,                 // 获得的积分
    coins: number,                  // 获得的金币
    gamePoints: number,             // 获得的游戏积分
    bonusPoints: number,            // 额外奖励积分
    createdAt: string               // 创建时间
}
```

#### 2. final_reward_distributions (最终奖励分配记录)
```sql
{
    _id: Id,
    uid: string,                    // 玩家ID
    tournamentId: Id,               // 锦标赛ID
    rank: number,                   // 最终排名
    score: number,                  // 最佳分数
    reward: {                       // 奖励详情
        coins: number,
        gamePoints: number,
        props: Array,
        tickets: Array
    },
    createdAt: string               // 创建时间
}
```

## 使用场景

### 1. 竞技比赛
- 多个玩家同时参与同一场比赛
- 实时竞争和排名
- 支持多次尝试提高成绩

### 2. 技能提升
- 玩家可以通过多次尝试来提高技能
- 每次尝试都能获得即时反馈和奖励
- 鼓励玩家持续参与和改进

### 3. 社交互动
- 多人同时参与增加社交元素
- 实时排名增加竞争感
- 支持多次参与增加互动机会

## 优势特点

### 1. 玩家体验
- **即时满足**: 每场比赛都有奖励
- **持续参与**: 多次尝试机制
- **社交竞争**: 多人同时参与
- **技能发展**: 通过练习提高水平

### 2. 系统设计
- **复用现有处理器**: 基于 `multiPlayerSingleMatchHandler`
- **灵活配置**: 可调整尝试次数和奖励参数
- **数据追踪**: 完整的尝试历史和奖励记录
- **扩展性强**: 支持多种奖励条件和规则

### 3. 商业价值
- **提高留存**: 多次参与增加用户粘性
- **增加收入**: 入场费 × 尝试次数
- **数据收集**: 丰富的玩家行为数据
- **社交传播**: 多人参与增加传播性

## 与其他模式的对比

| 特性 | 多人单场比赛多次参与 | 传统多人锦标赛 | 独立锦标赛 |
|------|---------------------|----------------|------------|
| 参与方式 | 多人同时参与 | 多人同时参与 | 单人参与 |
| 尝试次数 | 多次（最多10次） | 单次 | 单次 |
| 奖励时机 | 即时 + 最终 | 仅最终 | 仅最终 |
| 竞争激烈度 | 高 | 高 | 低 |
| 社交元素 | 强 | 强 | 弱 |
| 学习曲线 | 友好 | 陡峭 | 平缓 |

## 配置建议

### 1. 尝试次数设置
- **新手友好**: 5-10次
- **平衡模式**: 3-5次
- **竞技模式**: 1-3次

### 2. 奖励参数
- **基础积分**: 20-50
- **分数倍数**: 0.03-0.08
- **额外奖励**: 根据游戏难度调整

### 3. 时间限制
- **单场比赛**: 10-20分钟
- **总时间**: 30分钟-2小时
- **锦标赛周期**: 1-7天

### 4. 玩家数量
- **最少玩家**: 2-4人
- **最多玩家**: 6-12人
- **最佳体验**: 4-8人

## 监控指标

### 1. 参与指标
- 平均尝试次数
- 完成率
- 参与人数
- 同时在线人数

### 2. 奖励指标
- 平均每场比赛奖励
- 奖励分布
- 额外奖励触发率
- 最终排名分布

### 3. 性能指标
- 结算时间
- 数据库查询效率
- 系统响应时间
- 匹配等待时间

## 未来扩展

### 1. 社交功能
- 好友邀请
- 团队比赛
- 聊天系统
- 观战模式

### 2. 进阶功能
- 连胜奖励
- 段位晋升
- 特殊成就
- 排行榜系统

### 3. 个性化
- 自适应难度
- 个性化奖励
- 推荐系统
- 匹配算法优化

## 总结

通过扩展现有的 `multiPlayerSingleMatchHandler`，我们成功实现了支持多次参与且每场比赛都有积分奖励的锦标赛模式。这种设计既保持了多人竞技的社交性和竞争性，又通过多次参与机制和即时奖励系统提高了玩家的参与度和满意度。

主要优势：
1. **复用现有代码**: 基于成熟的处理器，减少开发风险
2. **灵活配置**: 支持多种参数调整，适应不同需求
3. **完整功能**: 包含多次参与、即时奖励、最终排名等完整功能
4. **良好体验**: 平衡了竞技性和友好性，适合不同技能水平的玩家 