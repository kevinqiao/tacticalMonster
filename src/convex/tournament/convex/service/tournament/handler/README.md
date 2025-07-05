# 锦标赛处理器 (Tournament Handlers)

本目录包含了针对不同锦标赛类型的专用处理器，每个处理器都实现了统一的接口来处理特定类型的锦标赛。

## 处理器分类

### 1. 每日锦标赛处理器 (Daily Handler)
- **文件**: `dailyHandler.ts`
- **适用类型**: 
  - `daily_solitaire_challenge`
  - `daily_rummy_quick`
  - `daily_uno_express`
  - `daily_ludo_race`
- **特点**: 
  - 每日重置
  - 单人比赛
  - 立即结算
  - 每日限制

### 2. 每周锦标赛处理器 (Weekly Handler)
- **文件**: `weeklyHandler.ts`
- **适用类型**:
  - `weekly_rummy_masters`
  - `weekly_chess_club`
  - `weekly_puzzle_league`
  - `weekly_arcade_showdown`
- **特点**:
  - 每周重置
  - 支持单人和多人比赛
  - 技能匹配

### 3. 赛季锦标赛处理器 (Seasonal Handler)
- **文件**: `seasonalHandler.ts`
- **适用类型**:
  - `seasonal_uno_championship`
  - `seasonal_ludo_kingdom`
  - `seasonal_puzzle_empire`
  - `seasonal_arcade_legends`
- **特点**:
  - 赛季级别
  - 长期比赛
  - 丰厚奖励

### 4. 特殊锦标赛处理器 (Special Handler)
- **文件**: `specialHandler.ts`
- **适用类型**:
  - `special_holiday_event`
  - `special_weekend_warrior`
  - `special_festival_frenzy`
  - `special_anniversary_celebration`
- **特点**:
  - 限时活动
  - 特殊奖励
  - 时间验证

### 5. 排位锦标赛处理器 (Ranked Handler)
- **文件**: `rankedHandler.ts`
- **适用类型**:
  - `ranked_chess_masters`
  - `ranked_puzzle_grandmaster`
  - `ranked_arcade_pro`
  - `ranked_strategy_elite`
- **特点**:
  - ELO积分系统
  - 段位要求
  - 段位变化记录

### 6. 休闲锦标赛处理器 (Casual Handler)
- **文件**: `casualHandler.ts`
- **适用类型**:
  - `casual_ludo_fun`
  - `casual_uno_party`
  - `casual_puzzle_relax`
  - `casual_arcade_chill`
- **特点**:
  - 轻松规则
  - 娱乐为主
  - 低压力

### 7. 冠军锦标赛处理器 (Championship Handler)
- **文件**: `championshipHandler.ts`
- **适用类型**:
  - `championship_puzzle_masters`
  - `championship_chess_grandmaster`
  - `championship_arcade_legend`
  - `championship_strategy_king`
- **特点**:
  - 精英级别
  - 冠军积分
  - 冠军记录

### 8. 普通锦标赛处理器 (General Handler)
- **文件**: `tournamentHandler.ts`
- **适用类型**:
  - `tournament_arcade_challenge`
  - `tournament_puzzle_quest`
  - `tournament_strategy_battle`
  - `tournament_skill_showdown`
- **特点**:
  - 标准规则
  - 平衡奖励
  - 通用处理

## 统一接口

所有处理器都实现了以下统一接口：

```typescript
interface TournamentHandler {
    // 加入锦标赛
    join(ctx: any, params: {
        uid: string;
        gameType: string;
        tournamentType: string;
        player: any;
        season: any;
    }): Promise<any>;

    // 提交分数
    submitScore(ctx: any, params: {
        tournamentId: string;
        uid: string;
        gameType: string;
        score: number;
        gameData: any;
        propsUsed: string[];
        gameId?: string;
    }): Promise<any>;

    // 结算锦标赛
    settle(ctx: any, tournamentId: string): Promise<void>;

    // 验证加入条件
    validateJoin(ctx: any, params: any): Promise<void>;

    // 验证分数提交
    validateScore(ctx: any, params: any): Promise<void>;

    // 分配奖励
    distributeRewards(ctx: any, params: any): Promise<void>;
}
```

## 使用方法

### 1. 获取处理器

```typescript
import { getHandler } from "./handler";

const handler = getHandler("daily_solitaire_challenge");
```

### 2. 加入锦标赛

```typescript
const result = await handler.join(ctx, {
    uid: "user123",
    gameType: "solitaire",
    tournamentType: "daily_solitaire_challenge",
    player: {
        uid: "user123",
        segmentName: "Gold",
        isSubscribed: true,
        totalPoints: 1500
    },
    season: {
        _id: "season123",
        name: "Spring 2024",
        isActive: true
    }
});
```

### 3. 提交分数

```typescript
const result = await handler.submitScore(ctx, {
    tournamentId: "tournament123",
    uid: "user123",
    gameType: "solitaire",
    score: 1500,
    gameData: {
        moves: 45,
        timeSpent: 300
    },
    propsUsed: ["hint"],
    gameId: "game123"
});
```

### 4. 结算锦标赛

```typescript
await handler.settle(ctx, "tournament123");
```

## 处理器选择逻辑

处理器选择基于锦标赛类型的前缀：

- `daily_*` → 每日处理器
- `weekly_*` → 每周处理器
- `seasonal_*` → 赛季处理器
- `special_*` → 特殊处理器
- `ranked_*` → 排位处理器
- `casual_*` → 休闲处理器
- `championship_*` → 冠军处理器
- `tournament_*` → 普通处理器

## 测试

运行测试来验证所有处理器：

```typescript
import { runAllHandlerTests } from "./testHandlers";

const results = await runAllHandlerTests();
```

## 使用示例

查看 `usageExamples.ts` 文件获取详细的使用示例。

## 扩展

要添加新的锦标赛类型：

1. 在相应的处理器文件中添加新的类型映射
2. 在 `index.ts` 中更新 `HANDLER_MAP`
3. 添加相应的测试用例
4. 更新文档

## 注意事项

1. 所有处理器都支持远程游戏服务器
2. 处理器会自动处理道具使用和延迟扣除
3. 每个处理器都有特定的验证逻辑
4. 处理器会自动记录错误日志
5. 支持订阅用户和普通用户的不同限制 