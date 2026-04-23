import {
    getTournamentConfig,
    resolveTournamentMode,
    type TournamentModeType,
} from "@/convex/tournament/convex/data/tournamentConfigs";
import { useModalManager } from "@/service/ModalManager";
import { useTournamentManager } from "@/service/TournamentManager";
import React, { useCallback, useMemo, useState } from "react";
import "./tournamentList.css";

const MODE_TABS: { mode: TournamentModeType; label: string }[] = [
    { mode: "tutorial", label: "教学" },
    { mode: "solo_challenge", label: "单人挑战" },
    { mode: "multiplayer_tournament", label: "多人锦标赛" },
];

const MODE_ORDER: TournamentModeType[] = ["tutorial", "solo_challenge", "multiplayer_tournament"];

/**
 * getAvailableTournaments 下发的 config 未包含顶层 mode（见 tournamentService 组装字段），
 * 需用静态表按 typeId 补全，否则 resolveTournamentMode 恒为 undefined，教学关会被误判为 solo_challenge。
 */
function resolveTournamentModeWithStaticFallback(item: {
    typeId?: string;
    config?: any;
}): TournamentModeType | undefined {
    const fromApi = resolveTournamentMode(item.config);
    if (fromApi) return fromApi;
    if (item.typeId) {
        const fromStatic = resolveTournamentMode(getTournamentConfig(item.typeId));
        if (fromStatic) return fromStatic;
    }
    return undefined;
}

/**
 * 与静态表一致优先；仍无 mode 时按 matchRules 粗分。
 */
function getDisplayModeForItem(item: { typeId?: string; config?: any }): TournamentModeType {
    const resolved = resolveTournamentModeWithStaticFallback(item);
    if (resolved) return resolved;
    const max = item.config?.matchRules?.maxPlayers ?? 1;
    if (max > 1) return "multiplayer_tournament";
    return "solo_challenge";
}

function pickDefaultTab(items: any[]): TournamentModeType {
    for (const m of MODE_ORDER) {
        if (items.some((i) => getDisplayModeForItem(i) === m)) return m;
    }
    return "tutorial";
}

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
    /** null = 尚未选手动 Tab，用 pickDefaultTab(tournaments) 作为首屏默认 */
    const [activeTab, setActiveTab] = useState<TournamentModeType | null>(null);

    const join = useCallback(async (item: any) => {
        console.log("join tournament", item);
        const matchType = item.config.matchRules.maxPlayers === 1 ? "solo" : "multi_player";
        openModal({
            name: "play_tournament", data: {
                playMode: "join",
                gameType: item.gameType,
                gameData: {
                    typeId: item.typeId,
                    stageId: item.stageId,
                    matchType: matchType,
                    mode: resolveTournamentModeWithStaticFallback(item),
                }
            }, effect: { name: "swipeRight", args: { width: "100%" } }
        });
    }, [openModal]);

    const effectiveTab = useMemo((): TournamentModeType => {
        if (!tournaments?.length) return "tutorial";
        return activeTab ?? pickDefaultTab(tournaments);
    }, [tournaments, activeTab]);

    const filtered = useMemo(() => {
        if (!tournaments?.length) return [];
        return tournaments.filter((item: any) => getDisplayModeForItem(item) === effectiveTab);
    }, [tournaments, effectiveTab]);

    // 数据加载前不渲染列表，避免影响 LCP
    if (!tournaments) {
        return null;
    }

    return (
        <>
            <div className="tournament-mode-tabs" role="tablist" aria-label="关卡类型">
                {MODE_TABS.map(({ mode, label }) => {
                    const selected = effectiveTab === mode;
                    return (
                        <button
                            key={mode}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={
                                selected
                                    ? "tournament-mode-tab tournament-mode-tab--active"
                                    : "tournament-mode-tab"
                            }
                            onClick={() => setActiveTab(mode)}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
            <div className="tournament-list-content" role="tabpanel">
                {filtered.length === 0 ? (
                    <p className="tournament-list-empty">该分类下暂无可用关卡</p>
                ) : (
                    filtered.map((item: any) => (
                        <TournamentItem
                            key={item.typeId ?? item.stageId}
                            item={item}
                            onJoin={join}
                        />
                    ))
                )}
            </div>
        </>
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
