/**
 * ModelConfigEditor - 模型配置编辑器组件
 * 用于实时调整模型配置参数并预览效果
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimationExtractionConfig, ModelConfig, PositionOffsetConfig } from "../battle/config/modelConfig";
import "./ModelConfigEditor.css";

interface ModelConfigEditorProps {
    modelPath: string;
    currentConfig: Partial<ModelConfig>;
    onConfigChange: (config: Partial<ModelConfig>) => void;
    onClose?: () => void;
}

const ModelConfigEditor: React.FC<ModelConfigEditorProps> = ({
    modelPath,
    currentConfig,
    onConfigChange,
    onClose
}) => {
    const [config, setConfig] = useState<Partial<ModelConfig>>(currentConfig);
    const [copySuccess, setCopySuccess] = useState(false);

    // 使用 useRef 跟踪上次从外部接收的配置和上次通知的配置，避免循环更新
    const lastExternalConfigRef = useRef<string>(JSON.stringify(currentConfig));
    const lastNotifiedConfigRef = useRef<string>(JSON.stringify(currentConfig));
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isUpdatingFromExternalRef = useRef(false);

    // 当外部配置变化时同步内部状态（仅在外部配置真正改变时更新）
    useEffect(() => {
        const currentConfigString = JSON.stringify(currentConfig);
        const lastExternal = lastExternalConfigRef.current;

        // 只有在外部配置真的改变且不是我们刚刚通知的变化时才更新
        if (currentConfigString !== lastExternal && currentConfigString !== lastNotifiedConfigRef.current) {
            isUpdatingFromExternalRef.current = true;
            lastExternalConfigRef.current = currentConfigString;
            setConfig(currentConfig);
            // 重置标志（使用 setTimeout 确保在下一个渲染周期重置）
            setTimeout(() => {
                isUpdatingFromExternalRef.current = false;
            }, 0);
        }
    }, [currentConfig]);

    // 使用 useEffect 监听 config 变化并通知父组件（使用防抖避免频繁更新）
    useEffect(() => {
        // 如果是从外部更新引起的，不通知父组件（避免循环）
        if (isUpdatingFromExternalRef.current) {
            return;
        }

        const configString = JSON.stringify(config);
        const lastNotified = lastNotifiedConfigRef.current;

        // 如果配置真的改变了，才通知父组件
        if (configString !== lastNotified) {
            // 清除之前的定时器
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // 使用防抖延迟通知，避免过于频繁的更新
            debounceTimerRef.current = setTimeout(() => {
                lastNotifiedConfigRef.current = configString;
                onConfigChange(config);
            }, 150); // 150ms 防抖
        }

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [config, onConfigChange]);

    // 更新配置的通用方法（只更新本地状态，不直接调用 onConfigChange）
    const updateConfig = useCallback((updates: Partial<ModelConfig>) => {
        setConfig(prev => {
            const newConfig = { ...prev, ...updates };
            // 递归合并嵌套对象
            (Object.keys(updates) as Array<keyof ModelConfig>).forEach(key => {
                const updateValue = updates[key];
                const prevValue = prev[key];
                if (updateValue && typeof updateValue === 'object' && !Array.isArray(updateValue) && prevValue && typeof prevValue === 'object' && !Array.isArray(prevValue)) {
                    (newConfig as any)[key] = { ...prevValue, ...updateValue };
                }
            });
            // 不在这里调用 onConfigChange，让 useEffect 处理
            return newConfig;
        });
    }, []);

    // 重置为默认值（重置为空配置，让模型使用配置文件中的默认值）
    const handleReset = useCallback(() => {
        console.log('重置按钮被点击，重置配置为空对象');
        const emptyConfig: Partial<ModelConfig> = {};
        setConfig(emptyConfig);
        onConfigChange(emptyConfig);
    }, [onConfigChange]);

    // 构建配置JSON
    const buildConfigJSON = useCallback(() => {
        const modelName = modelPath.split('/').pop()?.replace(/\.(glb|gltf|fbx)$/i, '') || 'model';

        // 构建只包含非默认值的配置
        const configToExport: Partial<ModelConfig> = {};

        if (config.scale !== undefined && config.scale !== 1.0) {
            configToExport.scale = config.scale;
        }
        if (config.mirror !== undefined && config.mirror !== false) {
            configToExport.mirror = config.mirror;
        }
        if (config.rotation) {
            const rotation = config.rotation;
            if (rotation.x !== undefined || rotation.y !== undefined || rotation.z !== undefined) {
                configToExport.rotation = {};
                if (rotation.x !== undefined && rotation.x !== 0) configToExport.rotation.x = rotation.x;
                if (rotation.y !== undefined && rotation.y !== Math.PI) configToExport.rotation.y = rotation.y;
                if (rotation.z !== undefined && rotation.z !== 0) configToExport.rotation.z = rotation.z;
                if (Object.keys(configToExport.rotation).length === 0) delete configToExport.rotation;
            }
        }
        if (config.positionOffset) {
            const pos = config.positionOffset;
            const hasCustomHorizontal = pos.horizontal !== undefined && pos.horizontal !== 0.2;
            const hasCustomVertical = pos.vertical !== undefined && pos.vertical !== -5.0;

            if (hasCustomHorizontal || hasCustomVertical) {
                const positionOffset: Partial<PositionOffsetConfig> = {};
                if (hasCustomHorizontal) positionOffset.horizontal = pos.horizontal;
                if (hasCustomVertical) positionOffset.vertical = pos.vertical;
                // 只有当至少有一个值不是默认值时才添加
                if (hasCustomHorizontal || hasCustomVertical) {
                    configToExport.positionOffset = positionOffset as PositionOffsetConfig;
                }
            }
        }
        if (config.camera) {
            const cam = config.camera;
            if (cam.lookAtHeight !== undefined && cam.lookAtHeight !== 0.25 || cam.baseDistanceMultiplier !== undefined && cam.baseDistanceMultiplier !== 2.0) {
                configToExport.camera = {};
                if (cam.lookAtHeight !== undefined && cam.lookAtHeight !== 0.25) configToExport.camera.lookAtHeight = cam.lookAtHeight;
                if (cam.baseDistanceMultiplier !== undefined && cam.baseDistanceMultiplier !== 2.0) configToExport.camera.baseDistanceMultiplier = cam.baseDistanceMultiplier;
                if (Object.keys(configToExport.camera).length === 0) delete configToExport.camera;
            }
        }
        if (config.animationExtraction) {
            const anim = config.animationExtraction;
            const hasCustomStrategy = anim.strategy !== undefined && anim.strategy !== "auto";
            const hasCustomUseFullClip = anim.useFullClip !== undefined && anim.useFullClip !== false;
            const hasCustomFps = anim.fps !== undefined && anim.fps !== 30;

            if (hasCustomStrategy || hasCustomUseFullClip || hasCustomFps) {
                const animationExtraction: Partial<AnimationExtractionConfig> = {};
                if (hasCustomStrategy && anim.strategy !== undefined) animationExtraction.strategy = anim.strategy;
                if (hasCustomUseFullClip && anim.useFullClip !== undefined) animationExtraction.useFullClip = anim.useFullClip;
                if (hasCustomFps && anim.fps !== undefined) animationExtraction.fps = anim.fps;
                // 只有当至少有一个值不是默认值时才添加
                if (hasCustomStrategy || hasCustomUseFullClip || hasCustomFps) {
                    configToExport.animationExtraction = animationExtraction as any;
                }
            }
        }

        const configBlock = {
            [modelPath]: configToExport
        };

        return JSON.stringify(configBlock, null, 2);
    }, [modelPath, config]);

    // 复制到剪贴板
    const handleCopyToClipboard = useCallback(async () => {
        try {
            const jsonString = buildConfigJSON();
            console.log('准备复制JSON:', jsonString);

            // 尝试使用 Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(jsonString);
                console.log('✓ JSON已复制到剪贴板');
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            } else {
                // 降级方案：使用传统方法
                const textArea = document.createElement('textarea');
                textArea.value = jsonString;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        console.log('✓ JSON已复制到剪贴板（降级方案）');
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                    } else {
                        throw new Error('execCommand failed');
                    }
                } catch (err) {
                    console.error('复制失败:', err);
                    alert('复制失败，JSON内容已输出到控制台');
                    console.log('JSON内容:', jsonString);
                }
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('复制失败:', error);
            alert('复制失败，JSON内容已输出到控制台，请手动复制');
            const jsonString = buildConfigJSON();
            console.log('JSON内容:', jsonString);
        }
    }, [buildConfigJSON]);

    // 下载JSON文件
    const handleDownloadJSON = useCallback(() => {
        try {
            const jsonString = buildConfigJSON();
            console.log('准备下载JSON:', jsonString);
            const modelName = modelPath.split('/').pop()?.replace(/\.(glb|gltf|fbx)$/i, '') || 'model';
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `model_config_${modelName}.json`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('✓ JSON文件下载完成');
            }, 100);
        } catch (error) {
            console.error('下载失败:', error);
            alert('下载失败: ' + (error instanceof Error ? error.message : String(error)));
        }
    }, [buildConfigJSON, modelPath]);

    // 弧度转角度
    const radiansToDegrees = (rad: number) => (rad * 180 / Math.PI).toFixed(1);
    // 角度转弧度
    const degreesToRadians = (deg: number) => deg * Math.PI / 180;

    // 使用 ref 直接绑定原生事件
    const resetButtonRef = useRef<HTMLButtonElement>(null);
    const copyButtonRef = useRef<HTMLButtonElement>(null);
    const downloadButtonRef = useRef<HTMLButtonElement>(null);

    // 使用 useEffect 直接绑定原生事件监听器
    useEffect(() => {
        const resetBtn = resetButtonRef.current;
        const copyBtn = copyButtonRef.current;
        const downloadBtn = downloadButtonRef.current;

        const handlers: Array<() => void> = [];

        if (resetBtn) {
            const handleResetClick = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('🟢 原生事件：重置按钮被点击', e);
                handleReset();
            };
            const handleResetMouseDown = (e: MouseEvent) => {
                e.stopPropagation();
                console.log('🟢 原生事件：重置按钮 mousedown');
            };
            resetBtn.addEventListener('click', handleResetClick, true); // 使用捕获阶段
            resetBtn.addEventListener('mousedown', handleResetMouseDown, true);
            handlers.push(() => {
                resetBtn.removeEventListener('click', handleResetClick, true);
                resetBtn.removeEventListener('mousedown', handleResetMouseDown, true);
            });
        }

        if (copyBtn) {
            const handleCopyClick = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('🟢 原生事件：复制按钮被点击', e);
                handleCopyToClipboard();
            };
            const handleCopyMouseDown = (e: MouseEvent) => {
                e.stopPropagation();
                console.log('🟢 原生事件：复制按钮 mousedown');
            };
            copyBtn.addEventListener('click', handleCopyClick, true);
            copyBtn.addEventListener('mousedown', handleCopyMouseDown, true);
            handlers.push(() => {
                copyBtn.removeEventListener('click', handleCopyClick, true);
                copyBtn.removeEventListener('mousedown', handleCopyMouseDown, true);
            });
        }

        if (downloadBtn) {
            const handleDownloadClick = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('🟢 原生事件：下载按钮被点击', e);
                handleDownloadJSON();
            };
            const handleDownloadMouseDown = (e: MouseEvent) => {
                e.stopPropagation();
                console.log('🟢 原生事件：下载按钮 mousedown');
            };
            downloadBtn.addEventListener('click', handleDownloadClick, true);
            downloadBtn.addEventListener('mousedown', handleDownloadMouseDown, true);
            handlers.push(() => {
                downloadBtn.removeEventListener('click', handleDownloadClick, true);
                downloadBtn.removeEventListener('mousedown', handleDownloadMouseDown, true);
            });
        }

        return () => {
            handlers.forEach(cleanup => cleanup());
        };
    }, [handleReset, handleCopyToClipboard, handleDownloadJSON]);

    return (
        <div
            className="model-config-editor"
            onClick={(e) => {
                // 确保编辑器容器不阻止按钮点击
                e.stopPropagation();
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
            }}
        >
            <div className="editor-header">
                <h3>模型配置编辑器</h3>
                {onClose && (
                    <button className="close-button" onClick={onClose}>×</button>
                )}
            </div>

            <div className="editor-content">
                {/* 基础配置 */}
                <div className="config-section">
                    <h4>基础配置</h4>

                    <div className="config-item">
                        <label>
                            <span>Scale</span>
                            <span className="value-display">{(config.scale || 1.0).toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            value={config.scale || 1.0}
                            onChange={(e) => updateConfig({ scale: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div className="config-item">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.mirror || false}
                                onChange={(e) => updateConfig({ mirror: e.target.checked })}
                            />
                            <span>Mirror (水平镜像)</span>
                        </label>
                    </div>

                    <div className="config-item">
                        <label>Rotation X (俯仰角)</label>
                        <div className="rotation-input-group">
                            <input
                                type="range"
                                min={-Math.PI}
                                max={Math.PI}
                                step={0.01}
                                value={config.rotation?.x || 0}
                                onChange={(e) => updateConfig({
                                    rotation: {
                                        ...config.rotation,
                                        x: parseFloat(e.target.value)
                                    }
                                })}
                            />
                            <span className="value-display">
                                {(config.rotation?.x || 0).toFixed(3)} rad ({radiansToDegrees(config.rotation?.x || 0)}°)
                            </span>
                        </div>
                    </div>

                    <div className="config-item">
                        <label>Rotation Y (偏航角)</label>
                        <div className="rotation-input-group">
                            <input
                                type="range"
                                min={-Math.PI}
                                max={Math.PI}
                                step={0.01}
                                value={config.rotation?.y !== undefined ? config.rotation.y : Math.PI}
                                onChange={(e) => updateConfig({
                                    rotation: {
                                        ...config.rotation,
                                        y: parseFloat(e.target.value)
                                    }
                                })}
                            />
                            <span className="value-display">
                                {(config.rotation?.y !== undefined ? config.rotation.y : Math.PI).toFixed(3)} rad ({radiansToDegrees(config.rotation?.y !== undefined ? config.rotation.y : Math.PI)}°)
                            </span>
                        </div>
                    </div>

                    <div className="config-item">
                        <label>Rotation Z (翻滚角)</label>
                        <div className="rotation-input-group">
                            <input
                                type="range"
                                min={-Math.PI}
                                max={Math.PI}
                                step={0.01}
                                value={config.rotation?.z || 0}
                                onChange={(e) => updateConfig({
                                    rotation: {
                                        ...config.rotation,
                                        z: parseFloat(e.target.value)
                                    }
                                })}
                            />
                            <span className="value-display">
                                {(config.rotation?.z || 0).toFixed(3)} rad ({radiansToDegrees(config.rotation?.z || 0)}°)
                            </span>
                        </div>
                    </div>
                </div>

                {/* 位置偏移 */}
                <div className="config-section">
                    <h4>位置偏移</h4>

                    <div className="config-item">
                        <label>
                            <span>Horizontal</span>
                            <span className="value-display">{(config.positionOffset?.horizontal || 0.2).toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            min="-2.0"
                            max="2.0"
                            step="0.1"
                            value={config.positionOffset?.horizontal || 0.2}
                            onChange={(e) => updateConfig({
                                positionOffset: {
                                    horizontal: parseFloat(e.target.value),
                                    vertical: config.positionOffset?.vertical ?? -5.0
                                }
                            })}
                        />
                    </div>

                    <div className="config-item">
                        <label>
                            <span>Vertical</span>
                            <span className="value-display">{(config.positionOffset?.vertical || -5.0).toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            min="-50.0"
                            max="50.0"
                            step="0.5"
                            value={config.positionOffset?.vertical || -5.0}
                            onChange={(e) => updateConfig({
                                positionOffset: {
                                    horizontal: config.positionOffset?.horizontal ?? 0.2,
                                    vertical: parseFloat(e.target.value)
                                }
                            })}
                        />
                    </div>
                </div>

                {/* 相机配置 */}
                <div className="config-section">
                    <h4>相机配置</h4>

                    <div className="config-item">
                        <label>
                            <span>LookAt Height</span>
                            <span className="value-display">{(config.camera?.lookAtHeight || 0.25).toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.01"
                            value={config.camera?.lookAtHeight || 0.25}
                            onChange={(e) => updateConfig({
                                camera: {
                                    ...config.camera,
                                    lookAtHeight: parseFloat(e.target.value)
                                }
                            })}
                        />
                    </div>

                    <div className="config-item">
                        <label>
                            <span>Base Distance Multiplier</span>
                            <span className="value-display">{(config.camera?.baseDistanceMultiplier || 2.0).toFixed(2)}</span>
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="5.0"
                            step="0.1"
                            value={config.camera?.baseDistanceMultiplier || 2.0}
                            onChange={(e) => updateConfig({
                                camera: {
                                    ...config.camera,
                                    baseDistanceMultiplier: parseFloat(e.target.value)
                                }
                            })}
                        />
                    </div>
                </div>

                {/* 动画提取配置 */}
                <div className="config-section">
                    <h4>动画提取配置</h4>

                    <div className="config-item">
                        <label>Strategy</label>
                        <select
                            value={config.animationExtraction?.strategy || "auto"}
                            onChange={(e) => updateConfig({
                                animationExtraction: {
                                    strategy: e.target.value as "auto" | "fullClip" | "manual",
                                    useFullClip: config.animationExtraction?.useFullClip ?? false,
                                    useCachedSegments: config.animationExtraction?.useCachedSegments ?? true,
                                    fps: config.animationExtraction?.fps
                                }
                            })}
                        >
                            <option value="auto">Auto</option>
                            <option value="fullClip">Full Clip</option>
                            <option value="manual">Manual</option>
                        </select>
                    </div>

                    <div className="config-item">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.animationExtraction?.useFullClip || false}
                                onChange={(e) => updateConfig({
                                    animationExtraction: {
                                        strategy: config.animationExtraction?.strategy ?? "auto",
                                        useFullClip: e.target.checked,
                                        useCachedSegments: config.animationExtraction?.useCachedSegments ?? true,
                                        fps: config.animationExtraction?.fps
                                    }
                                })}
                            />
                            <span>Use Full Clip</span>
                        </label>
                    </div>

                    <div className="config-item">
                        <label>
                            <span>FPS</span>
                            <span className="value-display">{config.animationExtraction?.fps || 30}</span>
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="60"
                            step="1"
                            value={config.animationExtraction?.fps || 30}
                            onChange={(e) => updateConfig({
                                animationExtraction: {
                                    strategy: config.animationExtraction?.strategy ?? "auto",
                                    useFullClip: config.animationExtraction?.useFullClip ?? false,
                                    useCachedSegments: config.animationExtraction?.useCachedSegments ?? true,
                                    fps: parseInt(e.target.value)
                                }
                            })}
                        />
                    </div>
                </div>
            </div>

            <div className="editor-footer">

                <button
                    // ref={resetButtonRef}
                    // type="button"
                    className="reset-button"
                    onClick={(e) => {
                        // e.preventDefault();
                        // e.stopPropagation();
                        console.log('🔵 React事件：重置按钮被点击', e);
                        try {
                            handleReset();
                        } catch (error) {
                            console.error('重置失败:', error);
                        }
                    }}

                >
                    重置
                </button>
                <button
                    type="button"
                    className={`copy-button ${copySuccess ? 'success' : ''}`}
                    onClick={(e) => {
                        console.log('🔵 React事件：复制JSON按钮被点击', e);
                        try {
                            handleCopyToClipboard();
                        } catch (error) {
                            console.error('复制失败:', error);
                        }
                    }}

                >
                    {copySuccess ? '✓ 已复制' : '复制JSON'}
                </button>
                <button

                    type="button"
                    className="download-button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔵 React事件：下载JSON按钮被点击', e);
                        try {
                            handleDownloadJSON();
                        } catch (error) {
                            console.error('下载失败:', error);
                        }
                    }}

                >
                    下载JSON
                </button>
            </div>
        </div>
    );
};

export default ModelConfigEditor;

