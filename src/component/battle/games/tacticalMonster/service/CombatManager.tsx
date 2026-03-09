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
import type { GameRound, GameTurn } from "../types/gameTypes";
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
    | NonNullable<PhaseChanges["turnEnd"]>

export type TurnRoundDataWithRound = TurnRoundData & {
    /** 由前端 setTurnRound 注入的最新回合快照（用于 UI 同步，如 turnbar） */
    currentRound?: GameRound;
};

export type TurnRoundPayload = {
    name: "roundStart" | "turnStart" | "roundEnd" | "turnEnd" | "init";
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
    turnRound?: TurnRoundPayload;
    setTurnRound: (payload: TurnRoundPayload) => void;
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
    turnRound: undefined,
    setTurnRound: () => { },
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
    const lastSyncedRoundRef = useRef<GameRound | null>(null);
    useEffect(() => {
        const nextId = game?.gameId ?? null;
        if (nextId !== gameIdRef.current) {
            gameIdRef.current = nextId;
            lastSyncedRoundRef.current = null;
            setRuntimeGame(game);
        }
    }, [game, game?.gameId]);
    const effectiveGame = runtimeGame ?? game;
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

    const [turnRound, setTurnRoundState] = useState<TurnRoundPayload | undefined>(undefined);

    const setTurnRound = useCallback((payload: TurnRoundPayload) => {
        if (!effectiveGame) return;
        const { name, data } = payload;
        let nextPayload = payload;
        const actor = ("turn" in data ? data.turn : data) as {
            uid?: string;
            character_id?: string;
            monsterId?: string;
            bossId?: string;
            minionId?: string;
            status?: number;
            order?: number;
        };
        const actorId =
            actor.character_id ??
            actor.monsterId ??
            actor.bossId ??
            actor.minionId;

        // roundStart: 先同步 effectiveGame.currentRound（后端返回的 round.turns 已保证 uid="boss" 时含 bossId 或 minionId）
        if (name === "roundStart" && "round" in data && data.round) {
            const round = data.round as GameRound;
            (effectiveGame as { currentRound?: GameRound }).currentRound = round;
        }

        // turnStart / turnEnd: 同步 effectiveGame.currentRound
        if ((name === "turnStart" || name === "turnEnd") && effectiveGame.currentRound) {
            const dataWithRound = data as TurnRoundData & { currentRound?: GameRound };
            // 固定逻辑：后端每次 turnStart 都带 currentRound，直接整体替换以同步 order（含召唤等）
            if (name === "turnStart" && dataWithRound.currentRound) {
                const activeFromRound = dataWithRound.currentRound.turns.find((t) => (t.status ?? 0) === 1)?.character_id;
                const resolvedActorId =
                    actor.character_id ??
                    activeFromRound ??
                    actor.monsterId ??
                    actor.bossId ??
                    actor.minionId;
                // 后端 turnStart.currentRound 在部分场景不会带完整的 completed(2) 轨迹。
                // 若仍在同一回合，优先保留前端已知的 completed 状态，避免 turnbar 每次“重置”。
                const keepCompletedFromPrev =
                    effectiveGame.currentRound?.no === dataWithRound.currentRound.no;
                const prevCompletedIds = new Set(
                    keepCompletedFromPrev
                        ? (effectiveGame.currentRound?.turns ?? [])
                            .filter((t) => (t.status ?? 0) === 2)
                            .map((t) => t.character_id)
                        : []
                );
                if (keepCompletedFromPrev) {
                    const prevActiveId = (effectiveGame.currentRound?.turns ?? []).find((t) => (t.status ?? 0) === 1)?.character_id;
                    if (prevActiveId && prevActiveId !== resolvedActorId) {
                        prevCompletedIds.add(prevActiveId);
                    }
                }
                let matched = false;
                const normalizedTurns = dataWithRound.currentRound.turns.map((t) => {
                    const isActor =
                        !!resolvedActorId &&
                        t.character_id === resolvedActorId &&
                        (!actor.uid || t.uid === actor.uid);
                    if (isActor) {
                        matched = true;
                        return { ...t, status: 1 };
                    }
                    if (prevCompletedIds.has(t.character_id)) {
                        return { ...t, status: 2 };
                    }
                    // turnStart 场景仅允许一个进行中 turn（仅当能解析到 actorId 时）
                    if ((t.status ?? 0) === 1 && !!resolvedActorId) {
                        return { ...t, status: 0 };
                    }
                    return { ...t };
                });
                if (!matched && resolvedActorId && actor.uid) {
                    normalizedTurns.push({
                        uid: actor.uid,
                        character_id: resolvedActorId,
                        status: 1,
                        order: actor.order ?? (normalizedTurns.length + 1),
                    });
                }
                const normalizedRound: GameRound = {
                    ...dataWithRound.currentRound,
                    turns: normalizedTurns,
                };
                (effectiveGame as { currentRound?: GameRound }).currentRound = normalizedRound;
                nextPayload = {
                    ...payload,
                    data: {
                        ...(data as TurnRoundData),
                        currentRound: normalizedRound,
                    },
                };
            } else {
                // 兼容：无 currentRound 时按单条更新/追加
                const turns = effectiveGame.currentRound.turns;
                let updatedTurns = turns.map((t) => ({ ...t }));
                let turn = actorId ? updatedTurns.find((t) => t.character_id === actorId) : undefined;

                if (name === "turnStart") {
                    // turnStart 场景只允许一个 status=1，先清掉其他进行中 turn
                    updatedTurns = updatedTurns.map((t) => {
                        if ((t.status ?? 0) === 1) return { ...t, status: 0 };
                        return t;
                    });
                    turn = actorId ? updatedTurns.find((t) => t.character_id === actorId) : undefined;

                    if (!turn && actorId && actor.uid) {
                        updatedTurns.push({
                            uid: actor.uid,
                            character_id: actorId,
                            status: 1,
                            order: actor.order ?? (updatedTurns.length + 1),
                        });
                    } else if (turn) {
                        turn.status = 1;
                    }
                } else {
                    if (turn) {
                        turn.status = 2;
                    } else {
                        // turnEnd 常见只带 uid/monsterId，可能无法直接匹配 character_id；
                        // 兜底：将当前进行中的 turn 标记为完成，避免回合轨迹丢失导致 turnbar 重置。
                        const inProgress = updatedTurns.find((t) => (t.status ?? 0) === 1 && (!actor.uid || t.uid === actor.uid));
                        if (inProgress) inProgress.status = 2;
                    }
                }

                (effectiveGame.currentRound as { turns: GameTurn[] }).turns = updatedTurns;

                const currentRoundSnapshot: GameRound = {
                    no: effectiveGame.currentRound.no,
                    turns: updatedTurns.map((t) => ({ ...t })),
                };
                nextPayload = {
                    ...payload,
                    data: {
                        ...(data as TurnRoundData),
                        currentRound: currentRoundSnapshot,
                    },
                };
            }
        }

        setTurnRoundState(nextPayload);
    }, [effectiveGame]);

    // ✅ 当前回合活跃角色（命令式设置，确保 phase handler 中即时生效）
    const [activeCharacterKey, setActiveCharacterKey] = useState<string | null>(null);

    // turnRound.currentRound 是前端动作链里最及时的回合快照（尤其是召唤/插队场景），
    // 通过 updateRuntimeGame 回写到 runtimeGame.currentRound，避免后续消费者读到旧回合。
    useEffect(() => {
        const roundFromTurnRound = (turnRound?.data as any)?.currentRound as GameRound | undefined;
        if (!roundFromTurnRound || roundFromTurnRound === lastSyncedRoundRef.current) return;
        lastSyncedRoundRef.current = roundFromTurnRound;
        updateRuntimeGame((prev) => ({ ...prev, currentRound: roundFromTurnRound }));
    }, [turnRound, updateRuntimeGame]);

    // ✅ 兜底同步：当 turnRound / game.currentRound 变化时，根据 status 1 的 turn 推导 activeCharacterKey，确保高亮不丢失
    useEffect(() => {
        const roundFromTurnRound = (turnRound?.data as any)?.currentRound as GameRound | undefined;
        const round = roundFromTurnRound ?? effectiveGame?.currentRound;
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
    }, [turnRound, effectiveGame?.currentRound, characters]);

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
        turnRound,
        setTurnRound,
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


