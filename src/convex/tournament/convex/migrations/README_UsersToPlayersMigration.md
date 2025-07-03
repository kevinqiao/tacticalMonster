# Users 表到 Players 表迁移指南

## 概述

本迁移将 `users` 表的数据合并到 `players` 表中，实现用户信息的统一管理。

## 迁移内容

### 表结构变化

**原来的 users 表字段：**
- uid: string
- email: string  
- displayName: string
- avatarUrl: optional string
- isSubscribed: boolean
- subscriptionExpiry: optional string
- createdAt: string
- updatedAt: string

**原来的 players 表字段：**
- uid: string
- displayName: string
- segmentName: string
- isSubscribed: boolean
- lastActive: string
- totalPoints: number
- createdAt: string
- updatedAt: string

**合并后的 players 表字段：**
- uid: string
- email: string
- displayName: string
- avatarUrl: optional string
- segmentName: string
- isSubscribed: boolean
- subscriptionExpiry: optional string
- lastActive: string
- totalPoints: number
- createdAt: string
- updatedAt: string

## 迁移步骤

### 1. 检查迁移状态

在 Convex 控制台中运行：

```javascript
await ctx.runQuery(internal.migrations.migrateUsersToPlayers.checkMigrationStatus, {});
```

这将返回：
- `usersTableExists`: 是否存在 users 表数据
- `usersCount`: users 表记录数
- `playersCount`: players 表记录数
- `needsMigration`: 是否需要迁移
- `migrationStatus`: 迁移状态

### 2. 执行迁移

如果 `needsMigration` 为 true，执行迁移：

```javascript
await ctx.runMutation(internal.migrations.migrateUsersToPlayers.migrateUsersToPlayers, {});
```

迁移过程会：
- 读取所有 users 表数据
- 检查是否已存在对应的 players 记录
- 如果存在，更新现有记录（合并字段）
- 如果不存在，创建新的 players 记录
- 记录迁移日志

### 3. 验证迁移结果

迁移完成后，验证结果：

```javascript
await ctx.runQuery(internal.migrations.migrateUsersToPlayers.validateMigration, {});
```

验证内容包括：
- 总玩家数量
- 包含邮箱的玩家数量
- 包含显示名的玩家数量
- 包含段位的玩家数量
- 包含订阅状态的玩家数量
- 平均积分

## 迁移策略

### 数据合并规则

1. **uid**: 作为主键，保持不变
2. **email**: 从 users 表复制，如果 players 表已有则保留
3. **displayName**: 从 users 表复制，如果 players 表已有则保留
4. **avatarUrl**: 从 users 表复制，如果 players 表已有则保留
5. **segmentName**: 保持 players 表原有值，如果不存在则设为 "Bronze"
6. **isSubscribed**: 使用 users 表的值
7. **subscriptionExpiry**: 从 users 表复制
8. **lastActive**: 使用 users 表的 updatedAt 或 createdAt
9. **totalPoints**: 保持 players 表原有值，如果不存在则设为 0
10. **createdAt**: 使用 users 表的 createdAt
11. **updatedAt**: 设为迁移时间

### 冲突处理

- 如果同一 uid 在 users 和 players 表中都存在，优先保留 players 表的游戏相关字段（segmentName, totalPoints）
- 用户信息字段（email, displayName, avatarUrl）从 users 表更新
- 订阅信息使用 users 表的值

## 回滚

如果需要回滚迁移，可以运行：

```javascript
await ctx.runMutation(internal.migrations.migrateUsersToPlayers.rollbackMigration, {});
```

**注意**: 由于数据已经合并，回滚比较复杂，建议在迁移前备份数据。

## 迁移日志

迁移过程会创建 `migration_logs` 记录，包含：
- migrationType: "users_to_players"
- status: "completed" 或 "failed"
- totalUsers: 总用户数
- migratedCount: 成功迁移数
- skippedCount: 跳过数
- errorCount: 错误数
- log: 详细日志
- createdAt: 创建时间

## 注意事项

1. **备份数据**: 迁移前请确保已备份重要数据
2. **测试环境**: 建议先在测试环境执行迁移
3. **停机时间**: 迁移过程中建议暂停相关服务
4. **验证**: 迁移完成后务必验证数据完整性
5. **清理**: 确认迁移成功后可以删除旧的 users 表

## 常见问题

### Q: 迁移失败怎么办？
A: 检查迁移日志，根据错误信息修复问题后重新执行迁移。

### Q: 如何验证迁移是否成功？
A: 运行验证函数，检查所有必要字段是否正确迁移。

### Q: 迁移后 users 表还存在吗？
A: 迁移只复制数据，不会删除 users 表。确认无误后可以手动删除。

### Q: 迁移会影响现有功能吗？
A: 迁移会更新 players 表结构，确保所有相关代码都已更新为使用新的字段结构。

## 联系支持

如果遇到问题，请检查：
1. 迁移日志中的错误信息
2. 数据库连接状态
3. 表结构是否正确
4. 相关代码是否已更新 