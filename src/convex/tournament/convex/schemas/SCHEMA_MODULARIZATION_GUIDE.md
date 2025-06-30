# Schema模块化指南

## 概述

本指南介绍如何将大型的单一schema文件分割成多个独立的模块化schema文件，以提高代码的可维护性、可读性和可扩展性。

## 当前架构

```
schemas/
├── index.ts                    # 主schema文件（合并所有模块）
├── userSchema.ts              # 用户系统模块
├── tournamentSchema.ts        # 锦标赛系统模块
├── segmentSchema.ts           # 段位系统模块
├── propSchema.ts              # 道具系统模块
├── ticketSchema.ts            # 门票系统模块
├── taskSchema.ts              # 任务系统模块
├── config.ts                  # 模块配置
├── schemaManager.ts           # Schema管理工具
├── migrationHelper.ts         # 迁移助手
└── README.md                  # 模块说明文档
```

## 模块划分原则

### 1. 功能相关性
- 将功能相关的表放在同一个模块中
- 例如：所有用户相关的表放在 `userSchema.ts`

### 2. 业务领域
- 按业务领域划分模块
- 例如：锦标赛、段位、道具、门票、任务等

### 3. 依赖关系
- 考虑表之间的依赖关系
- 避免循环依赖

### 4. 团队协作
- 不同团队可以专注于不同模块
- 减少代码冲突

## 使用方法

### 1. 查看现有模块
```typescript
// 查看所有模块信息
import { getAllModuleInfo } from './schemas/config';
console.log(getAllModuleInfo());
```

### 2. 添加新表到现有模块
```typescript
// 在 userSchema.ts 中添加新表
export const userSchema = {
  // 现有表...
  user_sessions: defineTable({
    uid: v.string(),
    sessionId: v.string(),
    loginTime: v.string(),
    logoutTime: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_uid", ["uid"]).index("by_session", ["sessionId"]),
};
```

### 3. 创建新模块
```typescript
// 1. 创建新文件：notificationSchema.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const notificationSchema = {
  notifications: defineTable({
    uid: v.string(),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    isRead: v.boolean(),
    createdAt: v.string(),
  }).index("by_uid", ["uid"]).index("by_read", ["isRead"]),
};

// 2. 在主schema文件中导入
import { notificationSchema } from "./schemas/notificationSchema";

export default defineSchema({
  // 现有模块...
  ...notificationSchema,
});
```

### 4. 验证schema
```typescript
import { validateSchemaModules } from './schemas/schemaManager';

const validation = validateSchemaModules();
if (!validation.isValid) {
  console.error('Schema验证失败:', validation.conflicts);
}
```

## 最佳实践

### 1. 命名规范
- 表名：使用下划线分隔，如 `user_profiles`
- 索引名：使用描述性名称，如 `by_user_email`
- 字段名：使用下划线分隔，如 `created_at`

### 2. 模块组织
- 每个模块文件不超过500行
- 相关表放在一起
- 添加清晰的注释

### 3. 索引管理
- 为常用查询创建索引
- 避免过多索引影响性能
- 使用复合索引优化查询

### 4. 类型安全
- 使用具体的类型而不是 `v.any()`
- 定义清晰的字段类型
- 使用可选字段处理可选数据

## 迁移指南

### 从单一schema文件迁移

1. **分析现有表结构**
```typescript
import { analyzeTableForModule } from './schemas/migrationHelper';

const suggestedModule = analyzeTableForModule("users", tableFields);
console.log(`表 'users' 建议分类到: ${suggestedModule}`);
```

2. **创建模块文件**
```typescript
// 将相关表移动到对应模块文件
export const userSchema = {
  users: defineTable({...}),
  user_preferences: defineTable({...}),
  // ...
};
```

3. **更新主schema文件**
```typescript
import { userSchema } from "./schemas/userSchema";
// ... 其他模块导入

export default defineSchema({
  ...userSchema,
  // ... 其他模块
});
```

4. **验证迁移结果**
```typescript
import { validateModularSchema } from './schemas/migrationHelper';

const validation = validateModularSchema(modules);
if (!validation.isValid) {
  console.error('迁移问题:', validation.issues);
}
```

## 工具和脚本

### 1. Schema管理器
```typescript
import { 
  validateSchemaModules, 
  generateSchemaStats, 
  findTableModule 
} from './schemas/schemaManager';

// 验证schema
const validation = validateSchemaModules();

// 生成统计信息
const stats = generateSchemaStats();

// 查找表所属模块
const module = findTableModule("users");
```

### 2. 迁移助手
```typescript
import { 
  analyzeTableForModule, 
  generateModularSchemaCode,
  generateMigrationReport 
} from './schemas/migrationHelper';

// 分析表分类
const module = analyzeTableForModule("users", tableFields);

// 生成模块化代码
const code = generateModularSchemaCode("users", tableFields, "user");
```

### 3. 配置管理
```typescript
import { 
  getModuleInfo, 
  validateTableName, 
  generateIndexName 
} from './schemas/config';

// 获取模块信息
const info = getModuleInfo("user");

// 验证表名
const isValid = validateTableName("user_profiles", "user");

// 生成索引名
const indexName = generateIndexName(["uid", "email"]);
```

## 常见问题

### Q1: 如何处理跨模块的表依赖？
A1: 使用外键引用，确保引用的表在主schema中已定义。

### Q2: 如何避免表名冲突？
A2: 使用模块前缀，如 `user_profiles`, `tournament_matches`。

### Q3: 如何管理索引名冲突？
A3: 使用描述性的索引名，如 `by_user_email`, `by_tournament_status`。

### Q4: 如何添加新字段到现有表？
A4: 在对应模块文件中修改表定义，添加新字段。

### Q5: 如何删除表？
A5: 从模块文件中删除表定义，并更新相关的外键引用。

## 性能考虑

1. **索引优化**: 为常用查询创建合适的索引
2. **表大小**: 避免单个表过大，考虑分表
3. **查询优化**: 使用复合索引优化复杂查询
4. **缓存策略**: 对频繁访问的数据使用缓存

## 监控和维护

1. **定期验证**: 使用 `validateSchemaModules()` 定期检查schema
2. **性能监控**: 监控查询性能，优化慢查询
3. **文档更新**: 及时更新模块文档和注释
4. **版本控制**: 使用Git管理schema变更

## 总结

模块化schema设计提供了以下优势：

- **可维护性**: 代码结构清晰，易于维护
- **可扩展性**: 新增功能不影响现有代码
- **团队协作**: 不同开发者可以专注于不同模块
- **性能优化**: 更好的索引管理和查询优化
- **类型安全**: 更严格的类型检查

通过遵循本指南，您可以有效地管理大型项目的数据库schema，提高开发效率和代码质量。 