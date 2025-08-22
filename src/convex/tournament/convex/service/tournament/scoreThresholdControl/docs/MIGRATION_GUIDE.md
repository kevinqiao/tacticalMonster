# 数据库迁移指南

## 概述

本指南将帮助您将现有的 `player_match_records` 表数据迁移到新的统一 `match_results` 表，以优化数据库结构并支持种子难度分析功能。

## 迁移原因

### **为什么要迁移？**

1. **数据冗余** - 两个表存储相同数据，浪费存储空间
2. **维护复杂** - 需要维护两套表结构和索引
3. **功能增强** - 新表支持种子分析和段位查询
4. **性能优化** - 统一的索引和查询优化

### **迁移的好处**

- 减少50%的存储空间
- 支持种子难度分析
- 简化系统维护
- 提高查询性能

## 迁移前准备

### **1. 备份数据**
```bash
# 建议在迁移前备份整个数据库
# 或者至少备份 player_match_records 表
```

### **2. 检查系统状态**
```typescript
// 检查迁移状态
const status = await ctx.runQuery(
    "scoreThresholdControl:checkMigrationStatus"
);

console.log(status);
// 输出示例：
// {
//   success: true,
//   oldTableCount: 1500,
//   newTableCount: 0,
//   needsMigration: true,
//   migrationStatus: 'pending'
// }
```

### **3. 停止相关服务**
- 暂停写入 `player_match_records` 的操作
- 确保没有正在进行的比赛

## 执行迁移

### **步骤1：执行数据迁移**

```typescript
// 执行数据迁移
const migrationResult = await ctx.runMutation(
    "scoreThresholdControl:executeDataMigration",
    {
        defaultSeed: "migrated", // 为旧数据设置默认种子
        batchSize: 100           // 每批处理100条记录
    }
);

console.log(migrationResult);
// 输出示例：
// {
//   success: true,
//   message: "数据迁移完成",
//   migratedCount: 1500,
//   totalCount: 1500,
//   newTableCount: 1500
// }
```

### **步骤2：验证迁移结果**

```typescript
// 验证数据完整性
const validation = await ctx.runQuery(
    "scoreThresholdControl:validateMigration"
);

console.log(validation);
// 输出示例：
// {
//   success: true,
//   totalRecords: 1500,
//   validRecords: 1500,
//   invalidRecords: 0,
//   dataIntegrity: 1
// }
```

### **步骤3：清理旧表数据**

```typescript
// 迁移验证成功后，清理旧表数据
const cleanupResult = await ctx.runMutation(
    "scoreThresholdControl:cleanupOldTable"
);

console.log(cleanupResult);
// 输出示例：
// {
//   success: true,
//   message: "清理完成，删除了 1500 条旧数据",
//   deletedCount: 1500
// }
```

## 迁移后验证

### **1. 功能测试**

```typescript
// 测试种子推荐功能
const recommendation = await ctx.runQuery(
    "scoreThresholdControl:recommendSeedsBySkill",
    {
        uid: "test_user_123",
        preferredDifficulty: "balanced"
    }
);

console.log(recommendation);
```

### **2. 数据查询测试**

```typescript
// 测试玩家历史查询
const playerHistory = await ctx.runQuery(
    "scoreThresholdControl:getPlayerSkillLevel",
    { uid: "test_user_123" }
);

console.log(playerHistory);
```

### **3. 性能测试**

```typescript
// 测试批量查询性能
const startTime = Date.now();
const seeds = await ctx.runQuery(
    "scoreThresholdControl:getSeedsByDifficulty",
    { difficultyLevel: "normal", limit: 100 }
);
const queryTime = Date.now() - startTime;

console.log(`查询耗时: ${queryTime}ms`);
```

## 回滚方案

### **如果需要回滚迁移**

```typescript
// 回滚迁移（删除迁移的数据）
const rollbackResult = await ctx.runMutation(
    "scoreThresholdControl:rollbackMigration"
);

console.log(rollbackResult);
// 输出示例：
// {
//   success: true,
//   message: "回滚完成，删除了 1500 条迁移数据",
//   rolledBackCount: 1500
// }
```

## 迁移检查清单

### **迁移前**
- [ ] 备份数据库
- [ ] 检查系统状态
- [ ] 停止相关服务
- [ ] 通知团队成员

### **迁移中**
- [ ] 执行数据迁移
- [ ] 监控迁移进度
- [ ] 处理错误（如果有）

### **迁移后**
- [ ] 验证数据完整性
- [ ] 测试系统功能
- [ ] 清理旧表数据
- [ ] 更新相关文档

## 注意事项

### **1. 数据完整性**
- 确保所有必要字段都有值
- 验证数据类型正确性
- 检查索引是否正确创建

### **2. 性能影响**
- 迁移期间可能影响查询性能
- 建议在低峰期进行迁移
- 监控迁移后的查询性能

### **3. 种子字段处理**
- 旧数据使用默认种子 "migrated"
- 新数据应包含实际的种子值
- 后续可以更新种子字段为实际值

## 常见问题

### **Q: 迁移过程中系统可以继续使用吗？**
A: 建议暂停写入操作，但可以继续读取。迁移完成后恢复所有操作。

### **Q: 如果迁移失败怎么办？**
A: 使用回滚功能删除迁移的数据，然后重新执行迁移。

### **Q: 迁移后需要更新代码吗？**
A: 是的，所有使用 `player_match_records` 的代码都需要更新为 `match_results`。

### **Q: 如何验证迁移是否成功？**
A: 使用验证功能检查数据完整性，确保所有记录都正确迁移。

## 技术支持

如果在迁移过程中遇到问题，请：

1. 检查控制台日志
2. 使用验证功能检查数据
3. 查看错误信息
4. 必要时使用回滚功能

## 总结

通过这次迁移，您的系统将获得：

1. **更好的性能** - 优化的索引和查询
2. **更强的功能** - 种子难度分析和智能推荐
3. **更低的成本** - 减少存储空间和维护成本
4. **更好的维护性** - 统一的表结构和代码

迁移完成后，您就可以使用新的种子推荐系统，为玩家提供个性化的游戏体验！

