# TournamentService 测试执行指南

## 📋 测试概述

本目录包含 `tournamentService.ts` 的完整测试套件，涵盖以下三个主要接口函数：

- `joinTournament` - 加入锦标赛
- `submitScore` - 提交分数  
- `getAvailableTournaments` - 获取可用锦标赛

## 🚀 执行测试的方法

### 方法1：使用 Convex Dashboard（推荐）

#### 1. 启动开发服务器
```bash
cd develop/src/convex/tournament
npx convex dev
```

#### 2. 访问 Dashboard
打开浏览器访问 `http://localhost:8000`

#### 3. 执行测试
在 Dashboard 中找到 "Functions" 标签，然后：

**执行所有测试：**
- 找到 `runAllTournamentServiceTests` 函数
- 点击 "Run" 按钮
- 无需输入参数，直接执行

**执行单个测试：**
- 找到对应的测试函数（如 `testJoinTournament`）
- 点击 "Run" 按钮
- 输入测试参数

### 方法2：使用 Convex CLI

#### 执行所有测试
```bash
npx convex run runAllTournamentServiceTests
```

#### 执行单个测试
```bash
# joinTournament 测试
npx convex run testJoinTournament --data '{
  "testCases": [
    {
      "uid": "test_user_1",
      "typeId": "daily_solitaire",
      "expectedSuccess": true
    }
  ]
}'

# submitScore 测试
npx convex run testSubmitScore --data '{
  "testCases": [
    {
      "matchId": "test_match_1",
      "games": [
        {
          "uid": "test_user_1",
          "score": 1500,
          "gameData": {"moves": 10, "time": 120}
        }
      ],
      "expectedSuccess": true
    }
  ]
}'

# getAvailableTournaments 测试
npx convex run testGetAvailableTournaments --data '{
  "testCases": [
    {
      "uid": "test_user_1",
      "gameType": "solitaire",
      "expectedTournamentCount": 3
    }
  ]
}'
```

### 方法3：使用测试脚本

#### 执行完整测试套件
```bash
npx convex run runAllTournamentServiceTests
```

#### 执行单个测试
```bash
npx convex run runSingleTest --data '{
  "testName": "joinTournament",
  "testData": {
    "uid": "test_user_1",
    "typeId": "daily_solitaire"
  }
}'
```

## 📊 测试用例说明

### 1. testJoinTournament
测试玩家加入锦标赛的功能

**测试场景：**
- 正常加入锦标赛
- 加入不存在的锦标赛类型
- 资源不足的情况

**参数示例：**
```json
{
  "testCases": [
    {
      "uid": "test_user_1",
      "typeId": "daily_solitaire",
      "expectedSuccess": true
    },
    {
      "uid": "test_user_2",
      "typeId": "non_existent_type",
      "expectedSuccess": false,
      "expectedError": "锦标赛类型不存在"
    }
  ]
}
```

### 2. testSubmitScore
测试分数提交功能

**测试场景：**
- 单玩家分数提交
- 多玩家分数提交
- 无效比赛ID

**参数示例：**
```json
{
  "testCases": [
    {
      "matchId": "test_match_1",
      "games": [
        {
          "uid": "test_user_1",
          "score": 1500,
          "gameData": {"moves": 10, "time": 120}
        }
      ],
      "expectedSuccess": true
    }
  ]
}
```

### 3. testGetAvailableTournaments
测试获取可用锦标赛列表

**测试场景：**
- 获取所有可用锦标赛
- 按游戏类型过滤
- 验证资格检查

**参数示例：**
```json
{
  "testCases": [
    {
      "uid": "test_user_1",
      "gameType": "solitaire",
      "expectedTournamentCount": 3
    },
    {
      "uid": "test_user_2",
      "expectedTournamentCount": 8
    }
  ]
}
```

### 4. testCompleteTournamentFlow
测试完整锦标赛流程

**测试流程：**
1. 准备测试数据
2. 获取可用锦标赛
3. 加入锦标赛
4. 提交分数

### 5. testBoundaryConditions
测试边界条件

**测试场景：**
- 无效用户ID
- 不存在的锦标赛类型
- 资源不足

### 6. testPerformance
性能测试

**测试内容：**
- 批量创建玩家
- 批量获取锦标赛
- 批量加入锦标赛

## 📈 测试结果解读

### 成功指标
- **成功率 > 90%**：测试通过
- **成功率 80-90%**：需要关注
- **成功率 < 80%**：需要修复

### 性能指标
- **玩家创建**：< 20ms/玩家
- **获取锦标赛**：< 30ms/玩家
- **加入锦标赛**：< 50ms/玩家

## 🔧 故障排除

### 常见问题

1. **测试数据不存在**
   ```
   解决方案：确保已运行 loadTournamentConfig 加载锦标赛配置
   ```

2. **玩家不存在**
   ```
   解决方案：测试会自动创建测试玩家，无需手动创建
   ```

3. **权限错误**
   ```
   解决方案：确保使用正确的 Convex 环境变量
   ```

### 调试技巧

1. **查看控制台日志**
   ```bash
   npx convex dev --verbose
   ```

2. **检查数据库状态**
   ```bash
   npx convex dashboard
   ```

3. **单步调试**
   ```bash
   npx convex run runSingleTest --data '{"testName": "joinTournament", "testData": {...}}'
   ```

## 📝 测试报告

执行测试后，可以使用 `generateTestReport` 生成详细的测试报告：

```bash
npx convex run generateTestReport --data '{
  "testResults": {
    "joinTournament": {"success": true, "passed": 2, "failed": 1},
    "submitScore": {"success": true, "passed": 2, "failed": 0}
  }
}'
```

## 🎯 最佳实践

1. **定期执行测试**：建议每次代码变更后执行测试
2. **关注失败用例**：及时修复失败的测试
3. **性能监控**：定期执行性能测试
4. **测试数据管理**：使用独立的测试数据，避免影响生产环境

## 📞 支持

如果遇到测试问题，请：

1. 检查控制台错误信息
2. 验证测试参数格式
3. 确认数据库连接正常
4. 查看 Convex 文档：https://docs.convex.dev/ 