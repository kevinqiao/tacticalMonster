# Schema 重构：移除跨模块表定义

## 📋 重构概述

将 `segment_change_history` 和 `player_protection_status` 表定义从 scoreThreshold 系统移动到 segment 系统，解决跨模块依赖问题。

## 🔄 变更详情

### 移除的表定义

从 `scoreThresholdSchema.ts` 中移除：

```typescript
// ❌ 已移除
player_protection_status: defineTable({...})
segment_change_history: defineTable({...})
```

### 新增的表定义

添加到 `segmentSchema.ts` 中：

```typescript
// ✅ 新增位置
player_protection_status: defineTable({
    uid: v.string(),
    segmentName: v.string(),
    protectionLevel: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3)),
    protectionThreshold: v.number(),
    demotionGracePeriod: v.number(),
    promotionStabilityPeriod: v.number(),
    lastSegmentChange: v.string(),
    createdAt: v.string(),
    updatedAt: v.string()
})

segment_change_history: defineTable({
    uid: v.string(),
    oldSegment: v.string(),
    newSegment: v.string(),
    changeType: v.union(v.literal("promotion"), v.literal("demotion")),
    pointsConsumed: v.number(),
    reason: v.string(),
    matchId: v.optional(v.string()),
    createdAt: v.string()
})
```

## 🎯 重构目标

1. **模块职责清晰**：段位相关表由段位系统管理
2. **减少跨模块依赖**：避免系统间的紧耦合
3. **架构一致性**：表定义与使用位置保持一致
4. **维护便利性**：相关功能的schema集中管理

## 📊 影响范围

### 不受影响的代码
- `segment/dataAccess.ts` - 继续正常使用这些表
- `segment/SegmentManager.ts` - 业务逻辑无变化
- 所有现有的数据库查询和操作

### Schema 管理
- ✅ `segmentSchema.ts` - 现在包含完整的段位系统表定义
- ✅ `scoreThresholdSchema.ts` - 专注于分数门槛相关表

## 🔍 验证结果

- ✅ 所有表定义完整迁移
- ✅ 字段类型保持一致
- ✅ 索引定义完全保留
- ✅ 无linter错误

## 📝 后续建议

1. **统一Schema管理**：考虑建立统一的schema导入机制
2. **文档更新**：更新相关架构文档反映新的表归属
3. **代码审查**：确保没有遗漏的跨模块表引用

---

**重构完成时间**: 2024年
**影响级别**: 架构优化，无功能影响
**验证状态**: ✅ 通过
