import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useEffect, useRef } from "react";
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

// 添加资源加载状态
let spineResources: {
    atlas: any;
    spineData: any;
} | null = null;

// 添加资源加载函数
const loadSpineResources = async () => {
    if (spineResources) return spineResources;

    try {
        const [atlas, spineData] = await Promise.all([
            PIXI.Assets.load('/assets/monster_cat/monster_cat.atlas'),
            PIXI.Assets.load('/assets/monster_cat/monster_cat.json')
        ]);

        if (!atlas || !spineData) {
            throw new Error('Failed to load spine resources');
        }

        spineResources = { atlas, spineData };
        return spineResources;
    } catch (error) {
        console.error('Failed to load spine resources:', error);
        throw error;
    }
};

const SpineTest = () => {
    const { hexCell } = useCombatManager();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const containerRef = useRef<PIXI.Container | null>(null);
    const spinesRef = useRef<Map<string, Spine>>(new Map());

    useEffect(() => {
        if (!canvasRef.current) return;

        // 创建 PIXI 应用
        const app = new PIXI.Application({
            width: canvasRef.current.offsetWidth,
            height: canvasRef.current.offsetHeight,
            backgroundAlpha: 0,
            backgroundColor: 0x000000,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        // 设置视图样式
        const view = app.view as HTMLCanvasElement;
        view.style.width = '100%';
        view.style.height = '100%';
        view.style.position = 'absolute';
        view.style.top = '0';
        view.style.left = '0';
        
        appRef.current = app;
        canvasRef.current.appendChild(view);

        // 创建容器
        const container = new PIXI.Container();
        containerRef.current = container;
        container.position.set(0, 0);
        app.stage.addChild(container);

        // 处理窗口大小变化
        const handleResize = () => {
            if (canvasRef.current && app.renderer) {
                const parent = canvasRef.current;
                app.renderer.resize(parent.offsetWidth, parent.offsetHeight);
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(canvasRef.current);

        // 添加动画
        let time = 0;
        const animate = () => {
            time += 0.05;

            // 移动所有 spine
            spinesRef.current.forEach((spine) => {
                if (spine && spine.parent) {
                    spine.x = spine.x + Math.cos(time) * 0.5;
                }
            });
        };

        app.ticker.add(animate);

        // 修改资源加载和角色创建部分
        (async () => {
            try {
                const resources = await loadSpineResources();

                CHARACTERS.forEach((charData, index) => {
                    try {
                        const spine = new Spine(resources.spineData.spineData);
                        const id = `char_${index}`;
                        spinesRef.current.set(id, spine);

                        // 设置位置和动画
                        const pos = hexToPixel(charData.col, charData.row, hexCell.width, hexCell.height);
                        
                        // 获取spine的边界框来计算合适的缩放比例
                        const bounds = spine.getBounds();
                        const scale = (hexCell.width * 0.6) / bounds.width;
                        
                        spine.scale.set(scale);
                        spine.pivot.set(bounds.width / 2, bounds.height);
                        spine.x = pos.x + hexCell.width / 2;
                        spine.y = pos.y + hexCell.height;
                        
                        spine.state.setAnimation(0, charData.animation, true);
                        spine.visible = true;
                        spine.alpha = 1;
                        spine.zIndex = 1;

                        container.addChild(spine);
                        console.log(`Added spine ${id}:`, {
                            position: { x: spine.x, y: spine.y },
                            scale: spine.scale,
                            bounds: bounds,
                            visible: spine.visible
                        });
                    } catch (error) {
                        console.error(`Failed to create spine ${index}:`, error);
                    }
                });

            } catch (error) {
                console.error('Failed to initialize characters:', error);
            }
        })();

        return () => {
            // 清理时不销毁资源
            resizeObserver.disconnect();
            app.ticker.remove(animate);
            app.destroy(true, {
                children: true,
                texture: false, // 不销毁纹理
                baseTexture: false // 不销毁基础纹理
            });
        };
    }, [hexCell]);

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