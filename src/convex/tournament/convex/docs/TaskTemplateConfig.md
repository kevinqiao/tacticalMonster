# 任务模板配置使用指南

## 概述

本文档介绍如何使用 TypeScript 格式的任务模板配置文件 `taskTemplate.ts`，以及相关的工具函数和初始化脚本。

## 文件结构

```
develop/src/convex/tournament/convex/
├── data/
│   ├── taskTemplates.json          # JSON 格式的原始配置
│   └── taskTemplate.ts             # TypeScript 格式的配置
├── scripts/
│   └── initTaskTemplates.ts        # 初始化脚本
└── docs/
    └── TaskTemplateConfig.md       # 本文档
```

## 主要特性

### 1. 类型安全
- 使用 TypeScript 接口确保类型安全
- 编译时检查配置错误
- IDE 自动补全和错误提示

### 2. 模块化设计
- 分离配置数据和业务逻辑
- 易于维护和扩展
- 支持版本控制

### 3. 工具函数
- 提供多种查询和过滤函数
- 配置验证功能
- 统计信息生成

## 配置内容

### 任务模板类型

1. **每日任务 (daily)**
   - `daily_login`: 每日登录
   - `daily_win_3_matches`: 连胜三局
   - `daily_tournament_participant`: 锦标赛参与者

2. **每周任务 (weekly)**
   - `weekly_solitaire_master`: Solitaire大师
   - `weekly_prop_collector`: 道具收集者

3. **一次性任务 (one_time)**
   - `consecutive_login_7`: 连续登录7天
   - `achievement_unlocker`: 成就解锁者

4. **多阶段任务 (multi_stage)**
   - `multi_stage_tournament_champion`: 锦标赛冠军之路

5. **条件组合任务 (conditional)**
   - `conditional_social_achiever`: 社交达人

6. **赛季任务 (season)**
   - `season_gold_promotion`: 黄金段位晋升

7. **时间相关任务 (time_based)**
   - `time_based_weekly_challenge`: 一周挑战

### 任务分类

- **gameplay**: 游戏玩法相关
- **social**: 社交互动相关
- **collection**: 收集收集相关
- **challenge**: 挑战成就相关
- **tournament**: 锦标赛相关

## 使用方法

### 1. 导入配置

```typescript
import { TASK_TEMPLATES, getTaskTemplateById } from "../data/taskTemplate";

// 获取所有任务模板
const allTemplates = TASK_TEMPLATES;

// 根据ID获取特定模板
const loginTemplate = getTaskTemplateById("daily_login");
```

### 2. 使用工具函数

```typescript
import { 
    getTaskTemplatesByType,
    getTaskTemplatesByCategory,
    getTaskTemplatesByGameType,
    getActiveTaskTemplates,
    validateTaskTemplates
} from "../data/taskTemplate";

// 获取所有每日任务
const dailyTasks = getTaskTemplatesByType("daily");

// 获取所有游戏玩法任务
const gameplayTasks = getTaskTemplatesByCategory("gameplay");

// 获取所有Ludo游戏任务
const ludoTasks = getTaskTemplatesByGameType("ludo");

// 获取所有活跃任务
const activeTasks = getActiveTaskTemplates();

// 验证配置
const validation = validateTaskTemplates();
if (!validation.valid) {
    console.error("配置错误:", validation.errors);
}
```

### 3. 初始化到数据库

```typescript
// 在 Convex 函数中使用
import { initTaskTemplates } from "../scripts/initTaskTemplates";

// 调用初始化
const result = await initTaskTemplates(ctx, {});
if (result.success) {
    console.log(`初始化了 ${result.insertedCount} 个任务模板`);
}
```

## 配置示例

### 简单任务配置

```typescript
{
    templateId: "daily_login",
    name: "每日登录",
    description: "每日登录游戏即可获得奖励",
    type: "daily",
    category: "gameplay",
    condition: {
        type: "simple",
        action: "login",
        targetValue: 1
    },
    rewards: {
        coins: 50,
        props: [],
        tickets: [],
        seasonPoints: 10,
        gamePoints: {
            general: 20
        }
    },
    resetInterval: "daily",
    isActive: true,
    version: "1.0.0",
    lastUpdated: "2024-01-01T00:00:00.000Z"
}
```

### 多阶段任务配置

```typescript
{
    templateId: "multi_stage_tournament_champion",
    name: "锦标赛冠军之路",
    description: "完成多阶段锦标赛挑战",
    type: "multi_stage",
    category: "tournament",
    condition: {
        type: "multi_stage",
        stages: [
            {
                action: "tournament_join",
                targetValue: 1,
                reward: {
                    coins: 50,
                    seasonPoints: 10
                }
            },
            {
                action: "win_match",
                targetValue: 3,
                reward: {
                    coins: 100,
                    seasonPoints: 20
                }
            }
        ]
    },
    rewards: {
        coins: 500,
        props: [...],
        tickets: [...],
        seasonPoints: 150,
        gamePoints: {
            general: 300
        }
    },
    isActive: true,
    version: "1.0.0",
    lastUpdated: "2024-01-01T00:00:00.000Z"
}
```

## 验证规则

### 必需字段检查
- `templateId`: 模板唯一标识符
- `name`: 任务名称
- `description`: 任务描述
- `type`: 任务类型
- `category`: 任务分类
- `condition`: 任务条件
- `rewards`: 任务奖励

### 条件配置检查
- `condition.type`: 条件类型
- `condition.action`: 触发动作
- `condition.targetValue`: 目标值

### 奖励配置检查
- `rewards.coins`: 金币奖励
- `rewards.seasonPoints`: 赛季点奖励
- `rewards.gamePoints`: 游戏积分奖励

## 最佳实践

### 1. 命名规范
- 使用下划线分隔的命名方式
- 包含任务类型和主要功能
- 保持命名的一致性和可读性

### 2. 版本管理
- 为每个模板添加版本号
- 记录最后更新时间
- 支持配置的向后兼容

### 3. 分类管理
- 合理使用任务分类
- 便于管理和查询
- 支持按分类筛选

### 4. 奖励平衡
- 根据任务难度设置合理奖励
- 考虑不同奖励类型的价值
- 保持游戏经济的平衡

## 故障排除

### 常见问题

1. **类型错误**
   - 检查 TypeScript 编译错误
   - 确保所有必需字段都已定义
   - 验证字段类型是否正确

2. **配置验证失败**
   - 运行 `validateTaskTemplates()` 检查错误
   - 修复缺失或错误的字段
   - 确保条件配置正确

3. **初始化失败**
   - 检查数据库连接
   - 验证表结构是否正确
   - 确保有足够的权限

### 调试技巧

1. **使用工具函数**
   ```typescript
   // 检查特定模板
   const template = getTaskTemplateById("daily_login");
   console.log("模板配置:", template);
   
   // 验证配置
   const validation = validateTaskTemplates();
   console.log("验证结果:", validation);
   ```

2. **检查数据库状态**
   ```typescript
   // 获取统计信息
   const stats = await getTaskTemplateStats(ctx, {});
   console.log("数据库状态:", stats);
   ```

## 总结

TypeScript 格式的任务模板配置提供了类型安全、易于维护和扩展的解决方案。通过使用提供的工具函数和初始化脚本，可以轻松管理任务模板的配置和部署。 