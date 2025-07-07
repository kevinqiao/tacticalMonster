import { ErrorCode, ErrorMessages } from './errorCodes';
import { MessageCode, MessageTexts } from './messageCodes';

/**
 * 本地化管理器
 * 为整个项目提供统一的本地化支持
 */
export class LocalizationManager {
    private static instance: LocalizationManager;
    private currentLocale: string = 'zh-CN';
    private fallbackLocale: string = 'zh-CN';

    private constructor() { }

    /**
     * 获取单例实例
     */
    static getInstance(): LocalizationManager {
        if (!LocalizationManager.instance) {
            LocalizationManager.instance = new LocalizationManager();
        }
        return LocalizationManager.instance;
    }

    /**
     * 设置当前语言
     */
    setLocale(locale: string): void {
        this.currentLocale = locale;
    }

    /**
     * 获取当前语言
     */
    getLocale(): string {
        return this.currentLocale;
    }

    /**
     * 设置备用语言
     */
    setFallbackLocale(locale: string): void {
        this.fallbackLocale = locale;
    }

    /**
     * 获取本地化错误信息
     */
    getErrorMessage(
        code: ErrorCode,
        params?: Record<string, any>,
        locale?: string
    ): string {
        const targetLocale = locale || this.currentLocale;
        const messages = ErrorMessages[targetLocale as keyof typeof ErrorMessages];

        if (!messages || !messages[code]) {
            // 使用备用语言
            const fallbackMessages = ErrorMessages[this.fallbackLocale as keyof typeof ErrorMessages];
            const message = fallbackMessages[code] || '未知错误';
            return this.replaceParams(message, params);
        }

        const message = messages[code];
        return this.replaceParams(message, params);
    }

    /**
     * 获取本地化消息
     */
    getMessage(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string
    ): string {
        const targetLocale = locale || this.currentLocale;
        const messages = MessageTexts[targetLocale as keyof typeof MessageTexts];

        if (!messages || !messages[code]) {
            // 使用备用语言
            const fallbackMessages = MessageTexts[this.fallbackLocale as keyof typeof MessageTexts];
            const message = fallbackMessages[code] || '未知消息';
            return this.replaceParams(message, params);
        }

        const message = messages[code];
        return this.replaceParams(message, params);
    }

    /**
     * 替换参数占位符
     */
    private replaceParams(message: string, params?: Record<string, any>): string {
        if (!params) return message;

        let result = message;
        Object.keys(params).forEach(key => {
            const placeholder = new RegExp(`\\{${key}\\}`, 'g');
            result = result.replace(placeholder, String(params[key]));
        });

        return result;
    }

    /**
     * 检查语言是否支持
     */
    isLocaleSupported(locale: string): boolean {
        return locale in ErrorMessages && locale in MessageTexts;
    }

    /**
     * 获取支持的语言列表
     */
    getSupportedLocales(): string[] {
        return Object.keys(ErrorMessages).filter(locale =>
            locale in MessageTexts
        );
    }

    /**
     * 格式化数字
     */
    formatNumber(
        number: number,
        locale?: string,
        options?: Intl.NumberFormatOptions
    ): string {
        const targetLocale = locale || this.currentLocale;
        return new Intl.NumberFormat(targetLocale, options).format(number);
    }

    /**
     * 格式化日期
     */
    formatDate(
        date: Date | string | number,
        locale?: string,
        options?: Intl.DateTimeFormatOptions
    ): string {
        const targetLocale = locale || this.currentLocale;
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(targetLocale, options).format(dateObj);
    }

    /**
     * 格式化货币
     */
    formatCurrency(
        amount: number,
        currency: string = 'CNY',
        locale?: string,
        options?: Intl.NumberFormatOptions
    ): string {
        const targetLocale = locale || this.currentLocale;
        return new Intl.NumberFormat(targetLocale, {
            style: 'currency',
            currency,
            ...options
        }).format(amount);
    }

    /**
     * 获取相对时间
     */
    getRelativeTime(
        date: Date | string | number,
        locale?: string
    ): string {
        const targetLocale = locale || this.currentLocale;
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

        const rtf = new Intl.RelativeTimeFormat(targetLocale, { numeric: 'auto' });

        if (diffInSeconds < 60) {
            return rtf.format(-diffInSeconds, 'second');
        } else if (diffInSeconds < 3600) {
            return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
        } else if (diffInSeconds < 86400) {
            return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
        } else {
            return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
        }
    }
}

/**
 * 全局本地化管理器实例
 */
export const localizationManager = LocalizationManager.getInstance();

/**
 * 便捷函数：获取错误信息
 */
export function getErrorMessage(
    code: ErrorCode,
    params?: Record<string, any>,
    locale?: string
): string {
    return localizationManager.getErrorMessage(code, params, locale);
}

/**
 * 便捷函数：获取消息
 */
export function getMessage(
    code: MessageCode,
    params?: Record<string, any>,
    locale?: string
): string {
    return localizationManager.getMessage(code, params, locale);
}

/**
 * 便捷函数：格式化数字
 */
export function formatNumber(
    number: number,
    locale?: string,
    options?: Intl.NumberFormatOptions
): string {
    return localizationManager.formatNumber(number, locale, options);
}

/**
 * 便捷函数：格式化日期
 */
export function formatDate(
    date: Date | string | number,
    locale?: string,
    options?: Intl.DateTimeFormatOptions
): string {
    return localizationManager.formatDate(date, locale, options);
}

/**
 * 便捷函数：格式化货币
 */
export function formatCurrency(
    amount: number,
    currency: string = 'CNY',
    locale?: string,
    options?: Intl.NumberFormatOptions
): string {
    return localizationManager.formatCurrency(amount, currency, locale, options);
}

/**
 * 便捷函数：获取相对时间
 */
export function getRelativeTime(
    date: Date | string | number,
    locale?: string
): string {
    return localizationManager.getRelativeTime(date, locale);
} 