# applyRules 方法流程图

## 整体流程

```mermaid
flowchart TD
    A[开始: applyRules] --> B[获取锦标赛配置]
    B --> C[计算玩家最高分数]
    C --> D{排名策略判断}
    
    D -->|threshold| E[阈值排名计算]
    D -->|highest_score| F[最高分排名计算]
    
    E --> G[查找对应奖励配置]
    F --> G
    
    G --> H[计算基础奖励]
    H --> I{玩家是否订阅?}
    
    I -->|是| J[应用订阅者加成]
    I -->|否| K{玩家段位判断}
    
    J --> K
    K -->|Gold| L[应用Gold段位加成]
    K -->|Platinum| M[应用Platinum段位加成]
    K -->|其他| N[无段位加成]
    
    L --> O[更新玩家库存]
    M --> O
    N --> O
    
    O --> P[更新赛季积分]
    P --> Q{段位是否升级?}
    
    Q -->|是| R[更新玩家段位]
    Q -->|否| S{是否触发分享?}
    
    R --> S
    S -->|是| T[创建分享记录]
    S -->|否| U[返回结果]
    
    T --> U
    U --> V[结束]
```

## 详细子流程

### 1. 排名计算流程

```mermaid
flowchart TD
    A[开始排名计算] --> B{排名策略}
    
    B -->|threshold| C[获取分数阈值]
    C --> D[比较最高分数与阈值]
    D --> E{分数 >= 阈值?}
    E -->|是| F[排名 = 1]
    E -->|否| G[排名 = 2]
    F --> H[选择第1名奖励]
    G --> I[选择第2名奖励]
    
    B -->|highest_score| J[收集所有玩家分数]
    J --> K[按分数排序]
    K --> L[计算玩家排名]
    L --> M[查找排名对应奖励]
    
    H --> N[返回排名和奖励]
    I --> N
    M --> N
    N --> O[排名计算完成]
```

### 2. 奖励加成流程

```mermaid
flowchart TD
    A[开始奖励加成] --> B[获取基础奖励]
    B --> C{检查订阅状态}
    
    C -->|已订阅| D[应用订阅者加成]
    C -->|未订阅| E[跳过订阅加成]
    
    D --> F{检查段位}
    E --> F
    
    F -->|Gold| G[金币 × 1.1, 积分 × 1.1]
    F -->|Platinum| H[金币 × 1.2, 积分 × 1.2]
    F -->|其他| I[无段位加成]
    
    G --> J[计算最终奖励]
    H --> J
    I --> J
    
    J --> K[奖励加成完成]
```

### 3. 数据更新流程

```mermaid
flowchart TD
    A[开始数据更新] --> B[更新玩家库存]
    B --> C[更新金币]
    C --> D[更新道具]
    D --> E[更新门票]
    
    E --> F[更新赛季积分]
    F --> G[更新总积分]
    G --> H[更新游戏类型积分]
    
    H --> I{检查段位升级}
    I -->|需要升级| J[更新玩家段位]
    I -->|无需升级| K[跳过段位更新]
    
    J --> L{检查分享触发}
    K --> L
    
    L -->|触发分享| M[创建分享记录]
    L -->|不触发| N[跳过分享]
    
    M --> O[数据更新完成]
    N --> O
```

## 关键决策点

### 1. 排名策略选择
- **threshold**: 基于分数阈值的简单排名
- **highest_score**: 基于所有玩家分数的竞争排名

### 2. 奖励加成条件
- **订阅者**: 金币 × 1.2, 积分 × 1.5
- **Gold段位**: 金币 × 1.1, 积分 × 1.1
- **Platinum段位**: 金币 × 1.2, 积分 × 1.2

### 3. 段位升级条件
- **Bronze**: 0-999 积分
- **Silver**: 1000-4999 积分
- **Gold**: 5000-9999 积分
- **Platinum**: 10000+ 积分

### 4. 分享触发条件
- 配置中启用分享功能
- 随机概率检查通过
- 排名在指定范围内

## 数据流

### 输入数据
```typescript
{
  tournament: {
    config: {
      rules: { ranking: string, scoreThreshold?: number },
      rewards: Array<RewardConfig>,
      subscriberBonus: { coins: number, gamePoints: number },
      share: { probability: number, rankRange: [number, number] }
    }
  },
  uid: string,
  matches: Array<Match>,
  player: { isSubscribed: boolean, segmentName: string },
  inventory: { coins: number, props: Array, tickets: Array },
  playerSeason: { seasonPoints: number, gamePoints: Object }
}
```

### 输出数据
```typescript
{
  rank: number,
  finalReward: {
    coins: number,
    props: Array,
    gamePoints: number,
    tickets: Array
  }
}
```

### 数据库更新
1. **player_inventory**: 更新金币、道具、门票
2. **player_seasons**: 更新赛季积分和游戏积分
3. **players**: 更新段位（如果需要）
4. **player_shares**: 创建分享记录（如果触发）

## 错误处理

### 1. 配置错误
- 无效的排名策略
- 缺失的奖励配置
- 错误的排名范围

### 2. 数据错误
- 玩家数据不存在
- 库存数据缺失
- 赛季信息不完整

### 3. 计算错误
- 分数计算异常
- 奖励计算溢出
- 段位判断错误

## 性能考虑

### 1. 数据库操作优化
- 批量更新减少查询次数
- 使用索引提高查询效率
- 事务性操作确保一致性

### 2. 内存使用优化
- 使用 Map 进行快速查找
- 避免重复计算
- 及时释放临时变量

### 3. 并发处理
- 原子性操作避免竞态条件
- 乐观锁机制处理并发更新
- 错误重试机制

## 监控指标

### 1. 性能指标
- 方法执行时间
- 数据库查询次数
- 内存使用量

### 2. 业务指标
- 奖励分配成功率
- 段位升级频率
- 分享触发率

### 3. 错误指标
- 配置错误率
- 数据异常率
- 计算错误率 