

// 扩展时区工具
export class TimeZoneUtils {
    /**
     * 获取指定时区的当前时间ISO字符串
     */
    static getTimeZoneISO(timeZone: string = 'America/Toronto'): string {
        const now = new Date();
        return new Date(now.toLocaleString("en-US", {
            timeZone: timeZone
        })).toISOString();
    }

    /**
     * 获取指定时区的当前日期字符串 (YYYY-MM-DD)
     */
    static getCurrentDate(timeZone: string = 'America/Toronto'): string {
        const now = new Date();
        const localTime = new Date(now.toLocaleString("en-US", {
            timeZone: timeZone
        }));

        const year = localTime.getFullYear();
        const month = String(localTime.getMonth() + 1).padStart(2, '0');
        const day = String(localTime.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    /**
     * 获取指定时区的午夜时间ISO字符串
     */
    static getTimeZoneDayStartISO(timeZone: string = 'America/Toronto'): string {
        const now = new Date();
        const localMidnight = new Date(now.toLocaleString("en-US", {
            timeZone: timeZone
        }));
        localMidnight.setHours(0, 0, 0, 0);
        return localMidnight.toISOString();
    }

    /**
     * 获取指定时区的周开始时间ISO字符串
     */
    static getTimeZoneWeekStartISO(timeZone: string = 'America/Toronto'): string {
        const now = new Date();
        const localTime = new Date(now.toLocaleString("en-US", {
            timeZone: timeZone
        }));

        const dayOfWeek = localTime.getDay();
        const diff = localTime.getDate() - dayOfWeek;
        const weekStart = new Date(localTime);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);

        return weekStart.toISOString();
    }

    /**
     * 获取指定时区的月开始时间ISO字符串
     */
    static getTimeZoneMonthStartISO(timeZone: string = 'America/Toronto'): string {
        const now = new Date();
        const localTime = new Date(now.toLocaleString("en-US", {
            timeZone: timeZone
        }));

        const monthStart = new Date(localTime);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        return monthStart.toISOString();
    }

    /**
     * 根据特定时区的特定时间生成ISO字符串
     * @param timeZone 时区，默认为 'America/Toronto'
     * @param year 年份
     * @param month 月份 (1-12)
     * @param day 日期 (1-31)
     * @param hour 小时 (0-23)，默认为0
     * @param minute 分钟 (0-59)，默认为0
     * @param second 秒 (0-59)，默认为0
     * @param millisecond 毫秒 (0-999)，默认为0
     */
    static createTimeZoneISO(
        timeZone: string = 'America/Toronto',
        year: number,
        month: number,
        day: number,
        hour: number = 0,
        minute: number = 0,
        second: number = 0,
        millisecond: number = 0
    ): string {
        // 创建指定时区的日期对象
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}`;

        // 创建临时日期对象来获取时区偏移
        const tempDate = new Date();
        const localDate = new Date(tempDate.toLocaleString("en-US", { timeZone }));
        const utcDate = new Date(tempDate.toLocaleString("en-US", { timeZone: "UTC" }));
        const timezoneOffset = localDate.getTime() - utcDate.getTime();

        // 创建目标日期并调整时区
        const targetDate = new Date(`${dateString}Z`);
        const adjustedDate = new Date(targetDate.getTime() - timezoneOffset);

        return adjustedDate.toISOString();
    }
    /**
     * 根据特定时区的特定时间生成ISO字符串
     * @param timeZone 时区，默认为 'America/Toronto'
     * @param year 年份
     * @param month 月份 (1-12)
     * @param day 日期 (1-31)
     * @param hour 小时 (0-23)，默认为0
     * @param minute 分钟 (0-59)，默认为0
     * @param second 秒 (0-59)，默认为0
     * @param millisecond 毫秒 (0-999)，默认为0
     */
    static createTimeZoneDate(
        timeZone: string = 'America/Toronto',
        year: number,
        month: number,
        day: number,
        hour: number = 0,
        minute: number = 0,
        second: number = 0,
        millisecond: number = 0
    ): Date {
        // 创建指定时区的日期对象
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}`;

        // 创建临时日期对象来获取时区偏移
        const tempDate = new Date();
        const localDate = new Date(tempDate.toLocaleString("en-US", { timeZone }));
        const utcDate = new Date(tempDate.toLocaleString("en-US", { timeZone: "UTC" }));
        const timezoneOffset = localDate.getTime() - utcDate.getTime();

        // 创建目标日期并调整时区
        const targetDate = new Date(`${dateString}Z`);
        const adjustedDate = new Date(targetDate.getTime() - timezoneOffset);
        return adjustedDate;
    }
    /**
     * 根据特定时区的日期字符串生成ISO字符串
     * @param timeZone 时区，默认为 'America/Toronto'
     * @param dateString 日期字符串，格式为 'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm:ss'
     */
    static createTimeZoneISOFromString(
        param: { timeZone?: string, dateString: string }
    ): string {
        const { timeZone = 'America/Toronto', dateString } = param;
        // 解析日期字符串
        const dateMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?$/);

        if (!dateMatch) {
            throw new Error('Invalid date string format. Expected YYYY-MM-DD or YYYY-MM-DD HH:mm:ss');
        }

        const [, year, month, day, hour = '0', minute = '0', second = '0'] = dateMatch;

        return this.createTimeZoneISO(
            timeZone,
            parseInt(year),
            parseInt(month),
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
        );
    }

    /**
     * 根据特定时区的Date对象生成ISO字符串
     * @param timeZone 时区，默认为 'America/Toronto'
     * @param date Date对象
     */
    static createTimeZoneISOFromDate(
        timeZone: string = 'America/Toronto',
        date: Date
    ): string {
        return this.createTimeZoneISO(
            timeZone,
            date.getFullYear(),
            date.getMonth() + 1, // getMonth() 返回 0-11
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        );
    }

    /**
     * 获取指定时区的特定日期时间
     * @param timeZone 时区，默认为 'America/Toronto'
     * @param date 日期字符串 格式为 'YYYY-MM-DD'
     * @param time 时间字符串，格式为 'HH:mm:ss' 或 'HH:mm'
     */
    static getSpecificTimeZoneISO(
        param: { timeZone?: string, date: string, time: string }
    ): string | null {
        const { timeZone = 'America/Toronto', date, time } = param;

        try {
            // 解析日期字符串
            const dateMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (!dateMatch) {
                console.error('Invalid date format. Expected YYYY-MM-DD');
                return null;
            }

            // 解析时间字符串
            const timeMatch = time.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
            if (!timeMatch) {
                console.error('Invalid time format. Expected HH:mm or HH:mm:ss');
                return null;
            }

            const [, year, month, day] = dateMatch;
            const [, hour, minute, second = '0'] = timeMatch;

            // 使用 createTimeZoneISO 方法生成 ISO 字符串，然后创建 Date 对象
            const isoString = this.createTimeZoneISO(
                timeZone,
                parseInt(year),
                parseInt(month),
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
            );
            return isoString;
        } catch (error) {
            console.error('Error creating date:', error);
            return null;
        }
    }

    /**
     * 获取指定时区的赛季开始时间
     * @param timeZone 时区，默认为 'America/Toronto'
     * @param year 年份，默认为当前年份
     * @param month 月份 (1-12)，默认为当前月份
     */
    static getSeasonStartISO(
        timeZone: string = 'America/Toronto',
        year?: number,
        month?: number
    ): string {
        const now = new Date();
        const targetYear = year || now.getFullYear();
        const targetMonth = month || (now.getMonth() + 1);

        return this.createTimeZoneISO(timeZone, targetYear, targetMonth, 1, 0, 0, 0, 0);
    }

    /**
     * 获取指定时区的赛季结束时间
     * @param timeZone 时区，默认为 'America/Toronto'
     * @param year 年份，默认为当前年份
     * @param month 月份 (1-12)，默认为当前月份
     */
    static getSeasonEndISO(
        timeZone: string = 'America/Toronto',
        year?: number,
        month?: number
    ): string {
        const now = new Date();
        const targetYear = year || now.getFullYear();
        const targetMonth = month || (now.getMonth() + 1);

        // 获取下个月的第一天，然后减去1毫秒
        const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
        const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;

        const seasonEnd = this.createTimeZoneISO(timeZone, nextYear, nextMonth, 1, 0, 0, 0, 0);
        const endDate = new Date(seasonEnd);
        endDate.setMilliseconds(endDate.getMilliseconds() - 1);

        return endDate.toISOString();
    }
    static getTimeFromISO(iso: string): string {
        const date = new Date(iso);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    /**
     * 获取指定时区的当前日期 (YYYY-MM-DD 格式)
     * 这是一个简化版本的 getCurrentDate 方法
     */
    static getDate(timeZone: string = 'America/Toronto'): string {
        const now = new Date();
        return now.toLocaleDateString("en-CA", {
            timeZone: timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * 获取指定日期在指定时区的日期字符串
     */
    static getDateFromDate(date: Date, timeZone: string = 'America/Toronto'): string {
        return date.toLocaleDateString("en-CA", {
            timeZone: timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * 生成带偏移量的 ISO 格式字符串
     */
    static getISOWithOffset(date: Date, timeZone: string = 'America/Toronto'): string {
        // 获取时区偏移
        const timeZoneDate = new Date(date.toLocaleString("en-US", { timeZone }));
        const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
        const offsetMs = timeZoneDate.getTime() - utcDate.getTime();

        // 计算偏移小时和分钟
        const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
        const offsetMinutes = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
        const offsetSign = offsetMs >= 0 ? '+' : '-';

        // 格式化日期时间
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

        // 格式化偏移量
        const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetString}`;
    }

    /**
     * 获取时区偏移字符串 (±HH:mm)
     */
    static getTimeZoneOffsetString(timeZone: string = 'America/Toronto'): string {
        const now = new Date();
        const timeZoneDate = new Date(now.toLocaleString("en-US", { timeZone }));
        const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
        const offsetMs = timeZoneDate.getTime() - utcDate.getTime();

        const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
        const offsetMinutes = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
        const offsetSign = offsetMs >= 0 ? '+' : '-';

        return `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    }

    /**
     * 获取时区偏移量（分钟）
     */
    static getTimeZoneOffsetMinutes(timeZone: string = 'America/Toronto'): number {
        const now = new Date();
        const timeZoneDate = new Date(now.toLocaleString("en-US", { timeZone }));
        const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
        const offsetMs = timeZoneDate.getTime() - utcDate.getTime();

        return offsetMs / (1000 * 60); // 转换为分钟
    }

    /**
     * 获取时区偏移量（小时）
     */
    static getTimeZoneOffsetHours(timeZone: string = 'America/Toronto'): number {
        return this.getTimeZoneOffsetMinutes(timeZone) / 60;
    }

    /**
     * 获取时区详细信息
     */
    static getTimeZoneInfo(timeZone: string = 'America/Toronto'): {
        timeZone: string;
        offsetString: string;
        offsetMinutes: number;
        offsetHours: number;
        isDST: boolean; // 是否为夏令时
        currentTime: string;
    } {
        const now = new Date();
        const offsetMinutes = this.getTimeZoneOffsetMinutes(timeZone);
        const offsetHours = offsetMinutes / 60;
        const offsetString = this.getTimeZoneOffsetString(timeZone);

        // 检查是否为夏令时（简单判断）
        const january = new Date(now.getFullYear(), 0, 1);
        const july = new Date(now.getFullYear(), 6, 1);
        const janOffset = this.getTimeZoneOffsetMinutes(timeZone);
        const julyOffset = new Date(july.toLocaleString("en-US", { timeZone })).getTime() -
            new Date(july.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
        const isDST = Math.abs(offsetMinutes * 60 * 1000 - julyOffset) < Math.abs(janOffset * 60 * 1000 - julyOffset);

        const currentTime = this.getTimeZoneISO(timeZone);

        return {
            timeZone,
            offsetString,
            offsetMinutes,
            offsetHours,
            isDST,
            currentTime
        };
    }

    /**
     * 获取多个时区的偏移信息
     */
    static getMultipleTimeZoneOffsets(timeZones: string[]): Record<string, {
        offsetString: string;
        offsetMinutes: number;
        offsetHours: number;
    }> {
        const result: Record<string, any> = {};

        timeZones.forEach(tz => {
            result[tz] = {
                offsetString: this.getTimeZoneOffsetString(tz),
                offsetMinutes: this.getTimeZoneOffsetMinutes(tz),
                offsetHours: this.getTimeZoneOffsetHours(tz)
            };
        });

        return result;
    }

    /**
     * 比较两个时区的时间差异
     */
    static compareTimeZones(timeZone1: string, timeZone2: string): {
        timezone1: string;
        timezone2: string;
        offset1: string;
        offset2: string;
        timeDifference: number; // 以小时为单位的时间差
    } {
        const now = new Date();

        const offset1 = this.getTimeZoneOffsetString(timeZone1);
        const offset2 = this.getTimeZoneOffsetString(timeZone2);

        // 计算时间差（以小时为单位）
        const date1 = new Date(now.toLocaleString("en-US", { timeZone: timeZone1 }));
        const date2 = new Date(now.toLocaleString("en-US", { timeZone: timeZone2 }));
        const timeDifference = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60);

        return {
            timezone1: timeZone1,
            timezone2: timeZone2,
            offset1,
            offset2,
            timeDifference
        };
    }

    /**
     * 根据偏移量查找时区
     */
    static findTimeZonesByOffset(targetOffsetHours: number): string[] {
        const commonTimeZones = [
            'UTC',
            'America/Toronto', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Moscow',
            'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Seoul', 'Asia/Bangkok', 'Asia/Dubai',
            'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'
        ];

        const matchingTimeZones: string[] = [];

        commonTimeZones.forEach(tz => {
            const offsetHours = this.getTimeZoneOffsetHours(tz);
            if (Math.abs(offsetHours - targetOffsetHours) < 0.1) { // 允许小误差
                matchingTimeZones.push(tz);
            }
        });

        return matchingTimeZones;
    }
} 