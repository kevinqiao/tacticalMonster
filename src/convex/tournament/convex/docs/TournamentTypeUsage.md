# 锦标赛类型字段使用指南

## 概述

我们已经在 `tournament_types` 表中添加了两个新字段：
- `timeRange`: 时间范围 ("daily", "weekly", "seasonal", "total")
- `independent`: 是否独立锦标赛 (boolean)

这些字段替代了之前基于 `typeId` 的硬编码逻辑，提供了更灵活的配置方式。

## 数据库结构

### tournament_types 表

```sql
{
  "typeId": "daily_quick_match",
  "name": "每日快速比赛",
  "timeRange": "daily",           // 新增字段
  "independent": false,           // 新增字段
  "gameType": "ludo",
  "category": "daily",
  "isActive": true,
  // ... 其他字段
}
```

## 工具函数

### getTimeRangeFromTournamentType

从数据库获取锦标赛的时间范围。

```typescript
import { getTimeRangeFromTournamentType } from "./utils/tournamentTypeUtils";

const timeRange = await getTimeRangeFromTournamentType(ctx, "daily_quick_match");
// 返回: "daily" | "weekly" | "seasonal" | "total"
```

### getIndependentFromTournamentType

从数据库获取锦标赛的独立状态。

```typescript
import { getIndependentFromTournamentType } from "./utils/tournamentTypeUtils";

const independent = await getIndependentFromTournamentType(ctx, "daily_quick_match");
// 返回: boolean
```

## 使用场景

### 1. 获取玩家尝试次数

```typescript
// 在 getPlayerAttempts 方法中
const timeRange = await getTimeRangeFromTournamentType(ctx, tournamentType);
let startTime: string;

switch (timeRange) {
    case "daily":
        // 计算今日开始时间
        break;
    case "weekly":
        // 计算本周开始时间
        break;
    case "seasonal":
        // 计算赛季开始时间
        break;
    default:
        // 使用总时间范围
        break;
}
```

### 2. 检查参赛资格

```typescript
// 在 checkTournamentEligibility 方法中
const timeRange = await getTimeRangeFromTournamentType(ctx, tournamentType.typeId);
const attempts = await getPlayerAttempts(ctx, {
    uid,
    tournamentType: tournamentType.typeId,
    gameType: tournamentType.gameType
});

// 根据时间范围检查限制
const maxAttempts = matchRules?.maxAttempts;
if (maxAttempts && attempts >= maxAttempts) {
    const timeRangeText = timeRange === 'daily' ? '今日' :
        timeRange === 'weekly' ? '本周' :
        timeRange === 'seasonal' ? '本赛季' : '';
    reasons.push(`已达${timeRangeText}最大尝试次数 (${attempts}/${maxAttempts})`);
}
```

### 3. 构建参与统计

```typescript
// 在 buildParticipationStats 方法中
private static buildParticipationStats(attempts: number, timeRange: string) {
    switch (timeRange) {
        case "daily":
            return {
                dailyAttempts: attempts,
                weeklyAttempts: 0,
                totalAttempts: 0,
                lastParticipation: null
            };
        case "weekly":
            return {
                dailyAttempts: 0,
                weeklyAttempts: attempts,
                totalAttempts: 0,
                lastParticipation: null
            };
        case "seasonal":
            return {
                dailyAttempts: 0,
                weeklyAttempts: 0,
                totalAttempts: attempts,
                lastParticipation: null
            };
        default:
            return {
                dailyAttempts: 0,
                weeklyAttempts: 0,
                totalAttempts: attempts,
                lastParticipation: null
            };
    }
}
```

## 示例数据

### 每日锦标赛

```json
{
  "typeId": "daily_quick_match",
  "name": "每日快速比赛",
  "timeRange": "daily",
  "independent": false,
  "gameType": "ludo",
  "category": "daily"
}
```

### 每周锦标赛

```json
{
  "typeId": "weekly_championship",
  "name": "每周锦标赛",
  "timeRange": "weekly",
  "independent": false,
  "gameType": "solitaire",
  "category": "weekly"
}
```

### 赛季锦标赛

```json
{
  "typeId": "seasonal_grand_prix",
  "name": "赛季大奖赛",
  "timeRange": "seasonal",
  "independent": true,
  "gameType": "kumu",
  "category": "seasonal"
}
```

### 独立锦标赛

```json
{
  "typeId": "special_invitational",
  "name": "特别邀请赛",
  "timeRange": "total",
  "independent": true,
  "gameType": "ludo",
  "category": "special"
}
```

## 错误处理

### 锦标赛类型不存在

当查询不存在的锦标赛类型时，函数会抛出错误：

```typescript
try {
    const timeRange = await getTimeRangeFromTournamentType(ctx, "non_existent_type");
} catch (error) {
    console.error("锦标赛类型不存在:", error.message);
    // 处理错误
}
```

### 默认值

当字段不存在时，会使用默认值：
- `timeRange`: 默认为 "total"
- `independent`: 默认为 false

## 性能优化

1. **索引优化**: 确保 `tournament_types` 表有 `by_typeId` 索引
2. **缓存考虑**: 对于频繁访问的锦标赛类型，可以考虑缓存配置
3. **批量查询**: 当需要查询多个锦标赛类型时，考虑批量查询

## 测试

运行测试以验证功能：

```bash
npm test tournamentTypeUtils.test.ts
```

## 注意事项

1. **数据一致性**: 确保所有锦标赛类型都有正确的 `timeRange` 和 `independent` 字段
2. **向后兼容**: 新代码已经移除了对旧 `getTimeRangeForTournament` 方法的依赖
3. **错误处理**: 所有调用都应该包含适当的错误处理
4. **性能监控**: 监控数据库查询性能，确保索引正常工作 