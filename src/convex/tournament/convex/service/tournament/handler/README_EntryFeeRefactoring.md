# 入场费处理逻辑重构

## 概述

为了提高代码的可维护性和复用性，我们将入场费验证和扣除逻辑从主要的处理器方法中提取出来，创建了独立的辅助方法。这次重构涉及 `multiPlayerSharedMatchHandler` 和 `multiPlayerIndependentMatchHandler` 两个处理器。

## 重构内容

### 1. 提取的辅助方法

#### validateEntryFee
验证玩家是否满足入场费要求，不进行实际扣除。

```typescript
async function validateEntryFee(ctx: any, params: {
    uid: string;
    tournamentType: any;
    inventory: any;
})
```

**功能**:
- 检查金币入场费
- 检查游戏点数入场费
- 检查道具入场费
- 检查门票入场费
- 提供详细的错误信息

#### deductEntryFee
扣除入场费并记录日志。

```typescript
async function deductEntryFee(ctx: any, params: {
    uid: string;
    tournamentType: any;
    inventory: any;
    now: any;
})
```

**功能**:
- 扣除金币入场费
- 扣除游戏点数入场费
- 扣除道具入场费
- 扣除门票入场费
- 记录入场费扣除日志

### 2. 重构前后的对比

#### 重构前 (validateJoin 方法)

```typescript
validateJoin: async (ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: any;
}) => {
    const { uid, gameType, tournamentType } = params;

    // 获取玩家库存
    const inventory = await ctx.db
        .query("player_inventory")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    // 检查入场费 - 冗长的验证逻辑
    if (tournamentType.entryRequirements?.entryFee) {
        const entryFee = tournamentType.entryRequirements.entryFee;

        // 检查金币入场费
        if (entryFee.coins) {
            if (!inventory || inventory.coins < entryFee.coins) {
                throw new Error(`金币不足，需要 ${entryFee.coins} 金币，当前拥有 ${inventory?.coins || 0} 金币`);
            }
        }

        // 检查游戏点数入场费
        if (entryFee.gamePoints) {
            if (!inventory || inventory.gamePoints < entryFee.gamePoints) {
                throw new Error(`游戏点数不足，需要 ${entryFee.gamePoints} 点数，当前拥有 ${inventory?.gamePoints || 0} 点数`);
            }
        }

        // 检查道具入场费
        if (entryFee.props && entryFee.props.length > 0) {
            if (!inventory || !inventory.props) {
                throw new Error(`需要道具入场费，但玩家没有道具库存`);
            }

            for (const requiredProp of entryFee.props) {
                const hasProp = inventory.props.some((prop: any) =>
                    prop.id === requiredProp.id || prop.name === requiredProp.name
                );
                if (!hasProp) {
                    throw new Error(`缺少必需道具: ${requiredProp.name || requiredProp.id}`);
                }
            }
        }

        // 检查门票入场费
        if (entryFee.tickets && entryFee.tickets.length > 0) {
            if (!inventory || !inventory.tickets) {
                throw new Error(`需要门票入场费，但玩家没有门票库存`);
            }

            for (const requiredTicket of entryFee.tickets) {
                const hasTicket = inventory.tickets.some((ticket: any) =>
                    ticket.id === requiredTicket.id || ticket.name === requiredTicket.name
                );
                if (!hasTicket) {
                    throw new Error(`缺少必需门票: ${requiredTicket.name || requiredTicket.id}`);
                }
            }
        }
    }

    // 其他验证逻辑...
}
```

#### 重构后 (validateJoin 方法)

```typescript
validateJoin: async (ctx: any, params: {
    uid: string;
    gameType: string;
    tournamentType: any;
}) => {
    const { uid, gameType, tournamentType } = params;

    // 获取玩家库存
    const inventory = await ctx.db
        .query("player_inventory")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    // 验证入场费 - 简洁的调用
    await validateEntryFee(ctx, { uid, tournamentType, inventory });

    // 其他验证逻辑...
}
```

#### 重构前 (join 方法中的入场费扣除)

```typescript
// 获取玩家库存并处理入场费
const inventory = await ctx.db
    .query("player_inventory")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid))
    .first();

if (tournamentType.entryRequirements?.entryFee && inventory) {
    const entryFee = tournamentType.entryRequirements.entryFee;
    const updateData: any = { updatedAt: now.iso };

    // 扣除金币入场费
    if (entryFee.coins) {
        updateData.coins = inventory.coins - entryFee.coins;
    }

    // 扣除游戏点数入场费
    if (entryFee.gamePoints) {
        updateData.gamePoints = inventory.gamePoints - entryFee.gamePoints;
    }

    // 扣除道具入场费
    if (entryFee.props && entryFee.props.length > 0) {
        const updatedProps = [...(inventory.props || [])];
        for (const requiredProp of entryFee.props) {
            const propIndex = updatedProps.findIndex((prop: any) =>
                prop.id === requiredProp.id || prop.name === requiredProp.name
            );
            if (propIndex !== -1) {
                updatedProps.splice(propIndex, 1);
            }
        }
        updateData.props = updatedProps;
    }

    // 扣除门票入场费
    if (entryFee.tickets && entryFee.tickets.length > 0) {
        const updatedTickets = [...(inventory.tickets || [])];
        for (const requiredTicket of entryFee.tickets) {
            const ticketIndex = updatedTickets.findIndex((ticket: any) =>
                ticket.id === requiredTicket.id || ticket.name === requiredTicket.name
            );
            if (ticketIndex !== -1) {
                updatedTickets.splice(ticketIndex, 1);
            }
        }
        updateData.tickets = updatedTickets;
    }

    // 更新库存
    await ctx.db.patch(inventory._id, updateData);

    // 记录入场费扣除日志
    await ctx.db.insert("entry_fee_logs", {
        uid,
        tournamentType: typeId,
        gameType,
        entryFee,
        deductedAt: now.iso,
        createdAt: now.iso
    });
}
```

#### 重构后 (join 方法中的入场费扣除)

```typescript
// 获取玩家库存并处理入场费
const inventory = await ctx.db
    .query("player_inventory")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid))
    .first();

// 扣除入场费 - 简洁的调用
await deductEntryFee(ctx, { uid, tournamentType, inventory, now });
```

## 重构优势

### 1. 代码复用性
- 入场费验证和扣除逻辑可以在多个处理器中复用
- 避免重复代码，减少维护成本

### 2. 可维护性
- 入场费逻辑集中管理，便于修改和扩展
- 统一的错误处理和日志记录
- 更容易添加新的入场费类型

### 3. 可测试性
- 独立的辅助方法更容易进行单元测试
- 可以单独测试入场费验证和扣除逻辑

### 4. 代码清晰性
- 主要方法逻辑更清晰，专注于核心流程
- 减少方法长度，提高可读性
- 职责分离，每个方法专注于特定功能

### 5. 错误处理一致性
- 统一的错误信息格式
- 一致的异常处理方式
- 更好的用户体验

## 支持的入场费类型

重构后的代码支持以下入场费类型：

1. **金币入场费**: 扣除玩家金币
2. **游戏点数入场费**: 扣除玩家游戏点数
3. **道具入场费**: 扣除玩家特定道具
4. **门票入场费**: 扣除玩家特定门票
5. **订阅要求**: 检查玩家是否为订阅会员

## 使用示例

### 配置入场费

```typescript
const tournamentType = {
    typeId: "premium_tournament",
    name: "高级锦标赛",
    entryRequirements: {
        entryFee: {
            coins: 500,                    // 需要500金币
            gamePoints: 1000,              // 需要1000游戏点数
            props: [                       // 需要特定道具
                { id: "vip_card", name: "VIP卡" },
                { id: "lucky_charm", name: "幸运符" }
            ],
            tickets: [                     // 需要特定门票
                { id: "premium_ticket", name: "高级门票" }
            ]
        },
        isSubscribedRequired: true         // 需要订阅会员
    }
};
```

### 验证入场费

```typescript
// 在 validateJoin 中
await validateEntryFee(ctx, { uid, tournamentType, inventory });
```

### 扣除入场费

```typescript
// 在 join 中
await deductEntryFee(ctx, { uid, tournamentType, inventory, now });
```

## 错误处理

系统会提供详细的错误信息：

- `金币不足，需要 500 金币，当前拥有 200 金币`
- `游戏点数不足，需要 1000 点数，当前拥有 500 点数`
- `缺少必需道具: VIP卡`
- `缺少必需门票: 高级门票`
- `此锦标赛需要订阅会员才能参与`

## 日志记录

系统会自动记录入场费扣除日志：

```typescript
// entry_fee_logs 表结构
{
    uid: "player123",
    tournamentType: "premium_tournament",
    gameType: "battle",
    entryFee: {
        coins: 500,
        gamePoints: 1000,
        props: [{ id: "vip_card", name: "VIP卡" }],
        tickets: [{ id: "premium_ticket", name: "高级门票" }]
    },
    deductedAt: "2024-01-01T10:00:00.000Z",
    createdAt: "2024-01-01T10:00:00.000Z"
}
```

## 总结

这次重构显著提高了代码的质量和可维护性：

1. **代码行数减少**: 主要方法减少了约 60% 的代码行数
2. **逻辑清晰**: 职责分离，每个方法专注于特定功能
3. **易于扩展**: 新增入场费类型只需要修改辅助方法
4. **统一处理**: 所有处理器使用相同的入场费处理逻辑
5. **更好的测试**: 可以独立测试入场费相关功能

这种重构模式可以作为其他功能模块的参考，进一步提高整个系统的代码质量。 