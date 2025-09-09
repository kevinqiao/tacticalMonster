# 🏆 纯升级段位系统

## 📋 系统概述

根据 systemdesign.pdf 的设计要求，实现了纯升级段位系统。系统采用"只升不降"的设计理念，玩家通过积累积分逐步提升段位，一旦达到某个段位就永久保持，无需任何保护机制。

## 🏗️ 新系统架构

### 1. 分层设计

```
┌─────────────────────────────────────┐
│           Convex Functions          │  ← 接口层
├─────────────────────────────────────┤
│         SegmentManager              │  ← 业务逻辑层
├─────────────────────────────────────┤
│         Data Access Layer          │  ← 数据访问层
├─────────────────────────────────────┤
│         Configuration              │  ← 配置层
├─────────────────────────────────────┤
│         Type Definitions           │  ← 类型定义层
└─────────────────────────────────────┘
```

### 2. 文件结构

```
segment/
├── types.ts                           # 类型定义
├── config.ts                          # 配置和规则
├── dataAccess.ts                     # 数据访问层
├── SegmentManager.ts                  # 核心业务逻辑（仅升级）
├── segmentFunctions.ts                # 基础功能接口
├── tournamentIntegration.ts           # 锦标赛集成服务
├── tournamentIntegrationFunctions.ts  # 锦标赛集成接口
├── segmentSystemTest.ts              # 测试和调试
├── index.ts                          # 主入口文件
├── README.md                         # 系统说明
└── PURE_UPGRADE_SYSTEM_GUIDE.md      # 纯升级系统指南
```

## 🎯 核心特性

### 1. 纯升级设计
- **只升不降**: 玩家段位只能向上提升，永远不会下降
- **永久保持**: 一旦达到某个段位，就永久保持该段位
- **无保护机制**: 由于不会降级，因此不需要任何保护机制
- **积分累积**: 通过持续获得积分来提升段位

### 2. 类型安全
- 使用严格的TypeScript类型定义
- 统一的接口规范
- 编译时类型检查

### 3. 职责分离
- **类型层**: 定义所有接口和类型
- **配置层**: 管理段位规则和系统配置
- **数据层**: 统一数据库操作
- **业务层**: 核心逻辑处理（仅升级）
- **接口层**: Convex函数暴露

### 4. 错误处理
- 统一的错误处理机制
- 详细的错误信息
- 异常安全的数据操作

## 🚀 使用方法

### 1. 基本使用

```typescript
// 检查段位变化（仅升级）
const result = await ctx.runMutation(
  "segment:checkAndProcessSegmentChange",
  {
    uid: "player123",
    pointsDelta: 500  // 只接受正数
  }
);

if (result.changed) {
  console.log(`段位升级: ${result.message}`);
}
```

### 2. 查询段位信息

```typescript
// 获取段位信息
const segmentInfo = await ctx.runQuery(
  "segment:getSegmentInfo",
  { segmentName: "gold" }
);

// 获取玩家段位
const playerSegment = await ctx.runQuery(
  "segment:getPlayerSegmentInfo",
  { uid: "player123" }
);
```

### 3. 批量操作

```typescript
// 批量检查段位变化
const results = await ctx.runMutation(
  "segment:batchCheckSegmentChanges",
  {
    playerUpdates: [
      { uid: "player1", pointsDelta: 500 },
      { uid: "player2", pointsDelta: 1000 }
    ]
  }
);
```

## 📊 段位规则配置

### 1. 段位等级

| 段位 | 等级 | 颜色 | 图标 | 升级积分 |
|------|------|------|------|----------|
| Bronze | 1 | #CD7F32 | 🥉 | 1000 |
| Silver | 2 | #C0C0C0 | 🥈 | 2500 |
| Gold | 3 | #FFD700 | 🥇 | 5000 |
| Platinum | 4 | #E5E4E2 | 💎 | 10000 |
| Diamond | 5 | #B9F2FF | 💠 | 20000 |
| Master | 6 | #FF6B6B | 👑 | 50000 |
| Grandmaster | 7 | #9B59B6 | 🌟 | 100000 |

### 2. 升级条件示例

```typescript
gold: {
  promotion: {
    pointsRequired: 5000      // 只需要5000积分
  }
}
```

## 🎯 纯升级机制

### 1. 升级条件
- **积分要求**: 必须达到下一段位所需积分

### 2. 积分系统
- **只增不减**: 积分只能增加，不会减少
- **多来源**: 锦标赛、快速匹配、排行榜、任务等
- **段位倍数**: 高段位玩家获得更多积分
- **无衰减**: 积分不会随时间衰减

### 3. 无保护机制
- **无新段位保护**: 升级后无需保护期
- **无宽限期**: 不存在降级宽限期
- **无表现保护**: 不需要基于表现的保护
- **无降级检查**: 完全移除降级相关逻辑

### 4. 赛季重置机制
- **软重置**: 赛季结束时进行段位软重置
- **积分保留**: 保留30%的积分作为新赛季起点
- **段位调整**: 根据当前段位调整到合适的起始段位
- **重置预览**: 提供重置前的预览功能

## 📈 性能优化

### 1. 数据库索引
- 按用户ID索引
- 按段位索引
- 按时间索引

### 2. 批量操作
- 支持批量段位检查
- 减少数据库查询次数
- 提高系统响应速度

### 3. 内存优化
- 移除保护状态缓存
- 简化数据结构
- 减少内存占用

## 🧪 测试和调试

### 1. 系统测试
```typescript
// 运行完整测试
const testResult = await ctx.runMutation(
  "segment:runSegmentSystemTest",
  { testType: "all" }
);
```

### 2. 健康检查
```typescript
// 检查系统状态
const health = await ctx.runQuery(
  "segment:getSegmentSystemHealth"
);
```

### 3. 创建测试数据
```typescript
// 创建测试玩家
const testData = await ctx.runMutation(
  "segment:createTestPlayerData",
  {
    playerCount: 10,
    segmentName: "bronze"
  }
);
```

### 4. 赛季重置功能
```typescript
// 获取赛季重置预览
const preview = await ctx.runQuery(
  "segment:getSeasonResetPreview"
);

// 执行赛季软重置
const resetResult = await ctx.runMutation(
  "segment:performSeasonReset",
  {
    seasonId: "season_2024_1",
    resetReason: "赛季结束"
  }
);
```

## 🚀 未来扩展

### 1. 段位特权系统
- 高段位玩家获得特殊权限
- 段位专属奖励和称号
- 段位专属游戏模式

### 2. 段位联赛
- 同段位玩家之间的竞技
- 段位内部排名系统
- 段位专属锦标赛

### 3. 段位历史记录
- 详细的段位升级轨迹
- 段位成就系统
- 段位里程碑奖励

## 📝 注意事项

1. **积分验证**: 只接受正数积分增量，负数会被拒绝
2. **段位规则**: 所有段位的降级配置都设置为无效
3. **数据一致性**: 段位升级必须在事务中处理
4. **性能考虑**: 批量操作提高系统性能
5. **纯升级设计**: 系统只支持升级，不支持降级

## 🔮 技术特点

- **纯升级**: 只升不降，永久保持
- **无保护**: 不需要任何保护机制
- **积分累积**: 通过持续获得积分提升段位
- **简化架构**: 移除复杂的保护逻辑
- **高性能**: 优化的数据库查询和计算

---

**设计理念**: 纯升级系统，无降级，无保护  
**实现状态**: ✅ 完成  
**版本**: 2.0.0  
**最后更新**: 2024年
