import { TimeZoneUtils } from './TimeZoneUtils';

// ============================================================================
// TimeZoneUtils 使用示例
// ============================================================================

console.log('=== TimeZoneUtils.getDate 方法示例 ===\n');

// 1. 获取当前日期 (YYYY-MM-DD 格式)
console.log('1. 获取不同时区的当前日期:');
console.log('多伦多当前日期:', TimeZoneUtils.getDate('America/Toronto'));
console.log('东京当前日期:', TimeZoneUtils.getDate('Asia/Tokyo'));
console.log('伦敦当前日期:', TimeZoneUtils.getDate('Europe/London'));
console.log('纽约当前日期:', TimeZoneUtils.getDate('America/New_York'));
console.log('上海当前日期:', TimeZoneUtils.getDate('Asia/Shanghai'));
console.log('默认时区日期:', TimeZoneUtils.getDate()); // 默认多伦多
console.log('');

// 2. 获取指定日期在不同时区的日期字符串
console.log('2. 获取指定日期在不同时区的表示:');
const specificDate = new Date('2025-01-27T23:30:00Z'); // UTC 时间
console.log('原始时间 (UTC):', specificDate.toISOString());
console.log('多伦多日期:', TimeZoneUtils.getDateFromDate(specificDate, 'America/Toronto'));
console.log('东京日期:', TimeZoneUtils.getDateFromDate(specificDate, 'Asia/Tokyo'));
console.log('伦敦日期:', TimeZoneUtils.getDateFromDate(specificDate, 'Europe/London'));
console.log('上海日期:', TimeZoneUtils.getDateFromDate(specificDate, 'Asia/Shanghai'));
console.log('');

// 3. 生成带偏移量的 ISO 格式
console.log('3. 生成带偏移量的 ISO 格式:');
const now = new Date();
console.log('多伦多 ISO (带偏移):', TimeZoneUtils.getISOWithOffset(now, 'America/Toronto'));
console.log('东京 ISO (带偏移):', TimeZoneUtils.getISOWithOffset(now, 'Asia/Tokyo'));
console.log('伦敦 ISO (带偏移):', TimeZoneUtils.getISOWithOffset(now, 'Europe/London'));
console.log('');

// 4. 获取时区偏移信息
console.log('4. 获取时区偏移信息:');
console.log('多伦多偏移字符串:', TimeZoneUtils.getTimeZoneOffsetString('America/Toronto'));
console.log('多伦多偏移分钟:', TimeZoneUtils.getTimeZoneOffsetMinutes('America/Toronto'));
console.log('多伦多偏移小时:', TimeZoneUtils.getTimeZoneOffsetHours('America/Toronto'));

console.log('东京偏移字符串:', TimeZoneUtils.getTimeZoneOffsetString('Asia/Tokyo'));
console.log('东京偏移分钟:', TimeZoneUtils.getTimeZoneOffsetMinutes('Asia/Tokyo'));
console.log('东京偏移小时:', TimeZoneUtils.getTimeZoneOffsetHours('Asia/Tokyo'));

console.log('伦敦偏移字符串:', TimeZoneUtils.getTimeZoneOffsetString('Europe/London'));
console.log('伦敦偏移分钟:', TimeZoneUtils.getTimeZoneOffsetMinutes('Europe/London'));
console.log('伦敦偏移小时:', TimeZoneUtils.getTimeZoneOffsetHours('Europe/London'));
console.log('');

// 5. 比较两个时区
console.log('5. 比较两个时区:');
const comparison1 = TimeZoneUtils.compareTimeZones('America/Toronto', 'Asia/Tokyo');
console.log('多伦多 vs 东京:', comparison1);

const comparison2 = TimeZoneUtils.compareTimeZones('Europe/London', 'America/New_York');
console.log('伦敦 vs 纽约:', comparison2);
console.log('');

// 6. 使用 getSpecificTimeZoneISO 方法
console.log('6. 创建特定时区的日期时间:');
const specificDateTime1 = TimeZoneUtils.getSpecificTimeZoneISO({
    timeZone: 'America/Toronto',
    date: '2025-01-27',
    time: '14:30:00'
});
console.log('多伦多 2025-01-27 14:30:00:', specificDateTime1);

const specificDateTime2 = TimeZoneUtils.getSpecificTimeZoneISO({
    timeZone: 'Asia/Tokyo',
    date: '2025-01-27',
    time: '09:15'
});
console.log('东京 2025-01-27 09:15:', specificDateTime2);
console.log('');

// 7. 使用其他现有方法
console.log('7. 其他实用方法:');
console.log('多伦多当前时间 ISO:', TimeZoneUtils.getTimeZoneISO('America/Toronto'));
console.log('多伦多午夜时间 ISO:', TimeZoneUtils.getTimeZoneMidnightISO('America/Toronto'));
console.log('多伦多周开始时间 ISO:', TimeZoneUtils.getTimeZoneWeekStartISO('America/Toronto'));
console.log('多伦多月开始时间 ISO:', TimeZoneUtils.getTimeZoneMonthStartISO('America/Toronto'));
console.log('');

// 8. 赛季时间相关
console.log('8. 赛季时间相关:');
console.log('当前赛季开始时间:', TimeZoneUtils.getSeasonStartISO('America/Toronto'));
console.log('当前赛季结束时间:', TimeZoneUtils.getSeasonEndISO('America/Toronto'));
console.log('2025年3月赛季开始:', TimeZoneUtils.getSeasonStartISO('America/Toronto', 2025, 3));
console.log('2025年3月赛季结束:', TimeZoneUtils.getSeasonEndISO('America/Toronto', 2025, 3));
console.log('');

// 9. 游戏系统中的应用示例
console.log('9. 游戏系统应用示例:');

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

// 获取锦标赛开始时间（多时区显示）
function getTournamentStartTimes(startTime: Date): Record<string, string> {
    const timeZones = ['America/Toronto', 'Asia/Tokyo', 'Europe/London', 'America/New_York'];
    const result: Record<string, string> = {};

    timeZones.forEach(tz => {
        result[tz] = TimeZoneUtils.getISOWithOffset(startTime, tz);
    });

    return result;
}

console.log('多伦多玩家游戏重置时间:', getGameResetTime('America/Toronto'));
console.log('东京玩家游戏重置时间:', getGameResetTime('Asia/Tokyo'));
console.log('多伦多和东京玩家是否同一游戏日:', isSameGameDay('America/Toronto', 'Asia/Tokyo'));

const tournamentStart = new Date('2025-01-28T10:00:00Z');
console.log('锦标赛开始时间 (多时区):', getTournamentStartTimes(tournamentStart));
console.log('');

// 10. 高级偏移量功能
console.log('10. 高级偏移量功能:');

// 获取时区详细信息
const torontoInfo = TimeZoneUtils.getTimeZoneInfo('America/Toronto');
console.log('多伦多详细信息:', torontoInfo);

const tokyoInfo = TimeZoneUtils.getTimeZoneInfo('Asia/Tokyo');
console.log('东京详细信息:', tokyoInfo);

// 批量获取多个时区偏移
const timeZones = ['America/Toronto', 'Asia/Tokyo', 'Europe/London', 'Asia/Shanghai'];
const multipleOffsets = TimeZoneUtils.getMultipleTimeZoneOffsets(timeZones);
console.log('多时区偏移信息:', multipleOffsets);

// 根据偏移量查找时区
const utcTimeZones = TimeZoneUtils.findTimeZonesByOffset(0);    // UTC+0
const plus8TimeZones = TimeZoneUtils.findTimeZonesByOffset(8);  // UTC+8
const minus5TimeZones = TimeZoneUtils.findTimeZonesByOffset(-5); // UTC-5

console.log('UTC+0 时区:', utcTimeZones);
console.log('UTC+8 时区:', plus8TimeZones);
console.log('UTC-5 时区:', minus5TimeZones);

console.log('\n=== TimeZoneUtils 示例完成 ==='); 