# 自动创建锦标赛功能

## 概述

自动创建锦标赛功能已经集成到 `getAvailableTournaments` 方法中，实现了"懒加载"式的锦标赛创建。当第一个玩家查看可参与锦标赛时，系统会自动创建缺失的锦标赛。

## 🎯 **功能特点**

### **1. 按需创建**
- 只有玩家查看时才创建锦标赛
- 减少资源浪费，避免创建无人参与的锦标赛
- 提高系统性能和响应速度

### **2. 智能判断**
- 根据锦标赛类型（daily/weekly/seasonal）判断是否需要创建
- 避免重复创建相同时间段的锦标赛
- 支持多种游戏类型和分类

### **3. 自动通知**
- 创建锦标赛后自动通知所有活跃玩家
- 提高玩家参与度和活跃度

## 🔧 **实现原理**

### **核心方法**

#### `ensureTournamentsExist()`
- 检查所有活跃的锦标赛类型
- 判断是否需要创建新的锦标赛
- 调用相应的创建方法

#### `shouldCreateTournament()`
- 根据锦标赛分类判断创建策略：
  - `daily`: 检查是否已创建今日锦标赛
  - `weekly`: 检查是否已创建本周锦标赛  
  - `seasonal`: 检查是否已创建本赛季锦标赛
  - 其他类型：不预创建

#### `createTournamentIfNeeded()`
- 创建锦标赛记录
- 设置合适的结束时间
- 发送通知给玩家

## 📊 **支持的锦标赛类型**

### **每日锦标赛 (daily)**
- 每天自动创建一次
- 24小时后自动结束
- 示例：每日纸牌挑战、每日特殊锦标赛

### **每周锦标赛 (weekly)**
- 每周一自动创建
- 7天后自动结束
- 示例：每周拉米大师赛

### **赛季锦标赛 (seasonal)**
- 赛季开始时自动创建
- 赛季结束时自动结束
- 示例：赛季飞行棋联赛

### **其他类型**
- `casual`: 休闲锦标赛，按需创建
- `special`: 特殊活动锦标赛，手动创建
- `ranked`: 排位锦标赛，按需创建

## 🧪 **测试功能**

### **可用的测试函数**

#### 1. **完整测试** - `consoleTestAutoCreate`
运行所有自动创建测试用例：
- 基础自动创建功能
- 重复调用防护
- 不同游戏类型支持
- 通知功能验证

#### 2. **快速测试** - `quickTestAutoCreate`
只运行基础功能测试，快速验证核心功能。

#### 3. **单个测试** - `runSingleAutoCreateTest`
运行指定的单个测试用例。

### **测试用例说明**

#### **基础自动创建测试**
- 验证调用 `getAvailableTournaments` 时自动创建锦标赛
- 检查创建的锦标赛数量和类型
- 验证锦标赛配置的正确性

#### **重复调用测试**
- 验证多次调用不会重复创建锦标赛
- 确保系统的幂等性
- 检查锦标赛数量的稳定性

#### **不同游戏类型测试**
- 测试多种游戏类型的自动创建
- 验证游戏类型过滤功能
- 检查配置的正确应用

#### **通知功能测试**
- 验证创建锦标赛后的通知发送
- 检查通知内容的正确性
- 验证通知的及时性

## 🚀 **使用方法**

### **在 Convex 控制台中运行**

1. 打开 Convex 控制台
2. 进入 Functions 页面
3. 找到对应的测试函数
4. 点击 "Run" 按钮

### **示例调用**

```javascript
// 运行完整测试
await ctx.runMutation("service/tournament/tests/runAutoCreateTests:consoleTestAutoCreate", {});

// 运行快速测试
await ctx.runMutation("service/tournament/tests/runAutoCreateTests:quickTestAutoCreate", {});

// 运行单个测试
await ctx.runMutation("service/tournament/tests/runAutoCreateTests:runSingleAutoCreateTest", {
    testName: "basic" // basic, duplicate, gameTypes, notification
});
```

## 📈 **性能优化**

### **查询优化**
- 使用索引加速锦标赛查询
- 批量处理多个锦标赛类型
- 避免不必要的数据库查询

### **创建优化**
- 只在必要时创建锦标赛
- 使用事务确保数据一致性
- 异步处理通知发送

### **缓存策略**
- 缓存已创建的锦标赛信息
- 减少重复的资格检查
- 优化玩家统计查询

## 🔍 **监控和日志**

### **日志记录**
- 记录锦标赛创建过程
- 记录通知发送状态
- 记录错误和异常情况

### **性能监控**
- 监控创建时间
- 监控查询性能
- 监控通知发送成功率

## 🛠 **配置选项**

### **锦标赛配置**
```typescript
{
    category: "daily" | "weekly" | "seasonal" | "casual" | "special",
    autoCreate: boolean, // 是否启用自动创建
    notificationEnabled: boolean, // 是否发送通知
    maxPlayers: number, // 最大玩家数
    duration: number // 持续时间（秒）
}
```

### **通知配置**
```typescript
{
    enabled: boolean,
    messageTemplate: string,
    channels: ["in_app", "push", "email"]
}
```

## 🔄 **与现有系统的集成**

### **与 TournamentScheduler 的关系**
- 自动创建功能补充了 TournamentScheduler
- TournamentScheduler 仍可用于定时任务和批量操作
- 两者可以协同工作，提供更完整的解决方案

### **与 getAvailableTournaments 的集成**
- 无缝集成到现有方法中
- 不影响现有的资格检查逻辑
- 增强用户体验，提供更多可参与的锦标赛

## 📝 **最佳实践**

### **开发建议**
1. 定期运行测试确保功能正常
2. 监控锦标赛创建频率和成功率
3. 根据玩家反馈调整创建策略
4. 保持通知内容的吸引力和准确性

### **运维建议**
1. 设置合理的创建限制
2. 监控数据库性能影响
3. 定期清理过期的锦标赛
4. 备份重要的锦标赛数据

## 🎉 **总结**

自动创建锦标赛功能为锦标赛系统提供了更智能、更高效的解决方案。通过懒加载的方式，系统能够：

- **提高性能**：减少不必要的资源消耗
- **改善体验**：玩家总能找到可参与的锦标赛
- **简化管理**：减少手动创建的工作量
- **增强活跃度**：通过通知提高玩家参与度

这个功能与现有的锦标赛系统完美集成，为玩家提供了更好的游戏体验。 