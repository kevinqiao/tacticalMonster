import { getMessage } from './localizationManager';
import { MessageCode } from './messageCodes';

/**
 * 消息类型
 */
export enum MessageType {
    SUCCESS = 'success',
    INFO = 'info',
    WARNING = 'warning',
    CONFIRM = 'confirm',
    ERROR = 'error'
}

/**
 * 消息级别
 */
export enum MessageLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * 本地化消息类
 */
export class LocalizedMessage {
    public readonly code: MessageCode;
    public readonly type: MessageType;
    public readonly level: MessageLevel;
    public readonly params?: Record<string, any>;
    public readonly locale?: string;
    public readonly timestamp: Date;
    public readonly context?: string;
    public readonly message: string;

    constructor(
        code: MessageCode,
        type: MessageType,
        level: MessageLevel = MessageLevel.MEDIUM,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ) {
        this.code = code;
        this.type = type;
        this.level = level;
        this.params = params;
        this.locale = locale;
        this.timestamp = new Date();
        this.context = context;
        this.message = getMessage(code, params, locale);
    }

    /**
     * 获取消息（指定语言）
     */
    getMessage(locale?: string): string {
        return getMessage(this.code, this.params, locale);
    }

    /**
     * 转换为普通对象
     */
    toJSON(): any {
        return {
            code: this.code,
            type: this.type,
            level: this.level,
            message: this.message,
            params: this.params,
            locale: this.locale,
            timestamp: this.timestamp.toISOString(),
            context: this.context
        };
    }
}

/**
 * 消息处理器
 * 提供统一的消息处理和管理功能
 */
export class MessageHandler {
    private static instance: MessageHandler;
    private messageQueue: LocalizedMessage[] = [];
    private messageHistory: LocalizedMessage[] = [];
    private maxHistorySize: number = 1000;
    private listeners: Array<(message: LocalizedMessage) => void> = [];

    private constructor() { }

    /**
     * 获取单例实例
     */
    static getInstance(): MessageHandler {
        if (!MessageHandler.instance) {
            MessageHandler.instance = new MessageHandler();
        }
        return MessageHandler.instance;
    }

    /**
     * 创建成功消息
     */
    createSuccessMessage(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedMessage {
        return new LocalizedMessage(
            code,
            MessageType.SUCCESS,
            MessageLevel.LOW,
            params,
            locale,
            context
        );
    }

    /**
     * 创建信息消息
     */
    createInfoMessage(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedMessage {
        return new LocalizedMessage(
            code,
            MessageType.INFO,
            MessageLevel.LOW,
            params,
            locale,
            context
        );
    }

    /**
     * 创建警告消息
     */
    createWarningMessage(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedMessage {
        return new LocalizedMessage(
            code,
            MessageType.WARNING,
            MessageLevel.MEDIUM,
            params,
            locale,
            context
        );
    }

    /**
     * 创建确认消息
     */
    createConfirmMessage(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedMessage {
        return new LocalizedMessage(
            code,
            MessageType.CONFIRM,
            MessageLevel.HIGH,
            params,
            locale,
            context
        );
    }

    /**
     * 发送消息
     */
    sendMessage(message: LocalizedMessage): void {
        this.messageQueue.push(message);
        this.messageHistory.push(message);

        // 限制历史记录大小
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }

        // 通知监听器
        this.notifyListeners(message);

        // 在开发环境下输出到控制台
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${message.type.toUpperCase()}] ${message.message}`, {
                code: message.code,
                params: message.params,
                context: message.context,
                timestamp: message.timestamp
            });
        }
    }

    /**
     * 发送成功消息
     */
    sendSuccess(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedMessage {
        const message = this.createSuccessMessage(code, params, locale, context);
        this.sendMessage(message);
        return message;
    }

    /**
     * 发送信息消息
     */
    sendInfo(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedMessage {
        const message = this.createInfoMessage(code, params, locale, context);
        this.sendMessage(message);
        return message;
    }

    /**
     * 发送警告消息
     */
    sendWarning(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedMessage {
        const message = this.createWarningMessage(code, params, locale, context);
        this.sendMessage(message);
        return message;
    }

    /**
     * 发送确认消息
     */
    sendConfirm(
        code: MessageCode,
        params?: Record<string, any>,
        locale?: string,
        context?: string
    ): LocalizedMessage {
        const message = this.createConfirmMessage(code, params, locale, context);
        this.sendMessage(message);
        return message;
    }

    /**
     * 获取消息队列
     */
    getMessageQueue(): LocalizedMessage[] {
        return [...this.messageQueue];
    }

    /**
     * 获取消息历史
     */
    getMessageHistory(): LocalizedMessage[] {
        return [...this.messageHistory];
    }

    /**
     * 清空消息队列
     */
    clearMessageQueue(): void {
        this.messageQueue = [];
    }

    /**
     * 清空消息历史
     */
    clearMessageHistory(): void {
        this.messageHistory = [];
    }

    /**
     * 获取特定类型的消息
     */
    getMessagesByType(type: MessageType): LocalizedMessage[] {
        return this.messageHistory.filter(message => message.type === type);
    }

    /**
     * 获取特定级别的消息
     */
    getMessagesByLevel(level: MessageLevel): LocalizedMessage[] {
        return this.messageHistory.filter(message => message.level === level);
    }

    /**
     * 添加消息监听器
     */
    addListener(listener: (message: LocalizedMessage) => void): void {
        this.listeners.push(listener);
    }

    /**
     * 移除消息监听器
     */
    removeListener(listener: (message: LocalizedMessage) => void): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 通知所有监听器
     */
    private notifyListeners(message: LocalizedMessage): void {
        this.listeners.forEach(listener => {
            try {
                listener(message);
            } catch (error) {
                console.error('Error in message listener:', error);
            }
        });
    }

    /**
     * 设置最大历史记录大小
     */
    setMaxHistorySize(size: number): void {
        this.maxHistorySize = size;

        // 如果当前历史记录超过新的大小限制，则截断
        if (this.messageHistory.length > size) {
            this.messageHistory = this.messageHistory.slice(-size);
        }
    }

    /**
     * 获取消息统计信息
     */
    getMessageStats(): {
        total: number;
        byType: Record<MessageType, number>;
        byLevel: Record<MessageLevel, number>;
        recent: number; // 最近1小时的消息数量
    } {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const byType: Record<MessageType, number> = {
            [MessageType.SUCCESS]: 0,
            [MessageType.INFO]: 0,
            [MessageType.WARNING]: 0,
            [MessageType.CONFIRM]: 0,
            [MessageType.ERROR]: 0
        };

        const byLevel: Record<MessageLevel, number> = {
            [MessageLevel.LOW]: 0,
            [MessageLevel.MEDIUM]: 0,
            [MessageLevel.HIGH]: 0,
            [MessageLevel.CRITICAL]: 0
        };

        let recent = 0;

        this.messageHistory.forEach(message => {
            byType[message.type]++;
            byLevel[message.level]++;

            if (message.timestamp >= oneHourAgo) {
                recent++;
            }
        });

        return {
            total: this.messageHistory.length,
            byType,
            byLevel,
            recent
        };
    }
}

/**
 * 全局消息处理器实例
 */
export const messageHandler = MessageHandler.getInstance();

/**
 * 便捷函数：发送成功消息
 */
export function sendSuccess(
    code: MessageCode,
    params?: Record<string, any>,
    locale?: string,
    context?: string
): LocalizedMessage {
    return messageHandler.sendSuccess(code, params, locale, context);
}

/**
 * 便捷函数：发送信息消息
 */
export function sendInfo(
    code: MessageCode,
    params?: Record<string, any>,
    locale?: string,
    context?: string
): LocalizedMessage {
    return messageHandler.sendInfo(code, params, locale, context);
}

/**
 * 便捷函数：发送警告消息
 */
export function sendWarning(
    code: MessageCode,
    params?: Record<string, any>,
    locale?: string,
    context?: string
): LocalizedMessage {
    return messageHandler.sendWarning(code, params, locale, context);
}

/**
 * 便捷函数：发送确认消息
 */
export function sendConfirm(
    code: MessageCode,
    params?: Record<string, any>,
    locale?: string,
    context?: string
): LocalizedMessage {
    return messageHandler.sendConfirm(code, params, locale, context);
}

/**
 * 消息类型守卫
 */
export function isLocalizedMessage(message: any): message is LocalizedMessage {
    return message instanceof LocalizedMessage;
}

/**
 * 消息码类型守卫
 */
export function isMessageCode(code: any): code is MessageCode {
    return typeof code === 'number' && code >= 10000 && code <= 49999;
}

/**
 * 消息处理装饰器（用于类方法）
 */
export function handleMessages(
    successCode: MessageCode,
    errorCode: MessageCode,
    context?: string
) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            try {
                const result = await method.apply(this, args);

                // 发送成功消息
                messageHandler.sendSuccess(
                    successCode,
                    { result },
                    undefined,
                    context || `${target.constructor.name}.${propertyName}`
                );

                return result;
            } catch (error) {
                // 发送错误消息
                messageHandler.sendWarning(
                    errorCode,
                    { error: error instanceof Error ? error.message : String(error) },
                    undefined,
                    context || `${target.constructor.name}.${propertyName}`
                );

                throw error;
            }
        };
    };
} 