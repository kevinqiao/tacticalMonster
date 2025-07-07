# 本地化系统使用指南

## 概述

本项目提供了一套完整的本地化系统，支持错误码、消息码的统一管理和多语言支持。系统包含以下核心组件：

- **错误码系统** (`errorCodes.ts`) - 统一的错误码定义和本地化
- **消息码系统** (`messageCodes.ts`) - 成功消息、通知等用户消息的本地化
- **本地化管理器** (`localizationManager.ts`) - 核心本地化功能
- **错误处理器** (`errorHandler.ts`) - 统一的错误处理和管理
- **消息处理器** (`messageHandler.ts`) - 消息的发送和管理

## 快速开始

### 1. 导入系统

```typescript
import {
    // 错误处理
    throwError,
    createError,
    handleAsync,
    
    // 消息处理
    sendSuccess,
    sendInfo,
    sendWarning,
    sendConfirm,
    
    // 错误码
    UserErrorCode,
    GameErrorCode,
    TournamentErrorCode,
    
    // 消息码
    SuccessMessageCode,
    InfoMessageCode,
    
    // 本地化
    getErrorMessage,
    getMessage,
    formatNumber,
    formatDate
} from './localization';
```

### 2. 初始化系统

```typescript
import { initializeLocalizationSystem } from './localization';

// 使用默认配置初始化
initializeLocalizationSystem();

// 或使用自定义配置
initializeLocalizationSystem({
    localization: {
        defaultLocale: 'zh-CN',
        supportedLocales: ['zh-CN', 'en-US'],
        autoDetect: true
    },
    errorHandler: {
        logErrors: true,
        showUserFriendlyErrors: true
    }
});
```

## 错误处理

### 基本用法

```typescript
// 抛出错误
throwError(UserErrorCode.USER_NOT_FOUND, { uid: '123' });

// 创建错误（不抛出）
const error = createError(TournamentErrorCode.INSUFFICIENT_COINS, {
    required: 100,
    current: 50
});

// 处理异步操作
const result = await handleAsync(
    async () => {
        // 异步操作
        return await someAsyncOperation();
    },
    SystemErrorCode.DATABASE_QUERY_FAILED,
    'userService.getUser'
);
```

### 错误码分类

```typescript
// 用户相关错误 (1000-1999)
throwError(UserErrorCode.AUTHENTICATION_FAILED);
throwError(UserErrorCode.USER_NOT_FOUND, { uid: '123' });

// 游戏相关错误 (2000-2999)
throwError(GameErrorCode.GAME_NOT_FOUND, { gameId: '456' });
throwError(GameErrorCode.INVALID_MOVE);

// 锦标赛相关错误 (3000-3999)
throwError(TournamentErrorCode.INSUFFICIENT_COINS, {
    required: 100,
    current: 50
});
throwError(TournamentErrorCode.SEGMENT_TOO_LOW, {
    required: 'gold',
    current: 'bronze'
});

// 道具和库存错误 (4000-4999)
throwError(InventoryErrorCode.INSUFFICIENT_ITEMS, {
    required: 5,
    current: 2
});

// 系统错误 (7000-7999)
throwError(SystemErrorCode.DATABASE_CONNECTION_FAILED);
```

### 快速错误抛出函数

```typescript
import {
    throwUserError,
    throwGameError,
    throwTournamentError,
    throwInventoryError
} from './localization';

// 更简洁的错误抛出
throwUserError(UserErrorCode.USER_NOT_FOUND, { uid: '123' });
throwTournamentError(TournamentErrorCode.INSUFFICIENT_COINS, {
    required: 100,
    current: 50
});
```

## 消息处理

### 基本用法

```typescript
// 发送成功消息
sendSuccess(SuccessMessageCode.LOGIN_SUCCESS);

// 发送信息消息
sendInfo(InfoMessageCode.LOADING);

// 发送警告消息
sendWarning(WarningMessageCode.CONNECTION_UNSTABLE);

// 发送确认消息
sendConfirm(ConfirmMessageCode.CONFIRM_DELETE);
```

### 带参数的消息

```typescript
// 带参数的消息
sendSuccess(SuccessMessageCode.REWARD_RECEIVED_SUCCESS, {
    reward: '100金币'
});

sendInfo(InfoMessageCode.TURN_CHANGED, {
    playerName: '张三'
});

sendWarning(WarningMessageCode.ITEM_EXPIRING_SOON, {
    itemName: '限时道具'
});
```

### 快速消息发送函数

```typescript
import {
    sendSuccessMessage,
    sendInfoMessage,
    sendWarningMessage,
    sendConfirmMessage
} from './localization';

// 更简洁的消息发送
sendSuccessMessage(SuccessMessageCode.LOGIN_SUCCESS);
sendInfoMessage(InfoMessageCode.LOADING);
```

## 本地化功能

### 获取本地化文本

```typescript
import { getErrorMessage, getMessage } from './localization';

// 获取错误信息
const errorMsg = getErrorMessage(TournamentErrorCode.INSUFFICIENT_COINS, {
    required: 100,
    current: 50
});

// 获取消息
const message = getMessage(SuccessMessageCode.LOGIN_SUCCESS);

// 指定语言
const englishError = getErrorMessage(
    TournamentErrorCode.INSUFFICIENT_COINS,
    { required: 100, current: 50 },
    'en-US'
);
```

### 格式化功能

```typescript
import { formatNumber, formatDate, formatCurrency } from './localization';

// 格式化数字
const formattedNumber = formatNumber(1234.56); // "1,234.56"
const chineseNumber = formatNumber(1234.56, 'zh-CN'); // "1,234.56"

// 格式化日期
const formattedDate = formatDate(new Date()); // "2024/1/1"
const fullDate = formatDate(new Date(), 'zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
}); // "2024年1月1日"

// 格式化货币
const formattedCurrency = formatCurrency(1234.56); // "¥1,234.56"
const usdCurrency = formatCurrency(1234.56, 'USD', 'en-US'); // "$1,234.56"
```

## 装饰器使用

### 错误处理装饰器

```typescript
import { handleErrors } from './localization';

class UserService {
    @handleErrors(UserErrorCode.USER_NOT_FOUND, 'UserService.getUser')
    async getUser(uid: string) {
        // 方法实现
        const user = await this.db.getUser(uid);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
}
```

### 消息处理装饰器

```typescript
import { handleMessages } from './localization';

class TournamentService {
    @handleMessages(
        SuccessMessageCode.TOURNAMENT_JOIN_SUCCESS,
        TournamentErrorCode.TOURNAMENT_NOT_FOUND,
        'TournamentService.joinTournament'
    )
    async joinTournament(tournamentId: string) {
        // 方法实现
        return await this.join(tournamentId);
    }
}
```

## 函数包装

### 包装普通函数

```typescript
import { wrapFunction } from './localization';

const safeFunction = wrapFunction(
    (a: number, b: number) => a / b,
    SystemErrorCode.DATABASE_QUERY_FAILED,
    'division'
);

// 使用包装后的函数
const result = safeFunction(10, 2); // 正常执行
const error = safeFunction(10, 0); // 抛出本地化错误
```

### 包装异步函数

```typescript
import { wrapAsyncFunction } from './localization';

const safeAsyncFunction = wrapAsyncFunction(
    async (id: string) => {
        return await fetchUser(id);
    },
    UserErrorCode.USER_NOT_FOUND,
    'userService.fetchUser'
);

// 使用包装后的异步函数
const user = await safeAsyncFunction('123');
```

## 实际应用示例

### 1. 用户服务

```typescript
import {
    throwUserError,
    sendSuccessMessage,
    handleAsync,
    UserErrorCode,
    SuccessMessageCode
} from './localization';

class UserService {
    async login(username: string, password: string) {
        return await handleAsync(async () => {
            const user = await this.validateUser(username, password);
            if (!user) {
                throwUserError(UserErrorCode.AUTHENTICATION_FAILED);
            }
            
            sendSuccessMessage(SuccessMessageCode.LOGIN_SUCCESS);
            return user;
        }, UserErrorCode.AUTHENTICATION_FAILED, 'UserService.login');
    }

    async getUser(uid: string) {
        const user = await this.db.getUser(uid);
        if (!user) {
            throwUserError(UserErrorCode.USER_NOT_FOUND, { uid });
        }
        return user;
    }
}
```

### 2. 锦标赛服务

```typescript
import {
    throwTournamentError,
    sendSuccessMessage,
    sendWarningMessage,
    TournamentErrorCode,
    SuccessMessageCode,
    WarningMessageCode
} from './localization';

class TournamentService {
    async joinTournament(uid: string, tournamentId: string) {
        // 检查用户金币
        const user = await this.getUser(uid);
        const tournament = await this.getTournament(tournamentId);
        
        if (user.coins < tournament.entryFee) {
            throwTournamentError(TournamentErrorCode.INSUFFICIENT_COINS, {
                required: tournament.entryFee,
                current: user.coins
            });
        }

        // 检查段位要求
        if (user.segmentName === 'bronze' && tournament.minSegment === 'gold') {
            throwTournamentError(TournamentErrorCode.SEGMENT_TOO_LOW, {
                required: tournament.minSegment,
                current: user.segmentName
            });
        }

        // 加入锦标赛
        await this.addPlayerToTournament(uid, tournamentId);
        sendSuccessMessage(SuccessMessageCode.TOURNAMENT_JOIN_SUCCESS);
        
        return { success: true };
    }

    async submitScore(tournamentId: string, uid: string, score: number) {
        if (score < 0 || score > 10000) {
            throwTournamentError(TournamentErrorCode.INVALID_SCORE, {
                score,
                minScore: 0,
                maxScore: 10000
            });
        }

        await this.recordScore(tournamentId, uid, score);
        sendSuccessMessage(SuccessMessageCode.SCORE_SUBMIT_SUCCESS);
        
        return { success: true };
    }
}
```

### 3. 前端组件

```typescript
import React from 'react';
import {
    sendSuccessMessage,
    sendWarningMessage,
    sendConfirmMessage,
    SuccessMessageCode,
    WarningMessageCode,
    ConfirmMessageCode
} from './localization';

const TournamentComponent: React.FC = () => {
    const handleJoinTournament = async () => {
        try {
            await tournamentService.joinTournament(tournamentId);
            sendSuccessMessage(SuccessMessageCode.TOURNAMENT_JOIN_SUCCESS);
        } catch (error) {
            // 错误已经在服务层处理，这里只需要显示
            console.error('Failed to join tournament:', error);
        }
    };

    const handleLeaveTournament = () => {
        sendConfirmMessage(ConfirmMessageCode.CONFIRM_TOURNAMENT_LEAVE, {
            cost: '已消耗的入场费'
        });
    };

    return (
        <div>
            <button onClick={handleJoinTournament}>加入锦标赛</button>
            <button onClick={handleLeaveTournament}>离开锦标赛</button>
        </div>
    );
};
```

## 配置管理

### 系统配置

```typescript
import { initializeLocalizationSystem } from './localization';

const config = {
    localization: {
        defaultLocale: 'zh-CN',
        fallbackLocale: 'en-US',
        supportedLocales: ['zh-CN', 'en-US', 'ja-JP'],
        autoDetect: true,
        persistLocale: true
    },
    errorHandler: {
        logErrors: true,
        showUserFriendlyErrors: true,
        maxErrorLogSize: 2000,
        errorReportingEnabled: true
    },
    messageHandler: {
        maxMessageHistory: 2000,
        autoClearOldMessages: true,
        messageTimeout: 3000,
        showNotifications: true
    }
};

initializeLocalizationSystem(config);
```

### 获取系统状态

```typescript
import { getLocalizationSystemStatus } from './localization';

const status = getLocalizationSystemStatus();
console.log('Current locale:', status.currentLocale);
console.log('Error stats:', status.errorStats);
console.log('Message stats:', status.messageStats);
```

## 最佳实践

### 1. 错误处理

- 使用具体的错误码而不是通用错误码
- 提供有意义的参数信息
- 在服务层处理错误，在UI层只显示
- 使用 `handleAsync` 包装异步操作

### 2. 消息处理

- 使用适当的消息类型（success/info/warning/confirm）
- 提供必要的参数信息
- 避免过度使用消息，保持用户体验
- 使用装饰器简化代码

### 3. 本地化

- 始终使用本地化函数而不是硬编码文本
- 提供有意义的参数占位符
- 测试不同语言的显示效果
- 保持消息的一致性

### 4. 性能优化

- 合理设置历史记录大小
- 定期清理旧的消息和错误日志
- 使用单例模式避免重复实例化
- 缓存常用的本地化文本

## 扩展指南

### 添加新的错误码

1. 在 `errorCodes.ts` 中添加新的错误码枚举
2. 在 `ErrorMessages` 中添加对应的本地化文本
3. 在需要的地方使用新的错误码

### 添加新的消息码

1. 在 `messageCodes.ts` 中添加新的消息码枚举
2. 在 `MessageTexts` 中添加对应的本地化文本
3. 在需要的地方使用新的消息码

### 添加新的语言支持

1. 在 `ErrorMessages` 和 `MessageTexts` 中添加新语言
2. 更新 `supportedLocales` 配置
3. 测试新语言的显示效果

## 故障排除

### 常见问题

1. **错误信息显示为"未知错误"**
   - 检查错误码是否正确定义
   - 检查本地化文本是否存在

2. **消息不显示**
   - 检查消息处理器是否正确初始化
   - 检查监听器是否正确注册

3. **本地化不生效**
   - 检查语言设置是否正确
   - 检查本地化文本是否存在

4. **性能问题**
   - 检查历史记录大小设置
   - 检查是否有内存泄漏

### 调试技巧

```typescript
// 启用调试模式
if (process.env.NODE_ENV === 'development') {
    console.log('Error logs:', errorHandler.getErrorLogs());
    console.log('Message history:', messageHandler.getMessageHistory());
    console.log('System status:', getLocalizationSystemStatus());
}
``` 