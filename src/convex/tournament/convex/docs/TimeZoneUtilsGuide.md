# TimeZoneUtils 使用指南

## 概述

`TimeZoneUtils` 是一个强大的时区处理工具类，提供了丰富的时区转换和日期时间操作方法。本指南重点介绍 `getDate` 方法及相关功能。

## 核心方法

### 1. `getDate(timeZone?: string): string`

**功能**: 获取指定时区的当前日期（YYYY-MM-DD 格式）

**参数**:
- `timeZone` (可选): 时区字符串，默认为 'America/Toronto'

**返回值**: 字符串格式的日期 (YYYY-MM-DD)

**示例**:
```typescript
// 获取不同时区的当前日期
const torontoDate = TimeZoneUtils.getDate('America/Toronto');  // "2025-01-27"
const tokyoDate = TimeZoneUtils.getDate('Asia/Tokyo');         // "2025-01-28" (可能因时差而不同)
const londonDate = TimeZoneUtils.getDate('Europe/London');     // "2025-01-27"
const defaultDate = TimeZoneUtils.getDate();                   // "2025-01-27" (默认多伦多)
```

### 2. `getDateFromDate(date: Date, timeZone?: string): string`

**功能**: 获取指定日期在指定时区的日期字符串

**参数**:
- `date`: Date 对象
- `timeZone` (可选): 时区字符串，默认为 'America/Toronto'

**返回值**: 字符串格式的日期 (YYYY-MM-DD)

**示例**:
```typescript
const utcDate = new Date('2025-01-27T23:30:00Z');
const torontoDate = TimeZoneUtils.getDateFromDate(utcDate, 'America/Toronto');  // "2025-01-27"
const tokyoDate = TimeZoneUtils.getDateFromDate(utcDate, 'Asia/Tokyo');         // "2025-01-28"
```

### 3. `getISOWithOffset(date: Date, timeZone?: string): string`

**功能**: 生成带偏移量的 ISO 格式字符串

**参数**:
- `date`: Date 对象
- `timeZone` (可选): 时区字符串，默认为 'America/Toronto'

**返回值**: 带偏移量的 ISO 字符串

**示例**:
```typescript
const now = new Date();
const torontoISO = TimeZoneUtils.getISOWithOffset(now, 'America/Toronto');
// "2025-01-27T14:30:00.000-05:00"

const tokyoISO = TimeZoneUtils.getISOWithOffset(now, 'Asia/Tokyo');
// "2025-01-27T14:30:00.000+09:00"
```

### 4. `getTimeZoneOffsetString(timeZone?: string): string`

**功能**: 获取时区偏移字符串 (±HH:mm)

**参数**:
- `timeZone` (可选): 时区字符串，默认为 'America/Toronto'

**返回值**: 偏移量字符串

**示例**:
```typescript
const torontoOffset = TimeZoneUtils.getTimeZoneOffsetString('America/Toronto'); // "-05:00"
const tokyoOffset = TimeZoneUtils.getTimeZoneOffsetString('Asia/Tokyo');        // "+09:00"
```

### 5. `compareTimeZones(timeZone1: string, timeZone2: string)`

**功能**: 比较两个时区的时间差异

**参数**:
- `timeZone1`: 第一个时区
- `timeZone2`: 第二个时区

**返回值**: 包含时区信息和时差的对象

**示例**:
```typescript
const comparison = TimeZoneUtils.compareTimeZones('America/Toronto', 'Asia/Tokyo');
// {
//   timezone1: 'America/Toronto',
//   timezone2: 'Asia/Tokyo',
//   offset1: '-05:00',
//   offset2: '+09:00',
//   timeDifference: -14
// }
```

### 6. `getSpecificTimeZoneISO(param: { timeZone?: string, date: string, time: string })`

**功能**: 根据指定时区的特定日期时间创建 Date 对象

**参数**:
- `param.timeZone` (可选): 时区字符串
- `param.date`: 日期字符串 (YYYY-MM-DD)
- `param.time`: 时间字符串 (HH:mm:ss 或 HH:mm)

**返回值**: Date 对象或 null

**示例**:
```typescript
const specificDate = TimeZoneUtils.getSpecificTimeZoneISO({
    timeZone: 'America/Toronto',
    date: '2025-01-27',
    time: '14:30:00'
});
```

## 游戏系统中的应用

### 1. 玩家时区管理

```typescript
// 获取玩家时区的游戏重置时间
function getGameResetTime(playerTimeZone: string): string {
    return TimeZoneUtils.getDate(playerTimeZone);
}

// 检查两个玩家是否在同一游戏日
function isSameGameDay(player1TimeZone: string, player2TimeZone: string): boolean {
    const date1 = TimeZoneUtils.getDate(player1TimeZone);
    const date2 = TimeZoneUtils.getDate(player2TimeZone);
    return date1 === date2;
}
```

### 2. 锦标赛时间管理

```typescript
// 获取锦标赛开始时间（多时区显示）
function getTournamentStartTimes(startTime: Date): Record<string, string> {
    const timeZones = ['America/Toronto', 'Asia/Tokyo', 'Europe/London', 'America/New_York'];
    const result: Record<string, string> = {};
    
    timeZones.forEach(tz => {
        result[tz] = TimeZoneUtils.getISOWithOffset(startTime, tz);
    });
    
    return result;
}
```

### 3. 任务重置时间

```typescript
// 获取每日任务重置时间
function getDailyTaskResetTime(playerTimeZone: string): string {
    const today = TimeZoneUtils.getDate(playerTimeZone);
    return TimeZoneUtils.getSpecificTimeZoneISO({
        timeZone: playerTimeZone,
        date: today,
        time: '00:00:00'
    })?.toISOString() || '';
}
```

### 4. Battle Pass 赛季管理

```typescript
// 获取赛季开始和结束时间
function getSeasonTimes(timeZone: string = 'America/Toronto') {
    return {
        start: TimeZoneUtils.getSeasonStartISO(timeZone),
        end: TimeZoneUtils.getSeasonEndISO(timeZone)
    };
}
```

## 常用时区列表

- **北美**:
  - `America/Toronto` - 多伦多（东部时间）
  - `America/New_York` - 纽约（东部时间）
  - `America/Los_Angeles` - 洛杉矶（太平洋时间）
  
- **亚洲**:
  - `Asia/Tokyo` - 东京（日本标准时间）
  - `Asia/Shanghai` - 上海（中国标准时间）
  - `Asia/Seoul` - 首尔（韩国标准时间）
  
- **欧洲**:
  - `Europe/London` - 伦敦（格林威治时间）
  - `Europe/Paris` - 巴黎（中欧时间）
  - `Europe/Berlin` - 柏林（中欧时间）

## 最佳实践

1. **时区一致性**: 在游戏系统中始终使用相同的基准时区（推荐 America/Toronto）
2. **日期比较**: 使用 `getDate` 方法获取标准化的日期字符串进行比较
3. **多时区支持**: 为国际玩家提供本地时区的时间显示
4. **错误处理**: 始终检查时区字符串的有效性
5. **性能考虑**: 缓存频繁使用的时区计算结果

## 注意事项

1. **夏令时**: 时区偏移会根据夏令时自动调整
2. **格式标准**: 日期格式严格遵循 YYYY-MM-DD 标准
3. **时区有效性**: 使用标准的 IANA 时区标识符
4. **跨日期线**: 注意处理跨越国际日期变更线的情况

## 完整示例

```typescript
import { TimeZoneUtils } from './TimeZoneUtils';

// 游戏时间管理器
class GameTimeManager {
    /**
     * 获取玩家的当前游戏日期
     */
    static getPlayerGameDate(playerTimeZone: string): string {
        return TimeZoneUtils.getDate(playerTimeZone);
    }
    
    /**
     * 检查是否为新的游戏日
     */
    static isNewGameDay(lastLoginDate: string, playerTimeZone: string): boolean {
        const currentDate = this.getPlayerGameDate(playerTimeZone);
        return currentDate !== lastLoginDate;
    }
    
    /**
     * 获取游戏事件的多时区时间
     */
    static getEventTimes(eventTime: Date): Record<string, string> {
        const timeZones = ['America/Toronto', 'Asia/Tokyo', 'Europe/London'];
        const result: Record<string, string> = {};
        
        timeZones.forEach(tz => {
            result[tz] = TimeZoneUtils.getISOWithOffset(eventTime, tz);
        });
        
        return result;
    }
}

// 使用示例
const playerTimeZone = 'Asia/Tokyo';
const currentGameDate = GameTimeManager.getPlayerGameDate(playerTimeZone);
const isNewDay = GameTimeManager.isNewGameDay('2025-01-26', playerTimeZone);
const eventTimes = GameTimeManager.getEventTimes(new Date());

console.log('当前游戏日期:', currentGameDate);
console.log('是否新的游戏日:', isNewDay);
console.log('事件时间 (多时区):', eventTimes);
```

这个指南提供了 `TimeZoneUtils` 类的完整使用方法，特别是 `getDate` 方法及其在游戏系统中的应用。 