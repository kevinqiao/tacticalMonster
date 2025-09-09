# 🏆 纯升级段位系统设计指南

## 📋 系统概述

根据 systemdesign.pdf 的设计要求，段位系统采用纯升级模式，不支持降级，因此无需保护机制。玩家只能通过积累积分逐步提升段位，一旦达到某个段位就永久保持。

## 🎯 核心设计理念

### 1. 纯升级系统
- **只升不降**: 玩家段位只能向上提升，永远不会下降
- **永久保持**: 一旦达到某个段位，就永久保持该段位
- **积分累积**: 通过持续获得积分来提升段位
- **无保护机制**: 由于不会降级，因此不需要任何保护机制

### 2. 段位等级体系

| 段位 | 等级 | 颜色 | 图标 | 升级积分 |
|------|------|------|------|----------|
| Bronze | 1 | #CD7F32 | 🥉 | 1000 |
| Silver | 2 | #C0C0C0 | 🥈 | 2500 |
| Gold | 3 | #FFD700 | 🥇 | 5000 |
| Platinum | 4 | #E5E4E2 | 💎 | 10000 |
| Diamond | 5 | #B9F2FF | 💠 | 20000 |
| Master | 6 | #FF6B6B | 👑 | 50000 |
| Grandmaster | 7 | #9B59B6 | 🌟 | 100000 |

## 🔧 系统特性

### 1. 升级条件
每个段位都有明确的升级条件：
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

## 🏗️ 系统架构

### 核心组件
```
纯升级段位系统
├── SegmentManager.ts           # 核心段位管理器（仅升级）
├── TournamentSegmentIntegration.ts  # 锦标赛集成
├── dataAccess.ts              # 数据访问层
├── config.ts                  # 段位规则配置
├── types.ts                   # 类型定义
└── segmentFunctions.ts        # Convex函数接口
```

### 数据库表结构
```
段位系统表
├── player_segments            # 玩家段位主表
├── segment_change_history     # 段位变化历史（仅升级）
├── segment_points_logs        # 积分获得记录
├── segment_configs            # 段位配置
└── segment_stats              # 段位统计
```

## 🚀 使用方法

### 1. 基本段位操作

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

### 2. 锦标赛集成

```typescript
// 锦标赛结束后自动处理段位升级
const integrationResult = await ctx.runMutation(
  "segment:tournamentIntegrationFunctions.handleTournamentCompletion",
  {
    tournamentId: "tournament_123",
    results: [
      { uid: "player1", matchRank: 1, score: 1000 },
      { uid: "player2", matchRank: 2, score: 800 }
    ]
  }
);
```

### 3. 获取段位信息

```typescript
// 获取玩家段位
const playerSegment = await ctx.runQuery(
  "segment:getPlayerSegmentInfo",
  { uid: "player123" }
);

// 获取段位统计
const statistics = await ctx.runQuery(
  "segment:getSegmentDistribution"
);
```

## 📊 积分计算规则

### 基础积分计算
```typescript
// 根据排名计算基础积分
1st: 100 points
2nd: 80 points  
3rd: 60 points
4th: 40 points
其他: 20 points

// 段位倍数
Bronze: 1.0x
Silver: 1.2x
Gold: 1.5x
Platinum: 1.8x
Diamond: 2.0x
Master: 2.5x
Grandmaster: 3.0x

// 分数奖励
每100分额外5积分

// 总积分计算
totalPoints = Math.floor((basePoints + scoreBonus) * segmentMultiplier)
```

### 升级条件检查
```typescript
// 检查是否满足升级条件（仅积分）
const canUpgrade = currentPoints >= nextSegment.pointsRequired;
```

## 🔄 系统流程

### 1. 积分更新流程
```
玩家获得积分
    ↓
检查当前段位
    ↓
计算新总积分
    ↓
检查升级条件
    ↓
满足条件 → 执行升级 → 记录历史
    ↓
不满足条件 → 只更新积分
```

### 2. 升级执行流程
```
满足升级条件
    ↓
扣除升级所需积分
    ↓
更新玩家段位
    ↓
记录升级历史
    ↓
返回升级结果
```

## 📈 性能优化

### 1. 数据库优化
- 移除保护相关表，减少存储空间
- 简化查询逻辑，提高查询性能
- 优化索引设计，支持快速段位查询

### 2. 计算优化
- 移除复杂的保护机制计算
- 简化段位变化逻辑
- 减少不必要的数据库操作

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

### 2. 创建测试数据
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

### 3. 健康检查
```typescript
// 检查系统状态
const health = await ctx.runQuery(
  "segment:getSegmentSystemHealth"
);
```

## 🚨 注意事项

### 1. 积分验证
- 只接受正数积分增量
- 负数积分增量会被拒绝
- 零积分增量只更新最后比赛时间

### 2. 段位规则
- 所有段位的降级配置都设置为无效
- 保护机制完全禁用
- 只保留升级相关逻辑

### 3. 数据一致性
- 段位升级必须在事务中处理
- 积分扣除和段位更新必须同步
- 升级历史记录要及时更新

## 🔮 未来扩展

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

## 📞 技术支持

### 常见问题
1. **段位不升级**: 检查积分是否达到要求
2. **积分不增加**: 检查积分增量是否为正数
3. **升级条件不满足**: 检查胜率、比赛场次等条件

### 调试工具
1. **系统测试**: 运行完整测试套件
2. **健康检查**: 检查系统状态
3. **日志查看**: 查看详细的操作日志

---

**版本**: 2.0.0  
**设计理念**: 纯升级系统，无降级，无保护  
**最后更新**: 2024年  
**维护者**: AI Assistant
