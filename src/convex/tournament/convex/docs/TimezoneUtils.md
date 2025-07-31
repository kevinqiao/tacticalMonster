# 时区工具函数使用指南

## 📋 概述

本项目提供了完整的时区工具函数，支持获取特定时区的0点时间、当前时间、日期范围等功能。

## 🚀 快速开始

### 基本用法

```typescript
import { 
  getMidnightInTimezone, 
  getTorontoMidnight, 
  getBeijingMidnight,
  TimezoneUtils,
  TIMEZONES 
} from "../service/simpleTimezoneUtils";

// 获取多伦多时区的0点时间
const torontoMidnight = getTorontoMidnight();
console.log(torontoMidnight.iso); // 2025-01-27T05:00:00.000Z

// 获取北京时区的0点时间
const beijingMidnight = getBeijingMidnight();
console.log(beijingMidnight.iso); // 2025-01-26T16:00:00.000Z

// 获取任意时区的0点时间
const tokyoMidnight = getMidnightInTimezone('Asia/Tokyo');
console.log(tokyoMidnight.iso);
```

## 📚 API 参考

### 核心函数

#### `getMidnightInTimezone(timezone, date?)`

获取指定时区的0点时间。

**参数：**
- `timezone` (string): 时区字符串，如 "America/Toronto"
- `date` (Date, 可选): 指定日期，默认为当前日期

**返回值：**
```typescript
{
  iso: string;           // ISO格式的时间字符串
  localDate: Date;       // 本地Date对象
  timezone: string;      // 时区字符串
  dateString: string;    // 日期字符串 (YYYY-MM-DD)
}
```

**示例：**
```typescript
const result = getMidnightInTimezone('America/Toronto');
console.log(result.iso);        // 2025-01-27T05:00:00.000Z
console.log(result.dateString); // 2025-01-27
```

#### `getCurrentTimeInTimezone(timezone)`

获取指定时区的当前时间。

**参数：**
- `timezone` (string): 时区字符串

**返回值：**
```typescript
{
  iso: string;           // ISO格式的时间字符串
  localDate: Date;       // 本地Date对象
  timezone: string;      // 时区字符串
  dateString: string;    // 日期字符串
  timeString: string;    // 时间字符串 (HH:MM:SS)
}
```

#### `getDayRangeInTimezone(timezone, date?)`

获取指定时区的日期范围（从0点到23:59:59）。

**返回值：**
```typescript
{
  start: { iso: string, localDate: Date, timezone: string, dateString: string },
  end: { iso: string, localDate: Date, timezone: string, dateString: string }
}
```

### 便捷函数

#### 特定时区的0点时间

```typescript
// 多伦多时区
const toronto = getTorontoMidnight();

// 北京时区
const beijing = getBeijingMidnight();

// UTC时区
const utc = getUTCMidnight();
```

#### 使用 TimezoneUtils 对象

```typescript
// 获取多伦多当前时间
const torontoNow = TimezoneUtils.getToronto();

// 获取多伦多0点时间
const torontoMidnight = TimezoneUtils.getTorontoMidnight();

// 获取北京当前时间
const beijingNow = TimezoneUtils.getBeijing();

// 获取北京0点时间
const beijingMidnight = TimezoneUtils.getBeijingMidnight();
```

### 周期时间函数

#### `getWeekStartInTimezone(timezone, date?)`

获取指定时区的周开始时间（周一0点）。

#### `getMonthStartInTimezone(timezone, date?)`

获取指定时区的月开始时间（1号0点）。

#### `getYearStartInTimezone(timezone, date?)`

获取指定时区的年开始时间（1月1日0点）。

### 工具函数

#### `isTodayInTimezone(time, timezone)`

检查指定时间是否在指定时区的今天范围内。

**参数：**
- `time` (Date): 要检查的时间
- `timezone` (string): 时区字符串

**返回值：** boolean

## 🌍 支持的时区

### 时区常量

```typescript
TIMEZONES = {
  TORONTO: 'America/Toronto',
  BEIJING: 'Asia/Shanghai',
  UTC: 'UTC',
  NEW_YORK: 'America/New_York',
  LONDON: 'Europe/London',
  TOKYO: 'Asia/Tokyo',
  SYDNEY: 'Australia/Sydney'
}
```

### 常用时区字符串

| 时区 | 字符串 | 描述 |
|------|--------|------|
| 多伦多 | `America/Toronto` | 加拿大东部时间 |
| 北京 | `Asia/Shanghai` | 中国标准时间 |
| UTC | `UTC` | 协调世界时 |
| 纽约 | `America/New_York` | 美国东部时间 |
| 伦敦 | `Europe/London` | 英国时间 |
| 东京 | `Asia/Tokyo` | 日本标准时间 |
| 悉尼 | `Australia/Sydney` | 澳大利亚东部时间 |

## 💡 使用场景

### 1. 锦标赛时间管理

```typescript
// 获取多伦多时区的今日0点，用于每日锦标赛重置
const todayStart = getTorontoMidnight();

// 检查锦标赛是否在今天
const tournamentTime = new Date('2025-01-27T10:00:00Z');
const isToday = isTodayInTimezone(tournamentTime, TIMEZONES.TORONTO);
```

### 2. 季节性活动

```typescript
// 获取本周开始时间（周一0点）
const weekStart = getWeekStartInTimezone(TIMEZONES.TORONTO);

// 获取本月开始时间（1号0点）
const monthStart = getMonthStartInTimezone(TIMEZONES.TORONTO);

// 获取本年开始时间（1月1日0点）
const yearStart = getYearStartInTimezone(TIMEZONES.TORONTO);
```

### 3. 多时区支持

```typescript
// 为不同地区的玩家提供本地时间
const playerTimezones = ['America/Toronto', 'Asia/Shanghai', 'Europe/London'];

playerTimezones.forEach(timezone => {
  const localMidnight = getMidnightInTimezone(timezone);
  console.log(`${timezone}: ${localMidnight.dateString}`);
});
```

### 4. 日期范围查询

```typescript
// 获取多伦多时区的今日范围
const todayRange = getDayRangeInTimezone(TIMEZONES.TORONTO);

// 查询今日的锦标赛
const todayTournaments = await ctx.db
  .query("tournaments")
  .filter(q => q.gte(q.field("startTime"), todayRange.start.iso))
  .filter(q => q.lte(q.field("startTime"), todayRange.end.iso))
  .collect();
```

## 🧪 测试

### 执行测试

```bash
# 测试所有时区工具函数
npx convex run testAllTimezoneUtils

# 测试特定时区的0点时间
npx convex run testGetMidnightInTimezone --data '{
  "timezone": "America/Toronto"
}'

# 测试常用时区的0点时间
npx convex run testCommonTimezoneMidnights

# 测试日期范围
npx convex run testGetDayRangeInTimezone --data '{
  "timezone": "America/Toronto"
}'
```

### 在 Dashboard 中测试

1. 访问 https://dashboard.convex.dev/d/beloved-mouse-699
2. 找到 Functions 标签
3. 搜索并执行测试函数

## ⚠️ 注意事项

1. **时区字符串格式**：使用 IANA 时区数据库格式，如 `America/Toronto`
2. **夏令时**：函数会自动处理夏令时转换
3. **性能考虑**：频繁调用时建议缓存结果
4. **错误处理**：无效的时区字符串会抛出错误

## 🔧 故障排除

### 常见问题

1. **时区不存在**
   ```
   错误：Invalid timezone
   解决：检查时区字符串是否正确
   ```

2. **日期解析错误**
   ```
   错误：Invalid date
   解决：确保传入的日期格式正确
   ```

3. **性能问题**
   ```
   问题：频繁调用导致性能下降
   解决：缓存结果或使用批量处理
   ```

### 调试技巧

```typescript
// 检查时区是否有效
try {
  const result = getMidnightInTimezone('Invalid/Timezone');
} catch (error) {
  console.error('无效时区:', error.message);
}

// 验证结果
const result = getTorontoMidnight();
console.log('多伦多0点时间:', {
  iso: result.iso,
  dateString: result.dateString,
  timezone: result.timezone
});
```

## 📞 支持

如果遇到问题，请：

1. 检查时区字符串格式
2. 验证日期参数
3. 查看控制台错误信息
4. 参考 IANA 时区数据库：https://en.wikipedia.org/wiki/List_of_tz_database_time_zones 