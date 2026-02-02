/**
 * Tactical Monster 战斗主界面组件
 */

import React, { useEffect, useRef, useState } from "react";
import { ASSET_TYPE } from "../types/monsterTypes";
import { useCombatManager } from "./service/CombatManager";
import { useCurrentTurnHandler } from "./service/handler/hooks/useCurrentTurnHandler";
import useCombatActHandler from "./service/handler/useCombatActHandler";
import useEventHandler from "./service/handler/useEventHandler";
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
    const containerRef = useRef<HTMLDivElement | null>(null);
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

    const { game, changeCell } = useCombatManager();
    useEventHandler();

    useEffect(() => {
        if (!game?.map || game.map.cols === 0 || game.map.rows === 0) return;
        const { rows, cols } = game.map;

        const mapRatio = ((cols + 0.5) * Math.sqrt(3)) / 2 / (2 + ((rows - 1) * 3) / 4);

        const updateMap = () => {
            if (containerRef.current) {
                const windowRatio = window.innerWidth / window.innerHeight;
                const plazaSize: { width: number; height: number } = { width: 0, height: 0 };

                if (mapRatio < windowRatio) {
                    plazaSize.width = window.innerHeight * mapRatio;
                    plazaSize.height = window.innerHeight;
                } else {
                    plazaSize.width = window.innerWidth;
                    plazaSize.height = window.innerWidth / mapRatio;
                }

                const mapHeight = plazaSize.height * 0.8;
                const hexHeight = mapHeight / (2 + ((rows - 1) * 3) / 4);
                const hexWidth = (hexHeight * Math.sqrt(3)) / 2;
                const mapWidth = hexWidth * (cols + 0.5);

                const mapLeft = (plazaSize.width - mapWidth) / 2 + 0.25 * hexWidth;
                const mapTop = (plazaSize.height - mapHeight) / 2;
                changeCell({ width: hexWidth, height: hexHeight });

                setMapPosition({
                    top: mapTop,
                    left: mapLeft,
                    width: mapWidth,
                    height: mapHeight
                });

                setGridPosition({
                    top: hexHeight / 2,
                    left: 0,
                    width: mapWidth,
                    height: mapHeight - hexHeight / 2
                });

                const plazaLeft = (window.innerWidth - plazaSize.width) / 2;
                const plazaTop = (window.innerHeight - plazaSize.height) / 2;
                setPlacePosition({ top: plazaTop, left: plazaLeft, width: plazaSize.width, height: plazaSize.height });
            }
        };

        updateMap();
        window.addEventListener("resize", updateMap);
        return () => window.removeEventListener("resize", updateMap);
    }, [game, changeCell]);

    return (
        <div className="battle-container">
            <div
                ref={containerRef}
                style={{
                    position: "absolute",
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

    // ✅ Play 模式：检查并显示当前 turn UI（用于已存在的游戏）
    useCurrentTurnHandler();

    // ✅ 监听重播状态变化，更新当前事件索引和事件列表
    // 注意：游戏初始化时的 turn UI 显示由 usePhaseChangesHandler 处理 initialPhaseChanges.turnStart 统一处理
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


