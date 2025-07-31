# 简化门票系统文档 - 无时效设计

## 📋 系统概述

简化门票系统是一个跨游戏的统一门票管理系统，支持三种基本门票类型：**青铜(Bronze)**、**白银(Silver)**、**黄金(Gold)**。门票本身没有时效性，永久有效直到使用，锦标赛配置决定使用哪种门票类型。

## 🎯 核心特性

### 门票类型
- **青铜门票**：新手友好，价格实惠 (50金币)
- **白银门票**：进阶玩家，平衡性价比 (100金币)  
- **黄金门票**：高级玩家，顶级奖励 (200金币)

### 无时效设计
- **门票永久有效**：购买后永久保存，不会过期
- **锦标赛配置决定**：锦标赛类型决定需要哪种门票
- **灵活使用**：同一张门票可用于不同锦标赛

### 跨游戏支持
- 支持所有游戏类型：Ludo、Solitaire、Rummy、Uno
- 统一的门票使用机制
- 灵活的游戏类型配置

## 🏗️ 系统架构

### 数据表结构

```typescript
// 门票模板表
ticket_templates: {
    templateId: string,        // 模板ID
    name: string,              // 门票名称
    description: string,       // 描述
    type: "bronze" | "silver" | "gold",  // 门票类型
    price: { coins: number },  // 价格
    maxUsagePerDay: number,    // 每日最大使用次数
    gameTypes: string[],       // 支持的游戏类型
    isActive: boolean          // 是否激活
}

// 玩家门票表
player_tickets: {
    uid: string,               // 玩家ID
    templateId: string,        // 模板ID
    quantity: number,          // 数量
    lastUsedAt?: string        // 最后使用时间
}

// 门票交易表
ticket_transactions: {
    uid: string,               // 玩家ID
    templateId: string,        // 模板ID
    quantity: number,          // 数量
    transactionType: string,   // 交易类型
    source: string,            // 来源
    context?: any,             // 上下文
    createdAt: string          // 创建时间
}
```

### 核心服务类

```typescript
export class TicketSystem {
    // 门票模板管理
    static async getAllTicketTemplates(ctx: any): Promise<TicketTemplate[]>
    static async getTicketTemplatesByType(ctx: any, type: string): Promise<TicketTemplate[]>
    static async getTicketTemplatesByGameType(ctx: any, gameType: string): Promise<TicketTemplate[]>
    
    // 玩家门票管理
    static async getPlayerTickets(ctx: any, uid: string): Promise<PlayerTicket[]>
    static async getPlayerValidTickets(ctx: any, uid: string): Promise<PlayerTicket[]>
    
    // 门票购买和使用
    static async purchaseTicket(ctx: any, params: any): Promise<any>
    static async useTicket(ctx: any, params: any): Promise<any>
    
    // 门票奖励
    static async grantTicketReward(ctx: any, params: any): Promise<any>
    
    // 系统维护
    static async checkTicketEligibility(ctx: any, params: any): Promise<any>
}
```

## 🚀 快速开始

### 1. 初始化系统

```typescript
// 初始化门票系统
await initTicketSystem(ctx);

// 检查系统状态
const status = await checkTicketSystemStatus(ctx);
console.log("门票模板数量:", status.templates);
console.log("门票套餐数量:", status.bundles);
```

### 2. 购买门票

```typescript
// 购买青铜门票
const result = await purchaseTicket(ctx, {
    uid: "player123",
    templateId: "bronze_ticket",
    quantity: 1,
    source: "shop"
});

if (result.success) {
    console.log("购买成功:", result.message);
}
```

### 3. 使用门票

```typescript
// 使用门票参加锦标赛
const result = await useTicket(ctx, {
    uid: "player123",
    templateId: "bronze_ticket",
    gameType: "ludo",
    tournamentId: "tournament456"
});

if (result.success) {
    console.log("门票使用成功，剩余数量:", result.remainingQuantity);
}
```

### 4. 获取玩家门票

```typescript
// 获取玩家所有门票
const tickets = await getPlayerTickets(ctx, "player123");

// 获取玩家有效门票（数量大于0）
const validTickets = await getPlayerValidTickets(ctx, "player123");

// 获取特定游戏类型的门票
const gameTickets = await getPlayerValidTicketsByGameType(ctx, "player123", "ludo");
```

## 💰 价格体系

### 门票价格
- **青铜门票**：50金币
- **白银门票**：100金币
- **黄金门票**：200金币

### 套餐价格
- **新手套餐**：300金币 (5张青铜 + 2张白银)
- **进阶套餐**：800金币 (5张白银 + 2张黄金)
- **专业套餐**：1200金币 (5张黄金 + 3张白银)

## 📦 门票套餐

### 新手套餐 (300金币)
- 5张青铜门票
- 2张白银门票

### 进阶套餐 (800金币)
- 5张白银门票
- 2张黄金门票

### 专业套餐 (1200金币)
- 5张黄金门票
- 3张白银门票

## 🔧 使用限制

### 每日使用限制
- **青铜门票**：每日最多使用3次
- **白银门票**：每日最多使用5次
- **黄金门票**：每日最多使用10次

### 永久有效
- 门票购买后永久有效
- 不会过期，可随时使用
- 数量为0时无法使用

## 🎮 游戏集成

### 锦标赛配置
门票使用在锦标赛配置中设置：

```typescript
// 锦标赛类型配置
{
    typeId: "daily_bronze_tournament",
    name: "青铜每日锦标赛",
    entryRequirements: {
        ticketRequired: true,
        ticketTemplateId: "bronze_ticket"  // 指定需要的门票类型
    },
    // ... 其他配置
}
```

### 门票验证流程
1. 玩家尝试加入锦标赛
2. 系统检查锦标赛的门票要求
3. 验证玩家是否有对应类型的有效门票
4. 检查门票是否适用于该游戏类型
5. 扣除门票数量并允许加入

## 📊 统计和分析

### 使用统计
```typescript
// 获取玩家门票使用统计
const stats = await getPlayerTicketStats(ctx, "player123");
// 返回：总使用次数、胜利次数、失败次数、胜率等
```

### 热门门票
```typescript
// 获取热门门票模板
const popularTickets = await getPopularTicketTemplates(ctx);
// 基于使用统计返回最受欢迎的门票
```

### 推荐系统
```typescript
// 生成玩家门票推荐
await generateTicketRecommendations(ctx, "player123");

// 获取推荐结果
const recommendations = await getPlayerTicketRecommendations(ctx, "player123");
```

## 🛠️ 系统维护

### 健康检查
```typescript
// 检查系统状态
const health = await ticketSystemHealthCheck(ctx);
if (health.success) {
    console.log("系统状态:", health.status);
    console.log("统计信息:", health.stats);
}
```

### 交易历史
```typescript
// 获取门票交易历史
const history = await getTicketTransactionHistory(ctx, {
    uid: "player123",
    limit: 50
});

// 获取套餐购买历史
const bundleHistory = await getBundlePurchaseHistory(ctx, {
    uid: "player123",
    limit: 20
});
```

## 🔒 安全机制

### 使用验证
- 验证门票是否存在
- 检查门票数量是否足够
- 验证游戏类型匹配
- 检查每日使用限制

### 交易记录
- 所有门票操作都有完整记录
- 支持交易历史查询
- 便于问题排查和审计

### 防刷机制
- 每日使用次数限制
- 门票数量管理
- 交易频率控制

## 📈 性能优化

### 索引优化
```typescript
// 主要索引
player_tickets: ["uid", "templateId"]
ticket_transactions: ["uid", "templateId", "createdAt"]
ticket_templates: ["templateId", "type", "isActive"]
```

### 查询优化
- 使用索引进行快速查询
- 分页查询大量数据
- 缓存常用数据

### 批量操作
- 批量发放奖励
- 批量更新统计
- 批量查询玩家门票

## 🚨 错误处理

### 常见错误
```typescript
// 门票不存在
{ success: false, message: "门票不存在" }

// 数量不足
{ success: false, message: "门票数量不足" }

// 今日使用次数已达上限
{ success: false, message: "今日使用次数已达上限" }

// 不适用于此游戏类型
{ success: false, message: "门票不适用于此游戏类型" }
```

### 错误恢复
- 自动重试机制
- 事务回滚
- 错误日志记录

## 🔄 扩展指南

### 添加新门票类型
1. 在`ticket_templates`表中添加新模板
2. 更新初始化脚本
3. 添加相应的API接口

### 添加新游戏类型
1. 在门票模板的`gameTypes`数组中添加新游戏
2. 更新验证逻辑
3. 测试新游戏的门票使用

### 自定义价格策略
1. 修改门票模板的价格配置
2. 更新套餐价格
3. 调整奖励发放逻辑

## 📝 最佳实践

### 开发建议
1. **简化设计**：保持系统简单易懂
2. **统一接口**：使用一致的API设计
3. **充分测试**：覆盖所有使用场景
4. **文档完善**：保持文档更新

### 运营建议
1. **监控系统**：定期检查系统状态
2. **数据分析**：分析门票使用情况
3. **用户反馈**：收集用户使用反馈
4. **持续优化**：根据数据调整策略

### 维护建议
1. **定期检查**：检查门票使用情况
2. **备份数据**：定期备份重要数据
3. **性能监控**：监控系统性能指标
4. **安全审计**：定期进行安全审计

## 🎯 总结

简化门票系统通过三种基本类型（青铜、白银、黄金）和无时效设计，为玩家提供了清晰易懂的门票体系。门票本身没有过期时间，永久有效，而锦标赛配置决定使用哪种门票类型，这种设计更加灵活和用户友好。系统设计简洁，易于维护和扩展，同时保证了游戏的平衡性和公平性。

### 设计优势
1. **用户友好**：门票不会过期，用户不用担心时间限制
2. **灵活配置**：锦标赛可以灵活配置需要的门票类型
3. **简化管理**：无需管理复杂的时效逻辑
4. **降低成本**：减少过期门票的清理和维护成本 