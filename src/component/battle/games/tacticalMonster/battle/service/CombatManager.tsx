/**
 * Tactical Monster 战斗管理器
 * PVE模式：玩家 vs Boss（Boss本体 + 小怪，uid="boss"）
 * 基于 solitaireSolo 的架构模式实现
 */


import { useQuery } from "convex/react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../../../../convex/tacticalMonster/convex/_generated/api";

import { useGameReplay } from "../hooks/useGameReplay";
import {
    CombatEvent,
    GameMode,
    GridCell,
    MonsterSprite,
    ReplayControls
} from "../types/CombatTypes";
import { GameModel } from "../types/gameTypes";
import { getCharactersFromGameModel } from "../utils/typeAdapter";

// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export interface ICombatContext {
    game: GameModel | null;
    // activeSkill: MonsterSkill | null;
    coordDirection: number;
    hexCell: { width: number; height: number };
    // map?: MapModel;
    gridCells: GridCell[][] | null;
    timeClock?: number;
    characters?: MonsterSprite[];
    // currentRound?: CombatRound;
    eventQueue: CombatEvent[];
    processedEvents?: CombatEvent[];  // ✅ Watch 模式：已处理的事件列表（用于实时计算分数）
    score: number;  // 新增：当前分数
    changeCell: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
    // setActiveSkill: (skill: MonsterSkill | null) => void;
    mode?: GameMode;  // 游戏模式
    replay?: ReplayControls;  // 重播控制（仅在 watch 模式）
    playbackSpeed?: number;  // 回放速度（仅在 replay 模式，用于同步动画速度）
}

export const CombatContext = createContext<ICombatContext>({
    game: null,
    coordDirection: 0,
    // currentRound: defaultRound,
    hexCell: { width: 0, height: 0 },
    // resourceLoad: { character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 },
    // map: { rows: 7, cols: 8 },
    gridCells: null,
    timeClock: 0,
    eventQueue: [],
    score: 0,
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
}

const CombatManager: React.FC<CombatManagerProps> = ({
    children,
    game = null,
    mode = 'play',
}) => {

    const [coordDirection, setCoordDirection] = useState<number>(0);
    const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
    const [hexCell, setHexCell] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [gridCells, setGridCells] = useState<GridCell[][] | null>(null);
    const [lastTime, setLastTime] = useState<number | undefined>(undefined);
    const [score, setScore] = useState<number>(0);
    // ✅ Watch 模式：收集所有已处理的事件用于实时计算分数
    const [processedEvents, setProcessedEvents] = useState<any[]>([]);
    // ✅ Replay 模式：维护游戏状态（从事件数据中提取）
    const [replayGameState, setReplayGameState] = useState<GameModel | null>(null);


    // ✅ 重播功能（仅在 replay 模式）
    // 在 replay 模式下，useGameReplay 会：
    // 1. 加载所有历史事件（findAllEvents）
    // 2. 创建 GameReplayManager 实例
    // 3. 提供播放控制方法（play/pause/stop/seekTo/setSpeed）
    const replay = useGameReplay(game?.gameId || null, mode);

    // ✅ 设置重播事件处理回调：将重播事件注入到 eventQueue
    // 当 GameReplayManager 播放事件时，会调用此回调
    // 回调将事件推入 eventQueue，由 useEventHandler 轮询处理
    useEffect(() => {
        if (mode === 'replay' && replay.setOnEventProcessed) {
            replay.setOnEventProcessed((event: CombatEvent) => {
                // 将重播事件注入到事件队列
                // 注意：这里直接推入队列，不触发 React 重新渲染
                // 事件处理由 useEventHandler 的轮询机制负责
                eventQueueRef.current.push(event);
            });
        }
    }, [mode, replay]);

    // ✅ 查询事件（仅 watch 模式需要实时查询）
    // - play 模式：不通过事件队列查询，事件由后端响应直接处理（通过 phaseChanges）
    // - watch 模式：实时查询新事件，但不允许操作
    // - replay 模式：跳过查询（使用 findAllEvents 一次性加载）
    const events: any = useQuery(
        api.service.game.gameService.findEvents,
        (game?.gameId && mode === 'watch') ? { gameId: game.gameId, lastTime } : "skip"
    );

    // 查询游戏报告
    const report: any = useQuery(
        (api as any).service.game.gameService.findReport,
        game?.gameId ? { gameId: game.gameId } : "skip"
    );

    // ✅ Watch 模式：实时查询游戏状态以同步数据更新
    // 在 watch 模式下，通过实时查询游戏状态来确保 UI 与后端数据同步
    const gameState: any = useQuery(
        api.service.game.gameService.getGame,
        (game?.gameId && mode === 'watch') ? { gameId: game.gameId } : "skip"
    );

    // ✅ Watch 模式：使用查询到的游戏状态（如果可用）
    // ✅ Replay 模式：使用从事件数据中提取的游戏状态（如果可用）
    // 优先级：watch 模式查询结果 > replay 模式状态 > 传入的 game prop
    const effectiveGame = (mode === 'watch' && gameState)
        ? gameState
        : (mode === 'replay' && replayGameState)
            ? replayGameState
            : game;

    // ✅ Replay 模式：从 gameInit 事件初始化游戏状态
    useEffect(() => {
        if (mode === 'replay' && game && !replayGameState) {
            // 在 replay 模式下，初始状态应该从 gameInit 事件中提取
            // 但如果没有 gameInit 事件，使用传入的 game prop
            setReplayGameState(game);
        }
    }, [mode, game, replayGameState]);



    // ✅ 处理事件更新（仅 watch 模式需要）
    // 此 useEffect 监听 events 变化（来自 useQuery），将新事件推入 eventQueue
    // - play 模式：不通过事件队列，事件由后端响应直接处理（通过 phaseChanges）
    // - replay 模式：跳过此处理（事件由 GameReplayManager 通过回调注入）
    useEffect(() => {
        // 只处理 watch 模式
        if (mode !== 'watch') return;

        if (Array.isArray(events) && events.length > 0) {
            events.forEach((backendEvent: any) => {
                // 对于非乐观事件，直接添加
                // 注意：watch 模式下不应该有阶段事件，所有阶段变化都在操作事件的 phaseChanges 中
                if (!backendEvent.optimistic) {
                    eventQueueRef.current.push(backendEvent);

                    // ✅ Watch 模式：收集已处理的事件用于实时计算分数
                    setProcessedEvents(prev => {
                        // 避免重复添加
                        const exists = prev.some(e =>
                            (e._id && backendEvent._id && e._id === backendEvent._id) ||
                            (e.time === backendEvent.time && e.name === backendEvent.name)
                        );
                        if (!exists) {
                            return [...prev, backendEvent];
                        }
                        return prev;
                    });
                }
            });

            const lastEvent = events[events.length - 1];
            setLastTime(lastEvent.time);
        }
    }, [events, mode]);




    // 初始化网格
    useEffect(() => {
        if (!game?.map || game.map.cols === 0 || game.map.rows === 0) return;

        const { rows, cols, obstacles, disables } = game.map;

        const cells: GridCell[][] = Array.from({ length: rows }, (_, y) =>
            Array.from({ length: cols }, (_, x) => {
                const cell: GridCell = {
                    x,
                    y,
                    gridContainer: null,
                    gridGround: null,
                    gridWalk: null,
                    walkable: true,
                    type: 0,
                };

                const obstacle = obstacles?.find((o) => o.q === x && o.r === y);
                if (obstacle) {
                    cell.walkable = false;
                    cell.type = 1;
                }

                const disable = disables?.find((d) => d.q === x && d.r === y);
                if (disable) {
                    cell.walkable = false;
                    cell.type = 2;
                }

                return cell;
            })
        );

        setGridCells(cells);
    }, [game?.map]);
    const timeClock = game?.dueTime;
    const gameScore = game?.score;

    // 从 team 和 boss 计算 characters（使用 useMemo 缓存）
    // ✅ Watch/Replay 模式：使用 effectiveGame 确保数据同步
    const characters = useMemo(() => {
        const gameToUse = effectiveGame || game;
        if (!gameToUse?.team || !gameToUse?.boss) return [];
        return getCharactersFromGameModel(gameToUse.team, gameToUse.boss);
    }, [effectiveGame, game?.team, game?.boss]);

    const value: ICombatContext = {
        game: effectiveGame || game,  // ✅ Watch 模式：使用查询到的游戏状态
        coordDirection,
        hexCell,
        // map: map || { rows: 7, cols: 8, obstacles: [], disables: [] },
        gridCells,
        // currentRound: currentRound || defaultRound,
        characters: characters || [],
        timeClock: timeClock || 0,
        eventQueue: eventQueueRef.current,
        processedEvents: mode === 'watch' ? processedEvents : undefined,  // ✅ Watch 模式：暴露已处理的事件
        score: (effectiveGame || game)?.score || gameScore || score,  // ✅ Watch 模式：使用查询到的分数
        // resourceLoad,
        // setResourceLoad,
        changeCell: setHexCell,
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
        throw new Error("useCombatManager must be used within a CombatManager");
    }
    return context;
};
export default CombatManager;


