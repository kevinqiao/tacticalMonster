import { TimeZoneUtils } from './TimeZoneUtils';

// ============================================================================
// 时区偏移量演示
// ============================================================================

console.log('=== 时区偏移量获取方法演示 ===\n');

// 1. 基本偏移量获取
console.log('1. 基本偏移量获取:');
const timeZones = [
    'America/Toronto',    // UTC-5 (冬季) / UTC-4 (夏季)
    'America/New_York',   // UTC-5 (冬季) / UTC-4 (夏季)
    'America/Los_Angeles', // UTC-8 (冬季) / UTC-7 (夏季)
    'Europe/London',      // UTC+0 (冬季) / UTC+1 (夏季)
    'Europe/Paris',       // UTC+1 (冬季) / UTC+2 (夏季)
    'Asia/Tokyo',         // UTC+9 (全年)
    'Asia/Shanghai',      // UTC+8 (全年)
    'Asia/Dubai',         // UTC+4 (全年)
    'Australia/Sydney',   // UTC+10 (冬季) / UTC+11 (夏季)
    'UTC'                 // UTC+0 (全年)
];

timeZones.forEach(tz => {
    const offsetString = TimeZoneUtils.getTimeZoneOffsetString(tz);
    const offsetMinutes = TimeZoneUtils.getTimeZoneOffsetMinutes(tz);
    const offsetHours = TimeZoneUtils.getTimeZoneOffsetHours(tz);

    console.log(`${tz}:`);
    console.log(`  偏移字符串: ${offsetString}`);
    console.log(`  偏移分钟: ${offsetMinutes}`);
    console.log(`  偏移小时: ${offsetHours}`);
    console.log('');
});

// 2. 详细时区信息
console.log('2. 详细时区信息:');
const detailedTimeZones = ['America/Toronto', 'Asia/Tokyo', 'Europe/London'];
detailedTimeZones.forEach(tz => {
    const info = TimeZoneUtils.getTimeZoneInfo(tz);
    console.log(`${tz} 详细信息:`);
    console.log(`  时区: ${info.timeZone}`);
    console.log(`  偏移字符串: ${info.offsetString}`);
    console.log(`  偏移分钟: ${info.offsetMinutes}`);
    console.log(`  偏移小时: ${info.offsetHours}`);
    console.log(`  是否夏令时: ${info.isDST}`);
    console.log(`  当前时间: ${info.currentTime}`);
    console.log('');
});

// 3. 批量获取偏移量
console.log('3. 批量获取偏移量:');
const batchTimeZones = ['America/Toronto', 'Asia/Tokyo', 'Europe/London', 'Asia/Shanghai'];
const batchOffsets = TimeZoneUtils.getMultipleTimeZoneOffsets(batchTimeZones);
console.log('批量偏移量结果:', JSON.stringify(batchOffsets, null, 2));
console.log('');

// 4. 根据偏移量查找时区
console.log('4. 根据偏移量查找时区:');
const offsetsToFind = [0, -5, -8, +1, +8, +9];
offsetsToFind.forEach(offset => {
    const foundTimeZones = TimeZoneUtils.findTimeZonesByOffset(offset);
    console.log(`UTC${offset >= 0 ? '+' : ''}${offset} 时区:`, foundTimeZones);
});
console.log('');

// 5. 时区比较
console.log('5. 时区比较:');
const comparisons = [
    ['America/Toronto', 'Asia/Tokyo'],
    ['Europe/London', 'America/New_York'],
    ['Asia/Shanghai', 'America/Los_Angeles'],
    ['UTC', 'Asia/Dubai']
];

comparisons.forEach(([tz1, tz2]) => {
    const comparison = TimeZoneUtils.compareTimeZones(tz1, tz2);
    console.log(`${tz1} vs ${tz2}:`);
    console.log(`  ${tz1} 偏移: ${comparison.offset1}`);
    console.log(`  ${tz2} 偏移: ${comparison.offset2}`);
    console.log(`  时间差: ${comparison.timeDifference} 小时`);
    console.log('');
});

// 6. 实际应用示例
console.log('6. 实际应用示例:');

// 游戏服务器时区管理
class GameServerTimeZoneManager {
    private static readonly SERVER_TIMEZONE = 'America/Toronto';

    /**
     * 获取服务器时区偏移
     */
    static getServerOffset(): {
        offsetString: string;
        offsetHours: number;
        offsetMinutes: number;
    } {
        return {
            offsetString: TimeZoneUtils.getTimeZoneOffsetString(this.SERVER_TIMEZONE),
            offsetHours: TimeZoneUtils.getTimeZoneOffsetHours(this.SERVER_TIMEZONE),
            offsetMinutes: TimeZoneUtils.getTimeZoneOffsetMinutes(this.SERVER_TIMEZONE)
        };
    }

    /**
     * 计算玩家时区与服务器时区的时差
     */
    static getPlayerServerTimeDifference(playerTimeZone: string): number {
        const comparison = TimeZoneUtils.compareTimeZones(playerTimeZone, this.SERVER_TIMEZONE);
        return comparison.timeDifference;
    }

    /**
     * 检查玩家是否在同一时区组
     */
    static isInSameTimeZoneGroup(playerTimeZone: string): boolean {
        const playerOffset = TimeZoneUtils.getTimeZoneOffsetHours(playerTimeZone);
        const serverOffset = TimeZoneUtils.getTimeZoneOffsetHours(this.SERVER_TIMEZONE);

        // 时差在3小时以内认为是同一时区组
        return Math.abs(playerOffset - serverOffset) <= 3;
    }

    /**
     * 获取推荐的游戏时间
     */
    static getRecommendedGameTime(playerTimeZone: string): {
        localTime: string;
        serverTime: string;
        timeDifference: number;
        recommendation: string;
    } {
        const timeDiff = this.getPlayerServerTimeDifference(playerTimeZone);
        const playerInfo = TimeZoneUtils.getTimeZoneInfo(playerTimeZone);
        const serverInfo = TimeZoneUtils.getTimeZoneInfo(this.SERVER_TIMEZONE);

        let recommendation = '';
        if (Math.abs(timeDiff) <= 3) {
            recommendation = '最佳游戏时间，与服务器时区接近';
        } else if (Math.abs(timeDiff) <= 8) {
            recommendation = '适合游戏时间，可能需要调整作息';
        } else {
            recommendation = '建议选择本地服务器或调整游戏时间';
        }

        return {
            localTime: playerInfo.currentTime,
            serverTime: serverInfo.currentTime,
            timeDifference: timeDiff,
            recommendation
        };
    }
}

// 使用游戏服务器时区管理器
console.log('游戏服务器时区管理示例:');
console.log('服务器偏移:', GameServerTimeZoneManager.getServerOffset());

const playerTimeZones = ['Asia/Tokyo', 'Europe/London', 'America/Los_Angeles'];
playerTimeZones.forEach(playerTz => {
    console.log(`\n玩家时区: ${playerTz}`);
    console.log('时差:', GameServerTimeZoneManager.getPlayerServerTimeDifference(playerTz), '小时');
    console.log('同时区组:', GameServerTimeZoneManager.isInSameTimeZoneGroup(playerTz));

    const recommendation = GameServerTimeZoneManager.getRecommendedGameTime(playerTz);
    console.log('推荐信息:', recommendation);
});

// 7. 偏移量格式转换
console.log('\n7. 偏移量格式转换示例:');

function convertOffsetFormats(timeZone: string) {
    const offsetString = TimeZoneUtils.getTimeZoneOffsetString(timeZone);
    const offsetMinutes = TimeZoneUtils.getTimeZoneOffsetMinutes(timeZone);
    const offsetHours = TimeZoneUtils.getTimeZoneOffsetHours(timeZone);

    // 转换为不同格式
    const formats = {
        iso: offsetString,                                    // ±HH:mm
        minutes: offsetMinutes,                               // 分钟数
        hours: offsetHours,                                   // 小时数
        decimal: Math.round(offsetHours * 100) / 100,        // 小数小时
        gmt: `GMT${offsetString}`,                            // GMT格式
        utc: `UTC${offsetString}`,                            // UTC格式
        readable: offsetHours >= 0 ?
            `东${Math.abs(offsetHours)}区` :
            `西${Math.abs(offsetHours)}区`                     // 中文描述
    };

    return formats;
}

const formatExamples = ['America/Toronto', 'Asia/Tokyo', 'Europe/London', 'Asia/Shanghai'];
formatExamples.forEach(tz => {
    console.log(`${tz} 偏移量格式:`, convertOffsetFormats(tz));
});

console.log('\n=== 时区偏移量演示完成 ==='); 