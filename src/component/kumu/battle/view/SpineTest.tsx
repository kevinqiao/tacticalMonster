import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef, useState } from "react";
import { hexToPixel } from "../../utils/hexUtil";
import { useCombatManager } from "../service/CombatManager";

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
        const baseScale = (BASE_CELL_SIZE.width * 0.2) / REFERENCE_SIZE.width; // 改为0.2倍格子宽度
        const finalScale = baseScale * scaleFactor;

        spine.scale.set(finalScale);
        spine.pivot.set(REFERENCE_SIZE.width / 2, REFERENCE_SIZE.height);
        spine.x = pos.x + hexCellSize.width / 2;
        spine.y = pos.y + hexCellSize.height / 1.1;
    });
};

const SpineTest = () => {
    const { hexCell } = useCombatManager();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const containerRef = useRef<PIXI.Container | null>(null);
    const spinesRef = useRef<Map<string, Spine>>(new Map());
    const [spineResources, setSpineResources] = useState<{
        atlas: any;
        spineData: any;
    } | null>(null);
    
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
            // 清理时移除所有spine
            spinesRef.current.forEach(spine => {
                spine.destroy();
            });
            spinesRef.current.clear();
        };
    }, [hexCell, spineResources]);


    return (
        <div
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none'
            }}
        />
    );
};

export default SpineTest; 