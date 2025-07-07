import React, { createContext, ReactNode, useContext, useEffect, useReducer } from "react";
import { TournamentNotification } from "./notificationService";

// 通知状态接口
interface NotificationState {
    notifications: TournamentNotification[];
    unreadCount: number;
    isPanelOpen: boolean;
}

// 通知动作类型
type NotificationAction =
    | { type: "ADD_NOTIFICATION"; payload: TournamentNotification }
    | { type: "REMOVE_NOTIFICATION"; payload: string }
    | { type: "MARK_AS_READ"; payload: string }
    | { type: "MARK_ALL_AS_READ" }
    | { type: "CLEAR_ALL" }
    | { type: "SET_PANEL_OPEN"; payload: boolean }
    | { type: "SET_NOTIFICATIONS"; payload: TournamentNotification[] };

// 通知上下文接口
interface NotificationContextType {
    state: NotificationState;
    addNotification: (notification: Omit<TournamentNotification, "id" | "timestamp" | "read">) => string;
    removeNotification: (id: string) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    togglePanel: () => void;
    setPanelOpen: (open: boolean) => void;
    handleTournamentChange: (changeType: string, data: any) => void;
}

// 创建上下文
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 初始状态
const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    isPanelOpen: false
};

// 通知状态 reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
    switch (action.type) {
        case "ADD_NOTIFICATION":
            return {
                ...state,
                notifications: [action.payload, ...state.notifications],
                unreadCount: state.unreadCount + 1
            };

        case "REMOVE_NOTIFICATION":
            const removedNotification = state.notifications.find(n => n.id === action.payload);
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.payload),
                unreadCount: removedNotification?.read ? state.unreadCount : state.unreadCount - 1
            };

        case "MARK_AS_READ":
            return {
                ...state,
                notifications: state.notifications.map(n =>
                    n.id === action.payload ? { ...n, read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            };

        case "MARK_ALL_AS_READ":
            return {
                ...state,
                notifications: state.notifications.map(n => ({ ...n, read: true })),
                unreadCount: 0
            };

        case "CLEAR_ALL":
            return {
                ...state,
                notifications: [],
                unreadCount: 0
            };

        case "SET_PANEL_OPEN":
            return {
                ...state,
                isPanelOpen: action.payload
            };

        case "SET_NOTIFICATIONS":
            return {
                ...state,
                notifications: action.payload,
                unreadCount: action.payload.filter(n => !n.read).length
            };

        default:
            return state;
    }
}

// 通知提供者组件
interface NotificationProviderProps {
    children: ReactNode;
    maxNotifications?: number;
}

export function NotificationProvider({ children, maxNotifications = 50 }: NotificationProviderProps) {
    const [state, dispatch] = useReducer(notificationReducer, initialState);

    // 添加通知
    const addNotification = (notification: Omit<TournamentNotification, "id" | "timestamp" | "read">): string => {
        const newNotification: TournamentNotification = {
            ...notification,
            id: generateId(),
            timestamp: new Date().toISOString(),
            read: false
        };

        dispatch({ type: "ADD_NOTIFICATION", payload: newNotification });

        // 限制通知数量
        if (state.notifications.length >= maxNotifications) {
            const oldestNotification = state.notifications[state.notifications.length - 1];
            if (oldestNotification) {
                dispatch({ type: "REMOVE_NOTIFICATION", payload: oldestNotification.id });
            }
        }

        return newNotification.id;
    };

    // 移除通知
    const removeNotification = (id: string) => {
        dispatch({ type: "REMOVE_NOTIFICATION", payload: id });
    };

    // 标记为已读
    const markAsRead = (id: string) => {
        dispatch({ type: "MARK_AS_READ", payload: id });
    };

    // 标记所有为已读
    const markAllAsRead = () => {
        dispatch({ type: "MARK_ALL_AS_READ" });
    };

    // 清空所有通知
    const clearAll = () => {
        dispatch({ type: "CLEAR_ALL" });
    };

    // 切换面板
    const togglePanel = () => {
        dispatch({ type: "SET_PANEL_OPEN", payload: !state.isPanelOpen });
    };

    // 设置面板状态
    const setPanelOpen = (open: boolean) => {
        dispatch({ type: "SET_PANEL_OPEN", payload: open });
    };

    // 处理锦标赛变化
    const handleTournamentChange = (changeType: string, data: any) => {
        let title = "";
        let message = "";

        switch (changeType) {
            case "new_tournament":
                title = "新锦标赛";
                message = `"${data.name}" 已开始，快来参与吧！`;
                break;
            case "eligibility_change":
                title = "参与条件更新";
                message = data.eligible
                    ? `"${data.name}" 现在可以参与了！`
                    : `"${data.name}" 的参与条件已更新`;
                break;
            case "participation_update":
                title = "参与状态更新";
                message = `您在 "${data.name}" 中的状态已更新`;
                break;
            case "tournament_completed":
                title = "锦标赛结束";
                message = `"${data.name}" 已结束，请查看结果！`;
                break;
            default:
                title = "锦标赛更新";
                message = "锦标赛状态已更新";
        }

        addNotification({
            type: changeType as any,
            title,
            message,
            data
        });
    };

    // 生成唯一ID
    const generateId = (): string => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    // 同步到本地存储
    useEffect(() => {
        const savedNotifications = localStorage.getItem("tournament_notifications");
        if (savedNotifications) {
            try {
                const notifications = JSON.parse(savedNotifications);
                dispatch({ type: "SET_NOTIFICATIONS", payload: notifications });
            } catch (error) {
                console.error("Failed to load notifications from localStorage:", error);
            }
        }
    }, []);

    // 保存到本地存储
    useEffect(() => {
        localStorage.setItem("tournament_notifications", JSON.stringify(state.notifications));
    }, [state.notifications]);

    const contextValue: NotificationContextType = {
        state,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        togglePanel,
        setPanelOpen,
        handleTournamentChange
    };

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
}

// 自定义 Hook
export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}

// 简化的通知 Hook
export function useNotificationState() {
    const { state } = useNotification();
    return state;
}

// 通知操作 Hook
export function useNotificationActions() {
    const { addNotification, removeNotification, markAsRead, markAllAsRead, clearAll, handleTournamentChange } = useNotification();
    return { addNotification, removeNotification, markAsRead, markAllAsRead, clearAll, handleTournamentChange };
}

// 面板控制 Hook
export function useNotificationPanel() {
    const { state, togglePanel, setPanelOpen } = useNotification();
    return {
        isOpen: state.isPanelOpen,
        togglePanel,
        setPanelOpen
    };
} 