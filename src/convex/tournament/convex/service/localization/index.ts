/**
 * 本地化系统统一导出
 * 为整个项目提供统一的本地化支持
 */

// ==================== 错误码系统 ====================
export type {
    CommonErrorCode, ErrorCode, ErrorMessages, GameErrorCode, InventoryErrorCode, SocialErrorCode,
    SystemErrorCode, TaskErrorCode, TournamentErrorCode, UserErrorCode, ValidationErrorCode
} from './errorCodes';

// ==================== 消息码系统 ====================
export type {
    ConfirmMessageCode, InfoMessageCode, MessageCode, MessageTexts, SuccessMessageCode, WarningMessageCode
} from './messageCodes';

// ==================== 本地化管理器 ====================
export { ErrorHandler } from './errorHandler';
export { LocalizationManager } from './localizationManager';
export { MessageHandler } from './messageHandler';

// ==================== 导入类型和函数 ====================
import type {
    CommonErrorCode,
    GameErrorCode,
    InventoryErrorCode,
    SocialErrorCode, SystemErrorCode,
    TaskErrorCode,
    TournamentErrorCode,
    UserErrorCode,
    ValidationErrorCode
} from './errorCodes';
import { ErrorHandler, throwError } from './errorHandler';
import { LocalizationManager } from './localizationManager';
import type {
    ConfirmMessageCode,
    InfoMessageCode,
    SuccessMessageCode,
    WarningMessageCode
} from './messageCodes';
import { MessageHandler, sendConfirm, sendInfo, sendSuccess, sendWarning } from './messageHandler';

// ==================== 单例实例 ====================
const localizationManager = LocalizationManager.getInstance();
const errorHandler = ErrorHandler.getInstance();
const messageHandler = MessageHandler.getInstance();

// ==================== 便捷导出 ====================

/**
 * 快速错误抛出函数
 */
export const throwUserError = (code: UserErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

export const throwGameError = (code: GameErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

export const throwTournamentError = (code: TournamentErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

export const throwInventoryError = (code: InventoryErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

export const throwTaskError = (code: TaskErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

export const throwSocialError = (code: SocialErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

export const throwSystemError = (code: SystemErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

export const throwValidationError = (code: ValidationErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

export const throwCommonError = (code: CommonErrorCode, params?: Record<string, any>, context?: string) =>
    throwError(code, params, undefined, context);

/**
 * 快速消息发送函数
 */
export const sendSuccessMessage = (code: SuccessMessageCode, params?: Record<string, any>, context?: string) =>
    sendSuccess(code, params, undefined, context);

export const sendInfoMessage = (code: InfoMessageCode, params?: Record<string, any>, context?: string) =>
    sendInfo(code, params, undefined, context);

export const sendWarningMessage = (code: WarningMessageCode, params?: Record<string, any>, context?: string) =>
    sendWarning(code, params, undefined, context);

export const sendConfirmMessage = (code: ConfirmMessageCode, params?: Record<string, any>, context?: string) =>
    sendConfirm(code, params, undefined, context);

// ==================== 类型导出 ====================

/**
 * 本地化系统配置类型
 */
export interface LocalizationConfig {
    defaultLocale: string;
    fallbackLocale: string;
    supportedLocales: string[];
    autoDetect: boolean;
    persistLocale: boolean;
}

/**
 * 错误处理配置类型
 */
export interface ErrorHandlerConfig {
    logErrors: boolean;
    showUserFriendlyErrors: boolean;
    maxErrorLogSize: number;
    errorReportingEnabled: boolean;
}

/**
 * 消息处理配置类型
 */
export interface MessageHandlerConfig {
    maxMessageHistory: number;
    autoClearOldMessages: boolean;
    messageTimeout: number;
    showNotifications: boolean;
}

/**
 * 完整配置类型
 */
export interface LocalizationSystemConfig {
    localization: LocalizationConfig;
    errorHandler: ErrorHandlerConfig;
    messageHandler: MessageHandlerConfig;
}

// ==================== 配置管理 ====================

/**
 * 默认配置
 */
export const defaultConfig: LocalizationSystemConfig = {
    localization: {
        defaultLocale: 'zh-CN',
        fallbackLocale: 'zh-CN',
        supportedLocales: ['zh-CN', 'en-US'],
        autoDetect: true,
        persistLocale: true
    },
    errorHandler: {
        logErrors: true,
        showUserFriendlyErrors: true,
        maxErrorLogSize: 1000,
        errorReportingEnabled: false
    },
    messageHandler: {
        maxMessageHistory: 1000,
        autoClearOldMessages: true,
        messageTimeout: 5000,
        showNotifications: true
    }
};

/**
 * 初始化本地化系统
 */
export function initializeLocalizationSystem(config: Partial<LocalizationSystemConfig> = {}): void {
    const finalConfig = { ...defaultConfig, ...config };

    // 设置本地化管理器
    localizationManager.setLocale(finalConfig.localization.defaultLocale);
    localizationManager.setFallbackLocale(finalConfig.localization.fallbackLocale);

    // 设置消息处理器
    messageHandler.setMaxHistorySize(finalConfig.messageHandler.maxMessageHistory);

    // 自动检测语言（如果启用）
    if (finalConfig.localization.autoDetect) {
        const browserLocale = navigator.language || 'zh-CN';
        const detectedLocale = finalConfig.localization.supportedLocales.find(
            locale => browserLocale.startsWith(locale)
        );
        if (detectedLocale) {
            localizationManager.setLocale(detectedLocale);
        }
    }

    // 持久化语言设置（如果启用）
    if (finalConfig.localization.persistLocale) {
        const savedLocale = localStorage.getItem('app_locale');
        if (savedLocale && finalConfig.localization.supportedLocales.includes(savedLocale)) {
            localizationManager.setLocale(savedLocale);
        }

        // 监听语言变化
        const originalSetLocale = localizationManager.setLocale.bind(localizationManager);
        localizationManager.setLocale = (locale: string) => {
            originalSetLocale(locale);
            localStorage.setItem('app_locale', locale);
        };
    }
}

/**
 * 获取当前系统状态
 */
export function getLocalizationSystemStatus() {
    return {
        currentLocale: localizationManager.getLocale(),
        supportedLocales: localizationManager.getSupportedLocales(),
        errorStats: {
            totalErrors: errorHandler.getErrorLogs().length,
            unhandledErrors: errorHandler.getUnhandledErrors().length
        },
        messageStats: messageHandler.getMessageStats()
    };
} 