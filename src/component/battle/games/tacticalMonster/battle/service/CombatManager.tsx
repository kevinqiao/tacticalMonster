/**
 * Tactical Monster 战斗管理器
 * PVE模式：玩家 vs Boss（Boss本体 + 小怪，uid="boss"）
 * 基于 solitaireSolo 的架构模式实现
 */

import { useConvex, useQuery } from "convex/react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../../../convex/tacticalMonster/convex/_generated/api";
import type { GameBoss, GameMonster } from "../../../../../../convex/tacticalMonster/convex/types/monsterTypes";
import { Skill } from "../types/CharacterTypes";
import {
    CombatEvent,
    CombatRound,
    DEFAULT_GAME_CONFIG,
    GameMode,
    GameModel,
    GameReport,
    GridCell,
    ICombatContext,
    MapModel,
    MonsterSprite,
    TacticalMonsterGameConfig
} from "../types/CombatTypes";
import { toMonsterSprite } from "../utils/typeAdapter";
import CombatRuleManager from "./CombatRuleManager";

// 注册 MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);

const defaultRound: CombatRound = {
    no: 0,
    turns: [],
    status: 0
};

export const CombatContext = createContext<ICombatContext>({
    game: null,
    activeSkill: null,
    coordDirection: 0,
    currentRound: defaultRound,
    gameId: null,
    hexCell: { width: 0, height: 0 },
    resourceLoad: { character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 },
    map: { rows: 7, cols: 8 },
    gridCells: null,
    timeClock: 0,
    eventQueue: [],
    ruleManager: null,
    gameReport: null,
    score: 0,
    config: DEFAULT_GAME_CONFIG,
    submitScore: () => null,
    onGameOver: () => null,
    setResourceLoad: () => null,
    changeCell: () => null,
    changeCoordDirection: () => null,
    setActiveSkill: () => null,
    updateGame: () => null,
    mode: 'play'
});

export const useCombatManager = () => {
    const context = useContext(CombatContext);
    if (!context) {
        throw new Error("useCombatManager must be used within a CombatManager");
    }
    return context;
};

interface CombatManagerProps {
    children: ReactNode;
    gameId?: string;
    config?: Partial<TacticalMonsterGameConfig>;
    mode?: GameMode;  // 游戏模式
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

const CombatManager: React.FC<CombatManagerProps> = ({
    children,
    gameId,
    config: customConfig,
    mode = 'play',
    onGameLoadComplete,
    onGameSubmit
}) => {
    const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
    const [coordDirection, setCoordDirection] = useState<number>(0);
    const eventQueueRef: React.MutableRefObject<CombatEvent[]> = useRef<CombatEvent[]>([]);
    const [hexCell, setHexCell] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [gridCells, setGridCells] = useState<GridCell[][] | null>(null);
    const [lastTime, setLastTime] = useState<number | undefined>(undefined);
    const [resourceLoad, setResourceLoad] = useState<{
        character: number;
        gridContainer: number;
        gridGround: number;
        gridWalk: number;
    }>({ character: 0, gridContainer: 0, gridGround: 0, gridWalk: 0 });
    const [game, setGame] = useState<GameModel | null>(null);
    const [gameReport, setGameReport] = useState<GameReport | null>(null);
    const [score, setScore] = useState<number>(0);

    const config = {
        ...DEFAULT_GAME_CONFIG,
        ...customConfig,
        mode: mode || customConfig?.mode || 'play'  // 合并模式配置
    };

    const convex = useConvex();
    const { user } = useUserManager();

    // 查询事件
    const events: any = useQuery(
        api.service.game.gameService.findEvents,
        gameId ? { gameId, lastTime } : "skip"
    );

    // 查询游戏报告
    const report: any = useQuery(
        (api as any).service.game.gameService.findReport,
        gameId ? { gameId } : "skip"
    );

    // 加载游戏
    useEffect(() => {
        if (!gameId) return;

        const fetchGame = async (gameId: string) => {
            console.log("loading game", gameId);
            try {
                const gameObj = await convex.query((api as any).service.game.gameService.loadGame, { gameId });
                if (gameObj?.ok && gameObj.data) {
                    const gameData = gameObj.data;

                    // 将后端Monster转换为前端MonsterSprite
                    // 后端返回的是 GameModel，包含 team (GameMonster[]) 和 boss (GameBoss)
                    const characters: MonsterSprite[] = [];
                    const existingSpritesMap = new Map<string, MonsterSprite>();

                    // 如果有现有的角色，保存它们的UI相关字段
                    if (game?.characters) {
                        game.characters.forEach(char => {
                            existingSpritesMap.set(char.character_id, char);
                        });
                    }

                    // PVE模式：处理玩家队伍
                    if (gameData.team && Array.isArray(gameData.team)) {
                        gameData.team.forEach((monster: GameMonster) => {
                            const existingSprite = existingSpritesMap.get(monster.monsterId);
                            const sprite = toMonsterSprite(monster, existingSprite);
                            // 设置角色翻转方向：玩家角色 scaleX = 1
                            sprite.scaleX = 1;
                            characters.push(sprite);
                        });
                    }

                    // PVE模式：处理Boss（包括Boss本体和小怪，uid="boss"）
                    if (gameData.boss) {
                        const boss = gameData.boss as GameBoss;
                        // Boss本体
                        const existingBossSprite = existingSpritesMap.get(boss.bossId || boss.monsterId);
                        const bossSprite = toMonsterSprite(boss, existingBossSprite);
                        bossSprite.scaleX = -1; // Boss角色 scaleX = -1（面向玩家）
                        characters.push(bossSprite);

                        // Boss的小怪
                        if (boss.minions && Array.isArray(boss.minions)) {
                            boss.minions.forEach((minion: GameMonster) => {
                                const minionId = (minion as any).minionId || minion.monsterId;
                                const existingMinionSprite = existingSpritesMap.get(minionId);
                                const minionSprite = toMonsterSprite(minion, existingMinionSprite);
                                minionSprite.scaleX = -1; // Boss小怪 scaleX = -1（面向玩家）
                                characters.push(minionSprite);
                            });
                        }
                    }

                    // 转换地图数据
                    const mapModel: MapModel = {
                        rows: gameData.map?.rows || 7,
                        cols: gameData.map?.cols || 8,
                        direction: gameData.map?.direction,
                        obstacles: gameData.map?.obstacles?.map((obs: { q: number; r: number }) => ({
                            q: obs.q,
                            r: obs.r,
                            asset: "",
                            walkable: false,
                            type: 1
                        })),
                        disables: gameData.map?.disables || []
                    };

                    setGame({
                        gameId: gameData.gameId,
                        map: mapModel,
                        playerUid: gameData.uid || gameData.playerUid || user?.uid || "",
                        characters,
                        currentRound: gameData.currentRound || defaultRound,
                        timeClock: 0,
                        score: gameData.score || 0
                    });

                    setScore(gameData.score || 0);
                    setLastTime(gameData.lastUpdate ? new Date(gameData.lastUpdate).getTime() : undefined);
                    eventQueueRef.current.push({
                        name: "gameInit",
                        data: gameData,
                        status: 0,
                        gameId,
                        time: Date.now()
                    });

                    onGameLoadComplete?.();
                }
            } catch (error) {
                console.error("Failed to load game", error);
            }
        };

        fetchGame(gameId);
    }, [gameId, convex, onGameLoadComplete, user?.uid]);

    // 处理事件更新（区分乐观事件和真实事件）
    useEffect(() => {
        if (Array.isArray(events) && events.length > 0) {
            events.forEach((backendEvent: any) => {
                // 检查是否是乐观事件的确认
                // 注意：这里需要从 useCombatActHandler 获取 optimisticEventManager
                // 但由于架构限制，我们通过事件数据匹配
                // 实际匹配逻辑在 useCombatActHandler 中处理

                // 对于非乐观事件（阶段事件等），直接添加
                if (!backendEvent.optimistic) {
                    eventQueueRef.current.push(backendEvent);
                }
                // 乐观事件的确认由 useCombatActHandler 处理
            });

            const lastEvent = events[events.length - 1];
            setLastTime(lastEvent.time);
        }
    }, [events]);

    // 处理游戏报告更新
    useEffect(() => {
        if (report?.ok && report.data) {
            setGameReport(report.data);
            if (report.data.totalScore) {
                setScore(report.data.totalScore);
            }
        }
    }, [report]);

    // 提交分数
    const submitScore = useCallback(async (finalScore: number) => {
        if (!gameId) return;
        try {
            await convex.action(api.proxy.controller.submitScore, { gameId, score: finalScore });
            onGameSubmit?.();
        } catch (error) {
            console.error("Failed to submit score", error);
        }
    }, [gameId, convex, onGameSubmit]);

    // 游戏结束回调
    const onGameOver = useCallback(() => {
        if (gameReport) {
            submitScore(gameReport.totalScore);
        }
    }, [gameReport, submitScore]);

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

    const changeCoordDirection = useCallback((direction: number) => {
        console.log("changeCoordDirection", direction);
        if (game?.map) {
            const updatedMap = { ...game.map, direction };
            setGame({ ...game, map: updatedMap });
            eventQueueRef.current.push({
                name: "changeCoordDirection",
                data: updatedMap,
                status: 0,
                gameId: game.gameId,
                time: Date.now()
            });
        }
    }, [game]);

    /**
     * 更新 GameModel（触发重新渲染）
     * 用于延迟更新后通知 React 状态已改变
     */
    const updateGame = useCallback((updater: (game: GameModel) => void) => {
        setGame(prevGame => {
            if (!prevGame) return prevGame;

            // 创建新对象引用，触发 React 重新渲染
            const newGame = { ...prevGame };

            // 执行更新逻辑
            updater(newGame);

            return newGame;
        });
    }, []);

    const { map, playerUid, characters, currentRound, timeClock, score: gameScore } = game || {};

    // 创建规则管理器
    const ruleManager = useMemo(() => {
        if (!game || !gridCells) return null;
        return new CombatRuleManager(game, gridCells, currentRound || null);
    }, [game, gridCells, currentRound]);

    const value: ICombatContext = {
        game,
        activeSkill,
        setActiveSkill,
        coordDirection,
        gameId: gameId || null,
        hexCell,
        map: map || { rows: 7, cols: 8 },
        gridCells,
        playerUid: playerUid || user?.uid || "",
        currentRound: currentRound || defaultRound,
        characters: characters || [],
        timeClock: timeClock || 0,
        eventQueue: eventQueueRef.current,
        ruleManager,
        gameReport,
        score: gameScore || score,
        config,
        submitScore,
        onGameOver,
        resourceLoad,
        setResourceLoad,
        changeCell: setHexCell,
        changeCoordDirection,
        updateGame,
        mode: config.mode || 'play'
    };

    return <CombatContext.Provider value={value}>{children}</CombatContext.Provider>;
};

export default CombatManager;


