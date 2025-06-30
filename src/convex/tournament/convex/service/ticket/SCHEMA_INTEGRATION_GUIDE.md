# 任务系统Schema融合指南

## 概述

本指南说明如何将任务系统的数据库模式（taskSchema）融合到主schema文件（convex/schema.ts）中。

## 融合步骤

### 1. 分析现有Schema结构

首先分析了现有的 `convex/schema.ts` 文件，发现已经包含了一些任务相关的表：
- `task_templates` - 任务模板表
- `task_events` - 任务事件表
- `player_tasks` - 玩家任务表

### 2. 添加新的任务系统表

在现有schema的基础上，添加了以下新的任务系统表：

#### 核心任务表
- `tasks` - 任务主表
- `task_completions` - 任务完成记录表
- `task_rewards` - 任务奖励记录表
- `task_progress_logs` - 任务进度记录表

#### 任务管理表
- `task_statistics` - 任务统计表
- `task_recommendations` - 任务推荐表
- `task_chains` - 任务链表
- `task_chain_progress` - 任务链进度表
- `task_configurations` - 任务配置表
- `task_logs` - 任务日志表

#### 门票系统表
- `tickets` - 门票表
- `ticket_usage_logs` - 门票使用记录表
- `ticket_templates` - 门票模板表
- `ticket_bundles` - 门票包表
- `ticket_bundle_purchases` - 门票包购买记录表
- `ticket_usage_stats` - 门票使用统计表
- `ticket_recommendations` - 门票推荐表

### 3. 处理重复表名

发现并解决了重复表名的问题：
- 删除了重复的 `task_templates` 表定义（保留原有的）
- 删除了重复的 `task_events` 表定义（保留原有的）

### 4. 创建常量文件

创建了独立的常量文件 `taskConstants.ts`，包含：
- 任务类型常量（TASK_TYPES）
- 任务分类常量（TASK_CATEGORIES）
- 任务状态常量（TASK_STATUS）
- 任务事件类型常量（TASK_EVENT_TYPES）
- 任务配置键常量（TASK_CONFIG_KEYS）
- 默认任务配置（DEFAULT_TASK_CONFIGS）
- 任务要求类型（REQUIREMENT_TYPES）
- 奖励类型（REWARD_TYPES）
- 任务优先级（TASK_PRIORITIES）
- 任务难度（TASK_DIFFICULTIES）
- 任务标签（TASK_TAGS）
- 任务模板（TASK_TEMPLATES）
- 门票类型常量（TICKET_TYPES）
- 门票分类常量（TICKET_CATEGORIES）
- 门票状态常量（TICKET_STATUS）

### 5. 删除独立Schema文件

删除了原来的 `taskSchema.ts` 文件，因为其内容已经融合到主schema文件中。

## 文件结构

融合后的文件结构：

```
develop/src/convex/tournament/convex/
├── schema.ts                    # 主schema文件（包含所有表定义）
└── service/ticket/
    ├── taskConstants.ts         # 任务系统常量定义
    ├── taskIntegration.ts       # 任务系统集成逻辑
    ├── taskExamples.ts          # 任务示例和模板
    ├── testTaskIntegration.ts   # 任务系统测试
    ├── integrationExample.ts    # 集成示例
    └── README_TaskIntegration.md # 任务系统设计文档
```

## 主要变更

### 1. Schema文件变更
- 在 `convex/schema.ts` 中添加了任务系统和门票系统的所有表定义
- 保持了与现有表的兼容性
- 使用了具体的类型定义而不是 `v.any()`

### 2. 常量管理
- 将常量定义从schema文件中分离出来
- 创建了独立的 `taskConstants.ts` 文件
- 便于维护和重用

### 3. 类型安全
- 避免了使用 `@ts-nocheck`
- 使用具体的对象类型定义
- 提供了更好的类型安全性

## 使用方式

### 1. 导入常量
```typescript
import { 
    TASK_TYPES, 
    TASK_CATEGORIES, 
    TASK_EVENT_TYPES,
    REQUIREMENT_TYPES,
    REWARD_TYPES 
} from "./taskConstants";
```

### 2. 使用任务系统
```typescript
import { TaskTicketIntegration } from "./taskIntegration";

// 创建任务
const result = await TaskTicketIntegration.createTicketTask({
    ctx,
    taskId: "my_task",
    taskName: "我的任务",
    taskDescription: "任务描述",
    taskType: TASK_TYPES.TICKET_USAGE,
    requirements: {
        type: REQUIREMENT_TYPES.TICKET_USAGE,
        count: 1
    },
    rewards: {
        tickets: [{ type: "normal", count: 1 }],
        points: 50
    }
});
```

### 3. 检查任务进度
```typescript
const progress = await TaskTicketIntegration.checkTaskProgress({
    ctx,
    uid: "user123",
    gameType: "ludo",
    taskId: "my_task"
});
```

## 优势

### 1. 统一管理
- 所有数据库表定义都在一个文件中
- 便于查看和维护
- 避免重复定义

### 2. 类型安全
- 使用具体的类型定义
- 避免TypeScript深度类型推断问题
- 提供更好的开发体验

### 3. 模块化设计
- 常量定义独立管理
- 功能模块分离
- 便于测试和维护

### 4. 向后兼容
- 保持与现有系统的兼容性
- 不影响现有功能
- 平滑升级

## 注意事项

1. **表名冲突**：在添加新表时要注意避免与现有表名冲突
2. **索引设计**：为每个表添加合适的索引以提高查询性能
3. **类型定义**：使用具体的对象类型而不是 `v.any()`
4. **常量管理**：将常量定义放在独立的文件中便于维护
5. **测试验证**：确保融合后的系统功能正常

## 总结

通过将任务系统的schema融合到主schema文件中，我们实现了：
- 统一的数据库模式管理
- 更好的类型安全性
- 模块化的常量管理
- 向后兼容的系统升级

这种融合方式为后续的功能扩展和维护提供了良好的基础。 