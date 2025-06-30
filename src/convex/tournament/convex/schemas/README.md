# 模块化Schema设计

## 概述

为了管理大型项目的数据库schema，我们将schema按功能模块分割成多个独立的文件，然后在主schema文件中合并。

## 文件结构

```
schemas/
├── index.ts              # 主schema文件，合并所有模块
├── userSchema.ts         # 用户系统相关表
├── tournamentSchema.ts   # 锦标赛系统相关表
├── segmentSchema.ts      # 段位系统相关表
├── propSchema.ts         # 道具系统相关表
├── ticketSchema.ts       # 门票系统相关表
├── taskSchema.ts         # 任务系统相关表
└── README.md            # 本文档
```

## 模块说明

### 1. userSchema.ts - 用户系统
- `users` - 用户基本信息
- `user_preferences` - 用户偏好设置
- `user_statistics` - 用户统计数据
- `user_achievements` - 用户成就

### 2. tournamentSchema.ts - 锦标赛系统
- `tournaments` - 锦标赛信息
- `tournament_types` - 锦标赛类型
- `matches` - 比赛记录
- `player_tournament_limits` - 玩家参赛限制
- `tournament_prop_distributions` - 锦标赛道具分配
- `tournament_entry_fees` - 参赛费用
- `tournament_prop_effects` - 道具效果
- `seasons` - 赛季信息

### 3. segmentSchema.ts - 段位系统
- `segments` - 段位定义
- `player_segments` - 玩家段位
- `segment_changes` - 段位变更记录
- `segment_rewards` - 段位奖励
- `leaderboards` - 排行榜
- `segment_statistics` - 段位统计
- `inactivity_penalties` - 不活跃惩罚
- `return_rewards` - 回归奖励
- `master_maintenance` - 大师维护

### 4. propSchema.ts - 道具系统
- `inventories` - 道具库存
- `prop_usage_logs` - 道具使用日志
- `prop_distribution_logs` - 道具分配日志
- `delayed_prop_deductions` - 延迟道具扣除
- `coin_transactions` - 金币交易

### 5. ticketSchema.ts - 门票系统
- `ticket_templates` - 门票模板
- `player_tickets` - 玩家门票
- `ticket_transactions` - 门票交易
- `ticket_bundles` - 门票礼包
- `bundle_purchases` - 礼包购买
- `ticket_usage_stats` - 门票使用统计
- `ticket_recommendations` - 门票推荐

### 6. taskSchema.ts - 任务系统
- `tasks` - 任务定义
- `player_tasks` - 玩家任务
- `task_progress_logs` - 任务进度日志
- `daily_task_resets` - 每日任务重置
- `achievement_tasks` - 成就任务

## 使用方法

### 1. 添加新表到现有模块
```typescript
// 在相应的模块文件中添加新表
export const userSchema = {
  // 现有表...
  new_table: defineTable({
    // 表结构
  }).index("by_field", ["field"]),
};
```

### 2. 创建新模块
```typescript
// 1. 创建新的schema文件，如 gameSchema.ts
export const gameSchema = {
  games: defineTable({
    // 表结构
  }),
};

// 2. 在主schema文件中导入并合并
import { gameSchema } from "./schemas/gameSchema";

export default defineSchema({
  // 现有模块...
  ...gameSchema,
});
```

### 3. 修改现有表结构
```typescript
// 在相应的模块文件中修改表定义
export const userSchema = {
  users: defineTable({
    // 添加新字段
    newField: v.string(),
    // 现有字段...
  }),
};
```

## 优势

1. **可维护性**: 每个模块独立管理，便于维护
2. **可读性**: 相关表集中在一起，逻辑清晰
3. **可扩展性**: 新增功能模块不影响现有代码
4. **团队协作**: 不同开发者可以专注于不同模块
5. **版本控制**: 模块级别的变更更容易追踪

## 注意事项

1. **表名唯一性**: 确保不同模块中的表名不重复
2. **索引命名**: 使用模块前缀避免索引名冲突
3. **依赖关系**: 注意模块间的表依赖关系
4. **导入顺序**: 在主schema文件中保持一致的导入顺序

## 迁移指南

如果要将现有的单一schema文件迁移到模块化结构：

1. 按功能将表分组
2. 创建相应的模块文件
3. 将表定义移动到对应模块
4. 更新主schema文件
5. 测试所有功能正常工作

## 最佳实践

1. **模块命名**: 使用清晰的模块名称，如 `userSchema`, `gameSchema`
2. **表命名**: 使用下划线分隔的命名方式，如 `user_profiles`
3. **索引命名**: 使用描述性的索引名，如 `by_user_email`
4. **文档**: 为每个模块添加注释说明
5. **测试**: 为每个模块创建相应的测试文件 