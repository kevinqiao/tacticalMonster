# 任务配置中 Stages 的 TargetValue 详细说明

## 概述

在任务系统中，`stages` 是多阶段任务的核心配置，每个阶段都有一个 `targetValue` 字段，用于定义该阶段的完成条件。本文将详细说明 `targetValue` 的设计理念、使用方式和实现逻辑。

## 1. 数据结构定义

### **TaskStage 接口**
```typescript
export interface TaskStage {
    action: string;           // 触发动作，如 "login", "win_match", "tournament_join"
    targetValue: number;      // 目标值，该阶段需要达到的数量
    reward: Partial<TaskRewards>; // 阶段性奖励
    gameType?: string;        // 可选：特定游戏类型
}
```

### **TaskProgress 中的 stageProgress**
```typescript
export interface TaskProgress {
    currentValue: number;
    stageProgress?: number[]; // 多阶段进度数组，每个元素对应一个阶段的当前进度
    // ... 其他字段
}
```

## 2. TargetValue 的含义

### **2.1 基本概念**
- `targetValue` 表示**该阶段需要完成的目标数量**
- 每个阶段都有独立的进度跟踪
- 阶段按顺序完成，只有当前阶段完成后才能进入下一阶段

### **2.2 实际示例**
```json
{
    "templateId": "multi_stage_tournament_champion",
    "name": "锦标赛冠军之路",
    "condition": {
        "type": "multi_stage",
        "stages": [
            {
                "action": "tournament_join",
                "targetValue": 1,    // 阶段1：参加1次锦标赛
                "reward": { "coins": 50, "seasonPoints": 10 }
            },
            {
                "action": "win_match", 
                "targetValue": 3,     // 阶段2：获胜3局比赛
                "reward": { "coins": 100, "seasonPoints": 20 }
            },
            {
                "action": "complete_match",
                "targetValue": 5,     // 阶段3：完成5局比赛
                "reward": { "coins": 200, "seasonPoints": 50 }
            }
        ]
    }
}
```

## 3. 进度更新逻辑

### **3.1 当前阶段确定**
```typescript
private static updateMultiStageProgress(progress: TaskProgress, condition: TaskCondition, action: string, actionData: any): TaskProgress {
    if (!condition.stages || !progress.stageProgress) {
        return progress;
    }

    // 找到当前未完成的阶段
    const currentStage = progress.stageProgress.findIndex(p => p < condition.stages![0].targetValue);
    if (currentStage === -1) {
        return progress; // 所有阶段都已完成
    }

    const stage = condition.stages![currentStage];
    if (stage.action === action) {
        // 更新当前阶段的进度
        const newStageProgress = [...progress.stageProgress];
        newStageProgress[currentStage] += this.calculateIncrement(actionData);

        return {
            ...progress,
            stageProgress: newStageProgress
        };
    }

    return progress;
}
```

### **3.2 进度计算逻辑**
```typescript
private static calculateIncrement(actionData: any): number {
    if (typeof actionData === 'number') {
        return actionData;
    }
    if (actionData && typeof actionData === 'object') {
        return actionData.increment || actionData.count || 1;
    }
    return 1; // 默认增加1
}
```

## 4. 完成检查逻辑

### **4.1 多阶段完成检查**
```typescript
private static checkMultiStageCompletion(condition: TaskCondition, progress: TaskProgress): boolean {
    if (!condition.stages || !progress.stageProgress) {
        return false;
    }

    // 检查所有阶段的进度是否都达到目标值
    return progress.stageProgress.every((stageProgress, index) =>
        stageProgress >= condition.stages![index].targetValue
    );
}
```

### **4.2 阶段性奖励发放**
```typescript
// 当某个阶段完成时，可以发放阶段性奖励
// 这需要在任务事件处理中实现
```

## 5. 使用场景和示例

### **5.1 锦标赛挑战任务**
```json
{
    "stages": [
        {
            "action": "tournament_join",
            "targetValue": 1,        // 参加1次锦标赛
            "reward": { "coins": 50 }
        },
        {
            "action": "win_match", 
            "targetValue": 3,        // 在锦标赛中获胜3局
            "reward": { "coins": 100 }
        },
        {
            "action": "complete_match",
            "targetValue": 5,        // 完成5局比赛
            "reward": { "coins": 200 }
        }
    ]
}
```

### **5.2 新手引导任务**
```json
{
    "stages": [
        {
            "action": "login",
            "targetValue": 1,        // 首次登录
            "reward": { "coins": 100 }
        },
        {
            "action": "complete_match",
            "targetValue": 1,        // 完成第一局游戏
            "reward": { "coins": 200 }
        },
        {
            "action": "win_match",
            "targetValue": 1,        // 获得第一次胜利
            "reward": { "coins": 300 }
        },
        {
            "action": "use_prop",
            "targetValue": 1,        // 使用第一个道具
            "reward": { "coins": 400 }
        }
    ]
}
```

### **5.3 成就解锁任务**
```json
{
    "stages": [
        {
            "action": "complete_match",
            "targetValue": 10,       // 完成10局游戏
            "reward": { "seasonPoints": 50 }
        },
        {
            "action": "win_match",
            "targetValue": 5,        // 获胜5局
            "reward": { "seasonPoints": 100 }
        },
        {
            "action": "tournament_join",
            "targetValue": 3,        // 参加3次锦标赛
            "reward": { "seasonPoints": 200 }
        }
    ]
}
```

## 6. 进度状态示例

### **6.1 初始状态**
```typescript
const initialProgress: TaskProgress = {
    currentValue: 0,
    stageProgress: [0, 0, 0], // 3个阶段，初始进度都是0
    // ... 其他字段
};
```

### **6.2 阶段1完成**
```typescript
const stage1Completed: TaskProgress = {
    currentValue: 0,
    stageProgress: [1, 0, 0], // 阶段1完成，阶段2、3未开始
    // ... 其他字段
};
```

### **6.3 阶段2进行中**
```typescript
const stage2InProgress: TaskProgress = {
    currentValue: 0,
    stageProgress: [1, 2, 0], // 阶段1完成，阶段2进行中(2/3)，阶段3未开始
    // ... 其他字段
};
```

### **6.4 全部完成**
```typescript
const allCompleted: TaskProgress = {
    currentValue: 0,
    stageProgress: [1, 3, 5], // 所有阶段都完成
    // ... 其他字段
};
```

## 7. 设计考虑

### **7.1 顺序性**
- 阶段必须按顺序完成
- 只有当前阶段完成后，下一阶段才会开始
- 已完成阶段的进度不会重置

### **7.2 独立性**
- 每个阶段有独立的 `targetValue`
- 每个阶段有独立的阶段性奖励
- 阶段之间的进度互不影响

### **7.3 灵活性**
- `targetValue` 可以是任意正整数
- 支持不同的 `action` 类型
- 可以设置阶段性奖励

### **7.4 可扩展性**
- 可以添加任意数量的阶段
- 每个阶段可以有不同的游戏类型限制
- 支持复杂的奖励组合

## 8. 最佳实践

### **8.1 TargetValue 设置建议**
```typescript
const targetValueGuidelines = {
    "新手引导": "1-3",           // 简单易完成
    "日常任务": "3-10",          // 适中的挑战
    "周常任务": "10-50",         // 需要一定时间投入
    "成就任务": "50-100",        // 长期目标
    "特殊活动": "根据活动设计"    // 灵活设置
};
```

### **8.2 阶段设计原则**
```typescript
const stageDesignPrinciples = {
    "渐进性": "每个阶段的难度逐步增加",
    "多样性": "不同阶段使用不同的action",
    "奖励性": "每个阶段都有相应的奖励",
    "可完成性": "确保玩家能够完成所有阶段"
};
```

### **8.3 错误处理**
```typescript
// 确保 stageProgress 数组长度与 stages 数组长度一致
if (progress.stageProgress && progress.stageProgress.length !== condition.stages.length) {
    console.error("阶段进度数组长度不匹配");
    return progress;
}
```

## 9. 总结

`targetValue` 是多阶段任务系统的核心配置，它定义了每个阶段的完成条件。通过合理设计 `targetValue`，可以创建有趣且具有挑战性的多阶段任务，为玩家提供丰富的游戏体验和奖励机制。

关键要点：
1. **`targetValue` 表示该阶段需要完成的目标数量**
2. **阶段按顺序完成，只有当前阶段完成后才能进入下一阶段**
3. **每个阶段有独立的进度跟踪和阶段性奖励**
4. **设计时需要考虑玩家的完成能力和游戏体验** 