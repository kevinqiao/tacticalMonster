import { v } from "convex/values";
import { mutation } from "../../../_generated/server";

export const testTime = (mutation as any)({
    args: { date: v.string(), time: v.string() },
    handler: async (ctx: any, args: { date: string, time: string }) => {
        // const utcTime = new Date('2025-01-27T14:30:00Z')
        // const utcTime = new Date()
        // const localTime = utcTime.toLocaleString('en-US', {
        //     timeZone: 'America/Toronto'
        // });
        // console.log(localTime);
        // console.log(utcTime.toISOString());
        // const date = new Date();
        // const timeZoneString = date.toLocaleString("en-CA", {
        //     timeZone: 'America/Toronto',
        //     year: 'numeric',
        //     month: '2-digit',
        //     day: '2-digit',
        //     hour: '2-digit',
        //     minute: '2-digit',
        //     second: '2-digit',
        //     hour12: false
        // });

        // // 2. 创建该时区的 Date 对象
        // const timeZoneDate = new Date(timeZoneString);
        // console.log(timeZoneDate.toISOString());

        const now = new Date();
        const torontoISO = getISOWithOffset(now, 'America/Toronto');
        const tokyoISO = getISOWithOffset(now, 'Asia/Tokyo');
        const londonISO = getISOWithOffset(now, 'Europe/London');

        console.log('多伦多 ISO (带偏移):', torontoISO);
        console.log('东京 ISO (带偏移):', tokyoISO);
        console.log('伦敦 ISO (带偏移):', londonISO);

        // 测试 getDate 方法
        console.log('\n=== 测试 getDate 方法 ===');
        console.log('多伦多当前日期:', getDate('America/Toronto'));
        console.log('东京当前日期:', getDate('Asia/Tokyo'));
        console.log('伦敦当前日期:', getDate('Europe/London'));
        console.log('纽约当前日期:', getDate('America/New_York'));
        console.log('上海当前日期:', getDate('Asia/Shanghai'));

        // 测试 getDateFromDate 方法
        console.log('\n=== 测试 getDateFromDate 方法 ===');
        const specificDate = new Date('2025-01-27T23:30:00Z'); // UTC 时间
        console.log('原始时间 (UTC):', specificDate.toISOString());
        console.log('多伦多日期:', getDateFromDate(specificDate, 'America/Toronto'));
        console.log('东京日期:', getDateFromDate(specificDate, 'Asia/Tokyo'));
        console.log('伦敦日期:', getDateFromDate(specificDate, 'Europe/London'));
        console.log('上海日期:', getDateFromDate(specificDate, 'Asia/Shanghai'));
    },
});

function getISOWithOffset(date: Date, timeZone: string): string {
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
 * 获取指定时区的当前日期 (YYYY-MM-DD 格式)
 */
function getDate(timeZone: string = 'America/Toronto'): string {
    const now = new Date();

    // 使用 toLocaleDateString 获取指定时区的日期
    const dateString = now.toLocaleDateString("en-CA", {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    return dateString; // 返回 YYYY-MM-DD 格式
}

/**
 * 获取指定日期在指定时区的日期字符串
 */
function getDateFromDate(date: Date, timeZone: string = 'America/Toronto'): string {
    const dateString = date.toLocaleDateString("en-CA", {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    return dateString; // 返回 YYYY-MM-DD 格式
}

// 使用示例
