# 锦标赛通知系统

这个通知系统为锦标赛功能提供了实时的前端更新机制，通过后端通知和前端监听来实现用户界面的自动更新。

## 功能特性

### 后端通知机制
- **新锦标赛通知**: 当新的锦标赛创建时，自动通知相关玩家
- **资格变化通知**: 当玩家的参与资格发生变化时发送通知
- **参与状态更新**: 当玩家加入或提交分数时更新状态
- **锦标赛完成通知**: 当锦标赛结束时通知参与者

### 前端通知服务
- **实时通知显示**: 自动显示来自后端的通知
- **通知管理**: 支持标记已读、删除通知、清空所有通知
- **通知面板**: 提供完整的通知管理界面
- **自动消失**: 通知可以设置自动消失时间

## 使用方法

### 1. 基本集成

```tsx
import { useTournamentStatus } from "./frontendIntegration";
import { NotificationPanel } from "./NotificationPanel";

function MyComponent() {
    const { tournamentStatus, joinTournament } = useTournamentStatus("user123", "solitaire");
    
    return (
        <div>
            {/* 通知面板 */}
            <NotificationPanel />
            
            {/* 锦标赛列表 */}
            {/* 你的锦标赛UI */}
        </div>
    );
}
```

### 2. 使用通知服务

```tsx
import { tournamentNotificationService } from "./notificationService";

// 手动添加通知
tournamentNotificationService.addNotification({
    type: "new_tournament",
    title: "新锦标赛",
    message: "新的锦标赛已开始！",
    data: { tournamentId: "123", name: "每日挑战" }
});

// 处理锦标赛变化
tournamentNotificationService.handleTournamentChange("eligibility_change", {
    name: "每日挑战",
    eligible: true
});
```

### 3. 完整示例

```tsx
import { TournamentWithNotifications } from "./TournamentWithNotifications";

function App() {
    return (
        <TournamentWithNotifications 
            uid="user123" 
            gameType="solitaire" 
        />
    );
}
```

## 通知类型

### 1. new_tournament
- **触发时机**: 新锦标赛创建时
- **显示内容**: 锦标赛名称、描述、游戏类型
- **用户操作**: 点击查看详情或直接参与

### 2. eligibility_change
- **触发时机**: 玩家资格状态变化时
- **显示内容**: 资格变化原因、新的参与条件
- **用户操作**: 查看变化详情

### 3. participation_update
- **触发时机**: 玩家参与状态更新时
- **显示内容**: 参与统计、当前状态
- **用户操作**: 查看参与详情

### 4. tournament_completed
- **触发时机**: 锦标赛结束时
- **显示内容**: 最终结果、奖励信息
- **用户操作**: 查看结果和领取奖励

## 配置选项

### 通知面板配置

```tsx
<NotificationPanel 
    maxNotifications={10}        // 最大显示通知数
    showUnreadOnly={false}       // 是否只显示未读通知
/>
```

### 通知服务配置

```tsx
// 设置默认配置
tournamentNotificationService.setDefaultOptions({
    duration: 5000,              // 显示时长（毫秒）
    position: "top-right",       // 显示位置
    showIcon: true,              // 是否显示图标
    autoClose: true              // 是否自动关闭
});
```

## 后端集成

### 1. 在锦标赛服务中添加通知

```typescript
// 在 joinTournament 方法中
await this.notifyTournamentChanges(ctx, {
    uid: params.uid,
    changeType: "participation_update",
    tournamentType: params.tournamentType,
    tournamentId: result.tournamentId,
    data: {
        name: tournamentType.name,
        action: "joined"
    }
});
```

### 2. 批量通知

```typescript
// 通知多个玩家
await this.notifyMultiplePlayers(ctx, {
    uids: ["user1", "user2", "user3"],
    changeType: "new_tournament",
    tournamentType: "daily_challenge",
    data: {
        name: "每日挑战",
        description: "新的每日挑战已开始"
    }
});
```

## 自定义样式

### 1. 修改通知样式

```css
.tournament-notification {
    /* 自定义通知样式 */
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

.notification-panel {
    /* 自定义通知面板样式 */
    font-family: 'Arial', sans-serif;
}
```

### 2. 添加动画效果

```css
@keyframes slideInFromRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.tournament-notification {
    animation: slideInFromRight 0.3s ease-out;
}
```

## 最佳实践

### 1. 通知频率控制
- 避免发送过于频繁的通知
- 合并相似的通知
- 提供通知偏好设置

### 2. 用户体验
- 提供清晰的通知内容
- 支持通知的交互操作
- 允许用户自定义通知设置

### 3. 性能优化
- 限制同时显示的通知数量
- 及时清理过期的通知
- 使用虚拟滚动处理大量通知

## 故障排除

### 1. 通知不显示
- 检查浏览器通知权限
- 确认通知服务是否正确初始化
- 查看控制台是否有错误信息

### 2. 通知重复显示
- 检查通知ID是否唯一
- 确认通知去重逻辑
- 验证时间戳处理

### 3. 样式问题
- 检查CSS是否正确加载
- 确认样式优先级
- 验证响应式设计

## 扩展功能

### 1. 添加新的通知类型
```typescript
// 在 notificationService.ts 中添加新类型
export interface TournamentNotification {
    type: "new_tournament" | "eligibility_change" | "participation_update" | "tournament_completed" | "custom_type";
    // ... 其他属性
}
```

### 2. 集成外部通知系统
```typescript
// 集成推送通知
if ("serviceWorker" in navigator && "PushManager" in window) {
    // 实现推送通知逻辑
}
```

### 3. 添加通知统计
```typescript
// 添加通知统计功能
tournamentNotificationService.getNotificationStats();
```

这个通知系统为锦标赛功能提供了完整的实时更新解决方案，确保用户能够及时了解锦标赛状态的变化。 