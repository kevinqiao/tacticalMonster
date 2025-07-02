# 如何运行锦标赛测试

## 🚀 快速开始

### 方法1: Convex 控制台 (推荐)

1. **打开 Convex Dashboard**
   - 访问 https://dashboard.convex.dev
   - 选择您的项目

2. **导航到 Functions**
   - 点击左侧菜单的 "Functions"
   - 找到 `service/tournament/tests/runUnifiedTests`

3. **运行测试**
   - 点击 "Run" 按钮
   - 输入参数：
   ```json
   {
       "testTypes": ["unit", "scenario"],
       "verbose": true
   }
   ```

4. **查看结果**
   - 测试结果会显示在控制台输出中
   - 包含详细的成功/失败统计

### 方法2: React 组件

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function TestRunner() {
    const runTests = useMutation(api.service.tournament.tests.runUnifiedTests);

    const handleRunTests = async () => {
        const result = await runTests({
            testTypes: ["unit", "scenario"],
            verbose: true
        });
        console.log("测试结果:", result);
    };

    return <button onClick={handleRunTests}>运行测试</button>;
}
```

### 方法3: 客户端代码

```typescript
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const result = await client.query(api.service.tournament.tests.runUnifiedTests, {
    testTypes: ["unit", "scenario"],
    verbose: true
});
```

## 📋 常用测试命令

### 运行所有测试
```json
{
    "testTypes": ["unit", "integration", "scenario"],
    "verbose": true
}
```

### 只运行单元测试
```json
{
    "testTypes": ["unit"],
    "verbose": true
}
```

### 只运行场景测试
```json
{
    "testTypes": ["scenario"],
    "verbose": true
}
```

### 运行特定测试
```json
{
    "testTypes": ["scenario"],
    "specificTests": ["scenario_daily_join", "scenario_single_join"],
    "verbose": true
}
```

### 自定义配置
```json
{
    "testTypes": ["unit", "scenario"],
    "timeout": 60000,
    "verbose": true,
    "stopOnFailure": false
}
```

## 🎯 测试类型说明

### Unit Tests (单元测试)
- 测试单个函数或组件
- 运行速度快
- 适合开发时快速验证

### Integration Tests (集成测试)
- 测试多个组件交互
- 验证系统集成
- 中等运行速度

### Scenario Tests (场景测试)
- 测试完整业务场景
- 模拟真实用户操作
- 运行时间较长

## 📊 理解测试结果

### 成功输出示例
```
🚀 开始运行统一锦标赛测试
配置: {
  "testTypes": ["unit", "scenario"],
  "timeout": 30000,
  "concurrency": 1,
  "verbose": true,
  "stopOnFailure": false
}

📦 运行主测试套件
  🧪 测试工具创建
    ✅ 测试工具创建 - 通过
  🧪 Mock上下文设置
    ✅ Mock上下文设置 - 通过

📦 运行场景测试
  🧪 每日特殊锦标赛加入测试
    ✅ 每日特殊锦标赛加入测试 - 通过

============================================================
📊 测试执行报告
============================================================

📦 主测试套件:
   总测试: 2
   通过: 2 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%

📦 场景测试套件:
   总测试: 8
   通过: 8 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%

------------------------------------------------------------
📈 总体统计:
   总测试: 10
   通过: 10 ✅
   失败: 0 ❌
   跳过: 0 ⏭️
   成功率: 100.0%
============================================================
```

### 失败输出示例
```
❌ 测试失败: 期望 true 等于 false
   在: 我的第一个测试 > 应该成功创建模拟上下文
   错误: 期望 true 等于 false
```

## 🔧 调试技巧

### 1. 启用详细输出
```json
{
    "testTypes": ["unit"],
    "verbose": true
}
```

### 2. 增加超时时间
```json
{
    "testTypes": ["scenario"],
    "timeout": 60000
}
```

### 3. 运行单个测试
```json
{
    "testTypes": ["scenario"],
    "specificTests": ["scenario_daily_join"]
}
```

### 4. 检查测试状态
```typescript
// 在 Convex 控制台运行
await ctx.runQuery(internal.service.tournament.tests.getTestStatus);
```

## 🚨 常见问题

### 问题1: 测试超时
**解决方案:**
- 增加 `timeout` 参数
- 检查网络连接
- 减少测试范围

### 问题2: 测试失败
**解决方案:**
- 启用 `verbose: true` 查看详细错误
- 检查模拟数据设置
- 验证测试环境

### 问题3: 函数未找到
**解决方案:**
- 确保函数已部署
- 检查函数路径
- 验证 API 导入

## 📝 最佳实践

### 1. 开发时
- 运行单元测试快速验证
- 使用 `verbose: true` 查看详细信息
- 设置合理的超时时间

### 2. 提交前
- 运行所有测试类型
- 确保成功率 > 95%
- 检查测试覆盖率

### 3. 部署前
- 运行完整测试套件
- 验证关键场景测试
- 检查性能指标

## 🎯 测试场景

### 每日开发流程
```json
{
    "testTypes": ["unit"],
    "verbose": true,
    "timeout": 30000
}
```

### 功能验证
```json
{
    "testTypes": ["unit", "integration"],
    "verbose": true,
    "timeout": 45000
}
```

### 完整验证
```json
{
    "testTypes": ["unit", "integration", "scenario"],
    "verbose": true,
    "timeout": 60000
}
```

### CI/CD 流程
```json
{
    "testTypes": ["unit", "integration", "scenario"],
    "verbose": false,
    "timeout": 60000,
    "stopOnFailure": true
}
```

## 📚 相关文档

- [完整测试文档](README.md) - 详细的使用说明
- [快速开始指南](QUICK_START.md) - 5分钟快速上手
- [使用示例](EXAMPLES.md) - 实际代码示例
- [测试执行指南](README_TestExecution.md) - 执行流程说明

## 🆘 获取帮助

如果遇到问题：

1. 查看错误信息和堆栈跟踪
2. 检查测试环境状态
3. 参考相关文档
4. 查看现有测试示例

---

**现在就开始测试吧！** 🚀 