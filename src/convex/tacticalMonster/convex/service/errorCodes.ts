/**
 * 锦标赛系统错误码定义
 */
export enum TacticalMonsterErrorCode {
    // 参赛资格错误 (1000-1999)
    GAME_CREATE_FAILED = 4000,
    STAGE_NOT_UNLOCKED = 3000,
    STAGE_NOT_FOUND = 3001,
    INSUFFICIENT_ENERGY = 1000,
    INSUFFICIENT_COINS = 1001,
    INSUFFICIENT_GEMS = 1002,
    INSUFFICIENT_TICKETS = 1003,
    SEGMENT_TOO_LOW = 1103,
    SEGMENT_TOO_HIGH = 1104,
    SUBSCRIPTION_REQUIRED = 1105,
    MAX_ATTEMPTS_REACHED = 1106,
    TOURNAMENT_NOT_FOUND = 11007,
    PLAYER_NOT_FOUND = 11008,
    SEASON_NOT_ACTIVE = 1109,
    PLAYER_LEVEL_NOT_ENOUGH = 1110,

    // 比赛相关错误 (2000-2999)
    MATCH_NOT_FOUND = 2001,
    MATCH_ALREADY_COMPLETED = 2002,
    INVALID_SCORE = 2003,
    GAME_DATA_INVALID = 2004,

    // 系统错误 (3000-3999)
    DATABASE_ERROR = 3001,
    NETWORK_ERROR = 3002,
    CONFIGURATION_ERROR = 3003,

    // 通用错误 (9000-9999)
    UNKNOWN_ERROR = 9999,
    VALIDATION_ERROR = 9001,
    PERMISSION_DENIED = 9002,
}

/**
 * 错误信息本地化映射表
 */
export const ErrorMessages = {
    // 中文
    'zh-CN': {
        [TacticalMonsterErrorCode.STAGE_NOT_UNLOCKED]: '关卡未解锁',
        [TacticalMonsterErrorCode.INSUFFICIENT_COINS]: '金币不足，需要 {required} 金币，当前只有 {current} 金币',
        [TacticalMonsterErrorCode.PLAYER_NOT_FOUND]: '玩家不存在 (UID: {uid})',
        [TacticalMonsterErrorCode.SEASON_NOT_ACTIVE]: '当前无活跃赛季',
        [TacticalMonsterErrorCode.PLAYER_LEVEL_NOT_ENOUGH]: '玩家等级不足，需要至少 {required} 级，当前为 {current} 级',
        [TacticalMonsterErrorCode.MATCH_NOT_FOUND]: '比赛不存在 (ID: {matchId})',
        [TacticalMonsterErrorCode.MATCH_ALREADY_COMPLETED]: '比赛已完成 (ID: {matchId})',
        [TacticalMonsterErrorCode.INVALID_SCORE]: '无效的分数 {score}，应在 {minScore}-{maxScore} 范围内',
        [TacticalMonsterErrorCode.GAME_DATA_INVALID]: '游戏数据无效: {reason}',
        [TacticalMonsterErrorCode.DATABASE_ERROR]: '数据库错误: {operation}',
        [TacticalMonsterErrorCode.NETWORK_ERROR]: '网络错误',
        [TacticalMonsterErrorCode.CONFIGURATION_ERROR]: '配置错误: {configKey}',
        [TacticalMonsterErrorCode.UNKNOWN_ERROR]: '未知错误',
        [TacticalMonsterErrorCode.VALIDATION_ERROR]: '数据验证失败: {field} - {reason}',
        [TacticalMonsterErrorCode.PERMISSION_DENIED]: '权限不足: {action}',
    },

    // 英文
    'en-US': {
        [TacticalMonsterErrorCode.STAGE_NOT_UNLOCKED]: 'Stage not unlocked',
        [TacticalMonsterErrorCode.INSUFFICIENT_COINS]: 'Insufficient coins, need {required} coins, current: {current}',
        [TacticalMonsterErrorCode.PLAYER_NOT_FOUND]: 'Player not found (UID: {uid})',
    }
};

/**
 * 自定义错误类
 */
export class TacticalMonsterError extends Error {
    public code: TacticalMonsterErrorCode;
    public params?: Record<string, any>;

    constructor(code: TacticalMonsterErrorCode, params?: Record<string, any>) {
        super(`TournamentError: ${code}`);
        this.name = 'TournamentError';
        this.code = code;
        this.params = params;
    }
}

/**
 * 获取本地化错误信息
 */
export function getLocalizedErrorMessage(
    code: TacticalMonsterErrorCode,
    locale: string = 'zh-CN',
    params?: Record<string, any>
): string {
    const messages = ErrorMessages[locale as keyof typeof ErrorMessages];
    if (!messages) {
        return (ErrorMessages['zh-CN'] as Record<number, string>)[code] || '未知错误';
    }

    let message = (messages as Record<number, string>)[code] || (ErrorMessages['zh-CN'] as Record<number, string>)[code] || '未知错误';

    // 替换参数占位符
    if (params) {
        Object.keys(params).forEach(key => {
            message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(params[key]));
        });
    }

    return message;
}

/**
 * 创建带参数的错误信息
 */
export function createErrorWithParams(
    code: TacticalMonsterErrorCode,
    params?: Record<string, any>
): TacticalMonsterError {
    return new TacticalMonsterError(code, params);
} 