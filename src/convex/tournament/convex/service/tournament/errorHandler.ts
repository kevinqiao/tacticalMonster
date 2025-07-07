import { TournamentError, TournamentErrorCode, getLocalizedErrorMessage } from './errorCodes';

/**
 * 错误处理工具类
 */
export class TournamentErrorHandler {
    /**
     * 抛出本地化错误
     */
    static throwLocalizedError(
        code: TournamentErrorCode,
        locale: string = 'zh-CN',
        params?: Record<string, any>
    ): never {
        const message = getLocalizedErrorMessage(code, locale, params);
        throw new TournamentError(code, params);
    }

    /**
     * 抛出带参数的错误
     */
    static throwWithParams(
        code: TournamentErrorCode,
        params?: Record<string, any>
    ): never {
        throw new TournamentError(code, params);
    }

    /**
     * 处理错误并返回本地化消息
     */
    static handleError(
        error: any,
        locale: string = 'zh-CN'
    ): { code: TournamentErrorCode; message: string; params?: Record<string, any> } {
        if (error instanceof TournamentError) {
            return {
                code: error.code,
                message: getLocalizedErrorMessage(error.code, locale, error.params),
                params: error.params
            };
        }

        // 处理普通错误
        return {
            code: TournamentErrorCode.UNKNOWN_ERROR,
            message: getLocalizedErrorMessage(TournamentErrorCode.UNKNOWN_ERROR, locale),
            params: { originalError: error.message }
        };
    }

    /**
     * 验证并抛出错误
     */
    static validateAndThrow(
        condition: boolean,
        code: TournamentErrorCode,
        params?: Record<string, any>
    ): void {
        if (!condition) {
            this.throwWithParams(code, params);
        }
    }

    /**
     * 安全执行函数并处理错误
     */
    static async safeExecute<T>(
        fn: () => Promise<T>,
        locale: string = 'zh-CN'
    ): Promise<{ success: boolean; data?: T; error?: any }> {
        try {
            const data = await fn();
            return { success: true, data };
        } catch (error) {
            const handledError = this.handleError(error, locale);
            return { success: false, error: handledError };
        }
    }
}

/**
 * 常用错误抛出函数
 */
export const TournamentErrors = {
    insufficientCoins: (required: number, current: number) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.INSUFFICIENT_COINS, { required, current }),

    insufficientTickets: (required: number, current: number, gameType: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.INSUFFICIENT_TICKETS, { required, current, gameType }),

    segmentTooLow: (required: string, current: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.SEGMENT_TOO_LOW, { required, current }),

    segmentTooHigh: (required: string, current: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.SEGMENT_TOO_HIGH, { required, current }),

    subscriptionRequired: () =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.SUBSCRIPTION_REQUIRED),

    maxAttemptsReached: (maxAttempts: number, currentAttempts: number, timeRange: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.MAX_ATTEMPTS_REACHED, { maxAttempts, currentAttempts, timeRange }),

    tournamentNotFound: (tournamentId: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.TOURNAMENT_NOT_FOUND, { tournamentId }),

    playerNotFound: (uid: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.PLAYER_NOT_FOUND, { uid }),

    seasonNotActive: () =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.SEASON_NOT_ACTIVE),

    matchNotFound: (matchId: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.MATCH_NOT_FOUND, { matchId }),

    matchAlreadyCompleted: (matchId: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.MATCH_ALREADY_COMPLETED, { matchId }),

    invalidScore: (score: number, minScore: number, maxScore: number) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.INVALID_SCORE, { score, minScore, maxScore }),

    gameDataInvalid: (reason: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.GAME_DATA_INVALID, { reason }),

    databaseError: (operation: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.DATABASE_ERROR, { operation }),

    configurationError: (configKey: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.CONFIGURATION_ERROR, { configKey }),

    validationError: (field: string, reason: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.VALIDATION_ERROR, { field, reason }),

    permissionDenied: (action: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.PERMISSION_DENIED, { action }),
}; 