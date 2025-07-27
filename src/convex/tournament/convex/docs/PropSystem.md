# 道具系统使用指南

## 📋 概述

道具系统是一个完整的游戏内道具管理解决方案，包括道具配置、商店、效果管理和统计分析等功能。

## 🏗️ 系统架构

### 核心组件

1. **PropSystem** - 道具核心管理系统
2. **PropShop** - 道具商店系统
3. **PropEffectSystem** - 道具效果系统

### 数据表结构

- `prop_configs` - 道具配置表
- `player_props` - 玩家道具表
- `prop_usage_records` - 道具使用记录表
- `prop_purchase_records` - 道具购买记录表
- `prop_shops` - 商店配置表
- `shop_items` - 商店商品表
- `shop_purchase_records` - 商店购买记录表
- `game_effect_states` - 游戏效果状态表
- `prop_effect_statistics` - 道具效果统计表
- `effect_usage_logs` - 效果使用日志表

## 🚀 快速开始

### 1. 系统初始化

```typescript
// 初始化道具系统
await ctx.runMutation(initializeProps, {});
await ctx.runMutation(initializeShops, {});
```

### 2. 基本使用

```typescript
// 获取所有道具配置
const configs = await ctx.runQuery(getAllPropConfigs, {});

// 获取玩家道具
const playerProps = await ctx.runQuery(getPlayerProps, { uid: "user123" });

// 添加道具到玩家
await ctx.runMutation(addPropToPlayer, {
  uid: "user123",
  propId: "score_boost_1.5x",
  quantity: 3
});

// 使用道具
await ctx.runMutation(useProp, {
  uid: "user123",
  propId: "score_boost_1.5x",
  gameId: "game456"
});
```

## 🛍️ 道具商店

### 商店类型

- **每日商店** (`daily_shop`) - 每日刷新
- **每周商店** (`weekly_shop`) - 每周刷新
- **赛季商店** (`seasonal_shop`) - 赛季限时
- **特殊商店** (`special_shop`) - 特殊活动

### 商店操作

```typescript
// 获取商店商品
const items = await ctx.runQuery(getShopItems, { shopId: "daily_shop" });

// 从商店购买
await ctx.runMutation(buyFromShop, {
  uid: "user123",
  shopId: "daily_shop",
  propId: "time_boost_30s",
  quantity: 2
});

// 刷新商店
await ctx.runMutation(refreshShop, { shopId: "daily_shop" });
```

## ⚡ 道具效果

### 效果类型

| 效果类型 | 描述 | 示例 |
|---------|------|------|
| `score_multiplier` | 分数倍数 | 1.5倍分数 |
| `time_boost` | 时间增益 | +30秒 |
| `shield` | 护盾保护 | 免受惩罚 |
| `reroll` | 重掷机会 | 重新掷骰 |
| `extra_life` | 额外生命 | +1生命 |
| `hint` | 提示 | 游戏提示 |
| `cosmetic_frame` | 装饰边框 | 金色边框 |
| `cosmetic_avatar` | 装饰头像 | 龙形头像 |
| `cosmetic_title` | 装饰称号 | 冠军称号 |

### 游戏效果处理

```typescript
// 游戏开始时处理效果
await ctx.runMutation(handleGameStart, {
  uid: "user123",
  gameId: "game456",
  gameType: "solitaire"
});

// 使用游戏中的效果
await ctx.runMutation(useGameEffect, {
  uid: "user123",
  gameId: "game456",
  effectType: "shield"
});

// 游戏结束时处理效果
await ctx.runMutation(handleGameEnd, {
  uid: "user123",
  gameId: "game456",
  finalScore: 1500,
  baseScore: 1000
});
```

## 📊 统计和分析

### 获取统计数据

```typescript
// 道具统计
const propStats = await ctx.runQuery(getPropStatistics, { uid: "user123" });

// 效果统计
const effectStats = await ctx.runQuery(getEffectStatistics, { uid: "user123" });

// 商店统计
const shopStats = await ctx.runQuery(getShopStatistics, { shopId: "daily_shop" });
```

### 统计指标

- **道具统计**: 总道具数、使用次数、购买次数、总花费
- **效果统计**: 总游戏数、总效果数、平均分数提升、倍数使用率
- **商店统计**: 商品数量、购买次数、总收入、平均价格

## 🧪 测试

### 运行测试

```bash
# 测试道具系统初始化
npx convex run testPropSystemInitialization

# 测试道具管理
npx convex run testPropManagement --data '{"uid": "test_user"}'

# 测试道具商店
npx convex run testPropShop --data '{"uid": "test_user"}'

# 测试道具效果
npx convex run testPropEffectSystem --data '{"uid": "test_user"}'

# 完整系统测试
npx convex run testCompletePropSystem --data '{"uid": "test_user"}'
```

### 在 Dashboard 中测试

1. 访问 Convex Dashboard
2. 找到 Functions 标签
3. 搜索并执行测试函数

## 🔧 维护和清理

### 定期清理

```typescript
// 清理过期道具
await ctx.runMutation(cleanupExpiredProps, {});

// 清理过期效果
await ctx.runMutation(cleanupExpiredEffects, {});
```

### 系统状态检查

```typescript
// 检查系统状态
const status = await ctx.runQuery(getPropSystemStatus, {});
console.log("系统就绪:", status.systemReady);
```

## 📝 配置说明

### 道具配置

```typescript
interface PropConfig {
  propId: string;           // 道具ID
  name: string;             // 道具名称
  description: string;      // 道具描述
  type: PropType;          // 道具类型
  effectType: PropEffectType; // 效果类型
  effectValue: number;     // 效果值
  duration?: number;       // 持续时间（秒）
  maxStack: number;        // 最大堆叠数量
  rarity: string;          // 稀有度
  icon: string;            // 图标
  price: number;           // 价格
  isActive: boolean;       // 是否激活
  gameTypes: string[];     // 适用游戏类型
  unlockLevel?: number;    // 解锁等级
}
```

### 商店配置

```typescript
interface ShopConfig {
  shopId: string;          // 商店ID
  name: string;            // 商店名称
  description: string;     // 商店描述
  type: string;           // 商店类型
  refreshTime: string;    // 刷新时间
  isActive: boolean;      // 是否激活
}
```

## 🎮 游戏集成

### 游戏开始

```typescript
// 1. 处理游戏开始效果
const gameStart = await ctx.runMutation(handleGameStart, {
  uid: player.uid,
  gameId: gameId,
  gameType: gameType
});

// 2. 获取有效效果
const effects = await ctx.runQuery(getPlayerValidEffects, {
  uid: player.uid,
  gameId: gameId
});

// 3. 应用效果到游戏
const gameEffects = PropEffectSystem.calculateGameEffects(effects);
const finalTime = PropEffectSystem.applyTimeBoost(baseTime, gameEffects.timeBoost);
```

### 游戏进行中

```typescript
// 使用护盾
const shieldResult = await ctx.runMutation(useGameEffect, {
  uid: player.uid,
  gameId: gameId,
  effectType: "shield"
});

if (shieldResult.used) {
  // 护盾生效，免受惩罚
  console.log("护盾已使用");
}
```

### 游戏结束

```typescript
// 处理游戏结束效果
const gameEnd = await ctx.runMutation(handleGameEnd, {
  uid: player.uid,
  gameId: gameId,
  finalScore: finalScore,
  baseScore: baseScore
});

// 计算道具对分数的影响
const scoreDifference = gameEnd.scoreDifference;
console.log(`道具效果提升了 ${scoreDifference} 分`);
```

## 🔒 安全考虑

### 权限控制

- 只有玩家本人可以操作自己的道具
- 商店购买需要验证金币余额
- 道具使用需要验证拥有权

### 数据验证

- 道具配置验证
- 数量限制检查
- 过期时间验证
- 游戏类型匹配

### 防作弊

- 使用记录追踪
- 效果统计监控
- 异常行为检测

## 📈 性能优化

### 索引优化

- 玩家道具查询索引
- 商店商品查询索引
- 效果记录查询索引

### 缓存策略

- 道具配置缓存
- 玩家道具缓存
- 商店商品缓存

### 批量操作

- 批量添加道具
- 批量清理过期数据
- 批量更新统计

## 🐛 故障排除

### 常见问题

1. **道具无法使用**
   - 检查道具数量
   - 验证道具是否过期
   - 确认游戏类型匹配

2. **商店购买失败**
   - 检查金币余额
   - 验证商品库存
   - 确认商品是否在销售时间

3. **效果不生效**
   - 检查效果是否过期
   - 验证效果类型
   - 确认游戏ID匹配

### 调试方法

```typescript
// 检查玩家道具状态
const playerProps = await ctx.runQuery(getPlayerProps, { uid: "user123" });
console.log("玩家道具:", playerProps);

// 检查有效效果
const effects = await ctx.runQuery(getPlayerValidEffects, {
  uid: "user123",
  gameId: "game456"
});
console.log("有效效果:", effects);

// 检查系统状态
const status = await ctx.runQuery(getPropSystemStatus, {});
console.log("系统状态:", status);
```

## 📚 扩展开发

### 添加新道具

1. 在 `PropSystem.DEFAULT_PROPS` 中添加配置
2. 实现相应的效果逻辑
3. 更新测试用例
4. 更新文档

### 添加新效果类型

1. 在 `PropEffectType` 枚举中添加新类型
2. 在 `PropEffectSystem.calculateGameEffects` 中处理新效果
3. 实现相应的应用逻辑
4. 更新测试和文档

### 自定义商店

1. 在 `PropShop.DEFAULT_SHOPS` 中添加商店配置
2. 实现商店特定的商品生成逻辑
3. 添加相应的测试用例

## 🤝 贡献指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 添加适当的注释
- 编写单元测试

### 提交规范

- 使用清晰的提交信息
- 包含测试用例
- 更新相关文档
- 进行代码审查

---

## 📞 支持

如有问题或建议，请通过以下方式联系：

- 创建 Issue
- 提交 Pull Request
- 查看文档更新

---

*最后更新: 2025年1月* 