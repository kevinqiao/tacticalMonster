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
import {
    applySingleTurnUpdate,
    normalizeTurnRound,
    type TurnActor,
} from "../utils/normalizeTurnRound";
import { enqueueIfNotDuplicate, getPhaseEventKey } from "../utils/turnBarQueueUtils";
import { getCharactersFromGameModel } from "../utils/typeAdapter";
import type { TurnBarPhaseEvent, TurnBarQueuedEvent } from "../utils/turnBarQueueUtils";

/** 服务端快照写入 runtime 前浅拷贝 turns，避免与后续 mutate 共享引用 */
function cloneGameRoundForSync(round: GameRound): GameRound {
    return {
        no: round.no,
        turns: round.turns.map((t) => ({ ...t })),
    };
}
import { useInitialPhaseChangesGate } from "./hooks/useInitialPhaseChangesGate";
import type { MapDimension } from "./TeamDeployManager";
import { useMapDimension } from "./useMapDimension";

export type TurnRoundData =
    | NonNullable<PhaseChanges["roundStart"]>
    | NonNullable<PhaseChanges["turnStart"]>
    | NonNullable<PhaseChanges["roundEnd"]>
    | NonNullable<PhaseChanges["turnEnd"]>

export type TurnRoundDataWithRound = TurnRoundData & {
    /** 由前端 setPhaseChangeEvent 注入的最新回合快照（用于 UI 同步，如 turnbar） */
    currentRound?: GameRound;
};

export type TurnRoundPayload = {
    name: "roundStart" | "turnStart" | "roundEnd" | "turnEnd" | "init" | "gameOver";
    data: TurnRoundDataWithRound;
};
// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);
export interface ICombatContext {
    /** 运行时 game（CombatManager 内部维护，phase 变化通过 updateRuntimeGame 写入）；fallback 为 props.game */
    game: GameModel | null;
    /** 应用阶段变化到 runtimeGame 的受控更新接口（单一写入入口） */
    updateRuntimeGame?: (updater: (prev: GameModel) => GameModel) => void;
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
    /** 初始 phaseChanges 处理门：markProcessed 标记已处理，isProcessed 检查 */
    initialPhaseChangesGate: { markProcessed: () => void; isProcessed: () => boolean };
    /** gameOver 事件（仅用于 BattlePlayer3D 显示 GameOver 弹窗） */
    gameOverEvent?: TurnRoundPayload;
    /** phase 事件队列 ref（供 TurnOrderBar 消费） */
    phaseChangeEventQueueRef: React.MutableRefObject<TurnBarQueuedEvent[]>;
    /** init 门控：入队过 init 的 gameKey，供 TurnOrderBar 消费前判断 */
    initQueuedGameKeyRef: React.MutableRefObject<string | null>;
    addPhaseChangeEvent: (
        payload: TurnRoundPayload,
        options?: { unshift?: boolean; authoritativeRound?: boolean }
    ) => void;
    /** 当前回合活跃角色（用于 3D 视图高亮指示）；由 derivation 与 setActiveCharacterKey 共同控制 */
    activeCharacterKey: string | null;
    setActiveCharacterKey: (key: string | null) => void;
    /** 动画中角色：{ key, position } 或 null；避免重渲染覆盖 GSAP 控制的 position */
    animating: { key: string; position: [number, number, number] } | null;
    /** 开始动画：key + 可选 position；结束动画：setCharacterAnimating(null) */
    setCharacterAnimating: (key: string | null, position?: [number, number, number]) => void;
}

export const CombatContext = createContext<ICombatContext>({
    game: null,
    updateRuntimeGame: undefined,
    groundCells: [],
    obstacleSprites: [],
    eventQueue: [],
    mapDimension: null,
    // setMapDimension: () => null,
    // containerRef: { current: null },
    mode: 'play',
    playbackSpeed: 1.0,
    initialPhaseChangesGate: { markProcessed: () => { }, isProcessed: () => false },
    gameOverEvent: undefined,
    phaseChangeEventQueueRef: { current: [] },
    initQueuedGameKeyRef: { current: null },
    addPhaseChangeEvent: () => { },
    activeCharacterKey: null,
    setActiveCharacterKey: () => { },
    animating: null,
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
    initialPhaseChanges,
}) => {

    const eventQueueRef: React.MutableRefObject<FrontendCombatEvent[]> = useRef<FrontendCombatEvent[]>([]);
    const { containerRef, mapDimension } = useMapDimension();

    // runtimeGame: 运行时 game 状态，phase 变化由此单一写入，避免多处 mutation 导致状态漂移
    const [runtimeGame, setRuntimeGame] = useState<GameModel | null>(null);
    const gameIdRef = useRef<string | null>(null);
    useEffect(() => {
        const nextId = game?.gameId ?? null;
        if (nextId !== gameIdRef.current) {
            gameIdRef.current = nextId;
            setRuntimeGame(game);
        }
    }, [game, game?.gameId]);
    const effectiveGame = runtimeGame ?? game;
    /** 与 addPhaseChangeEvent 推导的 currentRound 同步；同一 flushSync 内多次 addPhaseChangeEvent 时 React state 尚未更新，需用 ref 链式读最新回合（bossAIActions 多条 turnStart 等） */
    const phaseRoundMirrorRef = useRef<GameRound | undefined>(undefined);
    useEffect(() => {
        phaseRoundMirrorRef.current = effectiveGame?.currentRound;
    }, [effectiveGame?.currentRound, effectiveGame?.gameId]);

    const updateRuntimeGame = useCallback((updater: (prev: GameModel) => GameModel) => {
        setRuntimeGame((prev) => {
            const base = prev ?? game;
            if (!base) return prev;
            return updater(base) ?? prev;
        });
    }, [game]);
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
        if (!effectiveGame?.team || !effectiveGame?.boss) return [];
        return getCharactersFromGameModel(effectiveGame.team, effectiveGame.boss);
    }, [effectiveGame?.gameId, effectiveGame?.team, effectiveGame?.boss]);

    const groundCells: GridCellSprite[][] | null = useMemo(() => {
        if (!effectiveGame?.map) return null;
        const { rows, cols, disables, obstacles } = effectiveGame.map;
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
    }, [effectiveGame?.map]);



    const initialPhaseChangesGate = useInitialPhaseChangesGate();

    const [gameOverEvent, setGameOverEvent] = useState<TurnRoundPayload | undefined>(undefined);
    const phaseChangeEventQueueRef = useRef<TurnBarQueuedEvent[]>([]);
    const initQueuedGameKeyRef = useRef<string | null>(null);

    const addPhaseChangeEvent = useCallback(
        (
            payload: TurnRoundPayload,
            options?: { unshift?: boolean; authoritativeRound?: boolean }
        ) => {
            if (payload.name === "gameOver") {
                setGameOverEvent(payload);
                return;
            }
            if (!effectiveGame && payload.name !== "init") return;

            const { name, data } = payload;
            const actor = ("turn" in data ? data.turn : data) as TurnActor;
            let nextPayload: TurnRoundPayload = payload;
            let roundToSync: GameRound | undefined;

            if (name === "roundStart" && "round" in data && data.round && typeof data.round === "object") {
                const round = data.round as GameRound;
                roundToSync = round;
                nextPayload = { ...payload, data: { ...(data as TurnRoundData), currentRound: round } };
            } else if (name === "roundEnd" && (data as any).currentRound) {
                roundToSync = (data as any).currentRound as GameRound;
            } else if (
                (name === "turnStart" || name === "turnEnd") &&
                options?.authoritativeRound &&
                (data as TurnRoundDataWithRound).currentRound
            ) {
                const snap = cloneGameRoundForSync((data as TurnRoundDataWithRound).currentRound!);
                roundToSync = snap;
                nextPayload = {
                    ...payload,
                    data: { ...(data as TurnRoundData), currentRound: snap },
                };
            } else if ((name === "turnStart" || name === "turnEnd") && effectiveGame?.currentRound) {
                const prevRoundForPhase =
                    phaseRoundMirrorRef.current ?? effectiveGame.currentRound;
                const dataWithRound = data as TurnRoundData & { currentRound?: GameRound };
                if (dataWithRound.currentRound) {
                    const normalizedRound = normalizeTurnRound(
                        dataWithRound.currentRound,
                        actor,
                        prevRoundForPhase,
                        name
                    );
                    roundToSync = normalizedRound;
                    nextPayload = {
                        ...payload,
                        data: { ...(data as TurnRoundData), currentRound: normalizedRound },
                    };
                } else {
                    if (process.env.NODE_ENV === "development") {
                        console.warn("[addPhaseChangeEvent] turnStart/turnEnd without currentRound, using fallback");
                    }
                    const normalizedRound = applySingleTurnUpdate(
                        prevRoundForPhase,
                        actor,
                        name
                    );
                    roundToSync = normalizedRound;
                    nextPayload = {
                        ...payload,
                        data: { ...(data as TurnRoundData), currentRound: normalizedRound },
                    };
                }
            } else if (name === "init" && effectiveGame?.currentRound) {
                nextPayload = {
                    name: "init",
                    data: effectiveGame.currentRound as unknown as TurnRoundDataWithRound,
                };
            }

            if (roundToSync && updateRuntimeGame) {
                phaseRoundMirrorRef.current = roundToSync;
                updateRuntimeGame((prev) => ({ ...prev, currentRound: roundToSync! }));
            }

            const queue = phaseChangeEventQueueRef.current;
            const evt: TurnBarPhaseEvent = { name, data: nextPayload.data };
            if (options?.unshift) {
                const nextKey = getPhaseEventKey(evt);
                const last = queue[queue.length - 1];
                const lastKey = getPhaseEventKey(last?.phaseChangeEvent);
                if (nextKey !== lastKey) {
                    queue.unshift({ status: 0, phaseChangeEvent: evt });
                }
            } else {
                enqueueIfNotDuplicate(queue, evt);
            }
        },
        [effectiveGame, updateRuntimeGame]
    );

    useEffect(() => {
        if (effectiveGame?.gameId == null || effectiveGame?.gameId === "") {
            initQueuedGameKeyRef.current = null;
        }
    }, [effectiveGame?.gameId]);

    useEffect(() => {
        const gameId = effectiveGame?.gameId;
        if (gameId == null || gameId === "" || !effectiveGame?.currentRound) return;
        const gameKey = String(gameId);
        if (initQueuedGameKeyRef.current === gameKey) return;
        initQueuedGameKeyRef.current = gameKey;
        addPhaseChangeEvent(
            { name: "init", data: effectiveGame.currentRound as unknown as TurnRoundDataWithRound },
            { unshift: true }
        );
    }, [effectiveGame?.gameId, effectiveGame?.currentRound, addPhaseChangeEvent]);

    // ✅ 当前回合活跃角色（命令式设置，确保 phase handler 中即时生效）
    const [activeCharacterKey, setActiveCharacterKey] = useState<string | null>(null);

    // ✅ 兜底同步：当 effectiveGame.currentRound 变化时，根据 status 1 的 turn 推导 activeCharacterKey
    useEffect(() => {
        const round = effectiveGame?.currentRound;
        const turns = round?.turns ?? [];
        const activeTurn = turns.find((t) => (t.status ?? 0) === 1);
        if (!activeTurn || !characters?.length) {
            setActiveCharacterKey(null);
            return;
        }
        const t = activeTurn as { uid?: string; character_id?: string; monsterId?: string; bossId?: string; minionId?: string };
        const activeTurnId = t.character_id ?? t.monsterId ?? t.bossId ?? t.minionId;
        const character = characters.find((c) => (c as { character_id?: string }).character_id === activeTurnId);
        if (character) {
            setActiveCharacterKey(getCharacterKey(character));
        } else {
            setActiveCharacterKey(null);
        }
    }, [effectiveGame?.currentRound, characters]);

    // ✅ 动画中角色（2D/3D 行走等）：key + position 合一，避免动画期间被 React 覆盖 GSAP
    const [animating, setAnimatingState] = useState<{
        key: string;
        position: [number, number, number];
    } | null>(null);
    const setCharacterAnimating = useCallback((key: string | null, position?: [number, number, number]) => {
        if (key === null) {
            setAnimatingState(null);
            return;
        }
        if (position) {
            setAnimatingState({ key, position });
        }
    }, []);
    useEffect(() => () => setAnimatingState(null), []);

    const obstacleSprites: ObstacleSprite[] | undefined = useMemo(() => {
        if (!effectiveGame?.map) return;
        const { obstacles } = effectiveGame.map;
        return obstacles?.map((o: ObstacleCell) => {
            return {
                id: o.id,
                q: o.q,
                r: o.r,
                element: undefined,
            };
        });

    }, [effectiveGame?.map]);

    const value: ICombatContext = {
        game: effectiveGame,
        updateRuntimeGame,
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
        initialPhaseChangesGate,
        gameOverEvent,
        phaseChangeEventQueueRef,
        initQueuedGameKeyRef,
        addPhaseChangeEvent,
        activeCharacterKey,
        setActiveCharacterKey,
        animating,
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


