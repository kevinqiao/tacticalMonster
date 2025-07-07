import { TournamentErrorCode } from './errorCodes';
import { TournamentErrorHandler, TournamentErrors } from './errorHandler';

/**
 * 错误本地化迁移示例
 * 展示如何将现有的 throw new Error() 替换为本地化错误
 */

// ==================== 迁移前 (旧代码) ====================

export function oldErrorHandling() {
    // 检查玩家是否存在
    const player = null;
    if (!player) {
        throw new Error("玩家不存在");
    }

    // 检查金币是否足够
    const playerCoins = 50;
    const requiredCoins = 100;
    if (playerCoins < requiredCoins) {
        throw new Error("金币不足");
    }

    // 检查段位要求
    const playerSegment = "bronze";
    const requiredSegment = "gold";
    if (playerSegment !== requiredSegment) {
        throw new Error("段位不够");
    }

    // 检查尝试次数
    const currentAttempts = 5;
    const maxAttempts = 3;
    if (currentAttempts >= maxAttempts) {
        throw new Error("已达到最大尝试次数");
    }
}

// ==================== 迁移后 (新代码) ====================

export function newErrorHandling() {
    // 检查玩家是否存在
    const player = null;
    if (!player) {
        TournamentErrors.playerNotFound("user123");
    }

    // 检查金币是否足够
    const playerCoins = 50;
    const requiredCoins = 100;
    if (playerCoins < requiredCoins) {
        TournamentErrors.insufficientCoins(requiredCoins, playerCoins);
    }

    // 检查段位要求
    const playerSegment = "bronze";
    const requiredSegment = "gold";
    const segments = ["bronze", "silver", "gold", "platinum", "diamond"];
    const playerIndex = segments.indexOf(playerSegment);
    const requiredIndex = segments.indexOf(requiredSegment);

    if (playerIndex < requiredIndex) {
        TournamentErrors.segmentTooLow(requiredSegment, playerSegment);
    }

    // 检查尝试次数
    const currentAttempts = 5;
    const maxAttempts = 3;
    if (currentAttempts >= maxAttempts) {
        TournamentErrors.maxAttemptsReached(maxAttempts, currentAttempts, "今日");
    }
}

// ==================== 在现有服务中的实际应用 ====================

export function applyToTournamentService() {
    // 示例：在 checkTournamentEligibility 方法中

    // 旧代码:
    // if (config.entryRequirements?.isSubscribedRequired && !player.isSubscribed) {
    //     reasons.push("需要订阅会员");
    // }

    // 新代码:
    if (config.entryRequirements?.isSubscribedRequired && !player.isSubscribed) {
        TournamentErrors.subscriptionRequired();
    }

    // 旧代码:
    // if (entryFee?.coins && (!inventory || inventory.coins < entryFee.coins)) {
    //     reasons.push(`需要 ${entryFee.coins} 金币`);
    // }

    // 新代码:
    if (entryFee?.coins && (!inventory || inventory.coins < entryFee.coins)) {
        TournamentErrors.insufficientCoins(entryFee.coins, inventory?.coins || 0);
    }

    // 旧代码:
    // if (maxAttempts && attempts >= maxAttempts) {
    //     reasons.push(`已达${timeRangeText}最大尝试次数 (${attempts}/${maxAttempts})`);
    // }

    // 新代码:
    if (maxAttempts && attempts >= maxAttempts) {
        TournamentErrors.maxAttemptsReached(maxAttempts, attempts, timeRangeText);
    }
}

// ==================== 前端错误处理示例 ====================

export function frontendErrorHandling() {
    // 模拟从后端接收的错误响应
    const apiResponse = {
        success: false,
        error: {
            code: TournamentErrorCode.INSUFFICIENT_COINS,
            params: { required: 100, current: 50 }
        }
    };

    // 前端处理
    if (!apiResponse.success) {
        const error = apiResponse.error;

        // 使用错误处理工具获取本地化消息
        const handledError = TournamentErrorHandler.handleError(
            { code: error.code, params: error.params },
            'zh-CN' // 根据用户语言设置
        );

        // 显示用户友好的错误信息
        console.log('错误信息:', handledError.message);
        // 输出: "金币不足，需要 100 金币，当前只有 50 金币"

        // 可以根据错误码显示不同的UI
        switch (handledError.code) {
            case TournamentErrorCode.INSUFFICIENT_COINS:
                // 显示购买金币的按钮
                console.log('显示购买金币按钮');
                break;
            case TournamentErrorCode.SUBSCRIPTION_REQUIRED:
                // 显示订阅提示
                console.log('显示订阅会员提示');
                break;
            case TournamentErrorCode.MAX_ATTEMPTS_REACHED:
                // 显示等待提示
                console.log('显示等待下次尝试提示');
                break;
        }
    }
}

// ==================== 错误处理最佳实践 ====================

export function errorHandlingBestPractices() {
    // 1. 使用预定义的错误函数
    try {
        // 业务逻辑
        if (someCondition) {
            TournamentErrors.insufficientCoins(100, 50);
        }
    } catch (error) {
        // 2. 统一错误处理
        const handledError = TournamentErrorHandler.handleError(error, 'zh-CN');

        // 3. 记录错误日志
        console.error('业务错误:', {
            code: handledError.code,
            message: handledError.message,
            params: handledError.params,
            timestamp: new Date().toISOString()
        });

        // 4. 返回用户友好的错误信息
        return {
            success: false,
            error: handledError.message,
            errorCode: handledError.code
        };
    }
}

// ==================== 测试示例 ====================

export function testErrorLocalization() {
    console.log('=== 错误本地化测试 ===');

    // 测试不同语言的错误信息
    const testCases = [
        {
            code: TournamentErrorCode.INSUFFICIENT_COINS,
            params: { required: 100, current: 50 }
        },
        {
            code: TournamentErrorCode.SEGMENT_TOO_LOW,
            params: { required: "gold", current: "bronze" }
        },
        {
            code: TournamentErrorCode.MAX_ATTEMPTS_REACHED,
            params: { maxAttempts: 3, currentAttempts: 3, timeRange: "今日" }
        }
    ];

    testCases.forEach(testCase => {
        console.log(`\n错误码: ${testCase.code}`);
        console.log(`参数:`, testCase.params);
        console.log(`中文: ${getLocalizedErrorMessage(testCase.code, 'zh-CN', testCase.params)}`);
        console.log(`English: ${getLocalizedErrorMessage(testCase.code, 'en-US', testCase.params)}`);
    });
} 