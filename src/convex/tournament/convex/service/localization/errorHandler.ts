import { ErrorCode } from './errorCodes';
import { getErrorMessage } from './localizationManager';

/**
 * 自定义错误类
 * 支持本地化错误信息和参数替换
 */
export class LocalizedError extends Error {
    public readonly code: ErrorCode;
    public readonly params?: Record<string, any>;
    public readonly locale?: string;
    public readonly timestamp: Date;
    public readonly context?: string;

    constructor(
        code: ErrorCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ) {
        const message = getErrorMessage(code, params, locale);
        super(message);

        this.name = 'LocalizedError';
        this.code = code;
        this.params = params;
        this.locale = locale;
        this.timestamp = new Date();
        this.context = context;

        // 确保错误堆栈正确
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, LocalizedError);
        }
    }

    /**
     * 获取错误信息（指定语言）
     */
    getMessage(locale?: string): string {
        return getErrorMessage(this.code, this.params, locale);
    }

    /**
     * 转换为普通对象
     */
    toJSON(): any {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            params: this.params,
            locale: this.locale,
            timestamp: this.timestamp.toISOString(),
            context: this.context,
            stack: this.stack
        };
    }
}

/**
 * 错误处理器
 * 提供统一的错误处理和管理功能
 */
export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorLogs: Array<{
        error: LocalizedError;
        handled: boolean;
        handledAt?: Date;
    }> = [];

    private constructor() { }

    /**
     * 获取单例实例
     */
    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * 创建本地化错误
     */
    createError(
        code: ErrorCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedError {
        return new LocalizedError(code, params, locale, context);
    }

    /**
     * 抛出本地化错误
     */
    throwError(
        code: ErrorCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): never {
        const error = this.createError(code, params, locale, context);
        this.logError(error);
        throw error;
    }

    /**
     * 记录错误
     */
    logError(error: LocalizedError): void {
        this.errorLogs.push({
            error,
            handled: false
        });

        // 在开发环境下输出到控制台
        if (process.env.NODE_ENV === 'development') {
            console.error('LocalizedError:', {
                code: error.code,
                message: error.message,
                params: error.params,
                context: error.context,
                timestamp: error.timestamp
            });
        }
    }

    /**
     * 标记错误为已处理
     */
    markErrorHandled(error: LocalizedError): void {
        const logEntry = this.errorLogs.find(log => log.error === error);
        if (logEntry) {
            logEntry.handled = true;
            logEntry.handledAt = new Date();
        }
    }

    /**
     * 获取错误日志
     */
    getErrorLogs(): Array<{
        error: LocalizedError;
        handled: boolean;
        handledAt?: Date;
    }> {
        return [...this.errorLogs];
    }

    /**
     * 清除错误日志
     */
    clearErrorLogs(): void {
        this.errorLogs = [];
    }

    /**
     * 获取未处理的错误
     */
    getUnhandledErrors(): LocalizedError[] {
        return this.errorLogs
            .filter(log => !log.handled)
            .map(log => log.error);
    }

    /**
     * 处理异步操作中的错误
     */
    async handleAsync<T>(
        operation: () => Promise<T>,
        fallbackCode: ErrorCode = 9999,
        context?: string
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (error instanceof LocalizedError) {
                this.logError(error);
                throw error;
            } else {
                const localizedError = this.createError(
                    fallbackCode,
                    { originalError: error instanceof Error ? error.message : String(error) },
                    undefined,
                    context
                );
                this.logError(localizedError);
                throw localizedError;
            }
        }
    }

    /**
     * 包装函数以处理错误
     */
    wrapFunction<T extends any[], R>(
        fn: (...args: T) => R,
        errorCode: ErrorCode,
        context?: string
    ): (...args: T) => R {
        return (...args: T): R => {
            try {
                return fn(...args);
            } catch (error) {
                if (error instanceof LocalizedError) {
                    this.logError(error);
                    throw error;
                } else {
                    const localizedError = this.createError(
                        errorCode,
                        { originalError: error instanceof Error ? error.message : String(error) },
                        undefined,
                        context
                    );
                    this.logError(localizedError);
                    throw localizedError;
                }
            }
        };
    }

    /**
     * 包装异步函数以处理错误
     */
    wrapAsyncFunction<T extends any[], R>(
        fn: (...args: T) => Promise<R>,
        errorCode: ErrorCode,
        context?: string
    ): (...args: T) => Promise<R> {
        return async (...args: T): Promise<R> => {
            try {
                return await fn(...args);
            } catch (error) {
                if (error instanceof LocalizedError) {
                    this.logError(error);
                    throw error;
                } else {
                    const localizedError = this.createError(
                        errorCode,
                        { originalError: error instanceof Error ? error.message : String(error) },
                        undefined,
                        context
                    );
                    this.logError(localizedError);
                    throw localizedError;
                }
            }
        };
    }
}

/**
 * 全局错误处理器实例
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * 便捷函数：创建错误
 */
export function createError(
    code: ErrorCode,
    params?: Record<string, any>,
    locale?: string,
    context?: string
): LocalizedError {
    return errorHandler.createError(code, params, locale, context);
}

/**
 * 便捷函数：抛出错误
 */
export function throwError(
    code: ErrorCode,
    params?: Record<string, any>,
    locale?: string,
    context?: string
): never {
    return errorHandler.throwError(code, params, locale, context);
}

/**
 * 便捷函数：处理异步操作
 */
export function handleAsync<T>(
    operation: () => Promise<T>,
    fallbackCode: ErrorCode = 9999,
    context?: string
): Promise<T> {
    return errorHandler.handleAsync(operation, fallbackCode, context);
}

/**
 * 便捷函数：包装函数
 */
export function wrapFunction<T extends any[], R>(
    fn: (...args: T) => R,
    errorCode: ErrorCode,
    context?: string
): (...args: T) => R {
    return errorHandler.wrapFunction(fn, errorCode, context);
}

/**
 * 便捷函数：包装异步函数
 */
export function wrapAsyncFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorCode: ErrorCode,
    context?: string
): (...args: T) => Promise<R> {
    return errorHandler.wrapAsyncFunction(fn, errorCode, context);
}

/**
 * 错误类型守卫
 */
export function isLocalizedError(error: any): error is LocalizedError {
    return error instanceof LocalizedError;
}

/**
 * 错误码类型守卫
 */
export function isErrorCode(code: any): code is ErrorCode {
    return typeof code === 'number' && code >= 1000 && code <= 9999;
}

/**
 * 错误处理装饰器（用于类方法）
 */
export function handleErrors(errorCode: ErrorCode, context?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            try {
                return await method.apply(this, args);
            } catch (error) {
                if (error instanceof LocalizedError) {
                    errorHandler.logError(error);
                    throw error;
                } else {
                    const localizedError = errorHandler.createError(
                        errorCode,
                        { originalError: error instanceof Error ? error.message : String(error) },
                        undefined,
                        context || `${target.constructor.name}.${propertyName}`
                    );
                    errorHandler.logError(localizedError);
                    throw localizedError;
                }
            }
        };
    };
} 