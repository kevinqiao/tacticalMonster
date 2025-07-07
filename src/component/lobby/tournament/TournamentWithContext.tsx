import React from "react";
import { NotificationProvider, useNotificationState, useNotificationActions } from "./NotificationContext";
import { useTournamentStatus } from "./frontendIntegration";
import { NotificationPanel } from "./NotificationPanel";

interface TournamentWithContextProps {
    uid: string;
    gameType?: string;
}

// 内部组件，使用 Context
function TournamentContent({ uid, gameType }: TournamentWithContextProps) {
    const {
        tournamentStatus,
        joinTournament,
        submitScore,
        getMergedTournamentData,
        isLoading,
        error
    } = useTournamentStatus(uid, gameType);

    const { notifications, unreadCount } = useNotificationState();
    const { addNotification } = useNotificationActions();

    const mergedTournamentData = getMergedTournamentData();
    const { player, inventory } = tournamentStatus || {};

    if (error) {
        return <div>加载失败</div>;
    }

    if (isLoading) {
        return <div>加载中...</div>;
    }

    return (
        <div style={{ padding: "20px" }}>
            {/* 通知面板 */}
            <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
                <NotificationPanel maxNotifications={10} />
            </div>

            {/* 通知统计 */}
            <div style={{ 
                position: "fixed", 
                top: "20px", 
                left: "20px", 
                zIndex: 1000,
                backgroundColor: "#f0f0f0",
                padding: "8px 12px",
                borderRadius: "4px",
                fontSize: "12px"
            }}>
                通知: {notifications.length} | 未读: {unreadCount}
            </div>

            {/* 玩家信息 */}
            <div style={{ marginBottom: "20px", padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
                <h3>玩家信息</h3>
                <p>段位: {player?.segmentName}</p>
                <p>订阅状态: {player?.isSubscribed ? "已订阅" : "未订阅"}</p>
                <p>金币: {inventory?.coins}</p>
            </div>

            {/* 锦标赛列表 */}
            <div>
                <h3>可参与的锦标赛</h3>
                {mergedTournamentData.map((tournament: any) => (
                    <div 
                        key={tournament.typeId} 
                        style={{
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            padding: "16px",
                            marginBottom: "16px",
                            backgroundColor: "white"
                        }}
                    >
                        <h4>{tournament.name}</h4>
                        <p>{tournament.description}</p>
                        
                        {/* 资格状态 */}
                        <div style={{ marginBottom: "12px" }}>
                            {tournament.eligibility.eligible ? (
                                <span style={{ color: "#4CAF50", fontWeight: "bold" }}>✅ 可参与</span>
                            ) : (
                                <div>
                                    <span style={{ color: "#f44336" }}>❌ 不可参与</span>
                                    <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                                        {tournament.eligibility.reasons.map((reason: string, index: number) => (
                                            <li key={index} style={{ color: "#666" }}>{reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* 参与统计 */}
                        <div style={{ marginBottom: "12px", fontSize: "14px", color: "#666" }}>
                            <p>今日尝试: {tournament.participationStats.dailyAttempts}</p>
                            <p>本周尝试: {tournament.participationStats.weeklyAttempts}</p>
                            <p>总尝试: {tournament.participationStats.totalAttempts}</p>
                        </div>

                        {/* 当前参与 */}
                        {tournament.currentParticipations.length > 0 && (
                            <div style={{ marginBottom: "12px", padding: "12px", backgroundColor: "#e3f2fd", borderRadius: "4px" }}>
                                <h5 style={{ margin: "0 0 8px 0" }}>当前参与:</h5>
                                {tournament.currentParticipations.map((participation: any) => (
                                    <div key={participation.tournamentId} style={{ fontSize: "14px" }}>
                                        <p>比赛数: {participation.matchCount}</p>
                                        <p>完成数: {participation.completedMatches}</p>
                                        <p>最佳分数: {participation.bestScore}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 操作按钮 */}
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {tournament.eligibility.eligible && (
                                <button
                                    onClick={() => {
                                        joinTournament({
                                            gameType: tournament.gameType,
                                            tournamentType: tournament.typeId
                                        }).then(() => {
                                            console.log("成功加入锦标赛");
                                        }).catch(error => {
                                            console.error("加入锦标赛失败:", error);
                                        });
                                    }}
                                    disabled={tournament.eligibility.reasons.includes("正在加入中...")}
                                    style={{
                                        backgroundColor: "#2196F3",
                                        color: "white",
                                        border: "none",
                                        padding: "8px 16px",
                                        borderRadius: "4px",
                                        cursor: "pointer"
                                    }}
                                >
                                    {tournament.eligibility.reasons.includes("正在加入中...") ? "加入中..." : "加入锦标赛"}
                                </button>
                            )}

                            {/* 模拟分数提交（仅用于演示） */}
                            {tournament.currentParticipations.length > 0 && (
                                <button
                                    onClick={() => {
                                        const participation = tournament.currentParticipations[0];
                                        submitScore({
                                            tournamentId: participation.tournamentId,
                                            gameType: tournament.gameType,
                                            score: Math.floor(Math.random() * 1000) + 100,
                                            gameData: { demo: true },
                                            propsUsed: []
                                        }).then(() => {
                                            console.log("分数提交成功");
                                        }).catch(error => {
                                            console.error("分数提交失败:", error);
                                        });
                                    }}
                                    style={{
                                        backgroundColor: "#4CAF50",
                                        color: "white",
                                        border: "none",
                                        padding: "8px 16px",
                                        borderRadius: "4px",
                                        cursor: "pointer"
                                    }}
                                >
                                    提交测试分数
                                </button>
                            )}

                            {/* 测试通知按钮 */}
                            <button
                                onClick={() => {
                                    addNotification({
                                        type: "new_tournament",
                                        title: "测试通知",
                                        message: `这是 ${tournament.name} 的测试通知`,
                                        data: { tournamentId: tournament.typeId, name: tournament.name }
                                    });
                                }}
                                style={{
                                    backgroundColor: "#FF9800",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 16px",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                测试通知
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 使用说明 */}
            <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                <h4>Context 通知系统使用说明</h4>
                <ul>
                    <li>使用 React Context 管理通知状态，避免 prop drilling</li>
                    <li>通知状态自动保存到 localStorage，刷新页面不会丢失</li>
                    <li>支持通知数量限制，防止内存泄漏</li>
                    <li>提供多个专用 Hook：useNotificationState、useNotificationActions、useNotificationPanel</li>
                    <li>通知会自动消失，也可以手动管理</li>
                    <li>点击"测试通知"按钮可以测试通知功能</li>
                </ul>
            </div>
        </div>
    );
}

// 外部组件，提供 Context
export function TournamentWithContext({ uid, gameType }: TournamentWithContextProps) {
    return (
        <NotificationProvider maxNotifications={50}>
            <TournamentContent uid={uid} gameType={gameType} />
        </NotificationProvider>
    );
}

export default TournamentWithContext; 