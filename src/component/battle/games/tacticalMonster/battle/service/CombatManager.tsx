/**
 * Tactical Monster 战斗管理器
 * 基于 solitaireSolo 的架构模式实现
 */

import { useConvex, useQuery } from "convex/react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../../../convex/tacticalMonster/convex/_generated/api";
import { Skill } from "../types/CharacterTypes";
import {
    CombatEvent,
    CombatRound,
    DEFAULT_GAME_CONFIG,
    GameCharacter,
    GameModel,
    GameReport,
    GridCell,
    ICombatContext,
    MapModel,
    TacticalMonsterGameConfig
} from "../types/CombatTypes";
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
    setActiveSkill: () => null
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
    onGameLoadComplete?: () => void;
    onGameSubmit?: () => void;
}

const CombatManager: React.FC<CombatManagerProps> = ({
    children,
    gameId,
    config: customConfig,
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

    const config = { ...DEFAULT_GAME_CONFIG, ...customConfig };

    const convex = useConvex();
    const { user } = useUserManager();

    // 查询事件
    const events: any = useQuery(
        api.service.gameManager.findEvents,
        gameId ? { gameId, lastTime } : "skip"
    );

    // 查询游戏报告
    const report: any = useQuery(
        api.service.gameManager.findReport,
        gameId ? { gameId } : "skip"
    );

    // 加载游戏
    useEffect(() => {
        if (!gameId) return;

        const fetchGame = async (gameId: string) => {
            console.log("loading game", gameId);
            try {
                const gameObj = await convex.query(api.service.gameManager.loadGame, { gameId });
                if (gameObj?.ok && gameObj.data) {
                    const gameData = gameObj.data;
                    // 设置角色翻转方向：玩家角色 scaleX = 1，AI 敌人 scaleX = -1
                    gameData.characters?.forEach((character: any) => {
                        const c = character as GameCharacter;
                        if (c.uid === gameData.playerUid) {
                            c.scaleX = 1;
                        } else {
                            c.scaleX = -1;
                        }
                    });

                    setGame({
                        gameId: gameData.gameId,
                        map: gameData.map as MapModel,
                        playerUid: gameData.playerUid,
                        characters: gameData.characters || [],
                        currentRound: gameData.currentRound || defaultRound,
                        timeClock: 0,
                        score: gameData.score || 0
                    });

                    setScore(gameData.score || 0);
                    setLastTime(gameData.lastUpdate);
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
    }, [gameId, convex, onGameLoadComplete]);

    // 处理事件更新
    useEffect(() => {
        if (Array.isArray(events) && events.length > 0) {
            eventQueueRef.current.push(...events);
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
        changeCoordDirection
    };

    return <CombatContext.Provider value={value}>{children}</CombatContext.Provider>;
};

export default CombatManager;


