import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useState } from "react";
import { hexToPixel } from "../../utils/hexUtil";
import { useCombatManager } from "../service/CombatManager";
import { GridPosition } from "../types/GridTypes";
import { findPath } from "../utils/PathFind";
import { GridCell } from "../model/CombatModels";

interface CharacterData {
    col: number;
    row: number;
    animation: string;
}

const CHARACTERS: CharacterData[] = [
    { col: 4, row: 4, animation: "melee" },
    { col: 3, row: 3, animation: "stand" },
    { col: 5, row: 3, animation: "stand" }
];



// 修改基准尺寸常量
const BASE_CELL_SIZE = {
    width: 100,
    height: 150
};

// 修改角色更新函数
const updateCharacterPositions = (
    container: PIXI.Container,
    spines: Map<string, Spine>,
    hexCellSize: { width: number; height: number }
) => {
    // 计算缩放系数
    const scaleFactor = Math.min(
        hexCellSize.width / BASE_CELL_SIZE.width,
        hexCellSize.height / BASE_CELL_SIZE.height
    );

    // 使用更小的参考尺寸
    const REFERENCE_SIZE = {
        width: 100,
        height: 150
    };

    CHARACTERS.forEach((charData, index) => {
        const spine = spines.get(`char_${index}`);
        if (!spine) return;

        const pos = hexToPixel(charData.col, charData.row, hexCellSize.width, hexCellSize.height);

        // 进一步减小基础缩放比例
        const baseScale = (BASE_CELL_SIZE.width * 0.2) / REFERENCE_SIZE.width; // 改为0.2倍格子度
        const finalScale = baseScale * scaleFactor;

        spine.scale.set(finalScale);
        spine.pivot.set(REFERENCE_SIZE.width / 2, REFERENCE_SIZE.height);
        spine.x = pos.x + hexCellSize.width / 2;
        spine.y = pos.y + hexCellSize.height / 1.1;
    });
};

// 添加移动函数
const moveSpine = (
    spine: Spine,
    from: { x: number; y: number },
    to: { x: number; y: number },
    app: PIXI.Application,
    onComplete?: () => void
) => {
    let progress = 0;
    const animate = () => {
        progress += 0.02;

        if (progress >= 1) {
            app.ticker.remove(animate);
            spine.state.setAnimation(0, "stand", true);
            onComplete?.();
            return;
        }

        spine.x = from.x + (to.x - from.x) * progress;
        spine.y = from.y + (to.y - from.y) * progress;
    };

    spine.state.setAnimation(0, "walk", true);
    app.ticker.add(animate);
};

// 添加网格配置
const GRID_CONFIG = {
    width: 8,  // 网格宽度
    height: 7  // 网格高度
};

// 修改点击处理函数
const handleGridClick = (
    event: MouseEvent,
    app: PIXI.Application,
    container: PIXI.Container,
    hexCell: { width: number; height: number }
) => {
    // 获取点击的 SVG 元素
    const target = event.target as SVGElement;
    const hexData = target.dataset;

    // 如果击到了六边形格子
    if (hexData.q !== undefined && hexData.r !== undefined) {
        const col = parseInt(hexData.q);
        const row = parseInt(hexData.r);

        // 确保坐标在有效范围内
        if (col >= 0 && col < GRID_CONFIG.width &&
            row >= 0 && row < GRID_CONFIG.height) {
            return { col, row } as GridPosition;
        }
    }

    return null;
};

// 修改移动处理
const moveSpineToGrid = (
    spine: Spine,
    fromGrid: GridPosition,
    toGrid: GridPosition,
    hexCell: { width: number; height: number },
    app: PIXI.Application,
    gridCells: GridCell[][]
) => {
    const path = findPath(gridCells, 
        { x: fromGrid.col, y: fromGrid.row },
        { x: toGrid.col, y: toGrid.row }
    );

    if (!path || path.length === 0) return;

    // 移动到路径上的每个点
    let currentIndex = 0;
    const moveNext = () => {
        if (currentIndex >= path.length - 1) return;

        const currentPos = hexToPixel(path[currentIndex].x, path[currentIndex].y, hexCell.width, hexCell.height);
        const nextPos = hexToPixel(path[currentIndex + 1].x, path[currentIndex + 1].y, hexCell.width, hexCell.height);

        // 设置朝向
        if (path[currentIndex + 1].x < path[currentIndex].x) {
            spine.scale.x = -Math.abs(spine.scale.x);
        } else if (path[currentIndex + 1].x > path[currentIndex].x) {
            spine.scale.x = Math.abs(spine.scale.x);
        }

        moveSpine(
            spine,
            {
                x: currentPos.x + hexCell.width / 2,
                y: currentPos.y + hexCell.height / 1.1
            },
            {
                x: nextPos.x + hexCell.width / 2,
                y: nextPos.y + hexCell.height / 1.1
            },
            app,
            () => {
                currentIndex++;
                if (currentIndex < path.length - 1) {
                    moveNext();
                }
            }
        );
    };

    moveNext();
};

const SpineTest = () => {
    const { hexCell, gridCells } = useCombatManager();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const containerRef = useRef<PIXI.Container | null>(null);
    const spinesRef = useRef<Map<string, Spine>>(new Map());
    const [spineResources, setSpineResources] = useState<{
        atlas: any;
        spineData: any;
    } | null>(null);

    // 添加当前位置状态
    const currentPosRef = useRef({ col: 4, row: 4 }); // 初始位置

    useEffect(() => {
        (async () => {
            if (spineResources) return;
            try {
                const [atlas, spineData] = await Promise.all([
                    PIXI.Assets.load('/assets/monster_cat/monster_cat.atlas'),
                    PIXI.Assets.load('/assets/monster_cat/monster_cat.json')
                ]);

                if (!atlas || !spineData) {
                    throw new Error('Failed to load spine resources');
                }
                setSpineResources({ atlas, spineData });
            } catch (error) {
                console.error('Failed to load spine resources:', error);
                throw error;
            }
        })();
    }, [])
    // 创建 PIXI 应用
    useEffect(() => {
        if (!canvasRef.current) return;

        const app = new PIXI.Application({
            width: canvasRef.current.offsetWidth,
            height: canvasRef.current.offsetHeight,
            backgroundAlpha: 0,
            backgroundColor: 0x000000,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        const view = app.view as HTMLCanvasElement;
        view.style.width = '100%';
        view.style.height = '100%';
        view.style.position = 'absolute';
        view.style.top = '0';
        view.style.left = '0';

        appRef.current = app;
        canvasRef.current.appendChild(view);

        const container = new PIXI.Container();
        containerRef.current = container;
        container.position.set(0, 0);
        app.stage.addChild(container);

        return () => {
            app.destroy(true, {
                children: true,
                texture: false,
                baseTexture: false
            });
        };
    }, []);

    // 处理窗口大小变化
    useEffect(() => {
        if (!canvasRef.current || !appRef.current) return;

        const handleResize = () => {
            const app = appRef.current;
            const container = containerRef.current;
            if (!app?.renderer || !container) return;

            const parent = canvasRef.current;
            if (!parent) return;

            app.renderer.resize(parent.offsetWidth, parent.offsetHeight);
            updateCharacterPositions(container, spinesRef.current, hexCell);
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(canvasRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [hexCell]);

    // 加载和创建角色
    useEffect(() => {
        const app = appRef.current;
        const container = containerRef.current;
        if (!app || !container || !spineResources || !hexCell) return;

        CHARACTERS.forEach((charData, index) => {
            try {
                const spine = new Spine(spineResources.spineData.spineData);
                const id = `char_${index}`;
                spinesRef.current.set(id, spine);

                spine.visible = true;
                spine.alpha = 1;
                spine.zIndex = 1;
                spine.state.setAnimation(0, charData.animation, true);
                container.addChild(spine);
            } catch (error) {
                console.error(`Failed to create spine ${index}:`, error);
            }
        });

        updateCharacterPositions(container, spinesRef.current, hexCell);

        return () => {
            // 理时移除所有spine
            spinesRef.current.forEach(spine => {
                spine.destroy();
            });
            spinesRef.current.clear();
        };
    }, [hexCell, spineResources]);

    // 修改 SpineTest 组件中的点击处理
    useEffect(() => {
        const app = appRef.current;
        const container = containerRef.current;
        if (!app || !container || !gridCells) return;

        const onClick = (event: MouseEvent) => {
            const targetGrid = handleGridClick(event, app, container, hexCell);
            const spine = spinesRef.current.get('char_0');
            if (!spine || !targetGrid) return;

            moveSpineToGrid(
                spine,
                currentPosRef.current,
                targetGrid,
                hexCell,
                app,
                gridCells
            );

            currentPosRef.current = targetGrid;
        };

        canvasRef.current?.addEventListener('click', onClick);
        return () => canvasRef.current?.removeEventListener('click', onClick);
    }, [hexCell, gridCells]);

    return (
        <div
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none' // 改为 auto 以启用点击
            }}
        />
    );
};

export default SpineTest; 