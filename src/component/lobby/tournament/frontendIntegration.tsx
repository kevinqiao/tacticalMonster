/**
 * 前端集成示例
 * 展示如何使用 Context 管理锦标赛通知
 */

import { ConvexReactClient, useQuery } from "convex/react";
import React, { useEffect, useState } from "react";
import { api as tacticalMonsterApi } from "../../../convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "../../../convex/tournament/convex/_generated/api";
import { useNotificationActions } from "./NotificationContext";

// TacticalMonster Convex 客户端 URL
const TACTICAL_MONSTER_CONVEX_URL = "https://shocking-leopard-487.convex.cloud";

/**
 * 锦标赛通知监听器 Hook
 */
export function useTournamentNotifications(uid: string) {
    // 监听锦标赛相关通知（使用 getAvailableTournaments 作为替代）
    const notifications = useQuery(tournamentApi.service.tournament.tournamentService.getAvailableTournaments, {
        uid
    });

    const [lastNotification, setLastNotification] = useState<any>(null);
    const { handleTournamentChange } = useNotificationActions();

    useEffect(() => {
        if (notifications?.tournaments) {
            // 检查是否有新的通知
            const tournamentNotifications = notifications.tournaments.filter((tournament: any) => {
                return tournament.lastUpdated &&
                    (!lastNotification || tournament.lastUpdated > lastNotification.timestamp);
            });

            if (tournamentNotifications.length > 0) {
                // 处理最新的通知
                const latestNotification = tournamentNotifications[tournamentNotifications.length - 1];
                setLastNotification({
                    timestamp: latestNotification.lastUpdated,
                    data: latestNotification
                });

                // 使用 Context 处理通知
                handleTournamentNotification(latestNotification);
            }
        }
    }, [notifications, lastNotification, handleTournamentChange]);

    const handleTournamentNotification = (notification: any) => {
        console.log("收到锦标赛通知:", notification);

        // 根据通知类型显示不同的用户提示
        if (notification.eligibility?.eligible) {
            handleTournamentChange("eligibility_change", {
                name: notification.name,
                eligible: true
            });
        } else if (notification.eligibility?.reasons?.length > 0) {
            handleTournamentChange("eligibility_change", {
                name: notification.name,
                eligible: false,
                reasons: notification.eligibility.reasons
            });
        }

        // 检查参与状态变化
        if (notification.currentParticipations?.length > 0) {
            handleTournamentChange("participation_update", {
                name: notification.name,
                participations: notification.currentParticipations
            });
        }
    };

    return {
        notifications,
        lastNotification
    };
}

/**
 * 锦标赛状态管理 Hook
 */
export function useTournamentStatus(uid: string, gameType?: string, category?: string) {
    // 实时查询锦标赛状态（使用 Tournament 模块）
    // 注意：如果 getPlayerTournamentStatus 不可用，使用 getAvailableTournaments
    const tournamentStatus = useQuery(tournamentApi.service.tournament.tournamentService.getAvailableTournaments, {
        uid
    });

    // 创建 TacticalMonster 客户端实例（用于调用加入锦标赛接口）
    const tacticalMonsterClient = React.useMemo(
        () => new ConvexReactClient(TACTICAL_MONSTER_CONVEX_URL),
        []
    );

    // 提交分数（使用 Tournament 模块的 matchManager）
    // 注意：submitScore 可能需要通过 HTTP 端点调用，这里先注释掉
    // const submitScore = useMutation(tournamentApi.service.tournament.matchManager.submitGameScore);

    // 乐观更新状态
    const [optimisticUpdates, setOptimisticUpdates] = useState<any>({});

    // 使用 Context 通知操作
    const { handleTournamentChange, addNotification } = useNotificationActions();

    // 使用通知监听器
    const { lastNotification } = useTournamentNotifications(uid);

    /**
     * 加入锦标赛（带乐观更新）
     */
    const joinTournamentWithOptimisticUpdate = async (params: {
        gameType: string;
        tournamentType: string;
    }) => {
        const { tournamentType } = params;

        // 1. 乐观更新 - 立即显示"正在加入中..."
        const optimisticData = {
            typeId: tournamentType,
            eligibility: { eligible: false, reasons: ["正在加入中..."] },
            participationStats: { ...tournamentStatus?.tournaments?.find((t: any) => t.typeId === tournamentType)?.participationStats }
        };

        setOptimisticUpdates((prev: any) => ({
            ...prev,
            [tournamentType]: optimisticData
        }));

        try {
            // 2. 执行加入操作（调用 TacticalMonster 模块）
            // 注意：joinTournamentMatching 是 action，需要使用 action 调用
            const result = await tacticalMonsterClient.action(
                tacticalMonsterApi.service.game.gameMatchingService.joinTournamentMatching,
                {
                    uid: uid,
                    tournamentType: tournamentType,
                    tournamentId: undefined,
                    tier: undefined, // 可选，会被后端验证覆盖
                }
            );

            // 3. 成功处理 - TacticalMonster 返回 { ok, gameId, matchId, inQueue, error }
            if (result.ok) {
                // 清除乐观更新，使用真实数据
                setOptimisticUpdates((prev: any) => {
                    const newUpdates = { ...prev };
                    delete newUpdates[tournamentType];
                    return newUpdates;
                });

                // 使用 Context 显示成功通知
                handleTournamentChange("participation_update", {
                    name: tournamentType,
                    action: "joined",
                    success: true,
                    gameId: result.gameId,
                    matchId: result.matchId,
                    inQueue: result.inQueue,
                });
            } else {
                // 处理错误情况
                throw new Error(result.error || "加入锦标赛失败");
            }

            return result;
        } catch (error) {
            // 4. 错误处理 - 恢复乐观更新
            setOptimisticUpdates((prev: any) => {
                const newUpdates = { ...prev };
                delete newUpdates[tournamentType];
                return newUpdates;
            });

            // 使用 Context 显示错误通知
            addNotification({
                type: "participation_update",
                title: "加入失败",
                message: `加入锦标赛失败: ${error instanceof Error ? error.message : "未知错误"}`,
                data: { tournamentType, error: error instanceof Error ? error.message : "未知错误" }
            });
            throw error;
        }
    };

    /**
     * 提交分数（带乐观更新）
     */
    const submitScoreWithOptimisticUpdate = async (params: {
        tournamentId: string;
        gameType: string;
        score: number;
        gameData: any;
        propsUsed: string[];
        gameId?: string;
    }) => {
        const { tournamentId } = params;

        // 1. 乐观更新 - 立即显示"正在提交中..."
        const optimisticData = {
            typeId: `score_${tournamentId}`,
            status: "submitting",
            message: "正在提交分数..."
        };

        setOptimisticUpdates((prev: any) => ({
            ...prev,
            [`score_${tournamentId}`]: optimisticData
        }));

        try {
            // 2. 执行提交操作
            // TODO: 实现分数提交逻辑（可能需要通过 HTTP 端点）
            // 暂时抛出错误，提示功能未实现
            throw new Error("分数提交功能暂未实现，需要通过 HTTP 端点调用 Tournament 模块的 submitGameScore");

            // 以下代码在实现后取消注释
            /*
            const result = await submitScore(params);
            
            // 3. 成功处理
            if (result.updatedAvailableTournaments) {
                // 清除乐观更新
                setOptimisticUpdates((prev: any) => {
                    const newUpdates = { ...prev };
                    delete newUpdates[`score_${tournamentId}`];
                    return newUpdates;
                });

                // 使用 Context 显示成功通知
                handleTournamentChange("participation_update", {
                    name: "锦标赛",
                    action: "score_submitted",
                    score: params.score,
                    success: true
                });
            }

            return result;
            */
        } catch (error) {
            // 4. 错误处理 - 恢复乐观更新
            setOptimisticUpdates((prev: any) => {
                const newUpdates = { ...prev };
                delete newUpdates[`score_${tournamentId}`];
                return newUpdates;
            });

            // 使用 Context 显示错误通知
            addNotification({
                type: "participation_update",
                title: "提交失败",
                message: `分数提交失败: ${error instanceof Error ? error.message : "未知错误"}`,
                data: { tournamentId, error: error instanceof Error ? error.message : "未知错误" }
            });
            throw error;
        }
    };

    /**
     * 获取合并后的锦标赛数据（包含乐观更新）
     */
    const getMergedTournamentData = () => {
        if (!tournamentStatus?.tournaments) return [];

        return tournamentStatus.tournaments.map((tournament: any) => {
            const optimisticUpdate = optimisticUpdates[tournament.typeId];
            if (optimisticUpdate) {
                return {
                    ...tournament,
                    ...optimisticUpdate
                };
            }
            return tournament;
        });
    };

    return {
        tournamentStatus,
        joinTournament: joinTournamentWithOptimisticUpdate,
        // submitScore: submitScoreWithOptimisticUpdate, // 暂时禁用，需要实现
        submitScore: async () => { throw new Error("分数提交功能暂未实现"); },
        getMergedTournamentData,
        isLoading: tournamentStatus === undefined,
        error: tournamentStatus === null
    };
}

/**
 * 锦标赛列表组件
 */
export function TournamentList({ uid, gameType }: { uid: string; gameType?: string }) {
    const {
        tournamentStatus,
        joinTournament,
        getMergedTournamentData,
        isLoading,
        error
    } = useTournamentStatus(uid, gameType);

    const [selectedTournament, setSelectedTournament] = useState<any>(null);

    const mergedTournamentData = getMergedTournamentData();
    // 注意：getAvailableTournaments 返回的数据结构可能不同，需要适配
    const player = (tournamentStatus as any)?.player || null;
    const inventory = (tournamentStatus as any)?.inventory || null;

    if (error) {
        return <div>加载失败 </div>;
    }

    if (isLoading) {
        return <div>加载中...</div>;
    }

    return (
        <div className="tournament-list" >
            <div className="player-info" >
                <h3>玩家信息 </h3>
                < p > 段位: {player?.segmentName} </p>
                < p > 订阅状态: {player?.isSubscribed ? "已订阅" : "未订阅"} </p>
                < p > 金币: {inventory?.coins} </p>
            </div>

            < div className="tournaments" >
                <h3>可参与的锦标赛 </h3>
                {
                    mergedTournamentData.map((tournament: any) => (
                        <div key={tournament.typeId} className="tournament-item" >
                            <h4>{tournament.name} </h4>
                            < p > {tournament.description} </p>

                            {/* 资格状态 */}
                            < div className="eligibility" >
                                {
                                    tournament.eligibility.eligible ? (
                                        <span className="eligible" >✅ 可参与</ span >
                                    ) : (
                                        <div className="not-eligible" >
                                            <span>❌ 不可参与 </span>
                                            <ul>
                                                {
                                                    tournament.eligibility.reasons.map((reason: string, index: number) => (
                                                        <li key={index} > {reason} </li>
                                                    ))
                                                }
                                            </ul>
                                        </div>
                                    )
                                }
                            </div>

                            {/* 参与统计 */}
                            <div className="participation-stats" >
                                <p>今日尝试: {tournament.participationStats.dailyAttempts} </p>
                                < p > 本周尝试: {tournament.participationStats.weeklyAttempts} </p>
                                < p > 总尝试: {tournament.participationStats.totalAttempts} </p>
                            </div>

                            {/* 当前参与 */}
                            {
                                tournament.currentParticipations.length > 0 && (
                                    <div className="current-participations" >
                                        <h5>当前参与: </h5>
                                        {
                                            tournament.currentParticipations.map((participation: any) => (
                                                <div key={participation.tournamentId} className="participation" >
                                                    <p>比赛数: {participation.matchCount} </p>
                                                    < p > 完成数: {participation.completedMatches} </p>
                                                    < p > 最佳分数: {participation.bestScore} </p>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )
                            }

                            {/* 操作按钮 */}
                            {
                                tournament.eligibility.eligible && (
                                    <button
                                        onClick={
                                            () => {
                                                joinTournament({
                                                    gameType: tournament.gameType,
                                                    tournamentType: tournament.typeId
                                                }).then(() => {
                                                    console.log("成功加入锦标赛");
                                                }).catch(error => {
                                                    console.error("加入锦标赛失败:", error);
                                                });
                                            }
                                        }
                                        disabled={tournament.eligibility.reasons.includes("正在加入中...")}
                                    >
                                        {tournament.eligibility.reasons.includes("正在加入中...") ? "加入中..." : "加入锦标赛"}
                                    </button>
                                )
                            }

                            {/* 查看详情 */}
                            <button onClick={() => setSelectedTournament(tournament)}>
                                查看详情
                            </button>
                        </div>
                    ))
                }
            </div>

            {/* 锦标赛详情弹窗 */}
            {
                selectedTournament && (
                    <div className="tournament-detail-modal" >
                        <h3>{selectedTournament.name} </h3>
                        < p > {selectedTournament.description} </p>

                        < div className="config-details" >
                            <h4>配置详情 </h4>
                            < p > 游戏类型: {selectedTournament.gameType} </p>
                            < p > 分类: {selectedTournament.category} </p>
                            < p > 优先级: {selectedTournament.priority} </p>
                        </div>

                        < button onClick={() => setSelectedTournament(null)
                        }> 关闭 </button>
                    </div>
                )}
        </div>
    );
}

/**
 * 实时更新监听器 Hook
 */
export function useTournamentRealtimeUpdates(uid: string) {
    // 监听锦标赛状态变化（使用 getAvailableTournaments）
    const tournamentStatus = useQuery(tournamentApi.service.tournament.tournamentService.getAvailableTournaments, {
        uid
    });

    // 监听库存变化（使用 getAvailableTournaments）
    const inventory = useQuery(tournamentApi.service.tournament.tournamentService.getAvailableTournaments, {
        uid
    });

    // 监听通知（使用 getAvailableTournaments）
    const notificationsData = useQuery(tournamentApi.service.tournament.tournamentService.getAvailableTournaments, {
        uid
    });

    useEffect(() => {
        if (notificationsData?.tournaments) {
            // 检查资格变化
            notificationsData.tournaments.forEach((tournament: any) => {
                // 这里可以添加更复杂的通知逻辑
                if (tournament.eligibility.eligible) {
                    console.log(`🎉 可以参与 ${tournament.name} 了！`);
                }
            });
        }
    }, [notificationsData]);

    return {
        tournamentStatus,
        inventory,
        notifications: notificationsData
    };
} 