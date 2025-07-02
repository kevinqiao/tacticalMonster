# 锦标赛测试系统文档索引

## 📚 文档概览

这个索引帮助您快速找到所需的测试文档。

## 🚀 快速开始

### 新用户入门
1. **[快速开始指南](QUICK_START.md)** - 5分钟快速上手
2. **[如何运行测试](RUN_TESTS.md)** - 详细的运行步骤
3. **[使用示例](EXAMPLES.md)** - 实际代码示例

### 立即开始测试
```typescript
// 最简单的测试运行
await runTests({ testTypes: ["unit"], verbose: true });
```

## 📖 详细文档

### 核心文档
- **[完整测试文档](README.md)** - 全面的使用说明和架构介绍
- **[测试执行指南](README_TestExecution.md)** - 执行流程和最佳实践
- **[测试清理说明](README_TestCleanup.md)** - 测试系统维护

### 架构文档
- **[测试框架设计](simpleTestFramework.ts)** - 自定义测试框架实现
- **[测试工具说明](testUtils.ts)** - 模拟上下文和工具函数
- **[测试运行器](testRunner.ts)** - 统一测试运行器实现

## 🎯 按需求查找

### 我想运行测试
- **[如何运行测试](RUN_TESTS.md)** - 详细的运行步骤
- **[快速开始指南](QUICK_START.md)** - 5分钟快速上手
- **[使用示例](EXAMPLES.md)** - 实际运行代码

### 我想编写测试
- **[完整测试文档](README.md)** - 编写测试的详细说明
- **[使用示例](EXAMPLES.md)** - 测试编写示例
- **[测试工具说明](testUtils.ts)** - 可用的测试工具

### 我想调试测试
- **[如何运行测试](RUN_TESTS.md)** - 调试技巧
- **[完整测试文档](README.md)** - 故障排除
- **[测试执行指南](README_TestExecution.md)** - 调试最佳实践

### 我想了解架构
- **[完整测试文档](README.md)** - 架构概述
- **[测试框架设计](simpleTestFramework.ts)** - 框架实现
- **[测试运行器](testRunner.ts)** - 运行器实现

## 📋 常用命令速查

### 基础测试运行
```json
// 运行所有测试
{
    "testTypes": ["unit", "integration", "scenario"],
    "verbose": true
}

// 只运行单元测试
{
    "testTypes": ["unit"],
    "verbose": true
}

// 只运行场景测试
{
    "testTypes": ["scenario"],
    "verbose": true
}
```

### 特定测试运行
```json
// 运行特定测试
{
    "testTypes": ["scenario"],
    "specificTests": ["scenario_daily_join"],
    "verbose": true
}
```

### 自定义配置
```json
// 完整配置示例
{
    "testTypes": ["unit", "scenario"],
    "timeout": 60000,
    "verbose": true,
    "stopOnFailure": false
}
```

## 🧪 测试类型说明

| 测试类型 | 用途 | 运行时间 | 适用场景 |
|---------|------|----------|----------|
| **Unit** | 单元测试 | 快 | 开发时快速验证 |
| **Integration** | 集成测试 | 中等 | 验证组件交互 |
| **Scenario** | 场景测试 | 慢 | 完整业务场景 |

## 📊 测试结果解读

### 成功指标
- ✅ **通过率 > 95%** - 测试质量良好
- ✅ **运行时间 < 60秒** - 性能正常
- ✅ **无关键错误** - 功能稳定

### 失败处理
- ❌ **查看详细错误** - 启用 `verbose: true`
- ❌ **检查模拟数据** - 验证测试环境
- ❌ **运行单个测试** - 隔离问题

## 🔧 工具和函数

### 核心函数
```typescript
// 运行统一测试
runUnifiedTests(config)

// 运行特定测试
runSpecificTest(testName)

// 获取测试状态
getTestStatus()
```

### 测试工具
```typescript
// 创建模拟上下文
TournamentTestUtils.createMockContext()

// 设置默认模拟
ctx.setupDefaultMocks()

// 验证结果
TournamentTestUtils.validateJoinResult(result)
```

### 断言函数
```typescript
// 基础断言
expect(actual).toBe(expected)
assertEqual(actual, expected)
assertTrue(condition)
assertDefined(value)

// 错误断言
assertThrows(fn, expectedError)
assertRejects(promise, expectedError)
```

## 🚨 常见问题

### 问题1: "jest is not defined"
**解决方案:** 查看 [快速开始指南](QUICK_START.md) 中的故障排除部分

### 问题2: 测试超时
**解决方案:** 增加 `timeout` 参数，参考 [如何运行测试](RUN_TESTS.md)

### 问题3: 模拟数据不匹配
**解决方案:** 检查 [测试工具说明](testUtils.ts) 中的模拟设置

## 📈 最佳实践

### 开发流程
1. **编写代码** → 2. **运行单元测试** → 3. **运行集成测试** → 4. **提交代码**

### 测试策略
- **单元测试**: 每个函数都要测试
- **集成测试**: 关键流程要测试
- **场景测试**: 重要业务场景要测试

### 质量保证
- **成功率 > 95%** - 确保代码质量
- **覆盖率 > 80%** - 确保测试覆盖
- **运行时间 < 60秒** - 确保测试效率

## 🆘 获取帮助

### 文档资源
1. **[完整测试文档](README.md)** - 最全面的文档
2. **[快速开始指南](QUICK_START.md)** - 快速入门
3. **[使用示例](EXAMPLES.md)** - 实际代码示例

### 调试步骤
1. 查看错误信息和堆栈跟踪
2. 检查测试环境状态
3. 参考相关文档
4. 查看现有测试示例

### 联系支持
- 查看现有文档
- 检查错误日志
- 参考测试示例
- 查看架构说明

## 📝 文档更新

### 最近更新
- ✅ 创建完整的测试文档体系
- ✅ 提供快速开始指南
- ✅ 添加实际使用示例
- ✅ 完善故障排除指南

### 计划更新
- 🔄 添加更多测试场景
- 🔄 优化测试性能
- 🔄 增加测试覆盖率报告
- 🔄 添加自动化测试流程

---

**开始使用锦标赛测试系统吧！** 🚀

选择适合您的文档开始学习，如果遇到问题，请参考故障排除部分或查看相关示例。 