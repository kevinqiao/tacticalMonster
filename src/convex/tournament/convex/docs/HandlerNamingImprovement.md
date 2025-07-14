# 锦标赛处理器命名改进

## 重命名说明

### 原名称：`sharedTournamentHandler.ts`
### 新名称：`multiPlayerIndependentMatchHandler.ts`

## 重命名理由

### 1. **更准确的语义表达**
- **原名称问题**：`sharedTournamentHandler` 中的 "shared" 容易引起歧义
  - 可能被理解为"共享游戏环境"
  - 不够明确表达"独立比赛"的概念
- **新名称优势**：`multiPlayerIndependentMatchHandler` 更清楚地表达了：
  - `multiPlayer` - 多人参与
  - `Independent` - 独立进行
  - `Match` - 比赛模式

### 2. **与现有命名保持一致**
现在所有处理器都遵循统一的命名模式：

| 处理器名称 | 功能描述 | 命名模式 |
|------------|----------|----------|
| `multiPlayerTournamentHandler` | 多人锦标赛 | `multiPlayer` + `Tournament` |
| `multiPlayerSingleMatchHandler` | 多人单场比赛 | `multiPlayer` + `SingleMatch` |
| `multiPlayerIndependentMatchHandler` | 多人独立比赛 | `multiPlayer` + `IndependentMatch` |
| `multiPlayerIndependentGamesHandler` | 多人独立游戏 | `multiPlayer` + `IndependentGames` |

### 3. **功能描述更精确**
- **原名称**：强调"共享锦标赛"，但实际是"独立比赛"
- **新名称**：直接表达"多人独立比赛"的核心概念
- **避免混淆**：与真正的"共享游戏环境"模式区分开来

## 功能对比

### 多人独立比赛锦标赛 (`multiPlayerIndependentMatchHandler`)
- ✅ 多个玩家共享同一个锦标赛实例
- ✅ 每个玩家进行独立的单人比赛
- ✅ 根据独立比赛成绩进行排名
- ✅ 支持多次尝试

### 多人单场比赛锦标赛 (`multiPlayerSingleMatchHandler`)
- ✅ 多个玩家参与同一场比赛
- ✅ 所有玩家在同一个游戏环境中竞争
- ✅ 实时排名和进度更新

### 多人独立游戏锦标赛 (`multiPlayerIndependentGamesHandler`)
- ✅ 多个玩家参与同一场比赛
- ✅ 每个玩家有独立的游戏实例
- ✅ 同步开始，独立计分

## 命名规范总结

### 命名模式：`[PlayerCount][MatchType][Handler]`

#### PlayerCount（玩家数量）
- `single` - 单人
- `multi` - 多人

#### MatchType（比赛类型）
- `Tournament` - 锦标赛
- `SingleMatch` - 单场比赛
- `IndependentMatch` - 独立比赛
- `IndependentGames` - 独立游戏

#### Handler（处理器）
- 所有处理器都以 `Handler` 结尾

### 示例
```typescript
// 正确的命名模式
multiPlayerTournamentHandler        // 多人锦标赛
multiPlayerSingleMatchHandler       // 多人单场比赛
multiPlayerIndependentMatchHandler  // 多人独立比赛
multiPlayerIndependentGamesHandler  // 多人独立游戏
singlePlayerTournamentHandler       // 单人锦标赛（如果存在）
```

## 代码更新

### 1. 文件重命名
```bash
sharedTournamentHandler.ts → multiPlayerIndependentMatchHandler.ts
```

### 2. 导出名称更新
```typescript
// 原代码
export const sharedTournamentHandler: TournamentHandler = {

// 新代码
export const multiPlayerIndependentMatchHandler: TournamentHandler = {
```

### 3. 导入语句更新
```typescript
// 原代码
import { sharedTournamentHandler } from "./sharedTournamentHandler";

// 新代码
import { multiPlayerIndependentMatchHandler } from "./multiPlayerIndependentMatchHandler";
```

### 4. 映射更新
```typescript
// 原代码
"shared_tournament_independent_matches": sharedTournamentHandler,

// 新代码
"shared_tournament_independent_matches": multiPlayerIndependentMatchHandler,
```

## 优势总结

### 1. **语义清晰**
- 新名称直接表达了功能特点
- 避免了"shared"可能引起的歧义
- 更容易理解处理器的用途

### 2. **命名一致**
- 所有处理器遵循相同的命名模式
- 便于维护和扩展
- 提高代码可读性

### 3. **功能明确**
- 清楚区分不同的多人模式
- 便于开发者选择合适的处理器
- 减少使用错误

### 4. **扩展友好**
- 为未来添加新的处理器类型提供了清晰的命名规范
- 便于理解整个系统的架构
- 支持更好的文档生成

## 建议

### 1. **保持命名一致性**
- 所有新添加的处理器都应遵循这个命名模式
- 避免使用容易引起歧义的词汇

### 2. **文档更新**
- 更新相关的设计文档
- 确保文档中的命名与实际代码一致

### 3. **代码审查**
- 在代码审查中关注命名的一致性
- 确保新代码遵循既定的命名规范

这次重命名是一个很好的改进，使整个系统的命名更加科学、清晰和一致。 