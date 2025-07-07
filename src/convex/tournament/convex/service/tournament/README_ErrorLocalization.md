# 锦标赛系统错误本地化指南

## 概述

本系统提供了完整的错误本地化解决方案，支持多语言错误信息显示，让用户获得更好的体验。

## 核心组件

### 1. 错误码定义 (`errorCodes.ts`)
- `TournamentErrorCode`: 枚举定义所有错误码
- `ErrorMessages`: 多语言错误信息映射表
- `TournamentError`: 自定义错误类
- `getLocalizedErrorMessage()`: 获取本地化错误信息

### 2. 错误处理工具 (`errorHandler.ts`)
- `TournamentErrorHandler`: 错误处理工具类
- `TournamentErrors`: 常用错误抛出函数集合

## 使用方法

### 1. 基本使用

```typescript
import { TournamentErrors } from './errorHandler';

// 抛出金币不足错误
if (playerCoins < requiredCoins) {
    TournamentErrors.insufficientCoins(requiredCoins, playerCoins);
}

// 抛出段位过低错误
if (playerSegment < requiredSegment) {
    TournamentErrors.segmentTooLow(requiredSegment, playerSegment);
}
```

### 2. 错误处理

```typescript
import { TournamentErrorHandler } from './errorHandler';

try {
    // 业务逻辑
    someBusinessLogic();
} catch (error) {
    // 处理错误并获取本地化消息
    const handledError = TournamentErrorHandler.handleError(error, 'zh-CN');
    console.log('错误信息:', handledError.message);
}
```

### 3. 前端集成

```typescript
// 从后端接收错误
const apiResponse = {
    success: false,
    error: {
        code: TournamentErrorCode.INSUFFICIENT_COINS,
        params: { required: 100, current: 50 }
    }
};

// 前端处理
if (!apiResponse.success) {
    const errorMessage = getLocalizedErrorMessage(
        apiResponse.error.code,
        'zh-CN', // 用户语言
        apiResponse.error.params
    );
    
    // 显示用户友好的错误信息
    showErrorMessage(errorMessage);
}
```

## 迁移现有代码

### 迁移前
```typescript
// 旧代码
if (playerCoins < requiredCoins) {
    throw new Error("入场费要求未正确工作");
}
```

### 迁移后
```typescript
// 新代码
if (playerCoins < requiredCoins) {
    TournamentErrors.insufficientCoins(requiredCoins, playerCoins);
}
```

## 错误码分类

### 参赛资格错误 (1000-1999)
- `INSUFFICIENT_COINS`: 金币不足
- `INSUFFICIENT_TICKETS`: 门票不足
- `SEGMENT_TOO_LOW`: 段位过低
- `SEGMENT_TOO_HIGH`: 段位过高
- `SUBSCRIPTION_REQUIRED`: 需要订阅
- `MAX_ATTEMPTS_REACHED`: 达到最大尝试次数

### 比赛相关错误 (2000-2999)
- `MATCH_NOT_FOUND`: 比赛不存在
- `MATCH_ALREADY_COMPLETED`: 比赛已完成
- `INVALID_SCORE`: 无效分数
- `GAME_DATA_INVALID`: 游戏数据无效

### 系统错误 (3000-3999)
- `DATABASE_ERROR`: 数据库错误
- `NETWORK_ERROR`: 网络错误
- `CONFIGURATION_ERROR`: 配置错误

## 支持的语言

- `zh-CN`: 简体中文
- `en-US`: 英文

## 参数占位符

错误信息支持参数占位符，使用 `{参数名}` 格式：

```typescript
// 错误信息模板
"金币不足，需要 {required} 金币，当前只有 {current} 金币"

// 使用时传入参数
TournamentErrors.insufficientCoins(100, 50);
// 输出: "金币不足，需要 100 金币，当前只有 50 金币"
```

## 最佳实践

### 1. 使用预定义错误函数
```typescript
// ✅ 推荐
TournamentErrors.insufficientCoins(100, 50);

// ❌ 不推荐
throw new TournamentError(TournamentErrorCode.INSUFFICIENT_COINS, { required: 100, current: 50 });
```

### 2. 统一错误处理
```typescript
try {
    businessLogic();
} catch (error) {
    const handledError = TournamentErrorHandler.handleError(error, userLocale);
    return { success: false, error: handledError.message };
}
```

### 3. 记录错误日志
```typescript
catch (error) {
    const handledError = TournamentErrorHandler.handleError(error, 'zh-CN');
    
    // 记录详细错误信息
    console.error('业务错误:', {
        code: handledError.code,
        message: handledError.message,
        params: handledError.params,
        timestamp: new Date().toISOString()
    });
}
```

## 扩展新错误

### 1. 添加新的错误码
```typescript
// 在 errorCodes.ts 中添加
export enum TournamentErrorCode {
    // ... 现有错误码
    NEW_ERROR_TYPE = 4001,
}
```

### 2. 添加错误信息
```typescript
// 在 ErrorMessages 中添加
'zh-CN': {
    // ... 现有错误信息
    [TournamentErrorCode.NEW_ERROR_TYPE]: '新的错误信息 {param1}',
},
'en-US': {
    // ... 现有错误信息
    [TournamentErrorCode.NEW_ERROR_TYPE]: 'New error message {param1}',
}
```

### 3. 添加错误函数
```typescript
// 在 errorHandler.ts 中添加
export const TournamentErrors = {
    // ... 现有错误函数
    newErrorType: (param1: string) =>
        TournamentErrorHandler.throwWithParams(TournamentErrorCode.NEW_ERROR_TYPE, { param1 }),
};
```

## 测试

运行测试示例：
```typescript
import { testErrorLocalization } from './errorMigrationExample';
testErrorLocalization();
```

这将输出所有错误码的中英文对照信息。 