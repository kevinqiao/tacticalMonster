# 门票跨赛季保留设计分析

## 1. 设计考虑

### 1.1 门票保留的优势
```typescript
// 保留门票的优势
{
    playerRetention: "提高玩家留存率",
    investmentProtection: "保护玩家投资",
    flexibility: "提供策略灵活性",
    userExperience: "改善用户体验"
}
```

### 1.2 门票重置的优势
```typescript
// 重置门票的优势
{
    economicBalance: "防止门票通胀",
    seasonFreshness: "保持赛季新鲜感",
    competitiveBalance: "维持竞技平衡",
    monetization: "促进门票购买"
}
```

## 2. 推荐方案：部分保留

### 2.1 保留策略
```typescript
// 门票跨赛季保留策略
{
    bronze: "完全保留",      // 青铜门票跨赛季保留
    silver: "部分保留",      // 白银门票保留50%
    gold: "完全重置"         // 黄金门票赛季重置
}
```

### 2.2 设计理由
```typescript
// 设计理由分析
{
    bronze: {
        reason: "基础门票，价值较低，保留不影响平衡",
        impact: "提高新玩家体验，减少流失"
    },
    silver: {
        reason: "中等价值，部分保留平衡玩家投资和系统平衡",
        impact: "鼓励适度使用，防止囤积"
    },
    gold: {
        reason: "高价值门票，重置促进购买和赛季竞争",
        impact: "维持经济平衡，促进付费"
    }
}
```

## 3. 实现方案

### 3.1 数据库设计
```typescript
// 门票表结构
interface PlayerTicket {
    uid: string;
    type: string; // "bronze", "silver", "gold"
    quantity: number;
    lastUsedAt?: string;
    seasonId?: string; // 新增：记录获得赛季
}
```

### 3.2 赛季重置逻辑
```typescript
// 赛季重置时的门票处理
async function handleTicketSeasonalReset(ctx: any, uid: string) {
    const playerTickets = await ctx.db.query("player_tickets")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .collect();

    for (const ticket of playerTickets) {
        switch (ticket.type) {
            case "bronze":
                // 青铜门票完全保留
                break;
            case "silver":
                // 白银门票保留50%
                const newQuantity = Math.floor(ticket.quantity * 0.5);
                await ctx.db.patch(ticket._id, {
                    quantity: newQuantity,
                    seasonId: getCurrentSeasonId()
                });
                break;
            case "gold":
                // 黄金门票完全重置
                await ctx.db.patch(ticket._id, {
                    quantity: 0,
                    seasonId: getCurrentSeasonId()
                });
                break;
        }
    }
}
```

### 3.3 API接口更新
```typescript
// 获取玩家门票（考虑赛季）
static async getPlayerTickets(ctx: any, uid: string): Promise<PlayerTicket[]> {
    const playerTickets = await ctx.db.query("player_tickets")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .filter((q: any) => q.gt(q.field("quantity"), 0))
        .collect();

    return playerTickets.map((ticket: any) => ({
        uid: ticket.uid,
        type: ticket.type,
        quantity: ticket.quantity,
        lastUsedAt: ticket.lastUsedAt,
        seasonId: ticket.seasonId
    }));
}
```

## 4. 用户体验设计

### 4.1 赛季开始通知
```typescript
// 赛季开始时的门票通知
{
    bronze: "您的青铜门票已保留到新赛季",
    silver: "您的白银门票已保留50%到新赛季",
    gold: "您的黄金门票已重置，新赛季重新开始"
}
```

### 4.2 门票使用建议
```typescript
// 赛季结束前的使用建议
{
    bronze: "青铜门票可跨赛季使用，无需急于使用",
    silver: "建议在赛季结束前使用部分白银门票",
    gold: "黄金门票将在赛季结束时重置，请及时使用"
}
```

## 5. 经济平衡考虑

### 5.1 门票获取平衡
```typescript
// 门票获取来源调整
{
    bronze: {
        sources: ["任务奖励", "Battle Pass", "每日登录"],
        retention: "完全保留",
        economicImpact: "低"
    },
    silver: {
        sources: ["锦标赛奖励", "Battle Pass", "特殊活动"],
        retention: "50%保留",
        economicImpact: "中等"
    },
    gold: {
        sources: ["付费购买", "高级奖励", "特殊成就"],
        retention: "完全重置",
        economicImpact: "高"
    }
}
```

### 5.2 购买激励
```typescript
// 不同门票的购买激励
{
    bronze: {
        incentive: "跨赛季保留，长期投资",
        target: "新玩家和休闲玩家"
    },
    silver: {
        incentive: "部分保留，平衡投资",
        target: "活跃玩家"
    },
    gold: {
        incentive: "赛季重置，促进购买",
        target: "付费玩家"
    }
}
```

## 6. 运营策略

### 6.1 数据监控
```typescript
// 门票使用数据监控
{
    metrics: {
        bronzeRetention: "青铜门票保留率",
        silverRetention: "白银门票保留率",
        goldReset: "黄金门票重置率",
        usagePattern: "使用模式分析"
    },
    alerts: {
        bronzeInflation: "青铜门票通胀警告",
        silverImbalance: "白银门票使用不平衡",
        goldDeflation: "黄金门票使用不足"
    }
}
```

### 6.2 动态调整
```typescript
// 根据数据动态调整保留策略
{
    bronzeRetentionRate: {
        high: "可考虑降低保留比例",
        low: "保持完全保留"
    },
    silverRetentionRate: {
        high: "可考虑降低到30%",
        low: "可考虑提高到70%"
    },
    goldUsageRate: {
        high: "保持完全重置",
        low: "可考虑部分保留"
    }
}
```

## 7. 技术实现

### 7.1 赛季重置API
```typescript
// 赛季重置API
export const resetSeasonTickets = mutation({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TicketSystem.handleSeasonalReset(ctx, args.uid);
    },
});
```

### 7.2 门票统计API
```typescript
// 门票统计API
export const getTicketSeasonalStats = query({
    args: { uid: v.string() },
    handler: async (ctx, args) => {
        return await TicketSystem.getSeasonalStats(ctx, args.uid);
    },
});
```

## 8. 总结

### 8.1 推荐方案
**部分保留策略**是最佳选择：
- **青铜门票**: 完全保留，提高新玩家体验
- **白银门票**: 50%保留，平衡投资和系统平衡
- **黄金门票**: 完全重置，维持经济平衡

### 8.2 设计优势
1. **用户体验**: 保护玩家投资，减少流失
2. **经济平衡**: 防止门票通胀，维持购买激励
3. **策略灵活性**: 不同门票类型提供不同策略选择
4. **运营可控**: 可根据数据动态调整保留比例

### 8.3 实施建议
1. **渐进实施**: 先实施青铜门票保留，观察效果
2. **数据监控**: 密切监控门票使用和购买数据
3. **用户教育**: 清晰告知玩家门票保留规则
4. **动态调整**: 根据运营数据调整保留策略

这个设计既保护了玩家投资，又维持了系统的经济平衡，为不同玩家类型提供了合适的策略选择。 