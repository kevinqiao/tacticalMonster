/**
 * 锦标赛通知服务
 * 处理前端通知显示和状态管理
 */

export interface TournamentNotification {
    id: string;
    type: "new_tournament" | "eligibility_change" | "participation_update" | "tournament_completed";
    title: string;
    message: string;
    data?: any;
    timestamp: string;
    read: boolean;
}

export interface NotificationOptions {
    duration?: number; // 显示时长（毫秒）
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    showIcon?: boolean;
    autoClose?: boolean;
}

class TournamentNotificationService {
    private notifications: TournamentNotification[] = [];
    private listeners: Array<(notifications: TournamentNotification[]) => void> = [];
    private defaultOptions: NotificationOptions = {
        duration: 5000,
        position: "top-right",
        showIcon: true,
        autoClose: true
    };

    /**
     * 添加通知
     */
    addNotification(notification: Omit<TournamentNotification, "id" | "timestamp" | "read">, options?: NotificationOptions) {
        const newNotification: TournamentNotification = {
            ...notification,
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.unshift(newNotification);
        this.notifyListeners();

        // 显示通知
        this.showNotification(newNotification, options);

        return newNotification.id;
    }

    /**
     * 显示通知
     */
    private showNotification(notification: TournamentNotification, options?: NotificationOptions) {
        const opts = { ...this.defaultOptions, ...options };

        // 创建通知元素
        const notificationElement = this.createNotificationElement(notification, opts);
        document.body.appendChild(notificationElement);

        // 自动关闭
        if (opts.autoClose && opts.duration) {
            setTimeout(() => {
                this.removeNotificationElement(notificationElement);
            }, opts.duration);
        }
    }

    /**
     * 创建通知元素
     */
    private createNotificationElement(notification: TournamentNotification, options: NotificationOptions): HTMLElement {
        const element = document.createElement("div");
        element.className = `tournament-notification ${options.position || "top-right"}`;
        element.style.cssText = `
            position: fixed;
            ${options.position?.includes("top") ? "top: 20px;" : "bottom: 20px;"}
            ${options.position?.includes("right") ? "right: 20px;" : "left: 20px;"}
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        const icon = this.getNotificationIcon(notification.type);
        const color = this.getNotificationColor(notification.type);

        element.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                ${options.showIcon ? `<div style="color: ${color}; font-size: 20px;">${icon}</div>` : ""}
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px; color: #333;">${notification.title}</div>
                    <div style="color: #666; font-size: 14px;">${notification.message}</div>
                    <div style="font-size: 12px; color: #999; margin-top: 8px;">
                        ${new Date(notification.timestamp).toLocaleTimeString()}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px;">
                    ×
                </button>
            </div>
        `;

        return element;
    }

    /**
     * 移除通知元素
     */
    private removeNotificationElement(element: HTMLElement) {
        element.style.animation = "slideOut 0.3s ease-in";
        setTimeout(() => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        }, 300);
    }

    /**
     * 获取通知图标
     */
    private getNotificationIcon(type: string): string {
        switch (type) {
            case "new_tournament": return "🎯";
            case "eligibility_change": return "🔔";
            case "participation_update": return "📊";
            case "tournament_completed": return "🏆";
            default: return "ℹ️";
        }
    }

    /**
     * 获取通知颜色
     */
    private getNotificationColor(type: string): string {
        switch (type) {
            case "new_tournament": return "#4CAF50";
            case "eligibility_change": return "#FF9800";
            case "participation_update": return "#2196F3";
            case "tournament_completed": return "#9C27B0";
            default: return "#607D8B";
        }
    }

    /**
     * 生成唯一ID
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 标记通知为已读
     */
    markAsRead(notificationId: string) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.notifyListeners();
        }
    }

    /**
     * 移除通知
     */
    removeNotification(notificationId: string) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.notifyListeners();
    }

    /**
     * 获取所有通知
     */
    getNotifications(): TournamentNotification[] {
        return [...this.notifications];
    }

    /**
     * 获取未读通知
     */
    getUnreadNotifications(): TournamentNotification[] {
        return this.notifications.filter(n => !n.read);
    }

    /**
     * 清空所有通知
     */
    clearAll() {
        this.notifications = [];
        this.notifyListeners();
    }

    /**
     * 添加监听器
     */
    addListener(listener: (notifications: TournamentNotification[]) => void) {
        this.listeners.push(listener);
    }

    /**
     * 移除监听器
     */
    removeListener(listener: (notifications: TournamentNotification[]) => void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * 通知所有监听器
     */
    private notifyListeners() {
        this.listeners.forEach(listener => listener([...this.notifications]));
    }

    /**
     * 处理锦标赛状态变化
     */
    handleTournamentChange(changeType: string, data: any) {
        let title = "";
        let message = "";

        switch (changeType) {
            case "new_tournament":
                title = "新锦标赛";
                message = `"${data.name}" 已开始，快来参与吧！`;
                break;
            case "eligibility_change":
                title = "参与条件更新";
                message = `"${data.name}" 的参与条件已更新`;
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

        this.addNotification({
            type: changeType as any,
            title,
            message,
            data
        });
    }
}

// 创建全局实例
export const tournamentNotificationService = new TournamentNotificationService();

// 添加CSS动画
const style = document.createElement("style");
style.textContent = `
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
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

export default tournamentNotificationService; 