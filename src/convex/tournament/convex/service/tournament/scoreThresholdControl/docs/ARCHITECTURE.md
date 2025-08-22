# 分数门槛控制系统架构设计

## 系统架构概览

分数门槛控制系统采用分层架构设计，将系统级操作和玩家级操作分离，提供清晰的API接口和类型安全。系统整合了历史数据分析、智能配置优化和段位管理等功能。

## 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Convex Functions Layer                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   core.ts       │  │  examples.ts    │  │      intelligent.ts         │  │
│  │  (核心功能)      │  │  (示例测试)      │  │     (智能功能)              │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                        ScoreThresholdPlayerController                       │
│                    (主控制器 - 整合系统级和玩家级功能)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │HistoricalData   │  │SegmentManager   │  │IntelligentExperience       │  │
│  │Analyzer         │  │(段位管理)        │  │Manager                     │  │
│  │(历史数据分析)     │  │                 │  │(智能体验管理)              │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                            Configuration Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   config.ts     │  │   types.ts      │  │   constants.ts              │  │
│  │  (配置管理)      │  │  (类型定义)      │  │   (常量定义)                │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                            Database Layer                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │score_threshold  │  │player_performance│  │player_protection_status    │  │
│  │configs          │  │metrics          │  │                            │  │
│  │(配置表)          │  │(性能指标表)      │  │(保护状态表)                │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐                                  │
│  │player_match     │  │match_results    │                                  │
│  │records          │  │(比赛结果表)      │                                  │
│  │(比赛记录表)      │  │                 │                                  │
│  └─────────────────┘  └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心组件详解

### 1. ScoreThresholdPlayerController (主控制器)

主控制器整合了原系统级和玩家级控制器的所有功能，是系统的核心组件。

#### 主要职责
- **比赛处理**: 处理比赛结束、计算排名、更新数据
- **排名计算**: 支持多种排名算法和动态参与者数量
- **配置管理**: 玩家配置的创建、更新、重置
- **历史分析**: 基于历史数据的智能配置优化
- **段位管理**: 段位变化检查和处理

#### 核心方法
```typescript
class ScoreThresholdPlayerController {
    // 比赛处理
    async processMatchEnd(matchId: string, playerScores: Array<{ uid: string; score: number; points: number }>): Promise<MatchRankingResult>
    
    // 排名计算
    async getRankByScore(uid: string, score: number, participantCount?: number): Promise<RankingResult>
    async getBatchRanksByScores(playerScores: Array<{ uid: string; score: number }>): Promise<BatchRankingResult[]>
    
    // 配置管理
    async getPlayerConfig(uid: string): Promise<ScoreThresholdConfig | null>
    async updatePlayerConfig(uid: string, updates: Partial<ScoreThresholdConfig>): Promise<boolean>
    async resetPlayerConfig(uid: string): Promise<boolean>
    
    // 历史数据分析
    async updatePlayerConfigBasedOnHistory(uid: string): Promise<ConfigUpdateResult>
    async getPlayerConfigOptimizationSuggestions(uid: string): Promise<OptimizationSuggestions>
    
    // 段位管理
    async checkSegmentChange(uid: string, changeType: ChangeType): Promise<SegmentChangeResult>
    async getPlayerSegmentInfo(uid: string): Promise<SegmentInfo | null>
}
```

### 2. HistoricalDataAnalyzer (历史数据分析器)

专门负责分析玩家历史数据，生成配置优化建议。

#### 分析维度
- **胜率趋势分析**: 比较最近10场与整体胜率
- **分数稳定性分析**: 计算分数方差和变异系数
- **排名分布分析**: 分析排名分布模式
- **学习曲线分析**: 检测学习速度和平台期

#### 核心方法
```typescript
class HistoricalDataAnalyzer {
    async analyzePlayerHistory(uid: string): Promise<AnalysisResult>
    
    private analyzeWinRate(metrics: any, records: any[]): WinRateAnalysis
    private analyzeScoreStability(records: any[]): ScoreStabilityAnalysis
    private analyzeRankingDistribution(records: any[]): RankingDistributionAnalysis
    private analyzeLearningCurve(records: any[]): LearningCurveAnalysis
    
    private generateConfigSuggestions(analysis: any): ConfigSuggestions
    private generateScoreThresholdAdjustments(analysis: any): ScoreThresholdAdjustments[]
}
```

### 3. SegmentManager (段位管理器)

负责段位相关的逻辑处理，包括升级检查、降级保护等。

#### 主要功能
- **段位变化检查**: 检查玩家是否满足升级/降级条件
- **保护机制管理**: 管理玩家的保护状态和宽限期
- **段位规则获取**: 获取不同段位的规则配置

#### 核心方法
```typescript
class SegmentManager {
    async canPromote(uid: string): Promise<boolean>
    async canDemote(uid: string): Promise<boolean>
    async getSegmentProtectionConfig(segmentName: SegmentName): Promise<ProtectionConfig>
    async getSegmentRule(segmentName: SegmentName): Promise<SegmentRule>
    async getSegmentTier(segmentName: SegmentName): Promise<number>
    async checkAndProcessSegmentChange(uid: string, points: number): Promise<SegmentChangeResult>
}
```

### 4. IntelligentExperienceManager (智能体验管理器)

提供智能化的游戏体验管理功能。

#### 主要功能
- **AI难度调整**: 根据玩家表现动态调整AI难度
- **智能排名分配**: 基于体验目标智能分配排名
- **学习曲线优化**: 优化玩家的学习路径和挑战频率
- **情感体验管理**: 管理玩家的情绪状态和体验策略

## 数据流设计

### 1. 比赛结束流程

```
比赛结束 → 排名计算 → 数据更新 → 历史分析 → 配置优化 → 体验提升
```

#### 详细流程
1. **比赛结束触发**: `processMatchEnd` 被调用
2. **排名计算**: 根据分数和配置计算每个玩家的排名
3. **数据更新**: 更新性能指标、保护状态、比赛记录
4. **历史分析**: 分析玩家历史数据，生成配置建议
5. **配置优化**: 自动更新玩家配置参数
6. **体验提升**: 基于新配置优化后续游戏体验

### 2. 配置更新流程

```
历史数据收集 → 数据分析 → 建议生成 → 配置更新 → 效果验证
```

#### 详细流程
1. **数据收集**: 收集玩家的比赛记录和性能指标
2. **数据分析**: 分析胜率趋势、分数稳定性、学习曲线等
3. **建议生成**: 基于分析结果生成配置优化建议
4. **配置更新**: 应用建议更新玩家配置
5. **效果验证**: 监控配置更新后的效果

## 数据模型设计

### 1. 核心接口

#### ScoreThresholdConfig
```typescript
interface ScoreThresholdConfig {
    _id?: string;
    uid: string;                           // 玩家ID
    segmentName: SegmentName;              // 当前段位
    scoreThresholds: ScoreThreshold[];     // 分数门槛配置
    maxRank: number;                       // 最大排名
    adaptiveMode: AdaptiveMode;            // 自适应模式
    learningRate: number;                  // 学习率
    autoAdjustLearningRate: boolean;       // 是否自动调整学习率
    rankingMode: RankingMode;              // 排名模式
    createdAt: string;                     // 创建时间
    updatedAt: string;                     // 更新时间
}
```

#### RankingResult
```typescript
interface RankingResult {
    uid: string;                           // 玩家ID
    rank: number;                          // 最终排名
    score: number;                         // 比赛分数
    points: number;                        // 获得积分
    rankingProbability: number;            // 排名概率
    segmentName: SegmentName;              // 段位名称
    protectionActive: boolean;             // 保护状态是否激活
    reason: string;                        // 排名原因
}
```

#### PlayerPerformanceMetrics
```typescript
interface PlayerPerformanceMetrics {
    _id?: string;
    uid: string;                           // 玩家ID
    totalMatches: number;                  // 总比赛场数
    totalWins: number;                     // 总胜利场数
    totalScore: number;                    // 总分数
    averageScore: number;                  // 平均分数
    lastMatchScore: number;                // 最后一场比赛分数
    lastMatchRank: number;                 // 最后一场比赛排名
    createdAt: string;                     // 创建时间
    updatedAt: string;                     // 更新时间
}
```

### 2. 枚举类型

#### RankingMode
```typescript
type RankingMode = 'score_based' | 'segment_based' | 'hybrid';
```

#### AdaptiveMode
```typescript
type AdaptiveMode = 'static' | 'dynamic' | 'learning';
```

#### SegmentName
```typescript
type SegmentName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';
```

## 配置管理

### 1. 配置层次结构

```
系统默认配置 (DEFAULT_SCORE_THRESHOLDS)
    ↓
段位默认配置 (getDefaultScoreThresholds)
    ↓
玩家个性化配置 (updatePlayerConfigBasedOnHistory)
    ↓
实时动态调整 (比赛过程中的微调)
```

### 2. 配置更新策略

#### 自动更新条件
- 比赛结束后自动触发
- 需要至少5场比赛的历史数据
- 分析置信度 ≥ 0.3

#### 更新参数范围
- **学习率**: 0.01 - 0.3
- **排名模式**: score_based | segment_based | hybrid
- **自适应模式**: static | dynamic | learning
- **分数门槛**: 基于分数稳定性动态调整

## 性能优化策略

### 1. 异步处理
- 配置更新异步执行，不阻塞比赛结果返回
- 使用 Promise.all 并行处理多个玩家
- 错误隔离，单个玩家失败不影响整体

### 2. 批量操作
- 支持批量排名计算 (`getBatchRanksByScores`)
- 支持批量配置更新 (`batchUpdatePlayerConfigs`)
- 减少数据库查询次数

### 3. 缓存策略
- 玩家配置缓存，减少重复查询
- 历史数据分析结果缓存
- 段位规则缓存

### 4. 数据库优化
- 合理的索引设计 (by_uid, by_segment, by_createdAt)
- 批量插入和更新操作
- 查询结果分页处理

## 错误处理机制

### 1. 分层错误处理
- **控制器层**: 捕获业务逻辑错误
- **数据访问层**: 处理数据库操作错误
- **配置层**: 验证配置参数错误

### 2. 容错策略
- 配置更新失败时回滚到上次有效配置
- 数据不一致时自动修复
- 网络异常时重试机制

### 3. 降级策略
- 智能分析失败时使用默认配置
- 历史数据不足时使用段位默认值
- 系统异常时提供基础功能

## 扩展性设计

### 1. 插件化架构
- 支持自定义历史数据分析器
- 支持自定义配置策略
- 支持自定义排名算法

### 2. 配置化设计
- 所有关键参数都可配置
- 支持运行时动态调整
- 支持A/B测试配置

### 3. 接口标准化
- 统一的错误处理接口
- 标准化的返回数据结构
- 可扩展的配置接口

## 监控和调试

### 1. 性能监控
- 排名计算耗时统计
- 配置更新成功率监控
- 数据库查询性能分析

### 2. 业务监控
- 玩家配置更新频率
- 段位变化趋势
- 排名分布统计

### 3. 调试工具
- 详细的变更日志记录
- 配置更新原因追踪
- 历史数据分析结果展示

## 部署和运维

### 1. 环境配置
- 开发环境: 使用模拟数据
- 测试环境: 使用测试数据库
- 生产环境: 使用生产数据库

### 2. 数据迁移
- 支持配置数据迁移
- 支持历史数据导入
- 支持段位数据同步

### 3. 备份和恢复
- 定期备份配置数据
- 支持配置数据恢复
- 支持历史数据恢复

## 总结

分数门槛控制系统采用现代化的分层架构设计，具备高度的模块化、可扩展性和可维护性。系统通过智能化的历史数据分析和配置优化，为每个玩家提供个性化的游戏体验，同时保持了良好的性能和稳定性。

通过合理的架构设计和优化策略，系统能够有效支持大规模玩家并发，为游戏运营提供强有力的技术支撑。
