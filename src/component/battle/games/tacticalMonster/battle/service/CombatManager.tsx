/**
 * Tactical Monster 战斗管理器
 * PVE模式：玩家 vs Boss（Boss本体 + 小怪，uid="boss"）
 * 基于 solitaireSolo 的架构模式实现
 */


import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { MapDimension } from "../../team/service/TeamDeployManager";
import type { GameModel } from "../../types/CombatTypes";
import {
    FrontendCombatEvent,
    GameMode,
    GridCellSprite,
    MonsterSprite,
    ReplayControls
} from "../../types/CombatTypes";
import { PhaseChanges } from "../../types/gameTypes";
import { ObstacleCell, ObstacleSprite } from "../../types/obstacleTypes";
import { useGameReplay } from "../hooks/useGameReplay";
import { useWatchMode } from "../hooks/useWatchMode";
import { getCharactersFromGameModel } from "../utils/typeAdapter";
// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export interface ICombatContext {
    game: GameModel | null;
    groundCells: GridCellSprite[][] | null;
    obstacleSprites?: ObstacleSprite[];
    characters?: MonsterSprite[];
    eventQueue: FrontendCombatEvent[];
    processedEvents?: FrontendCombatEvent[];  // Watch 模式：已处理的事件列表（用于实时计算分数）
    updateGameState?: (updater: (game: GameModel) => GameModel) => void;
    /** 由当前挂载的战斗视图写入：2D 时 BattlePlayer 写入，3D 时 BattleVenue3D 写入；2D 动画/格子等从 context 读取 */
    mapDimension: MapDimension | null;
    setMapDimension: React.Dispatch<React.SetStateAction<MapDimension | null>>;
    mode?: GameMode;
    replay?: ReplayControls;
    playbackSpeed?: number;
    // ✅ 初始 phaseChanges 由各视图层（2D/3D）自行处理
    initialPhaseChanges?: PhaseChanges;
    markInitialPhaseChangesProcessed: () => void;
    isInitialPhaseChangesProcessed: () => boolean;
    // ✅ 当前回合活跃角色（用于 3D 视图高亮指示）
    activeCharacterKey: string | null;
    setActiveCharacterKey: (key: string | null) => void;
    // ✅ 动画中角色（2D/3D 行走等）：避免重渲染覆盖 GSAP 控制的 position
    animatingCharacterKey: string | null;
    /** 动画起点 position 的稳定引用（3D: [x,y,z]，行走期间对该角色传此引用） */
    animatingStartPositionRef: React.MutableRefObject<[number, number, number]>;
    /** 开始动画：key + 可选 position（写入 ref）；结束动画：setCharacterAnimating(null) */
    setCharacterAnimating: (key: string | null, position?: [number, number, number]) => void;
}

export const CombatContext = createContext<ICombatContext>({
    game: null,
    groundCells: [],
    obstacleSprites: [],
    eventQueue: [],
    mapDimension: null,
    setMapDimension: () => null,
    mode: 'play',
    playbackSpeed: 1.0,
    markInitialPhaseChangesProcessed: () => { },
    isInitialPhaseChangesProcessed: () => false,
    activeCharacterKey: null,
    setActiveCharacterKey: () => { },
    animatingCharacterKey: null,
    animatingStartPositionRef: { current: [0, 0, 0] },
    setCharacterAnimating: () => { },
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

    const eventQueueRef: React.MutableRefObject<FrontendCombatEvent[]> = useRef<FrontendCombatEvent[]>([]);
    /** 与 mapDimension 一致：仅由当前激活的 2D/3D 视图通过 setMapDimension 写入，避免多处来源混乱 */
    const [mapDimension, setMapDimension] = useState<MapDimension | null>(null);

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

    // ✅ initialPhaseChanges 由各视图层（2D BattlePlayer / 3D BattleVenue3D）自行处理
    // CombatManager 只负责暴露数据和标记是否已处理
    const processedInitialPhaseChangesRef = useRef<boolean>(false);
    const markInitialPhaseChangesProcessed = useCallback(() => {
        processedInitialPhaseChangesRef.current = true;
    }, []);
    const isInitialPhaseChangesProcessed = useCallback(() => {
        return processedInitialPhaseChangesRef.current;
    }, []);

    // ✅ 当前回合活跃角色（用于 3D 视图高亮指示）
    const [activeCharacterKey, setActiveCharacterKey] = useState<string | null>(null);

    // ✅ 动画中角色（2D/3D 行走等）：稳定 position 引用 + 触发一次重渲染，避免动画期间被覆盖
    const [animatingCharacterKey, setAnimatingCharacterKey] = useState<string | null>(null);
    const animatingStartPositionRef = useRef<[number, number, number]>([0, 0, 0]);
    const setCharacterAnimating = useCallback((key: string | null, position?: [number, number, number]) => {
        if (key !== null && position) {
            animatingStartPositionRef.current[0] = position[0];
            animatingStartPositionRef.current[1] = position[1];
            animatingStartPositionRef.current[2] = position[2];
        }
        setAnimatingCharacterKey(key);
    }, []);
    useEffect(() => () => setAnimatingCharacterKey(null), []);

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
        game: game,
        groundCells,
        obstacleSprites,
        characters: characters || [],
        eventQueue: eventQueueRef.current,
        processedEvents: mode === 'watch' ? processedEvents : undefined,
        updateGameState,
        mapDimension,
        setMapDimension,
        mode: mode,
        initialPhaseChanges,
        markInitialPhaseChangesProcessed,
        isInitialPhaseChangesProcessed,
        activeCharacterKey,
        setActiveCharacterKey,
        animatingCharacterKey,
        animatingStartPositionRef,
        setCharacterAnimating,
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


