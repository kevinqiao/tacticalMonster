/**
 * Tactical Monster 战斗管理器
 * PVE模式：玩家 vs Boss（Boss本体 + 小怪，uid="boss"）
 * 基于 solitaireSolo 的架构模式实现
 */


import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useGameReplay } from "../battle/hooks/useGameReplay";
import { useWatchMode } from "../battle/hooks/useWatchMode";
import { getCharacterKey } from "../battle3d/utils/battle3DAdapter";
import type { GameModel } from "../types/CombatTypes";
import {
    FrontendCombatEvent,
    GameMode,
    GridCellSprite,
    MonsterSprite,
    ReplayControls
} from "../types/CombatTypes";
import type { GameRound } from "../types/gameTypes";
import { PhaseChanges } from "../types/gameTypes";
import { ObstacleCell, ObstacleSprite } from "../types/obstacleTypes";
import { getCharactersFromGameModel } from "../utils/typeAdapter";
import { useInitialPhaseChangesGate } from "./hooks/useInitialPhaseChangesGate";
import type { MapDimension } from "./TeamDeployManager";
import { useMapDimension } from "./useMapDimension";

export type TurnRoundData =
    | NonNullable<PhaseChanges["roundStart"]>
    | NonNullable<PhaseChanges["turnStart"]>
    | NonNullable<PhaseChanges["roundEnd"]>
    | NonNullable<PhaseChanges["turnEnd"]>;

export type TurnRoundPayload = {
    name: "roundStart" | "turnStart" | "roundEnd" | "turnEnd";
    data: TurnRoundData;
};
// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export interface ICombatContext {
    game: GameModel | null;
    groundCells: GridCellSprite[][] | null;
    obstacleSprites?: ObstacleSprite[];
    characters?: MonsterSprite[];
    eventQueue: FrontendCombatEvent[];

    processedEvents?: FrontendCombatEvent[];  // Watch 模式：已处理的事件列表（用于实时计算分数）

    /** 由 CombatManager 通过 useMapDimension 测量容器得到，供 2D/3D 视图与动画使用 */
    mapDimension: MapDimension | null;
    // setMapDimension: React.Dispatch<React.SetStateAction<MapDimension | null>>;
    /** 测量 mapDimension 的容器 ref，挂在 CombatManager 的包装 div 上 */
    // containerRef: React.RefObject<HTMLDivElement | null>;
    mode?: GameMode;
    replay?: ReplayControls;
    playbackSpeed?: number;
    // ✅ 初始 phaseChanges 由各视图层（2D/3D）自行处理
    initialPhaseChanges?: PhaseChanges;
    markInitialPhaseChangesProcessed: () => void;
    isInitialPhaseChangesProcessed: () => boolean;
    turnRound?: TurnRoundPayload;
    setTurnRound: (payload: TurnRoundPayload) => void;
    /** 当前回合活跃角色（用于 3D 视图高亮指示）；由 derivation 与 setActiveCharacterKey 共同控制 */
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
    // setMapDimension: () => null,
    // containerRef: { current: null },
    mode: 'play',
    playbackSpeed: 1.0,
    markInitialPhaseChangesProcessed: () => { },
    isInitialPhaseChangesProcessed: () => false,
    turnRound: undefined,
    setTurnRound: () => { },
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
    const { containerRef, mapDimension } = useMapDimension();
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



    const characters = useMemo(() => {
        if (!game?.team || !game?.boss) return [];
        return getCharactersFromGameModel(game.team, game.boss);
    }, [game?.gameId]);
    const groundCells: GridCellSprite[][] | null = useMemo(() => {
        if (!game?.map) return null;
        const { rows, cols, disables, obstacles } = game.map;
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
                const obstacle = obstacles?.find((o: ObstacleCell) => o.q === x && o.r === y);
                if (obstacle) {
                    cell.obstacle = 1;
                }
                return cell;
            })
        );
        return cells;
    }, [game?.map]);



    const { markInitialPhaseChangesProcessed, isInitialPhaseChangesProcessed } =
        useInitialPhaseChangesGate();

    const [turnRound, setTurnRoundState] = useState<TurnRoundPayload | undefined>(undefined);

    const setTurnRound = useCallback((payload: TurnRoundPayload) => {
        if (!game) return;
        const { name, data } = payload;

        // roundStart: 先同步 game.currentRound（后端返回的 round.turns 已保证 uid="boss" 时含 bossId 或 minionId）
        if (name === "roundStart" && "round" in data && data.round) {
            const round = data.round as GameRound;
            (game as { currentRound?: GameRound }).currentRound = round;
        }

        // turnStart / turnEnd: 更新 game.currentRound.turns 的 status
        if ((name === "turnStart" || name === "turnEnd") && game.currentRound) {
            const actor = ("turn" in data ? data.turn : data) as {
                uid?: string;
                monsterId?: string;
                bossId?: string;
                minionId?: string;
            };

            const turn = game.currentRound.turns.find((t) => {
                if (actor.bossId) return t.bossId === actor.bossId;
                if (actor.minionId) return t.minionId === actor.minionId;
                return actor.uid !== "boss" && !!actor.monsterId && t.monsterId === actor.monsterId;
            });

            if (turn) {
                turn.status = name === "turnStart" ? 1 : 2;
            }
        }

        setTurnRoundState(payload);
    }, [game]);

    // ✅ 当前回合活跃角色（命令式设置，确保 phase handler 中即时生效）
    const [activeCharacterKey, setActiveCharacterKey] = useState<string | null>(null);

    // ✅ 兜底同步：当 turnRound / game.currentRound 变化时，根据 status 1 的 turn 推导 activeCharacterKey，确保高亮不丢失
    useEffect(() => {
        const round = game?.currentRound;
        const turns = round?.turns ?? [];
        const activeTurn = turns.find((t) => (t.status ?? 0) === 1);
        if (!activeTurn || !characters?.length) {
            setActiveCharacterKey(null);
            return;
        }
        const t = activeTurn as { uid?: string; monsterId?: string; bossId?: string; minionId?: string };
        const character =
            (t.bossId != null && characters.find((c) => (c as { character_id?: string }).character_id === t.bossId)) ||
            (t.minionId != null && characters.find((c) => (c as { character_id?: string }).character_id === t.minionId)) ||
            characters.find((c) => c.uid === t.uid && c.monsterId === t.monsterId);
        if (character) {
            setActiveCharacterKey(getCharacterKey(character));
        } else {
            setActiveCharacterKey(null);
        }
    }, [turnRound, game?.currentRound, characters]);

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
        mapDimension,
        // setMapDimension,
        // containerRef,
        mode: mode,
        initialPhaseChanges,
        markInitialPhaseChangesProcessed,
        isInitialPhaseChangesProcessed,
        turnRound,
        setTurnRound,
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

    return (
        <CombatContext.Provider value={value}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
                {children}
            </div>
        </CombatContext.Provider>
    );
};
export const useCombatManager = () => {
    const context = useContext(CombatContext);
    if (!context) {
        throw new Error("useCombatManager must be used within a CombatProvider");
    }
    return context;
};

export default CombatManager;


