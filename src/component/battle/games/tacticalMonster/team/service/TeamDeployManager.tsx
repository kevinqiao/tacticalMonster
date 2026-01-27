import gsap from "gsap";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GridCellSprite } from "../../battle/types/CombatTypes";
import { HexPoint } from "../../battle/types/GridTypes";
import { calculateHexPoints, isPointInHex } from "../../battle/utils/gridUtils";
// ============ 类型定义 ============

export interface MapDimension {
    width: number;
    height: number;
    hexHeight: number;
    hexWidth: number;
}

export interface TeamContextValue {
    // 状态
    mapDimension: MapDimension | null;
    // candidates: { monster_id: string }[];
    monsters: { monsterId: string, teamPosition?: { q: number; r: number } }[];
    highlightedCell: { q: number; r: number } | null;
    dragMonster: { monsterId: string, inited: number, teamPosition?: { q: number, r: number }, q: number, r: number } | null;
    // dragPreviewPosition: { x: number; y: number } | null;
    groundCells: GridCellSprite[][];

    // Refs
    dragPreviewContainerRef: React.RefObject<HTMLDivElement>;
    candidateContainerRef: React.RefObject<HTMLDivElement>;
    containerRef: React.RefObject<HTMLDivElement>;
    mapContainerRef: React.RefObject<HTMLDivElement>;

    // 方法
    startDrag: (monster: { monsterId: string, teamPosition?: { q: number, r: number } }, e: React.DragEvent) => void;
    endDrag: () => void;
    placeMonster: (monsterId: string, teamPosition?: { q: number; r: number }) => void;
    // leaveTeam: (monsterId: string) => void;
    setHighlightedCell: (cell: { q: number; r: number } | null) => void;
    isCellOccupied: (q: number, r: number) => boolean;
    pixelToHex: (x: number, y: number) => { q: number; r: number } | null;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
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
    stageId?: string | null;
    onComplete?: () => void;
    children: React.ReactNode;
}

export const TeamDeployProvider: React.FC<TeamProviderProps> = ({ stageId, onComplete, children }) => {
    // Refs
    const candidateContainerRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const dragPreviewContainerRef = useRef<HTMLDivElement | null>(null);

    // 状态
    const [mapDimension, setMapDimension] = useState<MapDimension | null>(null);
    const [dragMonster, setDragMonster] = useState<{ monsterId: string, inited: number, teamPosition?: { q: number, r: number }, q: number, r: number } | null>(null);
    // const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
    const [highlightedCell, setHighlightedCell] = useState<{ q: number; r: number } | null>(null);
    const [monsters, setMonsters] = useState<{ monsterId: string, teamPosition?: { q: number; r: number } }[]>(() => {
        return Array.from({ length: 7 }, (_, index) => ({
            monsterId: `monster_${index}`,
        }));
    });

    // 网格数据
    const groundCells: GridCellSprite[][] = useMemo(() => {
        return Array.from({ length: 7 }, (_, row) =>
            Array.from({ length: 8 }, (_, col) => ({
                q: col,
                r: row,
                disable: false
            }))
        );
    }, []);

    // ============ 方法 ============

    // 开始拖拽
    const startDrag = useCallback((monster: { monsterId: string, teamPosition?: { q: number, r: number } }, e: React.DragEvent) => {
        if (!mapDimension) return;
        setDragMonster({ ...monster, inited: 0, q: monster.teamPosition?.q || -1, r: monster.teamPosition?.r || -1 });
        console.log("✅ 开始拖拽:", monster.monsterId);
    }, [mapDimension]);

    // 结束拖拽
    const endDrag = useCallback(() => {
        setDragMonster(null);
        // setDragPreviewPosition(null);
        gsap.set(dragPreviewContainerRef.current, { autoAlpha: 0 });
        // setHighlightedCell(null);
    }, [dragPreviewContainerRef]);



    // 检查格子是否被占用
    const isCellOccupied = useCallback((q: number, r: number): boolean => {
        for (const pos of monsters.values()) {
            if (pos.teamPosition?.q === q && pos.teamPosition?.r === r) {
                return true;
            }
        }
        return false;
    }, [monsters]);

    // 放置怪物
    const placeMonster = useCallback((monsterId: string, teamPosition?: { q: number; r: number }) => {
        setMonsters(prev => {
            const m = prev.find((p) => p.monsterId === monsterId);
            if (m) {
                m.teamPosition = teamPosition;
            } else {
                prev.push({ monsterId, teamPosition });
            }
            return [...prev];

        });
        console.log(`✅ 放置成功: ${monsterId} 到 (${teamPosition?.q}, ${teamPosition?.r})`);
    }, []);

    // 像素坐标转六边形坐标
    const pixelToHex = useCallback((x: number, y: number): { q: number; r: number } | null => {
        if (!mapDimension) return null;

        const { hexWidth, hexHeight } = mapDimension;

        const r = Math.round(y / (hexHeight * 0.75));
        if (r < 0 || r >= 7) return null;

        const isOddRow = r % 2 !== 0;
        const colOffset = isOddRow ? hexWidth / 2 : 0;
        const q = Math.floor((x - colOffset) / hexWidth);
        if (q < 0 || q >= 8) return null;

        const hexPoints = calculateHexPoints(hexWidth);
        const mousePoint: HexPoint = { x, y };

        const neighbors: Array<{ dq: number; dr: number }> = isOddRow
            ? [
                { dq: 0, dr: 0 },
                { dq: 1, dr: 0 },
                { dq: 1, dr: 1 },
                { dq: 0, dr: 1 },
                { dq: -1, dr: 0 },
                { dq: 0, dr: -1 },
                { dq: 1, dr: -1 },
            ]
            : [
                { dq: 0, dr: 0 },
                { dq: 1, dr: 0 },
                { dq: 0, dr: 1 },
                { dq: -1, dr: 1 },
                { dq: -1, dr: 0 },
                { dq: -1, dr: -1 },
                { dq: 0, dr: -1 },
            ];

        for (const { dq, dr } of neighbors) {
            const testQ = q + dq;
            const testR = r + dr;

            if (testQ < 0 || testQ >= 8 || testR < 0 || testR >= 7) {
                continue;
            }

            const testIsOddRow = testR % 2 !== 0;
            const testColOffset = testIsOddRow ? hexWidth / 2 : 0;
            const hexLeftX = testQ * hexWidth + testColOffset;
            const hexTopY = testR * hexHeight * 0.75;

            const worldHexPoints: HexPoint[] = hexPoints.map(point => ({
                x: hexLeftX + point.x,
                y: hexTopY + point.y,
            }));

            if (isPointInHex(mousePoint, worldHexPoints)) {
                return { q: testQ, r: testR };
            }
        }

        return null;
    }, [mapDimension]);

    // 处理拖拽悬停
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();

        // 默认不允许放置
        e.dataTransfer.dropEffect = "none";

        if (!dragMonster) return;

        // 检查必要的 refs
        if (!candidateContainerRef.current || !mapContainerRef.current || !mapDimension) {
            return;
        }

        // ============ 计算 dropEffect（无论动画状态如何都要执行）============
        const coord = { q: -2, r: -2 };
        const candidateRect = candidateContainerRef.current.getBoundingClientRect();
        const cx = e.clientX - candidateRect.left;
        const cy = e.clientY - candidateRect.top;

        if (cx >= 0 && cx < candidateRect.width && cy >= 0 && cy < candidateRect.height) {
            // 鼠标在候选区域内
            coord.q = -1;
            coord.r = -1;
            if (dragMonster.teamPosition) {
                e.dataTransfer.dropEffect = "move";
                console.log("🟢 dragover: 候选区域, dropEffect=move");
            }
        } else {
            // 鼠标在地图区域
            const rect = mapContainerRef.current.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            if (mx > 0 && mx < rect.width && my > 0 && my < rect.height) {
                const hexCoord = pixelToHex(mx, my);
                if (hexCoord) {
                    coord.q = hexCoord.q;
                    coord.r = hexCoord.r;
                    const occupied = isCellOccupied(hexCoord.q, hexCoord.r);
                    if (!occupied) {
                        e.dataTransfer.dropEffect = "move";
                    }
                }
            }
        }

        // ============ 动画进行中，只更新 dropEffect，不更新 UI ============
        if (dragMonster.inited === 1) return;

        // ============ 更新拖拽预览位置 ============
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

        // ============ 更新高亮格子 ============
        if (dragMonster.q !== coord.q || dragMonster.r !== coord.r) {
            // 清除旧的高亮
            if (dragMonster.q >= 0 && dragMonster.r >= 0) {
                const oldCell = groundCells[dragMonster.r][dragMonster.q] as GridCellSprite;
                if (oldCell.element) {
                    oldCell.element.style.fill = "black";
                    oldCell.element.style.stroke = "white";
                    oldCell.element.style.strokeWidth = "4";
                    oldCell.element.style.opacity = "0.6";
                }
            }
            // 更新坐标
            dragMonster.q = coord.q;
            dragMonster.r = coord.r;
            // 设置新的高亮
            if (coord.q >= 0 && coord.r >= 0) {
                const cell = groundCells[dragMonster.r][dragMonster.q] as GridCellSprite;
                if (cell.element) {
                    cell.element.style.fill = "rgba(0, 255, 0, 0.5)";
                    cell.element.style.stroke = "yellow";
                    cell.element.style.strokeWidth = "6";
                    cell.element.style.opacity = "0.8";
                }
            }
        }
    }, [mapDimension, pixelToHex, groundCells, dragMonster, isCellOccupied]);

    // 处理放置
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!dragMonster) return;

        // 不依赖 dropEffect，自己判断是否是有效放置
        if (dragMonster.q === -1 && dragMonster.r === -1) {
            // 放回候选区域（从地图移除）
            if (dragMonster.teamPosition) {
                placeMonster(dragMonster.monsterId, undefined);
                console.log("✅ drop: 移回候选区域");
            }
        } else if (dragMonster.q >= 0 && dragMonster.r >= 0) {
            // 放置到地图格子
            if (!isCellOccupied(dragMonster.q, dragMonster.r)) {
                placeMonster(dragMonster.monsterId, { q: dragMonster.q, r: dragMonster.r });
                console.log(`✅ drop: 放置到 (${dragMonster.q}, ${dragMonster.r})`);
            }
        }

        // 清理拖拽状态
        endDrag();
    }, [placeMonster, endDrag, dragMonster, isCellOccupied]);

    // ============ 副作用：计算地图尺寸 ============

    useEffect(() => {
        const cols = 8;
        const rows = 7;
        const mapRatio = ((cols + 2.5) * Math.sqrt(3)) / 2 / (1 + ((rows - 1) * 3) / 4);

        const updateMap = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;
                const containerRatio = containerWidth / containerHeight;

                let mapSize: { width: number; height: number } = { width: 0, height: 0 };
                let hexHeight: number;
                let hexWidth: number;

                if (mapRatio < containerRatio) {
                    hexHeight = containerHeight / (1 + ((rows - 1) * 3) / 4);
                    hexWidth = (hexHeight * Math.sqrt(3)) / 2;
                    mapSize.width = hexWidth * (cols + 2.5);
                    mapSize.height = mapSize.width / mapRatio;
                } else {
                    mapSize.width = containerWidth;
                    mapSize.height = mapSize.width / mapRatio;
                    hexWidth = mapSize.width / (cols + 2.5);
                    hexHeight = (hexWidth * 2) / Math.sqrt(3);
                }

                setMapDimension({
                    width: mapSize.width,
                    height: mapSize.height,
                    hexHeight,
                    hexWidth
                });
            }
        };

        updateMap();

        const resizeObserver = new ResizeObserver(() => {
            updateMap();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // ============ Context Value ============

    const value: TeamContextValue = useMemo(() => ({
        // 状态
        mapDimension,
        monsters,
        highlightedCell,
        dragMonster,
        // dragPreviewPosition,
        groundCells,

        // Refs
        dragPreviewContainerRef,
        candidateContainerRef,
        containerRef,
        mapContainerRef,

        // 方法
        startDrag,
        endDrag,
        placeMonster,
        setHighlightedCell,
        isCellOccupied,
        pixelToHex,
        handleDragOver,
        handleDrop,
    }), [
        mapDimension,
        monsters,
        highlightedCell,
        dragMonster,
        // dragPreviewPosition,
        groundCells,
        startDrag,
        endDrag,
        placeMonster,
        isCellOccupied,
        pixelToHex,
        handleDragOver,
        handleDrop,
    ]);

    return (
        <TeamContext.Provider value={value}>
            {children}
        </TeamContext.Provider>
    );
};

export default TeamContext;
