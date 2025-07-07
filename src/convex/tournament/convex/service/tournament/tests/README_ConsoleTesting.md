# 控制台测试 getAvailableTournaments

## 概述

本文档说明如何在控制台直接测试 `getAvailableTournaments` 功能。

## 可用的测试函数

### 1. 完整测试 - `consoleTestGetAvailableTournaments`

运行所有测试用例，包括：
- 基础功能测试
- 游戏类型过滤测试
- 分类过滤测试
- 参赛资格测试
- 参与统计测试
- 段位限制测试
- 订阅要求测试
- 入场费测试

**特点：**
- 详细的控制台输出
- 美观的格式化结果
- 成功率统计
- 完整的错误信息

### 2. 快速测试 - `quickTestGetAvailableTournaments`

只运行基础功能测试，用于快速验证核心功能。

**特点：**
- 快速执行
- 最小化输出
- 适合日常验证

### 3. 单个测试 - `runSingleTest`

运行指定的单个测试用例。

**参数：**
- `testName`: 测试名称（basic, gameTypeFilter, categoryFilter, eligibility, participation, segment, subscription, entryFee）

## 使用方法

### 在 Convex 控制台中运行

1. 打开 Convex 控制台
2. 进入 Functions 页面
3. 找到对应的测试函数
4. 点击 "Run" 按钮

### 示例调用

```javascript
// 运行完整测试
await ctx.runMutation("service/tournament/tests/runGetAvailableTournamentsTests:consoleTestGetAvailableTournaments", {});

// 运行快速测试
await ctx.runMutation("service/tournament/tests/runGetAvailableTournamentsTests:quickTestGetAvailableTournaments", {});

// 运行单个测试
await ctx.runMutation("service/tournament/tests/runGetAvailableTournamentsTests:runSingleTest", { 
    testName: "basic" 
});
```

### 在浏览器控制台中运行

```javascript
// 假设你已经有了 Convex 客户端实例
const result = await convex.mutation("service/tournament/tests/runGetAvailableTournamentsTests:consoleTestGetAvailableTournaments", {});
console.log(result);
```

## 输出示例

### 完整测试输出

```
🎮 开始控制台测试 getAvailableTournaments...
============================================================

--- 基础功能测试 ---
✓ 成功获取 5 个可用锦标赛
✓ 所有锦标赛都有完整的必要字段

--- 游戏类型过滤测试 ---
✓ 游戏类型过滤正常工作
✓ 所有返回的锦标赛都是 solitaire 类型

============================================================
📊 测试结果汇总
============================================================
✅ 通过: 8
❌ 失败: 0
📈 总计: 8
📊 成功率: 100.0%

📋 详细测试结果:
------------------------------------------------------------
1. ✅ 基础功能测试
2. ✅ 游戏类型过滤测试
3. ✅ 分类过滤测试
4. ✅ 参赛资格测试
5. ✅ 参与统计测试
6. ✅ 段位限制测试
7. ✅ 订阅要求测试
8. ✅ 入场费测试
```

### 快速测试输出

```
⚡ 快速测试 getAvailableTournaments...
==================================================

--- 基础功能测试 ---
✓ 成功获取 5 个可用锦标赛
✓ 所有锦标赛都有完整的必要字段

==================================================
⚡ 快速测试结果
==================================================
✅ 通过: 1
❌ 失败: 0
```

## 测试数据

测试会自动创建和清理以下测试数据：
- 测试玩家
- 测试锦标赛类型
- 测试库存数据
- 测试赛季数据

## 注意事项

1. **数据隔离**: 测试使用独立的测试数据，不会影响生产数据
2. **自动清理**: 测试完成后会自动清理测试数据
3. **错误处理**: 所有错误都会被捕获并显示详细信息
4. **性能**: 完整测试可能需要几秒钟时间

## 故障排除

### 常见错误

1. **"玩家不存在"**: 测试环境初始化失败
2. **"锦标赛类型不存在"**: 测试数据创建失败
3. **"无活跃赛季"**: 需要先创建赛季数据

### 调试建议

1. 先运行快速测试验证基本功能
2. 检查控制台输出的详细错误信息
3. 确认数据库中有必要的测试数据
4. 查看测试工具类的实现

## 扩展测试

如果需要添加新的测试用例：

1. 在 `TestGetAvailableTournaments` 类中添加新的测试方法
2. 在 `runAllTests` 方法中调用新测试
3. 在 `runSingleTest` 的 switch 语句中添加新的 case
4. 更新本文档

## 相关文件

- `testGetAvailableTournaments.ts` - 主要测试逻辑
- `testUtils.ts` - 测试工具类
- `runGetAvailableTournamentsTests.ts` - 测试运行器
- `README_GetAvailableTournaments.md` - 详细测试文档 