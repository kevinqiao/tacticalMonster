# 段位保护机制集成到 SegmentManager 指南

## 🎯 集成目标

将段位保护机制从 `IntelligentExperienceManager` 集成到 `SegmentManager` 中，实现统一的段位管理和保护逻辑。

## 🔄 重构方案

### 1. 移除重复实现

**之前的问题**：
- 段位保护逻辑在 `IntelligentExperienceManager` 中实现
- `ScoreThresholdPlayerController` 中重复调用保护机制
- 保护状态更新分散在多个地方

**解决方案**：
- 将保护机制核心逻辑移到 `SegmentManager`
- 在段位变化检查时自动应用保护
- 统一保护状态管理

### 2. 集成架构

```
ScoreThresholdPlayerController
    ↓
SegmentManager (包含保护机制)
    ↓
PlayerSegmentDataAccess
    ↓
数据库表
```

## 🛠️ 实现步骤

### 步骤1：更新 SegmentChangeResult 接口

在 `types.ts` 中添加保护信息字段：

```typescript
export interface SegmentChangeResult {
    changed: boolean;
    changeType: ChangeType;
    oldSegment: SegmentName;
    newSegment: SegmentName;
    pointsConsumed: number;
    message: string;
    reason: string;
    timestamp: string;
    protectionInfo?: {
        isProtected: boolean;
        protectionType: 'new_segment' | 'performance' | 'grace_period' | 'demotion_protection' | 'none';
        reason: string;
        remainingDays: number;
        protectionLevel: number;
    };
}
```

### 步骤2：在 SegmentManager 中添加保护方法

```typescript
class SegmentManager {
    // ==================== 段位保护机制 ====================
    
    /**
     * 检查段位保护状态
     */
    private async checkSegmentProtection(
        uid: string,
        currentSegment: string,
        newPoints: number
    ): Promise<ProtectionResult> {
        // 实现保护检查逻辑
    }
    
    /**
     * 新段位保护检查
     */
    private checkNewSegmentProtection(
        protectionData: any,
        currentSegment: string
    ): ProtectionResult {
        // 实现新段位保护逻辑
    }
    
    /**
     * 宽限期保护检查
     */
    private checkGracePeriodProtection(
        protectionData: any,
        currentSegment: string
    ): ProtectionResult {
        // 实现宽限期保护逻辑
    }
    
    /**
     * 表现保护检查
     */
    private checkPerformanceProtection(
        newPoints: number,
        currentSegment: string
    ): ProtectionResult {
        // 实现表现保护逻辑
    }
}
```

### 步骤3：集成到段位变化检查流程

```typescript
async checkAndProcessSegmentChange(
    uid: string,
    newPoints: number,
    matchId?: string
): Promise<SegmentChangeResult> {
    try {
        // 获取玩家当前数据
        const playerData = await PlayerSegmentDataAccess.getPlayerSegmentData(this.ctx, uid);
        
        // 🆕 检查段位保护状态
        const protectionResult = await this.checkSegmentProtection(uid, currentSegment, newPoints);
        
        // 如果玩家处于保护状态，阻止降级
        if (protectionResult.isProtected && protectionResult.protectionType === 'demotion_protection') {
            return {
                changed: false,
                changeType: "none",
                oldSegment: currentSegment,
                newSegment: currentSegment,
                pointsConsumed: 0,
                message: `段位保护中：${protectionResult.reason}`,
                reason: protectionResult.reason,
                timestamp: new Date().toISOString(),
                protectionInfo: protectionResult
            };
        }
        
        // 检查升级
        const promotionResult = await this.checkPromotion(playerData, segmentRule);
        if (promotionResult.shouldPromote) {
            const result = await this.executePromotion(playerData, promotionResult, matchId);
            
            // 🆕 晋升后设置保护状态
            if (result.changed) {
                await this.setNewSegmentProtection(uid, result.newSegment);
            }
            
            return result;
        }
        
        // 检查降级
        const demotionResult = await this.checkDemotion(playerData, segmentRule);
        if (demotionResult.shouldDemote) {
            const result = await this.executeDemotion(playerData, demotionResult, matchId);
            
            // 🆕 降级后设置宽限期保护
            if (result.changed) {
                await this.setGracePeriodProtection(uid, result.oldSegment);
            }
            
            return result;
        }
        
        // 无变化
        return {
            changed: false,
            changeType: "none",
            oldSegment: currentSegment,
            newSegment: currentSegment,
            pointsConsumed: 0,
            message: "段位无变化",
            reason: "不满足升降级条件",
            timestamp: new Date().toISOString(),
            protectionInfo: protectionResult
        };
        
    } catch (error) {
        console.error("检查段位变化时发生错误:", error);
        return this.createErrorResult(`系统错误: ${error.message}`);
    }
}
```

### 步骤4：简化 ScoreThresholdPlayerController

移除重复的保护逻辑，直接调用 `SegmentManager`：

```typescript
async checkSegmentChanges(rankings: RankingResult[], matchId: string): Promise<any[]> {
    const segmentChanges = [];
    
    for (const ranking of rankings) {
        try {
            // 计算本场比赛获得的积分
            const matchPoints = this.calculateMatchPoints(ranking.rank, ranking.segmentName);
            
            // 获取玩家当前累积积分
            const currentTotalPoints = await this.getPlayerCurrentTotalPoints(ranking.uid);
            
            // 计算新的累积积分
            const newTotalPoints = currentTotalPoints + matchPoints;
            
            // 使用段位管理器检查变化（包含保护机制）
            const changeResult = await this.segmentManager.checkAndProcessSegmentChange(
                ranking.uid,
                newTotalPoints,
                matchId
            );
            
            if (changeResult.changed) {
                segmentChanges.push({
                    uid: ranking.uid,
                    matchId,
                    oldSegment: ranking.segmentName,
                    newSegment: changeResult.newSegment,
                    changeType: changeResult.changeType,
                    pointsConsumed: changeResult.pointsConsumed || 0,
                    reason: changeResult.reason || '段位变化',
                    timestamp: new Date().toISOString()
                });
                
                // 更新玩家累积积分
                await this.updatePlayerTotalPoints(ranking.uid, newTotalPoints);
            } else {
                // 即使段位没有变化，也要更新累积积分
                await this.updatePlayerTotalPoints(ranking.uid, newTotalPoints);
            }
            
        } catch (error) {
            console.error(`检查玩家 ${ranking.uid} 段位变化失败:`, error);
        }
    }
    
    return segmentChanges;
}
```

## 📊 保护机制类型

### 1. 新段位保护（New Segment Protection）

**触发条件**：玩家刚晋升到新段位
**保护期**：7天
**保护等级**：高级（Level 2）
**自动设置**：晋升成功后自动设置

### 2. 表现保护（Performance Protection）

**触发条件**：积分远高于当前段位要求（≥1.5倍）
**保护期**：3天
**保护等级**：基础（Level 1）
**自动检查**：每次段位变化检查时自动评估

### 3. 宽限期保护（Grace Period Protection）

**触发条件**：玩家刚降级到较低段位
**保护期**：5天
**保护等级**：基础（Level 1）
**自动设置**：降级成功后自动设置

## 🔧 使用方法

### 1. 直接调用 SegmentManager

```typescript
import { SegmentManager } from '../segment/SegmentManager';

const segmentManager = new SegmentManager(ctx);

// 检查段位变化（自动包含保护机制）
const changeResult = await segmentManager.checkAndProcessSegmentChange(
    uid,
    newPoints,
    matchId
);

// 检查保护信息
if (changeResult.protectionInfo) {
    console.log(`保护状态: ${changeResult.protectionInfo.isProtected}`);
    console.log(`保护类型: ${changeResult.protectionInfo.protectionType}`);
    console.log(`剩余天数: ${changeResult.protectionInfo.remainingDays}`);
}
```

### 2. 通过 ScoreThresholdPlayerController

```typescript
// 在比赛结束后自动检查段位变化
const segmentChanges = await this.checkSegmentChanges(rankings, matchId);

// 保护机制已自动应用，无需额外处理
```

## 🧪 测试验证

### 运行集成测试

```bash
cd develop/src/convex/tournament/convex/service/tournament/scoreThresholdControl/test
node integratedSegmentProtectionTest.ts
```

### 测试覆盖

- ✅ 新段位保护检查
- ✅ 表现保护检查
- ✅ 宽限期保护检查
- ✅ 保护机制阻止降级
- ✅ 自动保护状态管理

## 📈 集成优势

### 1. 统一管理

- 段位逻辑和保护逻辑集中在一个地方
- 减少代码重复和维护成本
- 统一的错误处理和日志记录

### 2. 自动应用

- 保护机制在段位检查时自动应用
- 无需手动调用保护方法
- 保护状态自动更新和维护

### 3. 更好的扩展性

- 保护规则可以统一配置
- 新的保护类型易于添加
- 保护效果可以统一分析

### 4. 性能优化

- 减少重复的数据库查询
- 保护检查与段位检查合并
- 缓存保护状态信息

## 🔮 未来扩展

### 1. 数据库表设计

```sql
-- 玩家保护状态表
CREATE TABLE player_protection_status (
    uid VARCHAR(255) PRIMARY KEY,
    current_segment VARCHAR(50),
    last_promotion_date TIMESTAMP,
    promotion_segment VARCHAR(50),
    grace_period_start TIMESTAMP,
    grace_period_segment VARCHAR(50),
    protection_history JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. 配置化保护规则

```typescript
interface ProtectionRule {
    type: 'new_segment' | 'performance' | 'grace_period';
    duration: number;
    conditions: ProtectionCondition[];
    level: number;
}
```

### 3. 保护效果分析

```typescript
interface ProtectionEffect {
    protectionType: string;
    successRate: number;
    averageProtectionDays: number;
    playerSatisfaction: number;
}
```

## 📝 总结

通过将段位保护机制集成到 `SegmentManager` 中，我们实现了：

1. **统一管理**：段位逻辑和保护逻辑集中管理
2. **自动应用**：保护机制在段位检查时自动应用
3. **简化调用**：`ScoreThresholdPlayerController` 无需关心保护细节
4. **更好扩展**：新的保护类型易于添加和配置
5. **性能优化**：减少重复操作，提高系统效率

这种集成方式使得段位保护机制更加健壮、可维护，并且与现有的段位管理系统完美融合。
