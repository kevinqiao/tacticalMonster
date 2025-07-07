import React from "react";
import { useNotificationActions, useNotificationPanel, useNotificationState } from "./NotificationContext";

interface NotificationPanelProps {
    maxNotifications?: number;
    showUnreadOnly?: boolean;
}

export function NotificationPanel({ maxNotifications = 5, showUnreadOnly = false }: NotificationPanelProps) {
    const { notifications, unreadCount } = useNotificationState();
    const { markAsRead, removeNotification, markAllAsRead, clearAll } = useNotificationActions();
    const { isOpen, togglePanel } = useNotificationPanel();

    // 过滤通知
    const filteredNotifications = showUnreadOnly
        ? notifications.filter(n => !n.read)
        : notifications;

    const displayNotifications = filteredNotifications.slice(0, maxNotifications);

    return (
        <div className="notification-panel">
            {/* 通知图标 */}
            <div
                className="notification-icon"
                onClick={togglePanel}
                style={{
                    position: "relative",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#f5f5f5",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span
                        className="notification-badge"
                        style={{
                            position: "absolute",
                            top: "-5px",
                            right: "-5px",
                            backgroundColor: "#ff4444",
                            color: "white",
                            borderRadius: "50%",
                            width: "20px",
                            height: "20px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </div>

            {/* 通知面板 */}
            {isOpen && (
                <div
                    className="notification-dropdown"
                    style={{
                        position: "absolute",
                        top: "50px",
                        right: "0",
                        width: "350px",
                        maxHeight: "400px",
                        backgroundColor: "white",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        zIndex: 1000,
                        overflow: "hidden"
                    }}
                >
                    {/* 面板头部 */}
                    <div
                        className="notification-header"
                        style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid #eee",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: "16px" }}>锦标赛通知</h3>
                        <div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#2196F3",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        marginRight: "8px"
                                    }}
                                >
                                    全部已读
                                </button>
                            )}
                            <button
                                onClick={clearAll}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#999",
                                    cursor: "pointer",
                                    fontSize: "12px"
                                }}
                            >
                                清空
                            </button>
                        </div>
                    </div>

                    {/* 通知列表 */}
                    <div
                        className="notification-list"
                        style={{
                            maxHeight: "300px",
                            overflowY: "auto"
                        }}
                    >
                        {displayNotifications.length === 0 ? (
                            <div
                                style={{
                                    padding: "20px",
                                    textAlign: "center",
                                    color: "#999"
                                }}
                            >
                                暂无通知
                            </div>
                        ) : (
                            displayNotifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${notification.read ? "read" : "unread"}`}
                                    style={{
                                        padding: "12px 16px",
                                        borderBottom: "1px solid #f5f5f5",
                                        backgroundColor: notification.read ? "white" : "#f8f9ff",
                                        cursor: "pointer"
                                    }}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    fontWeight: notification.read ? "normal" : "600",
                                                    marginBottom: "4px",
                                                    color: "#333"
                                                }}
                                            >
                                                {notification.title}
                                            </div>
                                            <div
                                                style={{
                                                    color: "#666",
                                                    fontSize: "14px",
                                                    marginBottom: "4px"
                                                }}
                                            >
                                                {notification.message}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#999"
                                                }}
                                            >
                                                {new Date(notification.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeNotification(notification.id);
                                            }}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#999",
                                                cursor: "pointer",
                                                fontSize: "16px",
                                                padding: "0",
                                                marginLeft: "8px"
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationPanel; 