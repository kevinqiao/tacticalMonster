import { resolveTournamentMode } from "@/convex/tournament/convex/data/tournamentConfigs";
import { useModalManager } from "@/service/ModalManager";
import { useTournamentManager } from "@/service/TournamentManager";
import React, { useCallback } from "react";
import "./tournamentList.css";

const TournamentItem: React.FC<{ item: any; onJoin: (item: any) => void }> = ({ item, onJoin }) => {
    /** 仅教学链展示「教学关已完成」；数据来自服务端 ruleStatuses.completed（mr_player_first_clear） */
    const showTutorialCompleted = item.tutorialStageCompleted === true;
    const unlocked = item.unlocked === true;
    return (
        <div className="tournament-list-item">
            <div className="tournament-list-item-title">{item.name}</div>
            <span
                className={
                    unlocked
                        ? "tournament-list-item-unlock tournament-list-item-unlock--yes"
                        : "tournament-list-item-unlock tournament-list-item-unlock--no"
                }
                title={unlocked ? "当前可进入该关卡" : "未满足解锁条件（如前置关卡或等级）"}
            >
                {unlocked ? "已解锁" : "未解锁"}
            </span>
            {showTutorialCompleted && (
                <span className="tournament-list-item-badge" title="该教学关卡已通关">
                    教学关已完成
                </span>
            )}
            <button type="button" onClick={() => onJoin(item)}>{item.name}</button>
        </div>
    );
};

const TournamentList: React.FC = () => {
    const { openModal } = useModalManager();
    const { activeTournaments: tournaments } = useTournamentManager();
    const join = useCallback(async (item: any) => {
        console.log("join tournament", item);
        const matchType = item.config.matchRules.maxPlayers === 1 ? "solo" : "multi_player";
        openModal("play_tournament", {
            playMode: "join",
            gameType: item.gameType,
            gameData: {
                typeId: item.typeId,
                stageId: item.stageId,
                matchType: matchType,
                mode: resolveTournamentMode(item.config),
            }
        });
    }, [openModal]);

    // 数据加载前不渲染列表，避免影响 LCP
    if (!tournaments) {
        return null;
    }

    return (
        <div className="tournament-list-content">
            {tournaments.map((item: any, index: number) => (
                <TournamentItem key={index} item={item} onJoin={join} />
            ))}
        </div>
    );
};

const TournamentHome: React.FC = () => {
    return (
        <div className="tournament-list-container">
            {/* 静态大图/背景作为 LCP 元素，确保立即渲染且尺寸够大 */}
            <div className="tournament-header">
                <h1 className="tournament-title">Tournaments</h1>
            </div>
            <TournamentList />
        </div>
    );
};

export default TournamentHome;