# Context 通知系统

使用 React Context 管理锦标赛通知系统，提供更好的状态管理和用户体验。

## 🎯 核心优势

### 1. **避免 Prop Drilling**
- 通知状态在整个应用中共享，无需通过 props 层层传递
- 任何组件都可以直接访问通知状态和操作

### 2. **集中状态管理**
- 使用 useReducer 管理复杂的状态逻辑
- 状态变化可预测，易于调试

### 3. **持久化存储**
- 自动保存到 localStorage，刷新页面不丢失
- 支持跨会话的通知历史

### 4. **性能优化**
- 通知数量限制，防止内存泄漏
- 按需渲染，避免不必要的重渲染

## 🏗️ 架构设计

```
NotificationProvider (Context Provider)
├── useNotification() - 完整 Hook
├── useNotificationState() - 状态 Hook
├── useNotificationActions() - 操作 Hook
└── useNotificationPanel() - 面板 Hook
```

## 📦 核心组件

### 1. NotificationProvider
```tsx
<NotificationProvider maxNotifications={50}>
    <App />
</NotificationProvider>
```

### 2. 专用 Hooks
```tsx
// 获取完整功能
const { state, addNotification, markAsRead } = useNotification();

// 只获取状态
const { notifications, unreadCount } = useNotificationState();

// 只获取操作
const { addNotification, removeNotification } = useNotificationActions();

// 面板控制
const { isOpen, togglePanel } = useNotificationPanel();
```

## 🚀 使用示例

### 基本使用
```tsx
import { NotificationProvider, useNotificationActions } from "./NotificationContext";

function App() {
    return (
        <NotificationProvider>
            <TournamentApp />
        </NotificationProvider>
    );
}

function TournamentApp() {
    const { handleTournamentChange } = useNotificationActions();
    
    const handleJoinTournament = () => {
        // 业务逻辑...
        handleTournamentChange("participation_update", {
            name: "每日挑战",
            action: "joined"
        });
    };
    
    return <div>...</div>;
}
```

### 在组件中使用
```tsx
function TournamentList() {
    const { notifications } = useNotificationState();
    const { addNotification } = useNotificationActions();
    
    return (
        <div>
            {notifications.map(notification => (
                <div key={notification.id}>
                    {notification.title} - {notification.message}
                </div>
            ))}
        </div>
    );
}
```

## 🔧 状态管理

### 状态结构
```typescript
interface NotificationState {
    notifications: TournamentNotification[];
    unreadCount: number;
    isPanelOpen: boolean;
}
```

### 支持的操作
- `ADD_NOTIFICATION` - 添加通知
- `REMOVE_NOTIFICATION` - 移除通知
- `MARK_AS_READ` - 标记已读
- `MARK_ALL_AS_READ` - 全部标记已读
- `CLEAR_ALL` - 清空所有
- `SET_PANEL_OPEN` - 设置面板状态

## 💾 持久化

### 自动保存
```typescript
// 保存到 localStorage
useEffect(() => {
    localStorage.setItem("tournament_notifications", JSON.stringify(state.notifications));
}, [state.notifications]);

// 从 localStorage 恢复
useEffect(() => {
    const saved = localStorage.getItem("tournament_notifications");
    if (saved) {
        const notifications = JSON.parse(saved);
        dispatch({ type: "SET_NOTIFICATIONS", payload: notifications });
    }
}, []);
```

### 数据格式
```json
[
    {
        "id": "abc123",
        "type": "participation_update",
        "title": "参与状态更新",
        "message": "您在每日挑战中的状态已更新",
        "data": { "name": "每日挑战", "action": "joined" },
        "timestamp": "2024-01-01T12:00:00.000Z",
        "read": false
    }
]
```

## 🎨 自定义样式

### 通知样式
```css
.notification-item {
    transition: all 0.3s ease;
}

.notification-item.unread {
    background-color: #f8f9ff;
    border-left: 4px solid #2196F3;
}

.notification-item.read {
    opacity: 0.7;
}
```

### 动画效果
```css
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification-item {
    animation: slideIn 0.3s ease-out;
}
```

## 🔄 与后端集成

### 自动处理锦标赛变化
```tsx
function useTournamentNotifications(uid: string) {
    const { handleTournamentChange } = useNotificationActions();
    
    useEffect(() => {
        // 监听后端状态变化
        if (tournamentStatus?.tournaments) {
            tournamentStatus.tournaments.forEach(tournament => {
                if (tournament.eligibility?.eligible) {
                    handleTournamentChange("eligibility_change", {
                        name: tournament.name,
                        eligible: true
                    });
                }
            });
        }
    }, [tournamentStatus]);
}
```

## 📊 性能优化

### 1. 数量限制
```tsx
// 限制最大通知数量
if (state.notifications.length >= maxNotifications) {
    const oldestNotification = state.notifications[state.notifications.length - 1];
    dispatch({ type: "REMOVE_NOTIFICATION", payload: oldestNotification.id });
}
```

### 2. 按需渲染
```tsx
// 只渲染可见的通知
const displayNotifications = filteredNotifications.slice(0, maxNotifications);
```

### 3. 内存管理
```tsx
// 定期清理旧通知
useEffect(() => {
    const interval = setInterval(() => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const oldNotifications = notifications.filter(n => 
            new Date(n.timestamp) < oneDayAgo
        );
        oldNotifications.forEach(n => removeNotification(n.id));
    }, 60 * 60 * 1000); // 每小时清理一次

    return () => clearInterval(interval);
}, [notifications]);
```

## 🧪 测试

### 单元测试
```tsx
import { render, screen } from '@testing-library/react';
import { NotificationProvider, useNotificationActions } from './NotificationContext';

test('should add notification', () => {
    function TestComponent() {
        const { addNotification } = useNotificationActions();
        
        useEffect(() => {
            addNotification({
                type: 'new_tournament',
                title: '测试',
                message: '测试消息'
            });
        }, []);
        
        return <div>Test</div>;
    }
    
    render(
        <NotificationProvider>
            <TestComponent />
        </NotificationProvider>
    );
    
    expect(screen.getByText('测试消息')).toBeInTheDocument();
});
```

## 🔧 配置选项

### Provider 配置
```tsx
<NotificationProvider 
    maxNotifications={50}        // 最大通知数量
>
    <App />
</NotificationProvider>
```

### 面板配置
```tsx
<NotificationPanel 
    maxNotifications={10}        // 面板显示数量
    showUnreadOnly={false}      // 是否只显示未读
/>
```

## 🚀 最佳实践

### 1. 合理使用 Hook
```tsx
// 好的做法：按需使用专用 Hook
const { notifications } = useNotificationState();
const { addNotification } = useNotificationActions();

// 避免：在不需要完整功能的组件中使用完整 Hook
const { state, addNotification, markAsRead, ... } = useNotification();
```

### 2. 错误处理
```tsx
try {
    await joinTournament(params);
    handleTournamentChange("participation_update", { success: true });
} catch (error) {
    addNotification({
        type: "participation_update",
        title: "操作失败",
        message: error.message
    });
}
```

### 3. 性能考虑
```tsx
// 使用 useMemo 优化通知过滤
const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.read), 
    [notifications]
);
```

这个 Context 通知系统提供了完整的通知管理解决方案，既保持了代码的简洁性，又提供了强大的功能和良好的用户体验。 