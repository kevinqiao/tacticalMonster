// ============================================================================
// 简化时区工具函数 - 更可靠的版本
// ============================================================================
export function getTorontoDate(date?: Date) {
    const now = getTorontoMidnight(date);
    return now
}
/**
 * 获取指定时区的0点时间（简化版本）
 * @param timezone 时区字符串
 * @param date 可选，指定日期
 * @returns 包含ISO字符串和本地日期的对象
 */
export function getMidnightInTimezone(timezone: string, date?: Date) {
    const targetDate = date || new Date();

    try {
        // 获取目标时区的当前时间
        const targetTimeString = targetDate.toLocaleString('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // 提取日期部分
        const datePart = targetTimeString.split(',')[0];
        console.log("datePart", datePart);

        // 构建0点时间字符串（使用标准格式）
        const [year, month, day] = datePart.split('-');
        const midnightISO = `${year}-${month}-${day}T00:00:00.000Z`;

        // 创建UTC时间
        const utcMidnight = new Date(midnightISO);
        console.log("utcMidnight", utcMidnight);

        // 计算时区偏移
        const offsetMinutes = getTimezoneOffset(timezone);
        const localMidnight = new Date(utcMidnight.getTime() + offsetMinutes * 60 * 1000);

        console.log("localMidnight", localMidnight);

        return {
            iso: localMidnight.toISOString(),
            localDate: localMidnight,
            timezone: timezone,
            dateString: datePart
        };
    } catch (error) {
        console.error(`Error in getMidnightInTimezone for ${timezone}:`, error);

        // 备用方法：使用UTC时间
        const utcDate = new Date(targetDate);
        utcDate.setUTCHours(0, 0, 0, 0);

        return {
            iso: utcDate.toISOString(),
            localDate: utcDate,
            timezone: 'UTC',
            dateString: utcDate.toISOString().split('T')[0]
        };
    }
}

/**
 * 获取时区偏移（分钟）
 * @param timezone 时区字符串
 * @returns 偏移分钟数
 */
function getTimezoneOffset(timezone: string): number {
    const now = new Date();

    try {
        // 获取UTC时间
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);

        // 获取目标时区时间
        const targetTimeString = now.toLocaleString('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const targetTime = new Date(targetTimeString);
        const targetTimeMs = targetTime.getTime() + (targetTime.getTimezoneOffset() * 60000);

        // 计算偏移
        return (targetTimeMs - utcTime) / 60000;
    } catch (error) {
        console.error(`Error calculating offset for ${timezone}:`, error);
        return 0; // 默认UTC
    }
}

/**
 * 获取多伦多时区的0点时间
 */
export function getTorontoMidnight(date?: Date) {
    return getMidnightInTimezone('America/Toronto', date);
}

/**
 * 获取北京时区的0点时间
 */
export function getBeijingMidnight(date?: Date) {
    return getMidnightInTimezone('Asia/Shanghai', date);
}

/**
 * 获取UTC时区的0点时间
 */
export function getUTCMidnight(date?: Date) {
    const targetDate = date || new Date();
    const utcDate = new Date(targetDate);
    utcDate.setUTCHours(0, 0, 0, 0);

    return {
        iso: utcDate.toISOString(),
        localDate: utcDate,
        timezone: 'UTC',
        dateString: utcDate.toISOString().split('T')[0]
    };
}

/**
 * 获取指定时区的当前时间
 */
export function getCurrentTimeInTimezone(timezone: string) {
    const now = new Date();

    try {
        const timeString = now.toLocaleString('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const [datePart, timePart] = timeString.split(', ');
        const localDate = new Date(timeString);

        return {
            iso: localDate.toISOString(),
            localDate: localDate,
            timezone: timezone,
            dateString: datePart,
            timeString: timePart
        };
    } catch (error) {
        console.error(`Error in getCurrentTimeInTimezone for ${timezone}:`, error);

        return {
            iso: now.toISOString(),
            localDate: now,
            timezone: 'UTC',
            dateString: now.toISOString().split('T')[0],
            timeString: now.toISOString().split('T')[1].split('.')[0]
        };
    }
}

/**
 * 获取指定时区的日期范围
 */
export function getDayRangeInTimezone(timezone: string, date?: Date) {
    const start = getMidnightInTimezone(timezone, date);

    // 计算结束时间（下一天的0点减1毫秒）
    const endDate = date ? new Date(date) : new Date();
    endDate.setDate(endDate.getDate() + 1);
    const end = getMidnightInTimezone(timezone, endDate);

    return {
        start: start,
        end: {
            iso: new Date(end.localDate.getTime() - 1).toISOString(),
            localDate: new Date(end.localDate.getTime() - 1),
            timezone: timezone,
            dateString: start.dateString
        }
    };
}

/**
 * 检查指定时间是否在指定时区的今天范围内
 */
export function isTodayInTimezone(time: Date, timezone: string) {
    const todayRange = getDayRangeInTimezone(timezone);
    const timeISO = time.toISOString();

    return timeISO >= todayRange.start.iso && timeISO <= todayRange.end.iso;
}

/**
 * 时区常量
 */
export const TIMEZONES = {
    TORONTO: 'America/Toronto',
    BEIJING: 'Asia/Shanghai',
    UTC: 'UTC',
    NEW_YORK: 'America/New_York',
    LONDON: 'Europe/London',
    TOKYO: 'Asia/Tokyo',
    SYDNEY: 'Australia/Sydney'
} as const;

/**
 * 便捷工具对象
 */
export const SimpleTimezoneUtils = {
    getToronto: () => getCurrentTimeInTimezone(TIMEZONES.TORONTO),
    getTorontoMidnight: (date?: Date) => getMidnightInTimezone(TIMEZONES.TORONTO, date),
    getTorontoDate: (date?: Date) => getMidnightInTimezone(TIMEZONES.TORONTO, date),
    getBeijing: () => getCurrentTimeInTimezone(TIMEZONES.BEIJING),
    getBeijingMidnight: (date?: Date) => getMidnightInTimezone(TIMEZONES.BEIJING, date),

    getUTC: () => getCurrentTimeInTimezone(TIMEZONES.UTC),
    getUTCMidnight: (date?: Date) => getUTCMidnight(date),

    getNewYork: () => getCurrentTimeInTimezone(TIMEZONES.NEW_YORK),
    getNewYorkMidnight: (date?: Date) => getMidnightInTimezone(TIMEZONES.NEW_YORK, date),

    getLondon: () => getCurrentTimeInTimezone(TIMEZONES.LONDON),
    getLondonMidnight: (date?: Date) => getMidnightInTimezone(TIMEZONES.LONDON, date),

    getTokyo: () => getCurrentTimeInTimezone(TIMEZONES.TOKYO),
    getTokyoMidnight: (date?: Date) => getMidnightInTimezone(TIMEZONES.TOKYO, date),

    getSydney: () => getCurrentTimeInTimezone(TIMEZONES.SYDNEY),
    getSydneyMidnight: (date?: Date) => getMidnightInTimezone(TIMEZONES.SYDNEY, date)
}; 