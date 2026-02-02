/**
 * CharacterWalkDemo - 在地图上行走的演示组件
 * 展示角色在六边形地图上的移动功能
 */

import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { calculateHexPoints, pointsToPath } from "../battle/utils/gridUtils";
import { calculateHexDistance } from "../battle/utils/hexUtil";
import { findPath } from "../battle/utils/PathFind";
import Character3D from "../battle/view/Character3D";
import { ModelConfig } from "../config/modelConfig";
import { MapModel, MonsterSprite } from "../types/CombatTypes";
import "./CharacterWalkDemo.css";
import { mockCharacters } from "./mockCharacterData";
import ModelConfigEditor from "./ModelConfigEditor";

const DEMO_MAP: MapModel = {
    rows: 8,
    cols: 8,
    direction: 0,
    obstacles: [
        // 创建一个障碍物区域，形成一道墙
        { q: 4, r: 2, asset: "rock" },
        { q: 4, r: 3, asset: "rock" },
        { q: 4, r: 4, asset: "rock" },
        { q: 4, r: 5, asset: "rock" },
        // 另一个障碍物区域
        { q: 5, r: 1, asset: "rock" },
        { q: 5, r: 2, asset: "rock" },
        { q: 6, r: 3, asset: "rock" },
        { q: 6, r: 4, asset: "rock" },
        // 一些分散的障碍物
        { q: 1, r: 5, asset: "rock" },
        { q: 2, r: 6, asset: "rock" },
        { q: 7, r: 5, asset: "rock" },
    ],
    disables: []
};

interface HexCell {
    q: number;
    r: number;
    x: number;
    y: number;
}

const CharacterWalkDemo: React.FC = () => {
    const [selectedCharacter, setSelectedCharacter] = useState<MonsterSprite>(() => {
        const char = { ...mockCharacters[0] };
        char.q = 2;
        char.r = 2;
        return char;
    });

    const [hexSize, setHexSize] = useState({ width: 60, height: 60 });
    const [mapPosition, setMapPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [isMoving, setIsMoving] = useState(false);
    const [walkPath, setWalkPath] = useState<{ q: number; r: number }[]>([]);
    const [hoveredCell, setHoveredCell] = useState<{ q: number; r: number } | null>(null);
    const [showEditor, setShowEditor] = useState<boolean>(false);
    const [editorConfig, setEditorConfig] = useState<Partial<ModelConfig>>({});
    const initialConfigRef = useRef<Partial<ModelConfig>>({}); // 保存初始配置

    const containerRef = useRef<HTMLDivElement>(null);
    const characterContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const animatorRef = useRef<{ move: () => void; stand: () => void; attack?: () => void; playAnimation?: (name: string) => boolean;[key: string]: any } | null>(null);

    // 计算地图尺寸和位置
    useEffect(() => {
        if (!containerRef.current) return;

        const updateMapSize = () => {
            const container = containerRef.current;
            if (!container) return;

            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight - 100; // 为控制面板留空间

            const { rows, cols } = DEMO_MAP;
            const mapRatio = ((cols + 0.5) * Math.sqrt(3)) / 2 / (2 + ((rows - 1) * 3) / 4);
            const containerRatio = containerWidth / containerHeight;

            let mapWidth: number, mapHeight: number;

            if (mapRatio < containerRatio) {
                mapHeight = containerHeight;
                mapWidth = mapHeight * mapRatio;
            } else {
                mapWidth = containerWidth;
                mapHeight = mapWidth / mapRatio;
            }

            const hexHeight = mapHeight / (2 + ((rows - 1) * 3) / 4);
            const hexWidth = (hexHeight * Math.sqrt(3)) / 2;

            setHexSize({ width: hexWidth, height: hexHeight });

            const actualMapWidth = hexWidth * (cols + 0.5);
            const actualMapHeight = mapHeight;
            const mapLeft = (containerWidth - actualMapWidth) / 2 + hexWidth * 0.25;
            const mapTop = (containerHeight - actualMapHeight) / 2 + 50;

            setMapPosition({
                top: mapTop,
                left: mapLeft,
                width: actualMapWidth,
                height: actualMapHeight
            });
        };

        updateMapSize();
        window.addEventListener("resize", updateMapSize);
        return () => window.removeEventListener("resize", updateMapSize);
    }, []);

    // 生成六边形格子
    const generateHexCells = useCallback((): HexCell[] => {
        const cells: HexCell[] = [];
        const { rows, cols } = DEMO_MAP;

        for (let r = 0; r < rows; r++) {
            for (let q = 0; q < cols; q++) {
                const isOddRow = r % 2 !== 0;
                const offset = isOddRow ? hexSize.width / 2 : 0;
                const x = q * hexSize.width + offset;
                const y = r * hexSize.height * 0.75;

                cells.push({ q, r, x, y });
            }
        }

        return cells;
    }, [hexSize]);

    // 检查是否为障碍物
    const isObstacle = useCallback((q: number, r: number): boolean => {
        return DEMO_MAP.obstacles?.some(obs => obs.q === q && obs.r === r) ?? false;
    }, []);

    // 计算到目标位置的路径
    const calculatePath = useCallback((targetQ: number, targetR: number): { q: number; r: number }[] => {
        if (!selectedCharacter || isMoving) return [];

        const startQ = selectedCharacter.q ?? 0;
        const startR = selectedCharacter.r ?? 0;

        // 创建网格用于路径查找，标记障碍物
        const grid: { walkable?: boolean; x: number; y: number }[][] = Array.from({ length: DEMO_MAP.rows }, (_, r) =>
            Array.from({ length: DEMO_MAP.cols }, (_, q) => ({
                x: q,
                y: r,
                walkable: !isObstacle(q, r)  // 障碍物不可走
            }))
        );

        // 飞行单位可以忽略障碍物，使用直线路径
        const isFlying = selectedCharacter.isFlying ?? false;
        const canIgnoreObstacles = selectedCharacter.canIgnoreObstacles ?? isFlying;

        const path = findPath(
            grid,
            { x: startQ, y: startR },
            { x: targetQ, y: targetR },
            canIgnoreObstacles  // 传递飞行标志
        );

        // 转换为 q, r 格式并过滤掉起点
        return path.slice(1).map(node => ({ q: node.x, r: node.y }));
    }, [selectedCharacter, isMoving, isObstacle]);

    // 渲染单个六边形格子
    const renderHexCell = useCallback((cell: HexCell) => {
        const points = calculateHexPoints(hexSize.width);
        const pathData = pointsToPath(points);
        const isSelected = cell.q === selectedCharacter.q && cell.r === selectedCharacter.r;
        const isObstacleCell = isObstacle(cell.q, cell.r);

        // 计算是否可以移动（距离小于等于移动范围）
        const distance = calculateHexDistance(
            { q: selectedCharacter.q ?? 0, r: selectedCharacter.r ?? 0 },
            { q: cell.q, r: cell.r }
        );

        // 飞行单位可以忽略障碍物
        const isFlying = selectedCharacter.isFlying ?? false;
        const canIgnoreObstacles = selectedCharacter.canIgnoreObstacles ?? isFlying;
        const isInRange = distance <= (selectedCharacter.move_range ?? 3) && !isSelected;
        // 如果格子是障碍物且角色不是飞行单位，则不可走
        const isWalkable = !isMoving && isInRange && (!isObstacleCell || canIgnoreObstacles);

        // 检查是否在路径上
        const isInPath = walkPath.some(p => p.q === cell.q && p.r === cell.r);
        const isPathStart = cell.q === selectedCharacter.q && cell.r === selectedCharacter.r;
        const isPathEnd = walkPath.length > 0 &&
            cell.q === walkPath[walkPath.length - 1].q &&
            cell.r === walkPath[walkPath.length - 1].r;

        // 计算路径颜色
        let fillColor = "rgba(0, 0, 0, 0.3)";
        let strokeColor = "rgba(255, 255, 255, 0.4)";
        let strokeWidth = 2;
        let opacity = 0.4;

        // 障碍物显示为红色/灰色
        if (isObstacleCell) {
            fillColor = "rgba(139, 0, 0, 0.6)";
            strokeColor = "rgba(255, 0, 0, 0.8)";
            strokeWidth = 2;
            opacity = 0.7;
        } else if (isSelected) {
            fillColor = "#4a9eff";
            strokeColor = "#4a9eff";
            strokeWidth = 3;
            opacity = 1;
        } else if (isPathEnd) {
            fillColor = "#ffd700";
            strokeColor = "#ffd700";
            strokeWidth = 3;
            opacity = 0.8;
        } else if (isInPath) {
            fillColor = "rgba(255, 215, 0, 0.5)";
            strokeColor = "#ffd700";
            strokeWidth = 3;
            opacity = 0.7;
        } else if (isInRange) {
            fillColor = "rgba(74, 158, 255, 0.3)";
            strokeColor = "rgba(74, 158, 255, 0.6)";
            opacity = 0.6;
        }

        return (
            <svg
                key={`hex-${cell.q}-${cell.r}`}
                width={hexSize.width}
                height={hexSize.height}
                style={{
                    position: "absolute",
                    left: cell.x,
                    top: cell.y,
                    pointerEvents: isWalkable ? "auto" : "none",
                    cursor: isWalkable ? "pointer" : "default",
                    zIndex: isInPath || isPathEnd ? 1 : 0
                }}
                viewBox={`0 0 ${hexSize.width} ${hexSize.height}`}
                onClick={() => isWalkable && handleCellClick(cell.q, cell.r)}
                onMouseEnter={() => {
                    if (isWalkable && !isMoving) {
                        const path = calculatePath(cell.q, cell.r);
                        setWalkPath(path);
                        setHoveredCell({ q: cell.q, r: cell.r });
                    }
                }}
                onMouseLeave={() => {
                    if (!isMoving) {
                        setWalkPath([]);
                        setHoveredCell(null);
                    }
                }}
            >
                <path
                    d={pathData}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                />
            </svg>
        );
    }, [hexSize, selectedCharacter, isMoving, walkPath, calculatePath, isObstacle]);

    // 处理格子点击
    const handleCellClick = useCallback((q: number, r: number) => {
        if (isMoving || !characterContainerRef.current) return;

        const distance = calculateHexDistance(
            { q: selectedCharacter.q ?? 0, r: selectedCharacter.r ?? 0 },
            { q, r }
        );

        if (distance > (selectedCharacter.move_range ?? 3)) {
            return;
        }

        // 计算路径
        const path = calculatePath(q, r);
        if (path.length === 0) return;

        setIsMoving(true);
        const container = characterContainerRef.current;

        // 播放移动动画
        console.log('CharacterWalkDemo: 准备播放移动动画');
        console.log('selectedCharacter:', selectedCharacter);
        console.log('selectedCharacter.animator:', selectedCharacter.animator);
        console.log('animatorRef.current:', animatorRef.current);

        // 优先使用ref中的animator（通过onAnimatorReady回调设置）
        const animator = animatorRef.current || selectedCharacter.animator;

        console.log('检查animator:');
        console.log('  - animatorRef.current:', animatorRef.current);
        console.log('  - selectedCharacter.animator:', selectedCharacter.animator);
        console.log('  - 最终使用的animator:', animator);
        console.log('  - animator类型:', typeof animator);
        console.log('  - animator.move类型:', typeof animator?.move);

        if (animator && typeof animator.move === 'function') {
            console.log('✓ animator存在且有move方法，准备调用move()');
            try {
                console.log('调用animator.move()...');
                animator.move();
                console.log('✓ move()方法调用成功，已返回');
            } catch (error) {
                console.error('✗ move()方法调用失败:', error);
                console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息');
            }
        } else {
            console.warn('⚠ CharacterWalkDemo: animator不存在或move方法不可用');
            console.warn('  - animatorRef.current:', animatorRef.current);
            console.warn('  - selectedCharacter.animator:', selectedCharacter.animator);
            console.warn('  - selectedCharacter的所有属性:', Object.keys(selectedCharacter));
            if (animator) {
                console.warn('  - animator的方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(animator)));
            }
        }

        // 沿着路径平滑移动（无停顿）
        const timeline = gsap.timeline({
            onComplete: () => {
                // 更新角色位置
                const finalPos = path[path.length - 1];
                setSelectedCharacter(prev => ({
                    ...prev,
                    q: finalPos.q,
                    r: finalPos.r
                }));

                // 播放待机动画（移动完成后）
                console.log('移动完成，准备播放待机动画');
                const animator = animatorRef.current || selectedCharacter.animator;
                if (animator && typeof animator.stand === 'function') {
                    // 延迟一点，确保move动画完全停止
                    setTimeout(() => {
                        animator.stand();
                        console.log('✓ 移动完成后播放待机动画');
                    }, 100);
                }

                setWalkPath([]);
                setIsMoving(false);
            }
        });

        // 从当前位置开始，平滑移动到路径上的每个点
        let currentQ = selectedCharacter.q ?? 0;
        let currentR = selectedCharacter.r ?? 0;

        path.forEach((step, index) => {
            const isOddRow = step.r % 2 !== 0;
            const offset = isOddRow ? hexSize.width / 2 : 0;
            const stepX = step.q * hexSize.width + offset;
            const stepY = step.r * hexSize.height * 0.75;

            const currentIsOddRow = currentR % 2 !== 0;
            const currentOffset = currentIsOddRow ? hexSize.width / 2 : 0;
            const currentX = currentQ * hexSize.width + currentOffset;

            // 更新角色朝向
            const targetScale = stepX > currentX ? 1 : -1;

            // 使用 ">" 让动画紧接着前一个开始，创建平滑连续的效果
            // 完全无缝连接，消除所有停顿
            timeline.to(container, {
                x: stepX,
                y: stepY,
                scaleX: targetScale,
                duration: 0.15,  // 更短的持续时间，让移动更快速流畅
                ease: "linear"  // 使用线性缓动，保持匀速移动
            }, index > 0 ? ">" : 0);  // ">" 表示紧接着前一个动画开始，无延迟无重叠

            currentQ = step.q;
            currentR = step.r;
        });
    }, [selectedCharacter, hexSize, isMoving, calculatePath]);

    // 更新角色位置（初始化时）
    useEffect(() => {
        if (!characterContainerRef.current || hexSize.width === 0 || isMoving) return;

        const q = selectedCharacter.q ?? 0;
        const r = selectedCharacter.r ?? 0;
        const isOddRow = r % 2 !== 0;
        const offset = isOddRow ? hexSize.width / 2 : 0;
        const x = q * hexSize.width + offset;
        const y = r * hexSize.height * 0.75;

        if (characterContainerRef.current) {
            gsap.set(characterContainerRef.current, {
                x,
                y,
                scaleX: selectedCharacter.scaleX ?? 1
            });
        }
    }, [selectedCharacter.q, selectedCharacter.r, selectedCharacter.scaleX, hexSize, isMoving]);

    // 重置角色位置
    const handleReset = useCallback(() => {
        if (isMoving) return;
        const char = { ...mockCharacters[0] };
        char.q = 2;
        char.r = 2;
        char.scaleX = 1;
        setSelectedCharacter(char);
        setWalkPath([]);
        setHoveredCell(null);
    }, [isMoving]);

    // 切换角色
    const handleCharacterChange = useCallback((character: MonsterSprite) => {
        if (isMoving) return;
        const newChar = {
            ...character,
            q: selectedCharacter.q ?? 2,
            r: selectedCharacter.r ?? 2,
            scaleX: selectedCharacter.scaleX ?? 1
        };
        setSelectedCharacter(newChar);
        // 切换角色时重置编辑器配置，避免旧配置应用到新模型
        setEditorConfig({});
    }, [selectedCharacter, isMoving]);

    // 当模型配置加载完成时，更新编辑器配置
    const handleConfigReady = useCallback((config: ModelConfig) => {
        // 保存初始配置（用于重置）
        initialConfigRef.current = { ...config };
        // 更新编辑器配置，无论编辑器是否打开，这样打开编辑器时就能看到正确的初始值
        console.log("✓ 模型配置已加载，更新编辑器配置:", config);
        setEditorConfig({ ...config });
    }, []);

    const hexCells = generateHexCells();

    return (
        <div className="character-walk-demo" ref={containerRef}>
            <div className="demo-header">
                <h2>地图行走演示</h2>
                <button
                    className={`editor-toggle-btn ${showEditor ? 'active' : ''}`}
                    onClick={() => setShowEditor(!showEditor)}
                >
                    {showEditor ? '隐藏配置编辑器' : '显示配置编辑器'}
                </button>
            </div>

            <div className="demo-content">
                {/* 地图区域 */}
                <div
                    className="demo-map-container"
                    ref={mapRef}
                    style={{
                        top: mapPosition.top,
                        left: mapPosition.left,
                        width: mapPosition.width,
                        height: mapPosition.height
                    }}
                >
                    {hexCells.map(cell => renderHexCell(cell))}

                    {/* 角色容器 */}
                    <div
                        ref={characterContainerRef}
                        className="demo-character-container"
                        style={{
                            width: hexSize.width,
                            height: hexSize.height,
                            position: "absolute"
                        }}
                    >
                        <Character3D
                            character={selectedCharacter}
                            width={hexSize.width}
                            height={hexSize.height}
                            overrideConfig={showEditor ? editorConfig : undefined}
                            onAnimatorReady={(animator) => {
                                animatorRef.current = animator;
                                console.log('CharacterWalkDemo: animator已就绪', animator);
                            }}
                            onConfigReady={handleConfigReady}
                        />
                    </div>
                </div>

                {/* 控制面板 */}
                <div className="demo-control-panel">
                    <div className="control-section">
                        <h3>角色选择</h3>
                        <div className="character-selector">
                            {mockCharacters.map((char) => (
                                <button
                                    key={char.character_id}
                                    className={`char-btn ${selectedCharacter.character_id === char.character_id ? 'active' : ''}`}
                                    onClick={() => handleCharacterChange(char)}
                                    disabled={isMoving}
                                >
                                    {char.name || char.character_id}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="control-section">
                        <h3>角色信息</h3>
                        <div className="character-info">
                            <div className="info-item">
                                <label>名称:</label>
                                <span>{selectedCharacter.name || '未知'}</span>
                            </div>
                            <div className="info-item">
                                <label>位置:</label>
                                <span>({selectedCharacter.q}, {selectedCharacter.r})</span>
                            </div>
                            <div className="info-item">
                                <label>移动范围:</label>
                                <span>{selectedCharacter.move_range ?? 3}</span>
                            </div>
                            <div className="info-item">
                                <label>状态:</label>
                                <span>{isMoving ? '移动中...' : '待机'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="control-section">
                        <h3>操作</h3>
                        <button
                            className="reset-btn"
                            onClick={handleReset}
                            disabled={isMoving}
                        >
                            重置位置
                        </button>
                        <div className="hint-text">
                            <p>💡 点击蓝色高亮的格子移动角色</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 配置编辑器面板 */}
            {showEditor && (
                <ModelConfigEditor
                    modelPath={selectedCharacter.assetPath || ''}
                    currentConfig={editorConfig}
                    onConfigChange={setEditorConfig}
                    onClose={() => setShowEditor(false)}
                    initialConfig={initialConfigRef.current}
                    onPlayAnimation={(animationName: string) => {
                        const animator = animatorRef.current;
                        if (animator) {
                            // 优先使用通用的 playAnimation 方法
                            if (typeof animator.playAnimation === 'function') {
                                animator.playAnimation(animationName);
                            }
                            // 如果没有通用方法，尝试调用对应的方法（如 stand, move, attack 等）
                            else if (typeof animator[animationName] === 'function') {
                                animator[animationName]();
                                console.log(`播放动画: ${animationName}`);
                            } else {
                                console.warn(`动画 ${animationName} 不可用，animator 中没有对应的方法`);
                            }
                        } else {
                            console.warn('Animator 不可用，无法播放动画');
                        }
                    }}
                    onPreviewSegment={(clipName: string, segmentName: string, start: number, end: number) => {
                        // 通过自定义事件触发预览
                        const event = new CustomEvent('previewAnimationSegment', {
                            detail: { clipName, segmentName, start, end }
                        });
                        window.dispatchEvent(event);
                        console.log(`预览片段: ${segmentName} (${start.toFixed(2)}s - ${end.toFixed(2)}s) 来自 clip: ${clipName}`);
                    }}
                />
            )}
        </div>
    );
};

export default CharacterWalkDemo;
