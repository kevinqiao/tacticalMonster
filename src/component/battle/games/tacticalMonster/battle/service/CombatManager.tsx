/**
 * Tactical Monster 战斗管理器
 * PVE模式：玩家 vs Boss（Boss本体 + 小怪，uid="boss"）
 * 基于 solitaireSolo 的架构模式实现
 */


import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useGameReplay } from "../hooks/useGameReplay";
import { useWatchMode } from "../hooks/useWatchMode";
import type { GameModel } from "../types/CombatTypes";
import {
    FrontendCombatEvent,
    GameMode,
    GridCellSprite,
    MonsterSprite,
    ReplayControls
} from "../types/CombatTypes";
import { PhaseChanges } from "../types/gameTypes";
import { ObstacleCell, ObstacleSprite } from "../types/obstacleTypes";
import { getCharactersFromGameModel } from "../utils/typeAdapter";
import { usePhaseChangesHandler } from "./handler/hooks/usePhaseChangesHandler";

// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export interface ICombatContext {
    game: GameModel | null;
    initialPhaseChanges?: PhaseChanges;
    // activeSkill: MonsterSkill | null;
    coordDirection: number;
    hexDimension: { width: number; height: number };
    // map?: MapModel;
    groundCells: GridCellSprite[][] | null;
    obstacleSprites?: ObstacleSprite[];
    characters?: MonsterSprite[];
    // currentRound?: CombatRound;
    eventQueue: FrontendCombatEvent[];
    processedEvents?: FrontendCombatEvent[];  // ✅ Watch 模式：已处理的事件列表（用于实时计算分数）
    updateGameState?: (updater: (game: GameModel) => GameModel) => void;  // ✅ 方案1：统一的状态更新函数
    changeCell: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
    // setActiveSkill: (skill: MonsterSkill | null) => void;
    mode?: GameMode;  // 游戏模式
    replay?: ReplayControls;  // 重播控制（仅在 watch 模式）
    playbackSpeed?: number;  // 回放速度（仅在 replay 模式，用于同步动画速度）
}

export const CombatContext = createContext<ICombatContext>({
    game: null,
    initialPhaseChanges: undefined,
    coordDirection: 0,
    // currentRound: defaultRound,
    hexDimension: { width: 0, height: 0 },
    groundCells: [],
    obstacleSprites: [],
    eventQueue: [],
    // setResourceLoad: () => null,
    changeCell: () => null,
    // setActiveSkill: () => null,
    mode: 'play',
    playbackSpeed: 1.0
});


/**
 * CombatManager Props
 * 
 * @param children - 子组件（通常是 BattlePlayer）
 * @param gameId - 游戏ID，用于加载和查询游戏数据
 * @param config - 游戏配置（可选），会与默认配置合并
 * @param mode - 游戏模式：
 *   - 'play': 游玩模式（可操作，实时接收事件）
 *   - 'watch': 实时观看模式（只读，实时接收事件）
 *   - 'replay': 重播模式（只读，加载所有历史事件，可控制播放）
 * @param onGameLoadComplete - 游戏加载完成回调
 * @param onGameSubmit - 游戏提交回调（通常在游戏结束时调用）
 */
interface CombatManagerProps {
    children: ReactNode;
    game: GameModel | null;
    mode?: GameMode;
    initialPhaseChanges?: PhaseChanges; // ✅ 初始 phaseChanges（从 loadGame 返回）
}

const CombatManager: React.FC<CombatManagerProps> = ({
    children,
    game = null,
    mode = 'play',
    initialPhaseChanges, // ✅ 初始 phaseChanges
}) => {

    const [coordDirection, setCoordDirection] = useState<number>(0);
    const eventQueueRef: React.MutableRefObject<FrontendCombatEvent[]> = useRef<FrontendCombatEvent[]>([]);
    const [hexDimension, setHexDimension] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    // ✅ 重播功能（仅在 replay 模式）
    // 在 replay 模式下，useGameReplay 会：
    // 1. 加载所有历史事件（findAllEvents）
    // 2. 创建 GameReplayManager 实例
    // 3. 提供播放控制方法（play/pause/stop/seekTo/setSpeed）
    const replay = useGameReplay(game?.gameId || null, mode);

    // ✅ Watch 模式：处理实时事件查询和收集
    const { processedEvents } = useWatchMode({
        gameId: game?.gameId,
        mode,
        eventQueueRef
    });

    // ✅ 设置重播事件处理回调：将重播事件注入到 eventQueue
    // 当 GameReplayManager 播放事件时，会调用此回调
    // 回调将事件推入 eventQueue，由 useEventHandler 轮询处理
    useEffect(() => {
        if (mode === 'replay' && replay.setOnEventProcessed) {
            replay.setOnEventProcessed((event: FrontendCombatEvent) => {
                // 将重播事件注入到事件队列
                // 注意：这里直接推入队列，不触发 React 重新渲染
                // 事件处理由 useEventHandler 的轮询机制负责
                eventQueueRef.current.push(event);
            });
        }
    }, [mode, replay]);

    // ✅ 优化：直接使用传入的 game prop，不维护本地状态
    // 所有状态更新都通过直接修改 charactersRef 中的对象（通过 GSAP）实现，避免重新渲染

    // ✅ 优化：使用 ref 存储 characters，避免频繁重新计算和重新渲染
    // 直接修改 ref 中的对象（通过 GSAP）不会触发 React 重新渲染
    const charactersRef = useRef<MonsterSprite[]>([]);

    // ✅ 初始化 characters（只在 gameId 变化时）
    useEffect(() => {
        if (game?.team && game?.boss) {
            charactersRef.current = getCharactersFromGameModel(game.team, game.boss);
        }
    }, [game?.gameId]); // 只在 gameId 变化时重新初始化

    // ✅ 优化：characters 直接使用 ref（不触发重新渲染）
    // 直接修改 ref 中的对象（通过 GSAP）不会触发 React 重新渲染
    // 只有在 gameId 变化时（useEffect）才会重新初始化 charactersRef
    const characters = charactersRef.current;
    const groundCells: GridCellSprite[][] | null = useMemo(() => {
        if (!game?.map) return null;
        const { rows, cols, disables } = game.map;
        const cells: GridCellSprite[][] = Array.from({ length: rows }, (_, y) =>
            Array.from({ length: cols }, (_, x) => {
                const cell: GridCellSprite = {
                    q: x,
                    r: y,
                    disable: false,
                };
                const disable = disables?.find((d: any) => d.q === x && d.r === y);
                if (disable) {
                    cell.disable = true;
                }

                return cell;
            })
        );
        return cells;
    }, [game?.map]);

    // ✅ 优化：移除 updateGameState（不再需要维护本地状态）
    // 所有状态更新都通过直接修改 charactersRef 中的对象（通过 GSAP）实现
    // 如果需要更新 React 状态，应该通过父组件的 prop 传递
    const updateGameState = useCallback((updater: (game: GameModel) => GameModel) => {
        // ⚠️ 已移除本地状态管理，此函数保留为空函数以确保接口兼容性
        // 如果确实需要更新 game，应该通过父组件的状态管理来实现
        console.warn("updateGameState is deprecated. Game state should be managed by parent component.");
    }, []);

    // ✅ 使用阶段变化处理器
    const { handlePhaseChanges } = usePhaseChangesHandler();

    // ✅ 处理初始 phaseChanges（所有模式）
    const processedInitialPhaseChangesRef = useRef<boolean>(false);
    useEffect(() => {
        // 只在游戏已加载，且 phaseChanges 存在，且未处理过时执行
        // ✅ 优化：使用 charactersRef.current 代替 characters（避免依赖 ref 触发重新渲染）
        if (
            game &&
            initialPhaseChanges &&
            !processedInitialPhaseChangesRef.current &&
            charactersRef.current.length > 0 &&
            groundCells
        ) {
            // 根据模式决定是否处理初始 phaseChanges
            if (mode === 'play') {
                // play 模式：总是处理初始 phaseChanges（游戏刚创建时的第一个 turn）
                processedInitialPhaseChangesRef.current = true;
                const timer = setTimeout(() => {
                    handlePhaseChanges(initialPhaseChanges).catch((error) => {
                        console.error("Error handling initial phaseChanges in play mode:", error);
                    });
                }, 500); // 给资源加载一些时间
                return () => clearTimeout(timer);
            } else if (mode === 'watch' || mode === 'replay') {
                // watch/replay 模式：延迟处理，等待事件队列加载完成
                // 如果已经有历史事件，说明游戏不是刚创建的，不需要处理初始 phaseChanges
                // 如果事件队列为空，说明游戏是刚创建的，需要处理初始 phaseChanges
                const timer = setTimeout(() => {
                    // 检查事件队列是否为空（如果为空，说明是刚创建的游戏）
                    // 对于 watch 模式，还需要检查 events query 是否为空
                    // 对于 replay 模式，检查 replay 的 events 是否为空
                    if (mode === 'watch') {
                        // watch 模式：如果事件队列为空，处理初始 phaseChanges
                        if (eventQueueRef.current.length === 0) {
                            processedInitialPhaseChangesRef.current = true;
                            handlePhaseChanges(initialPhaseChanges).catch((error) => {
                                console.error("Error handling initial phaseChanges in watch mode:", error);
                            });
                        }
                    } else if (mode === 'replay') {
                        // replay 模式：如果 replay 的事件为空，处理初始 phaseChanges
                        if (replay && replay.getAllEvents && replay.getAllEvents().length === 0) {
                            processedInitialPhaseChangesRef.current = true;
                            handlePhaseChanges(initialPhaseChanges).catch((error) => {
                                console.error("Error handling initial phaseChanges in replay mode:", error);
                            });
                        }
                    }
                }, 1000); // 给事件加载更多时间
                return () => clearTimeout(timer);
            }
        }
    }, [mode, game, initialPhaseChanges, handlePhaseChanges, groundCells, replay]);

    const obstacleSprites: ObstacleSprite[] | undefined = useMemo(() => {
        if (!game?.map) return;
        const { obstacles } = game.map;
        return obstacles?.map((o: ObstacleCell) => {
            return {
                id: o.id,
                q: o.q,
                r: o.r,
                element: undefined,
            };
        });

    }, [game?.map]);

    const value: ICombatContext = {
        game: game,  // ✅ 直接使用传入的 game prop，不维护本地状态
        initialPhaseChanges: initialPhaseChanges,
        coordDirection,
        hexDimension,
        // map: map || { rows: 7, cols: 8, obstacles: [], disables: [] },
        groundCells,
        obstacleSprites,
        // currentRound: currentRound || defaultRound,
        characters: characters || [],
        eventQueue: eventQueueRef.current,
        processedEvents: mode === 'watch' ? processedEvents : undefined,  // ✅ Watch 模式：暴露已处理的事件（由 useWatchMode 提供）
        updateGameState,  // ✅ 方案1：统一的状态更新函数
        // resourceLoad,
        // setResourceLoad,
        changeCell: setHexDimension,
        mode: mode,
        // ✅ 重播控制（仅在 replay 模式）
        // 提供重播播放控制接口，子组件可通过 useCombatManager() 获取
        // 例如：const { replay } = useCombatManager(); replay?.play();
        replay: mode === 'replay' ? {
            play: replay.play,           // 开始播放
            pause: replay.pause,         // 暂停播放
            stop: replay.stop,           // 停止播放
            seekTo: replay.seekTo,      // 跳转到指定时间（毫秒）
            seekToIndex: replay.seekToIndex,  // 跳转到指定事件索引
            setSpeed: replay.setSpeed,   // 设置播放速度（0.5x, 1x, 2x）
            state: replay.replayState,   // 重播状态（isPlaying, currentIndex, totalEvents 等）
            getAllEvents: replay.getAllEvents,  // ✅ 获取所有事件（用于计分）
        } : undefined,
        // ✅ 回放速度（用于同步动画速度）
        playbackSpeed: mode === 'replay' ? (replay?.replayState?.playbackSpeed ?? 1.0) : 1.0,
    };

    return <CombatContext.Provider value={value}>{children}</CombatContext.Provider>;
};
export const useCombatManager = () => {
    const context = useContext(CombatContext);
    if (!context) {
        throw new Error("useCombatManager must be used within a CombatProvider");
    }
    return context;
};

export default CombatManager;


