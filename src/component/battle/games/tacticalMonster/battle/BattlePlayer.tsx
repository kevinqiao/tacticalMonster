/**
 * Tactical Monster 战斗主界面组件
 */

import React, { useEffect, useState } from "react";
import { useMapDimension } from "../common/hooks/useMapDimension";
import { useCombatManager } from "../service/CombatManager";
import { usePhaseChangesHandler } from "../service/handler/hooks/usePhaseChangesHandler";
import useCombatActHandler from "../service/handler/useCombatActHandler";
import useEventHandler from "../service/handler/useEventHandler";
import { ASSET_TYPE } from "../types/monsterTypes";
import "./style.css";
import CharacterGrid from "./view/CharacterGrid";
import GridGround from "./view/GridGround";
import ObstacleGrid from "./view/ObstacleGrid";
import { ReplayControls } from "./view/ReplayControls";
import { ReplayScoreDisplay } from "./view/ReplayScoreDisplay";


const CombatActPanel: React.FC = () => {

    const { surrender } = useCombatActHandler();
    return (
        <div className="action-control" style={{ left: -40, bottom: -40, pointerEvents: "auto" }}>

            <div className="action-panel-item">STANDBY</div>
            <div className="action-panel-item">DEFEND</div>
            <div className="action-panel-item" onClick={() => surrender()}>GAME OVER</div>
        </div>
    );
};

const CombatPlaza: React.FC<{ position: { top: number; left: number; width: number; height: number } | null, assetType?: ASSET_TYPE }> = ({ position, assetType }) => {
    const { game } = useCombatManager();
    // 当 direction === 1 时，反转整个容器以修正文字镜像问题
    // 注意：CSS 中已设置 transform: none，这里只在需要时覆盖
    const containerStyle: React.CSSProperties | undefined = game?.map?.direction === 1
        ? { transform: 'scaleX(-1)' }
        : undefined;

    return (
        <div className="tm-plaza-container" style={containerStyle}>

            <div className="tm-plaza-layer">
                <ObstacleGrid />
            </div>
            <div className="tm-plaza-layer">
                <GridGround />
            </div>
            <div className="tm-plaza-layer" style={{ pointerEvents: "none" }}>
                <CharacterGrid assetType={assetType} />
            </div>


        </div>
    );
};

const BattleVenue: React.FC<{ assetType?: ASSET_TYPE }> = ({ assetType }) => {
    const [placePosition, setPlacePosition] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
    } | null>(null);
    const [mapPosition, setMapPosition] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
    } | null>(null);
    const [gridPosition, setGridPosition] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
    } | null>(null);

    const {
        game,
        setMapDimension,
        mode,
        characters,
        groundCells: contextGroundCells,
        initialPhaseChanges,
        markInitialPhaseChangesProcessed,
        isInitialPhaseChangesProcessed,
        replay,
        eventQueue,
    } = useCombatManager();
    const { containerRef, mapDimension } = useMapDimension();
    useEventHandler();

    // ✅ 2D 阶段变化处理器（处理 initialPhaseChanges）
    const { handlePhaseChanges } = usePhaseChangesHandler();

    useEffect(() => {
        if (
            game &&
            initialPhaseChanges &&
            !isInitialPhaseChangesProcessed() &&
            characters && characters.length > 0 &&
            contextGroundCells
        ) {
            if (mode === 'play') {
                const timer = setTimeout(() => {
                    markInitialPhaseChangesProcessed();
                    handlePhaseChanges(initialPhaseChanges).catch((error) => {
                        console.error("[BattleVenue 2D] Error handling initial phaseChanges:", error);
                    });
                }, 500);
                return () => clearTimeout(timer);
            } else if (mode === 'watch' || mode === 'replay') {
                const timer = setTimeout(() => {
                    if (mode === 'watch' && eventQueue.length === 0) {
                        markInitialPhaseChangesProcessed();
                        handlePhaseChanges(initialPhaseChanges).catch((error) => {
                            console.error("[BattleVenue 2D] Error handling initial phaseChanges (watch):", error);
                        });
                    } else if (mode === 'replay' && replay?.getAllEvents?.().length === 0) {
                        markInitialPhaseChangesProcessed();
                        handlePhaseChanges(initialPhaseChanges).catch((error) => {
                            console.error("[BattleVenue 2D] Error handling initial phaseChanges (replay):", error);
                        });
                    }
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [game, initialPhaseChanges, mode, characters, contextGroundCells, handlePhaseChanges, markInitialPhaseChangesProcessed, isInitialPhaseChangesProcessed, eventQueue, replay]);

    useEffect(() => {
        if (!mapDimension) return;
        setMapDimension(mapDimension); // 同步到 CombatManager，供 2D 动画/格子等从 context 读取

        const mapW = mapDimension.width;
        const mapH = mapDimension.height;
        const hexH = mapDimension.hexHeight;
        const mapLeft = (mapDimension.width - mapW) / 2 + 0.25 * mapDimension.hexWidth;
        const mapTop = (mapDimension.height - mapH) / 2;

        setMapPosition({ top: mapTop, left: mapLeft, width: mapW, height: mapH });
        setGridPosition({
            top: hexH / 2,
            left: 0,
            width: mapW,
            height: mapH - hexH / 2
        });

        const plazaLeft = (window.innerWidth - mapDimension.width) / 2;
        const plazaTop = (window.innerHeight - mapDimension.height) / 2;
        setPlacePosition({
            top: plazaTop,
            left: plazaLeft,
            width: mapDimension.width,
            height: mapDimension.height
        });
    }, [mapDimension, setMapDimension]);

    return (
        <div className="battle-container">
            <div
                ref={containerRef}
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    ...placePosition,
                }}
            >
                <div style={{ position: "absolute", ...mapPosition }}>
                    <div style={{ position: "absolute", ...gridPosition }}>
                        <CombatPlaza position={gridPosition} assetType={assetType} />
                    </div>
                    <CombatActPanel />
                </div>
                <div style={{ position: "absolute", ...mapPosition, pointerEvents: "none" }}>
                    <CombatActPanel />
                </div>
            </div>
        </div>
    );
};

interface BattlePlayerProps {
    assetType?: ASSET_TYPE;
}

const BattlePlayer: React.FC<BattlePlayerProps> = ({ assetType }) => {
    const { game, replay, mode } = useCombatManager();
    const [currentEventIndex, setCurrentEventIndex] = useState(0);
    const [allEvents, setAllEvents] = useState<any[]>([]);
    const { positionSelectionUI } = useCombatActHandler();

    // 监听重播状态变化，更新当前事件索引和事件列表
    // turn UI 显示统一由 initialPhaseChanges → handlePhaseChanges 处理
    useEffect(() => {
        if (mode === 'replay' && replay?.state) {
            setCurrentEventIndex(replay.state.currentIndex || 0);
            // ✅ 获取所有事件用于计分计算
            if (replay && 'getAllEvents' in replay && typeof replay.getAllEvents === 'function') {
                const events = replay.getAllEvents();
                setAllEvents(events);
            }
        }
    }, [mode, replay?.state?.currentIndex, replay]);

    if (!game) return null;

    return (
        <>
            <BattleVenue />
            {/* ✅ 位置选择UI（手动移动模式） */}
            {positionSelectionUI}
            {/* ✅ 重播控制 UI（仅在 replay 模式显示） */}
            {mode === 'replay' && <ReplayControls />}
            {/* ✅ 重播计分显示（仅在 replay 模式显示） */}
            {mode === 'replay' && game && allEvents.length > 0 && (
                <ReplayScoreDisplay
                    game={game}
                    events={allEvents}
                    currentEventIndex={currentEventIndex}
                />
            )}
        </>
    );
};

export default BattlePlayer;


