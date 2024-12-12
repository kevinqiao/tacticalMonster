import { hexToPixel } from "component/kumu/utils/hexUtil";
import { Spine } from "pixi-spine";
import * as PIXI from "pixi.js";
import React, { useCallback, useEffect, useRef } from "react";
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

const SpineTest = () => {
    const { hexCell } = useCombatManager();
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const containerRef = useRef<PIXI.Container | null>(null);
    const resizeTimeoutRef = useRef<number>();
    const spinesRef = useRef<Map<string, Spine>>(new Map());

    // 清理函数
    const cleanup = useCallback(() => {
        if (containerRef.current) {
            spinesRef.current.forEach(spine => {
                containerRef.current?.removeChild(spine);
                spine.destroy();
            });
            spinesRef.current.clear();
        }
    }, []);

    // 初始化角色
    const initCharacter = useCallback((spine: Spine, data: CharacterData) => {
        if (!containerRef.current) return;

        const bounds = spine.getBounds();
        const baseScale = (hexCell.width * 0.9) / bounds.width;

        spine.scale.set(baseScale);
        spine.pivot.set(bounds.width * baseScale / 2, bounds.height * baseScale / 2);

        const { x, y } = hexToPixel(data.col, data.row, hexCell.width, hexCell.height);
        spine.position.set(
            x + hexCell.width / 1.6,
            y + hexCell.height / 1.2
        );

        spine.state.setAnimation(0, data.animation, true);
        containerRef.current.addChild(spine);
    }, [hexCell]);

    // 清理 PIXI 应用
    const destroyApp = useCallback(() => {
        if (appRef.current) {
            // 移除所有子元素
            appRef.current.stage.removeChildren();
            // 移除视图
            if (appRef.current.view.parentNode) {
                appRef.current.view.parentNode.removeChild(appRef.current.view);
            }
            // 销毁应用
            appRef.current.destroy(false, { children: true, texture: true, baseTexture: true });
            appRef.current = null;
        }
    }, []);

    // 初始化 PIXI 和加载资源
    useEffect(() => {
        if (!canvasRef.current || hexCell.width === 0) return;

        if (resizeTimeoutRef.current) {
            window.clearTimeout(resizeTimeoutRef.current);
        }

        resizeTimeoutRef.current = window.setTimeout(() => {
            // 创建 PIXI 应用
            console.log('create app');
            const app = new PIXI.Application({
                width: canvasRef.current!.offsetWidth,
                height: canvasRef.current!.offsetHeight,
                backgroundAlpha: 0,
                backgroundColor: 0x000000,
                antialias: true,
                resizeTo: canvasRef.current! // 使用 resizeTo 代替手动设置尺寸
            });
            appRef.current = app;
            canvasRef.current!.appendChild(app.view as unknown as Node);

            // 创建容器
            const container = new PIXI.Container();
            containerRef.current = container;
            container.position.set(0, 0);
            app.stage.addChild(container);

            // 加载资源
            (async () => {
                try {
                    await PIXI.Assets.load('/assets/monster_cat/monster_cat.png');
                    await PIXI.Assets.load('/assets/monster_cat/monster_cat.atlas');
                    const spineData = await PIXI.Assets.load('/assets/monster_cat/monster_cat.json');

                    // 创建多个角色
                    CHARACTERS.forEach((charData, index) => {
                        const spine = new Spine(spineData.spineData);
                        const id = `char_${index}`;
                        spinesRef.current.set(id, spine);
                        initCharacter(spine, charData);
                    });
                } catch (error) {
                    console.error('Failed to load spine:', error);
                }
            })();
        }, 200);

        return () => {
            if (resizeTimeoutRef.current) {
                window.clearTimeout(resizeTimeoutRef.current);
            }
            cleanup();
            destroyApp();
        };
    }, [hexCell, cleanup, destroyApp, initCharacter]);

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