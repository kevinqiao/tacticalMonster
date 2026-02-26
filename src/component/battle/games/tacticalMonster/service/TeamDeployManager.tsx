import { BOSS_CONFIGS } from "@/convex/tacticalMonster/convex/data/bossConfigs";
import { useTournamentManager } from "@/service/TournamentManager";
import gsap from "gsap";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { pixelToHex } from "../team/utils/coordinateUtils";
import { clearHighlight, setHighlight } from "../team/utils/dragHighlightUtils";
import { GridCellSprite } from "../types/CombatTypes";
import { Boss, Stage } from "../types/StageTypes";
import { useMapDimension } from "./useMapDimension";
// ============ 类型定义 ============

export interface MapDimension {
    containerWidth: number;
    containerHeight: number;
    width: number;
    height: number;
    hexHeight: number;
    hexWidth: number;
    isPortrait: boolean;  // 是否竖屏
    cols: number;         // 列数（横屏8，竖屏7）
    rows: number;         // 行数（横屏7，竖屏8）
    topOffset?: number;
    leftOffset?: number;
    zoom?: number;
}

export interface TeamContextValue {
    // 状态
    askAddMonster: { q: number, r: number } | null;
    mapDimension: MapDimension | null;
    playerMonsters: { monsterId: string, teamPosition?: { q: number; r: number } }[];
    dragMonster: { monsterId: string, inited: number, teamPosition?: { q: number, r: number }, q: number, r: number } | null;
    groundCells: GridCellSprite[][];
    deployables: { q: number, r: number }[];
    stage: Stage | null;
    boss: Boss | null;

    // Refs
    dragPreviewContainerRef: React.RefObject<HTMLDivElement>;
    candidateContainerRef: React.RefObject<HTMLDivElement>;
    containerRef: React.RefObject<HTMLDivElement>;
    mapContainerRef: React.RefObject<HTMLDivElement>;

    // 方法
    askAdd: (q: number, r: number) => void;
    completeAsk: () => void;
    quitTeam: (monsterId: string) => void;
    selectCanadidate: (monsterId: string) => void;
    startDrag: (monster: { monsterId: string, teamPosition?: { q: number, r: number } }, e: React.DragEvent) => void;
    endDrag: () => void;
    placeMonster: (monsterId: string, teamPosition?: { q: number; r: number }) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    isCellOccupied: (q: number, r: number) => boolean;
    moveMonster: (monsterId: string, logicQ: number, logicR: number) => void;
}

// ============ Context 创建 ============

const TeamContext = createContext<TeamContextValue | null>(null);

// ============ Hook ============

export const useTeamDeployManager = (): TeamContextValue => {
    const context = useContext(TeamContext);
    if (!context) {
        throw new Error("useTeamDeployManager must be used within a TeamDeployProvider");
    }
    return context;
};

// ============ Provider ============

interface TeamProviderProps {
    stage?: Stage | null;
    // onComplete?: () => void;
    children: React.ReactNode;
}

export const TeamDeployProvider: React.FC<TeamProviderProps> = ({ stage, children }) => {
    // Refs
    const candidateContainerRef = useRef<HTMLDivElement | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const dragPreviewContainerRef = useRef<HTMLDivElement | null>(null);

    // 使用 useMapDimension Hook
    const { containerRef, mapDimension } = useMapDimension();

    const [askAddMonster, setAskAddMonster] = useState<{ q: number, r: number } | null>(null);
    const [dragMonster, setDragMonster] = useState<{ monsterId: string, inited: number, teamPosition?: { q: number, r: number }, q: number, r: number } | null>(null);
    const { monsters } = useTournamentManager();
    const [playerMonsters, setPlayerMonsters] = useState<{ monsterId: string, teamPosition?: { q: number; r: number } }[]>([]);

    // 网格数据 - 依赖 mapDimension 中的动态行列
    const groundCells: GridCellSprite[][] = useMemo(() => {
        if (!mapDimension) return [];
        const { rows, cols } = mapDimension;
        return Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => ({
                q: col,
                r: row,
                disable: false
            }))
        );
    }, [mapDimension?.rows, mapDimension?.cols]);

    const deployables: { q: number, r: number }[] = useMemo(() => {
        if (!stage) return [];
        const { q, r } = stage.deployables || { q: 2, r: 6 };
        const deployables: { q: number, r: number }[] = [];

        for (let i = 0; i <= r; i++) {
            for (let j = 0; j <= q; j++) {
                const disable = stage.map.disables?.find((disable) => disable.q === j && disable.r === i);
                if (!disable) deployables.push({
                    q: j,
                    r: i,
                });
            }
        }
        return deployables;
    }, [stage]);
    const boss: Boss | null = useMemo(() => {
        if (!stage) return null;
        const bossConfig = BOSS_CONFIGS[stage.bossId];
        if (!bossConfig) return null;
        const minions = bossConfig.minions?.map((minion) => ({
            minionId: minion.minionId,
            monsterId: minion.monsterId,
            hp: minion.baseHp || 0,
            damage: minion.baseDamage || 0,
            defense: minion.baseDefense || 0,
            speed: minion.baseSpeed || 0,
            skills: minion.skills || [],
            assetPath: minion.assetPath || "",
            position: minion.position || { q: 0, r: 0 },
        }));
        return {
            bossId: stage.bossId,
            monsterId: bossConfig.monsterId,
            name: bossConfig.name,
            assetPath: bossConfig.assetPath,
            skills: bossConfig.skills,
            hp: bossConfig.baseHp || 0,
            damage: bossConfig.baseDamage || 0,
            defense: bossConfig.baseDefense || 0,
            speed: bossConfig.baseSpeed || 0,
            position: bossConfig.position || { q: 0, r: 0 },
            minions: minions || [],
        };

    }, [stage]);

    // ============ 方法 ============

    // 请求添加怪物（坐标统一为逻辑坐标）
    const askAdd = useCallback((q: number, r: number) => {
        setAskAddMonster({ q, r });
    }, []);

    // 完成添加怪物
    const completeAsk = useCallback(() => {
        setAskAddMonster(null);
    }, []);

    // 开始拖拽
    const startDrag = useCallback((monster: { monsterId: string, teamPosition?: { q: number, r: number } }, e: React.DragEvent) => {
        if (!mapDimension) return;
        setDragMonster({ ...monster, inited: 0, q: monster.teamPosition?.q || -1, r: monster.teamPosition?.r || -1 });
        console.log("✅ 开始拖拽:", monster.monsterId);
    }, [mapDimension]);

    // 结束拖拽
    const endDrag = useCallback(() => {
        if (!dragMonster) return;
        gsap.set(dragPreviewContainerRef.current, { autoAlpha: 0 });
        if (dragMonster.q >= 0 && dragMonster.r >= 0) {
            const oldCell = groundCells[dragMonster.r][dragMonster.q] as GridCellSprite;
            clearHighlight(oldCell);
        }
        setDragMonster(null);
    }, [dragMonster, groundCells]);



    // 检查格子是否被占用（坐标统一为逻辑坐标）
    const isCellOccupied = useCallback((q: number, r: number): boolean => {
        // 1. 检查玩家怪物
        for (const monster of playerMonsters.values()) {
            if (!monster.teamPosition) continue;
            if (monster.teamPosition.q === q && monster.teamPosition.r === r) {
                return true;
            }
        }

        // 2. 检查障碍物
        if (stage?.map?.obstacles) {
            for (const obstacle of stage.map.obstacles) {
                if (obstacle.q === q && obstacle.r === r) return true;
            }
        }

        // 3. 检查禁用区域
        if (stage?.map?.disables) {
            for (const disable of stage.map.disables) {
                if (disable.q === q && disable.r === r) return true;
            }
        }

        // 4. 检查 Boss 位置
        if (boss?.position && boss.position.q === q && boss.position.r === r) {
            return true;
        }

        // 5. 检查 Minions 位置
        if (boss?.minions) {
            for (const minion of boss.minions) {
                if (minion.position?.q === q && minion.position?.r === r) return true;
            }
        }

        return false;
    }, [playerMonsters, stage, boss]);

    // 放置怪物（坐标统一为逻辑坐标）
    const placeMonster = useCallback((monsterId: string, position?: { q: number; r: number }) => {
        setPlayerMonsters(prev => {
            if (!monsters) return prev;
            const m = prev.find((p) => p.monsterId === monsterId);
            if (m) {
                m.teamPosition = position;
                const monster = monsters.find((m) => m.monsterId === monsterId);
                if (monster) monster.teamPosition = position;
            } else {
                prev.push({ monsterId, teamPosition: position });
            }
            return [...prev];
        });
    }, [monsters]);
    const selectCanadidate = useCallback((monsterId: string) => {
        if (!askAddMonster || !monsters) {
            console.warn("[TeamDeployManager] selectCanadidate: askAddMonster 或 monsters 为空", { askAddMonster, monsters });
            return;
        }
        setPlayerMonsters(prev => {
            const m = prev.find((p) => p.monsterId === monsterId);
            if (m) {
                const monster = monsters.find((m) => m.monsterId === monsterId);
                // askAddMonster 已经是逻辑坐标，直接使用
                const logicPosition = { q: askAddMonster.q, r: askAddMonster.r };
                if (monster) {
                    monster.teamPosition = logicPosition;
                }
                // teamPosition 应该存储逻辑坐标，不是视图坐标
                m.teamPosition = logicPosition;
                setAskAddMonster(null);
                console.log(`✅ 选择怪物: ${monsterId} 逻辑坐标(${logicPosition.q}, ${logicPosition.r})`);
                console.log("[TeamDeployManager] 更新后的 playerMonsters:", prev.map(p => ({
                    monsterId: p.monsterId,
                    teamPosition: p.teamPosition
                })));
            } else {
                console.warn(`[TeamDeployManager] selectCanadidate: 未找到怪物 ${monsterId}`, { prev });
            }
            return [...prev];
        });
    }, [askAddMonster, monsters]);

    const quitTeam = useCallback((monsterId: string) => {
        console.log("quitTeam", monsterId);
        placeMonster(monsterId, undefined);
    }, [placeMonster]);

    // 移动怪物到新位置（接收逻辑坐标）
    const moveMonster = useCallback((monsterId: string, logicQ: number, logicR: number) => {
        setPlayerMonsters(prev => {
            const updated = prev.map(m => {
                if (m.monsterId === monsterId) {
                    return { ...m, teamPosition: { q: logicQ, r: logicR } };
                }
                return m;
            });
            console.log("[TeamDeployManager] 移动怪物:", monsterId, "到逻辑坐标:", { q: logicQ, r: logicR });
            return updated;
        });
    }, []);

    // 处理拖拽悬停
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "none";

        if (!dragMonster || !mapContainerRef.current || !mapDimension) {
            return;
        }

        // 计算 dropEffect（无论动画状态如何都要执行）
        const rect = mapContainerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const coord = { q: -2, r: -2 };

        if (mx > 0 && mx < rect.width && my > 0 && my < rect.height) {
            const hexCoord = pixelToHex(mx, my, mapDimension);
            if (hexCoord) {
                coord.q = hexCoord.q;
                coord.r = hexCoord.r;
                if (!isCellOccupied(hexCoord.q, hexCoord.r)) {
                    e.dataTransfer.dropEffect = "move";
                }
            }
        }

        // 动画进行中，只更新 dropEffect，不更新 UI
        if (dragMonster.inited === 1) return;

        // 更新拖拽预览位置（预览用屏幕像素，固定世界尺寸时用容器内像素对应的 hex 尺寸）
        if (!dragPreviewContainerRef.current) return;

        const x = e.clientX - mapDimension.hexWidth / 2;
        const y = e.clientY - mapDimension.hexHeight / 2;

        if (dragMonster.inited === 0) {
            dragMonster.inited = 1;
            const tl = gsap.timeline({
                onComplete: () => {
                    dragMonster.inited = 2;
                }
            });
            tl.to(dragPreviewContainerRef.current, {
                autoAlpha: 0,
                x: x,
                y: y,
                duration: 0,
            }).to(dragPreviewContainerRef.current, {
                autoAlpha: 1,
                duration: 0
            }, ">+0.2");
            tl.play();
        } else {
            gsap.set(dragPreviewContainerRef.current, { x: x, y: y, duration: 0 });
        }

        // 更新高亮格子
        if (dragMonster.q !== coord.q || dragMonster.r !== coord.r) {
            // 清除旧的高亮
            if (dragMonster.q >= 0 && dragMonster.r >= 0) {
                const oldCell = groundCells[dragMonster.r][dragMonster.q] as GridCellSprite;
                clearHighlight(oldCell);
            }
            // 更新坐标
            dragMonster.q = coord.q;
            dragMonster.r = coord.r;
            // 设置新的高亮
            if (coord.q >= 0 && coord.r >= 0) {
                const cell = groundCells[coord.r][coord.q] as GridCellSprite;
                setHighlight(cell);
            }
        }
    }, [mapDimension, groundCells, dragMonster, isCellOccupied]);

    // 处理放置
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!dragMonster) return;

        if (dragMonster.q >= 0 && dragMonster.r >= 0) {
            // 放置到地图格子
            if (!isCellOccupied(dragMonster.q, dragMonster.r)) {
                placeMonster(dragMonster.monsterId, { q: dragMonster.q, r: dragMonster.r });
                console.log(`✅ drop: 放置到 (${dragMonster.q}, ${dragMonster.r})`);
            }
        }

        // 清理拖拽状态
        endDrag();
    }, [placeMonster, endDrag, dragMonster, isCellOccupied]);

    // ============ 副作用 ============
    useEffect(() => {
        console.log("[TeamDeployManager] monsters 原始数据:", monsters);
        if (monsters && monsters.length > 0) {
            // 为没有 teamPosition 的怪物分配默认位置（用于测试）
            const mapped = monsters.map((monster, index) => {
                const hasPosition = monster.teamPosition && monster.teamPosition.q !== undefined;
                // 如果没有位置，分配一个测试位置
                const defaultPosition = hasPosition ? monster.teamPosition : { q: index, r: 0 };
                console.log(`[TeamDeployManager] 怪物 ${monster.monsterId}: 原始位置=${JSON.stringify(monster.teamPosition)}, 使用位置=${JSON.stringify(defaultPosition)}`);
                return {
                    monsterId: monster.monsterId,
                    teamPosition: defaultPosition
                };
            });
            console.log("[TeamDeployManager] 初始化 playerMonsters:", mapped);
            setPlayerMonsters(mapped);
        }
    }, [monsters]);

    // ============ Context Value ============

    const value: TeamContextValue = useMemo(() => ({
        // 状态
        mapDimension,
        playerMonsters,
        dragMonster,
        groundCells,
        deployables,
        askAddMonster,
        stage: stage || null,
        boss: boss || null,
        dragPreviewContainerRef,
        candidateContainerRef,
        containerRef,
        mapContainerRef,
        askAdd,
        completeAsk,
        selectCanadidate,
        quitTeam,
        startDrag,
        endDrag,
        placeMonster,
        handleDragOver,
        handleDrop,
        isCellOccupied,
        moveMonster,
    }), [
        mapDimension,
        playerMonsters,
        dragMonster,
        groundCells,
        askAddMonster,
        stage,
        boss,
        quitTeam,
        startDrag,
        endDrag,
        placeMonster,
        handleDragOver,
        handleDrop,
        isCellOccupied,
        moveMonster,
    ]);

    return (
        <TeamContext.Provider value={value}>
            {children}
        </TeamContext.Provider>
    );
};

export default TeamContext;
