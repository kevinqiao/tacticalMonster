# TaskCondition 的 targetValue 和 TaskStage 的 targetValue 关系详解

## 概述

在任务系统中，`TaskCondition` 和 `TaskStage` 都有 `targetValue` 字段，但它们在不同的上下文中使用，具有不同的含义和作用。本文将详细分析它们的关系和区别。

## 1. 数据结构定义

### **TaskCondition 的 targetValue**
```typescript
export interface TaskCondition {
    type: "simple" | "multi_stage" | "conditional" | "time_based";
    action: string; // "login", "complete_match", "win_match", "use_prop", etc.
    targetValue: number; // 任务完成的总目标值
    gameType?: string;
    consecutive?: boolean; // 连续完成
    withinDays?: number; // 在指定天数内完成
    subConditions?: TaskCondition[]; // 用于条件组合
    logic?: "and" | "or"; // 条件组合逻辑
    stages?: TaskStage[]; // 多阶段任务
}
```

### **TaskStage 的 targetValue**
```typescript
export interface TaskStage {
    action: string; // 阶段触发动作
    targetValue: number; // 该阶段需要完成的目标值
    reward: Partial<TaskRewards>; // 阶段性奖励
    gameType?: string; // 可选：特定游戏类型
}
```

## 2. 使用场景和关系

### **2.1 简单任务 (type: "simple")**
```json
{
    "templateId": "daily_login",
    "condition": {
        "type": "simple",
        "action": "login",
        "targetValue": 1  // TaskCondition.targetValue
    }
}
```
**关系**：只有 `TaskCondition.targetValue`，没有 `TaskStage.targetValue`

### **2.2 多阶段任务 (type: "multi_stage")**
```json
{
    "templateId": "multi_stage_tournament_champion",
    "condition": {
        "type": "multi_stage",
        "stages": [
            {
                "action": "tournament_join",
                "targetValue": 1,  // TaskStage.targetValue
                "reward": { "coins": 50, "seasonPoints": 10 }
            },
            {
                "action": "win_match", 
                "targetValue": 3,  // TaskStage.targetValue
                "reward": { "coins": 100, "seasonPoints": 20 }
            },
            {
                "action": "complete_match",
                "targetValue": 5,  // TaskStage.targetValue
                "reward": { "coins": 200, "seasonPoints": 50 }
            }
        ]
    }
}
```
**关系**：只有 `TaskStage.targetValue`，`TaskCondition.targetValue` 在多阶段任务中**不使用**

### **2.3 条件组合任务 (type: "conditional")**
```json
{
    "templateId": "conditional_social_achiever",
    "condition": {
        "type": "conditional",
        "logic": "or",
        "subConditions": [
            {
                "action": "invite_friend",
                "targetValue": 3  // 子条件的 targetValue
            },
            {
                "action": "share_game",
                "targetValue": 5  // 子条件的 targetValue
            },
            {
                "action": "join_clan",
                "targetValue": 1  // 子条件的 targetValue
            }
        ]
    }
}
```
**关系**：使用子条件的 `targetValue`，主 `TaskCondition.targetValue` **不使用**

## 3. 完成检查逻辑

### **3.1 简单任务完成检查**
```typescript
case "simple":
    return newProgress.currentValue >= condition.targetValue; // TaskCondition.targetValue
```

### **3.2 多阶段任务完成检查**
```typescript
private static checkMultiStageCompletion(condition: TaskCondition, progress: TaskProgress): boolean {
    if (!condition.stages || !progress.stageProgress) {
        return false;
    }

    // 检查所有阶段的进度是否都达到目标值
    return progress.stageProgress.every((stageProgress, index) =>
        stageProgress >= condition.stages![index].targetValue // TaskStage.targetValue
    );
}
```

### **3.3 条件组合任务完成检查**
```typescript
private static checkConditionalCompletion(condition: TaskCondition, progress: TaskProgress): boolean {
    if (!condition.subConditions || !progress.subProgress) {
        return false;
    }

    if (condition.logic === "or") {
        return condition.subConditions.some((subCondition, index) => {
            const key = `sub_${index}`;
            return (progress.subProgress![key] || 0) >= subCondition.targetValue; // 子条件的 targetValue
        });
    } else {
        // AND 逻辑
        return condition.subConditions.every((subCondition, index) => {
            const key = `sub_${index}`;
            return (progress.subProgress![key] || 0) >= subCondition.targetValue; // 子条件的 targetValue
        });
    }
}
```

## 4. 进度更新逻辑

### **4.1 简单任务进度更新**
```typescript
private static updateSimpleProgress(progress: TaskProgress, actionData: any): TaskProgress {
    return {
        ...progress,
        currentValue: progress.currentValue + this.calculateIncrement(actionData)
    };
}
```

### **4.2 多阶段任务进度更新**
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

## 5. 关系总结

### **5.1 互斥关系**
```typescript
const taskTypeToTargetValueUsage = {
    "simple": "只使用 TaskCondition.targetValue",
    "multi_stage": "只使用 TaskStage.targetValue",
    "conditional": "只使用子条件的 targetValue",
    "time_based": "只使用 TaskCondition.targetValue"
};
```

### **5.2 使用规则**
| 任务类型 | TaskCondition.targetValue | TaskStage.targetValue | 子条件 targetValue |
|----------|-------------------------|----------------------|-------------------|
| simple | ✅ 使用 | ❌ 不使用 | ❌ 不使用 |
| multi_stage | ❌ 不使用 | ✅ 使用 | ❌ 不使用 |
| conditional | ❌ 不使用 | ❌ 不使用 | ✅ 使用 |
| time_based | ✅ 使用 | ❌ 不使用 | ❌ 不使用 |

### **5.3 设计原理**
```typescript
const designPrinciple = {
    "单一职责": "每种任务类型只使用一种 targetValue",
    "避免冲突": "不同任务类型使用不同的 targetValue 来源",
    "清晰语义": "targetValue 的含义根据任务类型确定"
};
```

## 6. 实际示例对比

### **6.1 简单任务示例**
```json
{
    "templateId": "daily_win_3_matches",
    "condition": {
        "type": "simple",
        "action": "win_match",
        "targetValue": 3  // 需要获胜3局
    }
}
```
**完成条件**：`currentValue >= 3`

### **6.2 多阶段任务示例**
```json
{
    "templateId": "multi_stage_tournament_champion",
    "condition": {
        "type": "multi_stage",
        "stages": [
            {
                "action": "tournament_join",
                "targetValue": 1  // 阶段1：参加1次锦标赛
            },
            {
                "action": "win_match",
                "targetValue": 3  // 阶段2：获胜3局
            },
            {
                "action": "complete_match",
                "targetValue": 5  // 阶段3：完成5局
            }
        ]
    }
}
```
**完成条件**：`stageProgress[0] >= 1 && stageProgress[1] >= 3 && stageProgress[2] >= 5`

### **6.3 条件组合任务示例**
```json
{
    "templateId": "conditional_social_achiever",
    "condition": {
        "type": "conditional",
        "logic": "or",
        "subConditions": [
            {
                "action": "invite_friend",
                "targetValue": 3  // 邀请3个朋友
            },
            {
                "action": "share_game",
                "targetValue": 5  // 分享5次游戏
            },
            {
                "action": "join_clan",
                "targetValue": 1  // 加入1个公会
            }
        ]
    }
}
```
**完成条件**：`subProgress["sub_0"] >= 3 || subProgress["sub_1"] >= 5 || subProgress["sub_2"] >= 1`

## 7. 最佳实践

### **7.1 命名建议**
```typescript
// 建议在代码中使用更明确的命名
const targetValueUsage = {
    "simple": "condition.targetValue",
    "multi_stage": "stage.targetValue", 
    "conditional": "subCondition.targetValue",
    "time_based": "condition.targetValue"
};
```

### **7.2 验证规则**
```typescript
// 验证任务配置的 targetValue 使用是否正确
function validateTaskCondition(condition: TaskCondition): boolean {
    switch (condition.type) {
        case "simple":
        case "time_based":
            return condition.targetValue > 0;
        case "multi_stage":
            return condition.stages?.every(stage => stage.targetValue > 0) ?? false;
        case "conditional":
            return condition.subConditions?.every(sub => sub.targetValue > 0) ?? false;
        default:
            return false;
    }
}
```

### **7.3 文档建议**
```typescript
// 在任务模板中明确标注 targetValue 的含义
const taskTemplateExample = {
    "simple": "condition.targetValue 表示任务完成的总目标",
    "multi_stage": "每个 stage.targetValue 表示该阶段的完成目标",
    "conditional": "每个 subCondition.targetValue 表示子条件的完成目标"
};
```

## 8. 总结

### **8.1 核心关系**
- **互斥使用**：不同任务类型使用不同的 targetValue 来源
- **语义明确**：每种任务类型的 targetValue 含义清晰
- **避免冲突**：设计上避免了 targetValue 的歧义

### **8.2 关键要点**
1. **TaskCondition.targetValue** 用于简单任务和时间相关任务
2. **TaskStage.targetValue** 用于多阶段任务的每个阶段
3. **子条件 targetValue** 用于条件组合任务的每个子条件
4. **不同任务类型使用不同的 targetValue 来源**

### **8.3 设计优势**
- ✅ **类型安全**：每种任务类型有明确的 targetValue 使用规则
- ✅ **语义清晰**：targetValue 的含义根据任务类型确定
- ✅ **扩展性好**：新增任务类型可以定义新的 targetValue 使用方式
- ✅ **避免歧义**：不同任务类型使用不同的 targetValue 来源

这种设计确保了任务系统中 targetValue 的使用是类型安全和语义明确的，避免了不同任务类型之间的混淆。 