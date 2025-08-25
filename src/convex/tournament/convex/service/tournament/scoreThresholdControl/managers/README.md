# 智能管理器协作架构

## 概述

本系统采用**保持分离 + 增强协作**的架构设计，包含两个核心管理器：

- **IntelligentRecommendationManager**: 智能推荐管理器
- **IntelligentExperienceManager**: 智能体验管理器

## 架构设计原则

### 1. 职责分离
- **RecommendationManager**: 专注于种子推荐和用户偏好分析
- **ExperienceManager**: 专注于AI难度调节、情感体验和排名策略

### 2. 增强协作
- 通过公共接口实现数据共享
- 推荐时考虑体验因素
- 体验优化时参考推荐结果

## 协作流程

```
用户请求推荐 → RecommendationManager → 调用 ExperienceManager → 生成体验感知的推荐
```

### 具体步骤：

1. **RecommendationManager.intelligentRecommendSeeds()**
   - 获取基础统计数据和技能等级
   - 调用 `expManager.adjustAIDifficulty()` 获取AI策略
   - 调用 `expManager.getPlayerEmotionalState()` 获取情绪状态
   - 调用 `expManager.getPlayerExperienceTarget()` 获取体验目标

2. **生成体验感知的推荐**
   - 结合AI策略调整难度
   - 考虑情绪状态优化体验
   - 基于体验目标定制推荐

3. **返回增强的推荐结果**
   - 种子推荐列表
   - 体验优化建议
   - AI策略配置
   - 情绪支持建议

## 使用示例

### 基础推荐调用
```typescript
const recommendationManager = new IntelligentRecommendationManager(ctx);
const result = await recommendationManager.intelligentRecommendSeeds(uid, 5);

console.log('推荐种子:', result.recommendation.seeds);
console.log('AI策略:', result.experienceOptimization.aiStrategy);
console.log('情绪建议:', result.experienceOptimization.emotionalSupport.recommendations);
```

### 体验优化调用
```typescript
const experienceManager = new IntelligentExperienceManager(ctx);
const aiStrategy = await experienceManager.adjustAIDifficulty(uid);
const emotionalState = await experienceManager.getPlayerEmotionalState(uid);
const experienceTarget = await experienceManager.getPlayerExperienceTarget(uid);
```

## 优势

### 1. 模块化设计
- 每个管理器专注特定领域
- 代码结构清晰，易于维护
- 支持独立开发和测试

### 2. 智能协作
- 推荐时自动考虑体验因素
- 避免重复计算，提高性能
- 统一的用户体验

### 3. 可扩展性
- 可以独立扩展各自功能
- 支持新的协作模式
- 便于团队协作开发

## 扩展建议

### 1. 缓存优化
- 共享用户状态缓存
- 避免重复调用相同接口
- 实现智能缓存失效策略

### 2. 异步协作
- 支持并行调用多个管理器
- 实现异步结果聚合
- 优化响应时间

### 3. 配置化协作
- 支持动态配置协作策略
- 实现A/B测试支持
- 提供协作效果监控

## 注意事项

1. **错误处理**: 确保单个管理器失败不影响整体功能
2. **性能监控**: 监控协作调用的性能影响
3. **数据一致性**: 确保共享数据的一致性
4. **向后兼容**: 保持API的向后兼容性
