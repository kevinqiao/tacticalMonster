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
    candidates: { monster_id: string }[];
    placedMonsters: { monsterId: string, q: number; r: number }[];
    highlightedCell: { q: number; r: number } | null;
    draggedMonsterId: string | null;
    dragPreviewPosition: { x: number; y: number } | null;
    groundCells: GridCellSprite[][];

    // Refs
    containerRef: React.RefObject<HTMLDivElement>;
    mapContainerRef: React.RefObject<HTMLDivElement>;

    // 方法
    startDrag: (monsterId: string, e: React.DragEvent) => void;
    endDrag: () => void;
    placeMonster: (monsterId: string, q: number, r: number) => void;
    removeCandidate: (monsterId: string) => void;
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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);

    // 状态
    const [mapDimension, setMapDimension] = useState<MapDimension | null>(null);
    const [draggedMonsterId, setDraggedMonsterId] = useState<string | null>(null);
    const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
    const [highlightedCell, setHighlightedCell] = useState<{ q: number; r: number } | null>(null);

    const [candidates, setCandidates] = useState<{ monster_id: string }[]>(() => {
        return Array.from({ length: 7 }, (_, index) => ({
            monster_id: `monster_${index}`,
        }));
    });

    const [placedMonsters, setPlacedMonsters] = useState<{ monsterId: string, q: number; r: number }[]>([]);

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
    const startDrag = useCallback((monsterId: string, e: React.DragEvent) => {
        setDraggedMonsterId(monsterId);
        setDragPreviewPosition({ x: e.clientX, y: e.clientY });
        console.log("✅ 开始拖拽:", monsterId);
    }, []);

    // 结束拖拽
    const endDrag = useCallback(() => {
        setDraggedMonsterId(null);
        setDragPreviewPosition(null);
        setHighlightedCell(null);
    }, []);

    // 移除候选
    const removeCandidate = useCallback((monsterId: string) => {
        setCandidates(prev => prev.filter(c => c.monster_id !== monsterId));
        console.log(`已从候选列表移除: ${monsterId}`);
    }, []);

    // 检查格子是否被占用
    const isCellOccupied = useCallback((q: number, r: number): boolean => {
        for (const pos of placedMonsters.values()) {
            if (pos.q === q && pos.r === r) {
                return true;
            }
        }
        return false;
    }, [placedMonsters]);

    // 放置怪物
    const placeMonster = useCallback((monsterId: string, q: number, r: number) => {
        setPlacedMonsters(prev => {
            const m = prev.find((p) => p.monsterId === monsterId);
            if (m) {
                m.q = q;
                m.r = r;
            } else {
                prev.push({ monsterId, q, r });
            }
            return [...prev];

        });
        console.log(`✅ 放置成功: ${monsterId} 到 (${q}, ${r})`);
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

        // 更新拖拽预览位置
        if (draggedMonsterId) {
            setDragPreviewPosition({ x: e.clientX, y: e.clientY });
        }

        if (!mapContainerRef.current || !mapDimension || !draggedMonsterId) {
            e.dataTransfer.dropEffect = "none";
            setHighlightedCell(null);
            return;
        }

        const rect = mapContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            e.dataTransfer.dropEffect = "none";
            setHighlightedCell(null);
            return;
        }

        const hexCoord = pixelToHex(x, y);

        if (!hexCoord) {
            e.dataTransfer.dropEffect = "none";
            setHighlightedCell(null);
            return;
        }

        if (isCellOccupied(hexCoord.q, hexCoord.r)) {
            e.dataTransfer.dropEffect = "none";
            setHighlightedCell(null);
            return;
        }

        e.dataTransfer.dropEffect = "move";

        setHighlightedCell(prev => {
            if (prev?.q === hexCoord.q && prev?.r === hexCoord.r) {
                return prev;
            }
            return hexCoord;
        });
    }, [mapDimension, pixelToHex, draggedMonsterId, isCellOccupied]);

    // 处理放置
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();

        const monsterId = e.dataTransfer.getData("text/plain");

        if (!monsterId || !highlightedCell) {
            console.log("❌ 放置失败: 无效的 monsterId 或 highlightedCell");
            endDrag();
            return;
        }

        const { q, r } = highlightedCell;
        placeMonster(monsterId, q, r);
        endDrag();
    }, [highlightedCell, placeMonster, endDrag]);

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
        candidates,
        placedMonsters,
        highlightedCell,
        draggedMonsterId,
        dragPreviewPosition,
        groundCells,

        // Refs
        containerRef,
        mapContainerRef,

        // 方法
        startDrag,
        endDrag,
        placeMonster,
        removeCandidate,
        setHighlightedCell,
        isCellOccupied,
        pixelToHex,
        handleDragOver,
        handleDrop,
    }), [
        mapDimension,
        candidates,
        placedMonsters,
        highlightedCell,
        draggedMonsterId,
        dragPreviewPosition,
        groundCells,
        startDrag,
        endDrag,
        placeMonster,
        removeCandidate,
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
