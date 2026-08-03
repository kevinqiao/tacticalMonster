import moment from 'moment-timezone';
import * as PIXI from "pixi.js";
import seedrandom from 'seedrandom';
export const getNthRandom = (seed: string, n: number): number => {
    const rng = seedrandom(seed);
    let value = 0;

    for (let i = 0; i < n; i++) {
        value = rng();
    }

    return value;
}
export const getRandomSeed = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
export const getRandom = (max: number) => {
    return Math.floor(Math.random() * max);
}
export const loadSvgAsTexture = (url: string, callback: (texture: PIXI.Texture) => void) => {
    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context');
        }

        context.drawImage(image, 0, 0);
        const texture = PIXI.Texture.from(canvas);
        callback(texture);
    };
    image.onerror = () => {
        throw new Error('Failed to load image at ' + url);
    };
    image.src = url;
}



// 定义一个函数来获取指定时区的日期时间信息及星期的数字形式
export const getNow = (timeZone: string): { day: number; hour: number; weekday: number, minute: number } => {
    // 获取指定时区的当前时间
    const now = moment().tz(timeZone);
    const day: number = now.date();  // 日
    const weekday: number = now.day();  // 星期几（数字形式，0 = Sunday, 6 = Saturday）
    const hour: number = now.hours();  // 小时（数字，0至23）
    const minute: number = now.minutes();  // 分钟（数字，0至59
    return {
        day, weekday, hour, minute
    };
}
export const getMonthDate = (timeZone: string, day: number, hour: number, minute: number): Date => {
    // 获取指定时区的当月的时间
    const date = moment().tz(timeZone);

    // 设置日、小时和分钟
    date.date(day);   // 设置日期（日）
    date.hours(hour);  // 设置小时
    date.minutes(minute);  // 设置分钟

    return date.toDate();

}
export const getWeekDate = (timeZone: string, weekday: number, hour: number, minute: number): Date => {
    // 获取指定时区的当月的时间
    const date = moment().tz(timeZone);

    date.startOf('week').add(weekday, 'days');  // 从本周开始，增加指定的天数（weekday）
    date.hours(hour);  // 设置小时
    date.minutes(minute);  // 设置分钟
    date.seconds(0);  // 通常将秒数设置为0，以保持一致性
    date.milliseconds(0);  // 同样，将毫秒设置为0
    return date.toDate();

}
export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchAndRetry(
    input: RequestInfo,
    init?: RequestInit | undefined,
    nRetries = 3,
): Promise<Response> {
    try {
        // Make the request
        const response = await fetch(input, init);

        // If there's a 429 error code, retry after retry_after seconds
        // https://discord.com/developers/docs/topics/rate-limits#rate-limits
        if (response.status === 429 && nRetries > 0) {
            const retryAfter = Number(response.headers.get('retry_after'));
            if (Number.isNaN(retryAfter)) {
                return response;
            }
            await sleep(retryAfter * 1000);
            return await fetchAndRetry(input, init, nRetries - 1);
        } else {
            return response;
        }
    } catch (ex) {
        if (nRetries <= 0) {
            throw ex;
        }

        // If the request failed, wait one second before trying again
        // This could probably be fancier with exponential backoff
        await sleep(1000);
        return await fetchAndRetry(input, init, nRetries - 1);
    }
}
