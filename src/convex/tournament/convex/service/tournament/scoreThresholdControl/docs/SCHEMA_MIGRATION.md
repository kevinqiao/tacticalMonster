# 数据库Schema迁移指南

## 概述

为了优化数据库结构，避免数据冗余，我们将 `player_match_records` 和 `match_results` 两个表合并为一个统一的 `match_results` 表。

## 迁移原因

### 1. **数据冗余问题**
- `player_match_records` 和 `match_results` 存储几乎相同的数据
- 同一场比赛结果被存储两次，浪费存储空间
- 维护两个表增加了系统复杂性

### 2. **数据一致性问题**
- 两个表可能因为更新时机不同导致数据不一致
- 增加了数据同步的复杂性
- 可能导致分析结果不准确

### 3. **功能重复**
- 两个表都支持按玩家ID、比赛ID、时间等查询
- 索引重复，浪费资源
- 代码中需要维护两套查询逻辑

## 新的统一表结构

### **`match_results` 表（增强版）**

```typescript
match_results: defineTable({
    matchId: v.string(),          // 比赛ID
    seed: v.string(),             // 种子标识（重要：用于难度分析）
    uid: v.string(),              // 玩家用户ID
    score: v.number(),            // 玩家得分
    rank: v.number(),             // 玩家排名
    points: v.number(),           // 玩家获得的积分
    segmentName: v.optional(v.string()), // 玩家当前段位（新增）
    createdAt: v.string()         // 记录创建时间
})
```

### **索引优化**

```typescript
.index("by_matchId", ["matchId"])           // 按比赛ID查询
.index("by_seed", ["seed"])                 // 按种子查询
.index("by_uid", ["uid"])                   // 按玩家ID查询
.index("by_createdAt", ["createdAt"])       // 按时间查询
.index("by_seed_created", ["seed", "createdAt"]) // 种子增量查询
.index("by_score", ["score"])               // 按得分查询
.index("by_rank", ["rank"])                 // 按排名查询
.index("by_points", ["points"])             // 按积分查询
.index("by_segment", ["segmentName"])       // 按段位查询
.index("by_uid_created", ["uid", "createdAt"]) // 玩家历史查询
```

## 迁移步骤

### **阶段1：数据准备**
1. 确保所有现有数据都有 `seed` 字段
2. 为缺失的 `seed` 字段设置默认值
3. 验证数据完整性

### **阶段2：代码更新**
1. 更新所有查询从 `player_match_records` 到 `match_results`
2. 更新 `IncrementalStatisticsManager` 中的查询
3. 更新其他相关管理器中的查询

### **阶段3：数据迁移**
1. 将 `player_match_records` 中的数据合并到 `match_results`
2. 确保没有数据丢失
3. 验证迁移后的数据完整性

### **阶段4：清理**
1. 删除 `player_match_records` 表
2. 更新相关文档
3. 运行测试确保功能正常

## 代码更新示例

### **更新前（使用 player_match_records）**
```typescript
// 获取玩家最近的比赛记录
const recentMatches = await this.ctx.db
    .query("player_match_records")
    .filter((q) => q.eq(q.field("uid"), uid))
    .order("desc", "createdAt")
    .take(20);
```

### **更新后（使用 match_results）**
```typescript
// 获取玩家最近的比赛记录
const recentMatches = await this.ctx.db
    .query("match_results")
    .filter((q) => q.eq(q.field("uid"), uid))
    .order("desc", "createdAt")
    .take(20);
```

## 优势

### **1. 存储优化**
- 减少50%的存储空间
- 降低数据库维护成本
- 提高查询性能

### **2. 功能增强**
- `seed` 字段支持种子难度分析
- `segmentName` 字段支持段位相关查询
- 更丰富的索引支持复杂查询

### **3. 维护简化**
- 单一数据源，避免同步问题
- 减少代码重复
- 简化测试和维护

### **4. 查询优化**
- 复合索引支持高效查询
- 减少表连接操作
- 提高分析性能

## 注意事项

### **1. 数据完整性**
- 确保迁移过程中不丢失数据
- 验证所有必要字段都有值
- 检查索引是否正确创建

### **2. 性能影响**
- 迁移期间可能影响查询性能
- 建议在低峰期进行迁移
- 监控迁移后的查询性能

### **3. 向后兼容**
- 更新所有相关代码
- 确保现有功能正常工作
- 更新相关文档和测试

## 迁移检查清单

- [ ] 备份现有数据
- [ ] 验证新表结构
- [ ] 更新所有相关代码
- [ ] 执行数据迁移
- [ ] 验证数据完整性
- [ ] 运行功能测试
- [ ] 删除旧表
- [ ] 更新文档
- [ ] 监控系统性能

## 总结

通过合并 `player_match_records` 和 `match_results` 表，我们实现了：

1. **数据统一** - 单一数据源，避免冗余
2. **功能增强** - 支持种子分析和段位查询
3. **性能提升** - 优化索引和查询性能
4. **维护简化** - 减少代码复杂性和维护成本

这次迁移是系统架构优化的重要一步，为后续功能扩展奠定了良好的基础。
