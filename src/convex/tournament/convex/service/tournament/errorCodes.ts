/**
 * 锦标赛系统错误码定义
 */
export enum TournamentErrorCode {
    // 参赛资格错误 (1000-1999)
    INSUFFICIENT_COINS = 1001,
    INSUFFICIENT_TICKETS = 1002,
    SEGMENT_TOO_LOW = 1003,
    SEGMENT_TOO_HIGH = 1004,
    SUBSCRIPTION_REQUIRED = 1005,
    MAX_ATTEMPTS_REACHED = 1006,
    TOURNAMENT_NOT_FOUND = 1007,
    PLAYER_NOT_FOUND = 1008,
    SEASON_NOT_ACTIVE = 1009,

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
        [TournamentErrorCode.INSUFFICIENT_COINS]: '金币不足，需要 {required} 金币，当前只有 {current} 金币',
        [TournamentErrorCode.INSUFFICIENT_TICKETS]: '门票不足，需要 {required} 张 {gameType} 门票，当前只有 {current} 张',
        [TournamentErrorCode.SEGMENT_TOO_LOW]: '段位过低，需要至少 {required} 段位，当前为 {current} 段位',
        [TournamentErrorCode.SEGMENT_TOO_HIGH]: '段位过高，不能超过 {required} 段位，当前为 {current} 段位',
        [TournamentErrorCode.SUBSCRIPTION_REQUIRED]: '需要订阅会员才能参与此锦标赛',
        [TournamentErrorCode.MAX_ATTEMPTS_REACHED]: '已达到{timeRange}最大尝试次数 ({currentAttempts}/{maxAttempts})',
        [TournamentErrorCode.TOURNAMENT_NOT_FOUND]: '锦标赛不存在 (ID: {tournamentId})',
        [TournamentErrorCode.PLAYER_NOT_FOUND]: '玩家不存在 (UID: {uid})',
        [TournamentErrorCode.SEASON_NOT_ACTIVE]: '当前无活跃赛季',
        [TournamentErrorCode.MATCH_NOT_FOUND]: '比赛不存在 (ID: {matchId})',
        [TournamentErrorCode.MATCH_ALREADY_COMPLETED]: '比赛已完成 (ID: {matchId})',
        [TournamentErrorCode.INVALID_SCORE]: '无效的分数 {score}，应在 {minScore}-{maxScore} 范围内',
        [TournamentErrorCode.GAME_DATA_INVALID]: '游戏数据无效: {reason}',
        [TournamentErrorCode.DATABASE_ERROR]: '数据库错误: {operation}',
        [TournamentErrorCode.NETWORK_ERROR]: '网络错误',
        [TournamentErrorCode.CONFIGURATION_ERROR]: '配置错误: {configKey}',
        [TournamentErrorCode.UNKNOWN_ERROR]: '未知错误',
        [TournamentErrorCode.VALIDATION_ERROR]: '数据验证失败: {field} - {reason}',
        [TournamentErrorCode.PERMISSION_DENIED]: '权限不足: {action}',
    },

    // 英文
    'en-US': {
        [TournamentErrorCode.INSUFFICIENT_COINS]: 'Insufficient coins, need {required} coins, current: {current}',
        [TournamentErrorCode.INSUFFICIENT_TICKETS]: 'Insufficient tickets, need {required} {gameType} tickets, current: {current}',
        [TournamentErrorCode.SEGMENT_TOO_LOW]: 'Segment too low, need at least {required}, current: {current}',
        [TournamentErrorCode.SEGMENT_TOO_HIGH]: 'Segment too high, cannot exceed {required}, current: {current}',
        [TournamentErrorCode.SUBSCRIPTION_REQUIRED]: 'Subscription required for this tournament',
        [TournamentErrorCode.MAX_ATTEMPTS_REACHED]: 'Maximum {timeRange} attempts reached ({currentAttempts}/{maxAttempts})',
        [TournamentErrorCode.TOURNAMENT_NOT_FOUND]: 'Tournament not found (ID: {tournamentId})',
        [TournamentErrorCode.PLAYER_NOT_FOUND]: 'Player not found (UID: {uid})',
        [TournamentErrorCode.SEASON_NOT_ACTIVE]: 'No active season',
        [TournamentErrorCode.MATCH_NOT_FOUND]: 'Match not found (ID: {matchId})',
        [TournamentErrorCode.MATCH_ALREADY_COMPLETED]: 'Match already completed (ID: {matchId})',
        [TournamentErrorCode.INVALID_SCORE]: 'Invalid score {score}, should be between {minScore}-{maxScore}',
        [TournamentErrorCode.GAME_DATA_INVALID]: 'Invalid game data: {reason}',
        [TournamentErrorCode.DATABASE_ERROR]: 'Database error: {operation}',
        [TournamentErrorCode.NETWORK_ERROR]: 'Network error',
        [TournamentErrorCode.CONFIGURATION_ERROR]: 'Configuration error: {configKey}',
        [TournamentErrorCode.UNKNOWN_ERROR]: 'Unknown error',
        [TournamentErrorCode.VALIDATION_ERROR]: 'Validation error: {field} - {reason}',
        [TournamentErrorCode.PERMISSION_DENIED]: 'Permission denied: {action}',
    }
};

/**
 * 自定义错误类
 */
export class TournamentError extends Error {
    public code: TournamentErrorCode;
    public params?: Record<string, any>;

    constructor(code: TournamentErrorCode, params?: Record<string, any>) {
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
    code: TournamentErrorCode,
    locale: string = 'zh-CN',
    params?: Record<string, any>
): string {
    const messages = ErrorMessages[locale as keyof typeof ErrorMessages];
    if (!messages) {
        return ErrorMessages['zh-CN'][code] || '未知错误';
    }

    let message = messages[code] || ErrorMessages['zh-CN'][code] || '未知错误';

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
    code: TournamentErrorCode,
    params?: Record<string, any>
): TournamentError {
    return new TournamentError(code, params);
} 