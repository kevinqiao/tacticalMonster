import { TournamentErrorCode } from './errorCodes';
import { TournamentErrorHandler, TournamentErrors } from './errorHandler';

/**
 * 错误本地化使用示例
 */

// 示例1: 在参赛资格检查中使用
export function checkEntryRequirementsExample(
    playerCoins: number,
    requiredCoins: number,
    playerSegment: string,
    requiredSegment: string
) {
    // 旧方式
    // if (playerCoins < requiredCoins) {
    //     throw new Error("入场费要求未正确工作");
    // }

    // 新方式 - 使用预定义错误函数
    if (playerCoins < requiredCoins) {
        TournamentErrors.insufficientCoins(requiredCoins, playerCoins);
    }

    // 检查段位要求
    const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
    const playerIndex = segments.indexOf(playerSegment);
    const requiredIndex = segments.indexOf(requiredSegment);

    if (playerIndex < requiredIndex) {
        TournamentErrors.segmentTooLow(requiredSegment, playerSegment);
    }
}

// 示例2: 在锦标赛服务中使用
export function tournamentServiceExample() {
    // 检查玩家是否存在
    const player = null; // 模拟玩家不存在
    if (!player) {
        TournamentErrors.playerNotFound("user123");
    }

    // 检查锦标赛是否存在
    const tournament = null; // 模拟锦标赛不存在
    if (!tournament) {
        TournamentErrors.tournamentNotFound("tournament456");
    }

    // 检查尝试次数
    const maxAttempts = 3;
    const currentAttempts = 5;
    if (currentAttempts >= maxAttempts) {
        TournamentErrors.maxAttemptsReached(maxAttempts, currentAttempts, "今日");
    }
}

// 示例3: 在分数提交中使用
export function scoreSubmissionExample(score: number) {
    const minScore = 0;
    const maxScore = 1000;

    if (score < minScore || score > maxScore) {
        TournamentErrors.invalidScore(score, minScore, maxScore);
    }
}

// 示例4: 使用错误处理工具类
export function errorHandlerExample() {
    // 验证并抛出错误
    TournamentErrorHandler.validateAndThrow(
        false, // 模拟验证失败
        TournamentErrorCode.SUBSCRIPTION_REQUIRED
    );

    // 安全执行函数
    TournamentErrorHandler.safeExecute(
        async () => {
            // 模拟可能出错的异步操作
            throw TournamentErrors.databaseError("查询玩家数据");
        },
        'zh-CN'
    ).then(result => {
        if (!result.success) {
            console.log('错误信息:', result.error.message);
        }
    });
}

// 示例5: 在现有代码中替换错误
export function replaceExistingErrors() {
    // 替换前:
    // throw new Error("金币不足");
    // throw new Error("段位不够");
    // throw new Error("已达到最大尝试次数");

    // 替换后:
    TournamentErrors.insufficientCoins(100, 50);
    TournamentErrors.segmentTooLow("gold", "bronze");
    TournamentErrors.maxAttemptsReached(3, 3, "今日");
}

// 示例6: 前端错误处理
export function frontendErrorHandling() {
    // 模拟从后端接收的错误
    const backendError = {
        code: TournamentErrorCode.INSUFFICIENT_COINS,
        params: { required: 100, current: 50 }
    };

    // 前端处理错误
    const errorMessage = TournamentErrorHandler.getLocalizedErrorMessage(
        backendError.code,
        'zh-CN', // 根据用户语言设置
        backendError.params
    );

    console.log('用户友好的错误信息:', errorMessage);
    // 输出: "金币不足，需要 100 金币，当前只有 50 金币"
}

// 示例7: 多语言支持
export function multiLanguageExample() {
    const errorCode = TournamentErrorCode.INSUFFICIENT_COINS;
    const params = { required: 100, current: 50 };

    // 中文
    const zhMessage = TournamentErrorHandler.getLocalizedErrorMessage(errorCode, 'zh-CN', params);
    console.log('中文:', zhMessage);

    // 英文
    const enMessage = TournamentErrorHandler.getLocalizedErrorMessage(errorCode, 'en-US', params);
    console.log('English:', enMessage);
}

// 示例8: 自定义错误处理
export function customErrorHandling() {
    try {
        // 执行可能出错的代码
        TournamentErrors.insufficientCoins(100, 50);
    } catch (error) {
        // 处理错误
        const handledError = TournamentErrorHandler.handleError(error, 'zh-CN');

        console.log('错误码:', handledError.code);
        console.log('错误信息:', handledError.message);
        console.log('错误参数:', handledError.params);

        // 可以根据错误码进行不同的处理
        switch (handledError.code) {
            case TournamentErrorCode.INSUFFICIENT_COINS:
                // 显示购买金币的提示
                console.log('建议用户购买金币');
                break;
            case TournamentErrorCode.SUBSCRIPTION_REQUIRED:
                // 显示订阅提示
                console.log('建议用户订阅会员');
                break;
            default:
                console.log('其他错误处理');
        }
    }
} 