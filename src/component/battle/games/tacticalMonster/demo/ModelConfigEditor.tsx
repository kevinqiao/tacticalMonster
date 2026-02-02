/**
 * ModelConfigEditor - 模型配置编辑器组件
 * 用于实时调整模型配置参数并预览效果
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimationExtractionConfig, AnimationSegment, ModelConfig } from "../config/modelConfig";
import "./ModelConfigEditor.css";

interface ModelConfigEditorProps {
    modelPath: string;
    currentConfig: Partial<ModelConfig>;
    onConfigChange: (config: Partial<ModelConfig>) => void;
    onClose?: () => void;
    initialConfig?: Partial<ModelConfig>;
    onPlayAnimation?: (animationName: string) => void;
    onPreviewSegment?: (clipName: string, segmentName: string, start: number, end: number) => void;
}

const ModelConfigEditor: React.FC<ModelConfigEditorProps> = ({
    modelPath,
    currentConfig,
    onConfigChange,
    onClose,
    initialConfig,
    onPlayAnimation,
    onPreviewSegment
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

    // 更新动画片段的时间范围
    const updateSegmentTime = useCallback((
        clipName: string,
        segmentIndex: number,
        field: 'start' | 'end',
        value: number
    ) => {
        setConfig(prevConfig => {
            const newConfig = { ...prevConfig };
            if (!newConfig.animationSegments) {
                newConfig.animationSegments = {};
            }
            if (!newConfig.animationSegments![clipName]) {
                return newConfig;
            }

            const clipConfig = { ...newConfig.animationSegments![clipName] };
            const segments = [...(clipConfig.segments || [])];

            if (segments[segmentIndex]) {
                segments[segmentIndex] = {
                    ...segments[segmentIndex],
                    [field]: Math.max(0, Math.min(value, clipConfig.duration))
                };

                // 确保 start < end
                if (field === 'start' && segments[segmentIndex].start >= segments[segmentIndex].end) {
                    segments[segmentIndex].start = Math.max(0, segments[segmentIndex].end - 0.1);
                } else if (field === 'end' && segments[segmentIndex].end <= segments[segmentIndex].start) {
                    segments[segmentIndex].end = Math.min(clipConfig.duration, segments[segmentIndex].start + 0.1);
                }

                clipConfig.segments = segments;
                newConfig.animationSegments![clipName] = clipConfig;
            }

            return newConfig;
        });
    }, []);

    // 重置为初始配置值
    const handleReset = useCallback(() => {
        console.log('🔄 重置按钮被点击，重置配置为初始值');

        // 如果有初始配置，使用初始配置；否则使用空配置（让模型使用配置文件中的默认值）
        const resetConfig: Partial<ModelConfig> = initialConfig ? { ...initialConfig } : {};

        console.log('重置目标配置:', resetConfig);
        console.log('当前配置:', config);

        // 立即清除防抖定时器
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        // 更新内部状态
        setConfig(resetConfig);

        // 立即更新 refs，避免被 useEffect 覆盖
        const resetConfigString = JSON.stringify(resetConfig);
        lastNotifiedConfigRef.current = resetConfigString;
        lastExternalConfigRef.current = resetConfigString;

        // 设置标志，防止 useEffect 覆盖
        isUpdatingFromExternalRef.current = true;

        // 为了强制触发 Character3D 重新应用配置，即使配置字符串相同
        // 我们先传递一个临时值（带时间戳），然后再传递真正的配置
        // 这样可以确保 Character3D 检测到配置变化并重新应用
        const tempConfig: Partial<ModelConfig> = {
            ...resetConfig,
            // 添加一个临时属性，确保配置字符串不同，触发重新应用
            __resetTrigger: Date.now()
        } as any;

        // 先传递临时配置（带时间戳），触发重新应用
        onConfigChange(tempConfig);

        // 然后立即传递真正的配置（不带时间戳）
        // 使用 setTimeout 确保临时配置先被处理
        setTimeout(() => {
            onConfigChange(resetConfig);

            // 重置标志
            setTimeout(() => {
                isUpdatingFromExternalRef.current = false;
            }, 0);
        }, 100); // 100ms 延迟，确保临时配置先被处理

        console.log('✓ 重置完成，配置已恢复到初始值');
    }, [onConfigChange, initialConfig, config]);

    // 构建配置JSON（导出完整的配置，包括所有配置项）
    const buildConfigJSON = useCallback(() => {
        const modelName = modelPath.split('/').pop()?.replace(/\.(glb|gltf|fbx)$/i, '') || 'model';

        // 构建完整的配置对象（包含所有配置项，不仅是非默认值）
        const configToExport: Partial<ModelConfig> = {};

        // 导出所有配置项，不管是否是默认值
        if (config.scale !== undefined) {
            configToExport.scale = config.scale;
        }
        if (config.mirror !== undefined) {
            configToExport.mirror = config.mirror;
        }
        if (config.rotation) {
            const rotation = config.rotation;
            if (rotation.x !== undefined || rotation.y !== undefined || rotation.z !== undefined) {
                configToExport.rotation = {};
                if (rotation.x !== undefined) configToExport.rotation.x = rotation.x;
                if (rotation.y !== undefined) configToExport.rotation.y = rotation.y;
                if (rotation.z !== undefined) configToExport.rotation.z = rotation.z;
            }
        }
        if (config.positionOffset) {
            const pos = config.positionOffset;
            if (pos.horizontal !== undefined || pos.vertical !== undefined) {
                configToExport.positionOffset = {
                    horizontal: pos.horizontal ?? 0.2,
                    vertical: pos.vertical ?? -5.0
                };
            }
        }
        if (config.camera) {
            const cam = config.camera;
            if (cam.lookAtHeight !== undefined || cam.baseDistanceMultiplier !== undefined) {
                configToExport.camera = {};
                if (cam.lookAtHeight !== undefined) configToExport.camera.lookAtHeight = cam.lookAtHeight;
                if (cam.baseDistanceMultiplier !== undefined) configToExport.camera.baseDistanceMultiplier = cam.baseDistanceMultiplier;
            }
        }
        if (config.animationExtraction) {
            const anim = config.animationExtraction;
            const animationExtraction: Partial<AnimationExtractionConfig> = {};

            if (anim.strategy !== undefined) {
                animationExtraction.strategy = anim.strategy;
            }
            if (anim.useFullClip !== undefined) {
                animationExtraction.useFullClip = anim.useFullClip;
            }
            if (anim.useCachedSegments !== undefined) {
                animationExtraction.useCachedSegments = anim.useCachedSegments;
            }
            if (anim.fps !== undefined) {
                animationExtraction.fps = anim.fps;
            }

            // 添加阈值参数（如果存在）
            if (anim.autoExtractionThresholds) {
                const thresholds = anim.autoExtractionThresholds;
                animationExtraction.autoExtractionThresholds = {
                    minDuration: thresholds.minDuration ?? 5.0,
                    minTracks: thresholds.minTracks ?? 50,
                    defaultStandEnd: thresholds.defaultStandEnd ?? 2.0,
                    defaultStandEndPercent: thresholds.defaultStandEndPercent ?? 0.1,
                    minFrameCount: thresholds.minFrameCount ?? 10
                };
            }

            // 如果至少有一个字段，就添加到配置中
            if (Object.keys(animationExtraction).length > 0) {
                configToExport.animationExtraction = animationExtraction as any;
            }
        }

        // 添加动画片段配置（如果存在）
        if (config.animationSegments && Object.keys(config.animationSegments).length > 0) {
            configToExport.animationSegments = config.animationSegments;
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
                                        fps: config.animationExtraction?.fps,
                                        autoExtractionThresholds: config.animationExtraction?.autoExtractionThresholds
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
                                    fps: parseInt(e.target.value),
                                    autoExtractionThresholds: config.animationExtraction?.autoExtractionThresholds
                                }
                            })}
                        />
                    </div>

                    <div className="config-item">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.animationExtraction?.useCachedSegments ?? true}
                                onChange={(e) => updateConfig({
                                    animationExtraction: {
                                        strategy: config.animationExtraction?.strategy ?? "auto",
                                        useFullClip: config.animationExtraction?.useFullClip ?? false,
                                        useCachedSegments: e.target.checked,
                                        fps: config.animationExtraction?.fps,
                                        autoExtractionThresholds: config.animationExtraction?.autoExtractionThresholds
                                    }
                                })}
                            />
                            <span>Use Cached Segments</span>
                        </label>
                    </div>

                    {/* 自动提取阈值参数 */}
                    <div className="config-subsection">
                        <h5>自动提取阈值参数</h5>

                        <div className="config-item">
                            <label>
                                <span>Min Duration (秒)</span>
                                <span className="value-display">{(config.animationExtraction?.autoExtractionThresholds?.minDuration || 5.0).toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="1.0"
                                max="20.0"
                                step="0.1"
                                value={config.animationExtraction?.autoExtractionThresholds?.minDuration || 5.0}
                                onChange={(e) => updateConfig({
                                    animationExtraction: {
                                        strategy: config.animationExtraction?.strategy ?? "auto",
                                        useFullClip: config.animationExtraction?.useFullClip ?? false,
                                        useCachedSegments: config.animationExtraction?.useCachedSegments ?? true,
                                        fps: config.animationExtraction?.fps,
                                        autoExtractionThresholds: {
                                            minDuration: parseFloat(e.target.value),
                                            minTracks: config.animationExtraction?.autoExtractionThresholds?.minTracks || 50,
                                            defaultStandEnd: config.animationExtraction?.autoExtractionThresholds?.defaultStandEnd || 2.0,
                                            defaultStandEndPercent: config.animationExtraction?.autoExtractionThresholds?.defaultStandEndPercent || 0.1,
                                            minFrameCount: config.animationExtraction?.autoExtractionThresholds?.minFrameCount || 10
                                        }
                                    }
                                })}
                            />
                        </div>

                        <div className="config-item">
                            <label>
                                <span>Min Tracks</span>
                                <span className="value-display">{config.animationExtraction?.autoExtractionThresholds?.minTracks || 50}</span>
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="200"
                                step="1"
                                value={config.animationExtraction?.autoExtractionThresholds?.minTracks || 50}
                                onChange={(e) => updateConfig({
                                    animationExtraction: {
                                        strategy: config.animationExtraction?.strategy ?? "auto",
                                        useFullClip: config.animationExtraction?.useFullClip ?? false,
                                        useCachedSegments: config.animationExtraction?.useCachedSegments ?? true,
                                        fps: config.animationExtraction?.fps,
                                        autoExtractionThresholds: {
                                            minDuration: config.animationExtraction?.autoExtractionThresholds?.minDuration || 5.0,
                                            minTracks: parseInt(e.target.value),
                                            defaultStandEnd: config.animationExtraction?.autoExtractionThresholds?.defaultStandEnd || 2.0,
                                            defaultStandEndPercent: config.animationExtraction?.autoExtractionThresholds?.defaultStandEndPercent || 0.1,
                                            minFrameCount: config.animationExtraction?.autoExtractionThresholds?.minFrameCount || 10
                                        }
                                    }
                                })}
                            />
                        </div>

                        <div className="config-item">
                            <label>
                                <span>Default Stand End (秒)</span>
                                <span className="value-display">{(config.animationExtraction?.autoExtractionThresholds?.defaultStandEnd || 2.0).toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="10.0"
                                step="0.1"
                                value={config.animationExtraction?.autoExtractionThresholds?.defaultStandEnd || 2.0}
                                onChange={(e) => updateConfig({
                                    animationExtraction: {
                                        strategy: config.animationExtraction?.strategy ?? "auto",
                                        useFullClip: config.animationExtraction?.useFullClip ?? false,
                                        useCachedSegments: config.animationExtraction?.useCachedSegments ?? true,
                                        fps: config.animationExtraction?.fps,
                                        autoExtractionThresholds: {
                                            minDuration: config.animationExtraction?.autoExtractionThresholds?.minDuration || 5.0,
                                            minTracks: config.animationExtraction?.autoExtractionThresholds?.minTracks || 50,
                                            defaultStandEnd: parseFloat(e.target.value),
                                            defaultStandEndPercent: config.animationExtraction?.autoExtractionThresholds?.defaultStandEndPercent || 0.1,
                                            minFrameCount: config.animationExtraction?.autoExtractionThresholds?.minFrameCount || 10
                                        }
                                    }
                                })}
                            />
                        </div>

                        <div className="config-item">
                            <label>
                                <span>Default Stand End Percent</span>
                                <span className="value-display">{((config.animationExtraction?.autoExtractionThresholds?.defaultStandEndPercent || 0.1) * 100).toFixed(1)}%</span>
                            </label>
                            <input
                                type="range"
                                min="0.05"
                                max="0.5"
                                step="0.01"
                                value={config.animationExtraction?.autoExtractionThresholds?.defaultStandEndPercent || 0.1}
                                onChange={(e) => updateConfig({
                                    animationExtraction: {
                                        strategy: config.animationExtraction?.strategy ?? "auto",
                                        useFullClip: config.animationExtraction?.useFullClip ?? false,
                                        useCachedSegments: config.animationExtraction?.useCachedSegments ?? true,
                                        fps: config.animationExtraction?.fps,
                                        autoExtractionThresholds: {
                                            minDuration: config.animationExtraction?.autoExtractionThresholds?.minDuration || 5.0,
                                            minTracks: config.animationExtraction?.autoExtractionThresholds?.minTracks || 50,
                                            defaultStandEnd: config.animationExtraction?.autoExtractionThresholds?.defaultStandEnd || 2.0,
                                            defaultStandEndPercent: parseFloat(e.target.value),
                                            minFrameCount: config.animationExtraction?.autoExtractionThresholds?.minFrameCount || 10
                                        }
                                    }
                                })}
                            />
                        </div>

                        <div className="config-item">
                            <label>
                                <span>Min Frame Count</span>
                                <span className="value-display">{config.animationExtraction?.autoExtractionThresholds?.minFrameCount || 10}</span>
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                step="1"
                                value={config.animationExtraction?.autoExtractionThresholds?.minFrameCount || 10}
                                onChange={(e) => updateConfig({
                                    animationExtraction: {
                                        strategy: config.animationExtraction?.strategy ?? "auto",
                                        useFullClip: config.animationExtraction?.useFullClip ?? false,
                                        useCachedSegments: config.animationExtraction?.useCachedSegments ?? true,
                                        fps: config.animationExtraction?.fps,
                                        autoExtractionThresholds: {
                                            minDuration: config.animationExtraction?.autoExtractionThresholds?.minDuration || 5.0,
                                            minTracks: config.animationExtraction?.autoExtractionThresholds?.minTracks || 50,
                                            defaultStandEnd: config.animationExtraction?.autoExtractionThresholds?.defaultStandEnd || 2.0,
                                            defaultStandEndPercent: config.animationExtraction?.autoExtractionThresholds?.defaultStandEndPercent || 0.1,
                                            minFrameCount: parseInt(e.target.value)
                                        }
                                    }
                                })}
                            />
                        </div>
                    </div>

                    {/* 显示已识别的动画片段 */}
                    {config.animationSegments && Object.keys(config.animationSegments).length > 0 && (
                        <div className="config-subsection">
                            <h5>已识别的动画片段</h5>
                            {Object.entries(config.animationSegments).map(([clipName, clipConfig]) => (
                                <div key={clipName} className="animation-segments-display">
                                    <div className="clip-name">{clipName}</div>
                                    <div className="clip-duration">时长: {clipConfig.duration.toFixed(2)}s</div>
                                    {clipConfig.segments && clipConfig.segments.length > 0 ? (
                                        <div className="segments-list">
                                            {clipConfig.segments.map((segment: AnimationSegment, idx: number) => (
                                                <div key={idx} className="segment-item-editable">
                                                    <div className="segment-header">
                                                        <span className="segment-name">{segment.name}</span>
                                                        <div className="segment-actions">
                                                            {onPreviewSegment && (() => {
                                                                // 从当前配置中获取最新的 segment 数据，避免闭包问题
                                                                const currentSegment = config.animationSegments?.[clipName]?.segments?.[idx];
                                                                const currentStart = currentSegment?.start ?? segment.start;
                                                                const currentEnd = currentSegment?.end ?? segment.end;
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        className="preview-segment-button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            // 从当前配置中读取最新值
                                                                            const latestConfig = config;
                                                                            const latestSegment = latestConfig.animationSegments?.[clipName]?.segments?.[idx];
                                                                            if (latestSegment) {
                                                                                onPreviewSegment(clipName, latestSegment.name, latestSegment.start, latestSegment.end);
                                                                            } else {
                                                                                onPreviewSegment(clipName, segment.name, currentStart, currentEnd);
                                                                            }
                                                                        }}
                                                                        title={`预览 ${segment.name} 动画 (${currentStart.toFixed(2)}s - ${currentEnd.toFixed(2)}s)`}
                                                                    >
                                                                        👁️
                                                                    </button>
                                                                );
                                                            })()}
                                                            {onPlayAnimation && (
                                                                <button
                                                                    type="button"
                                                                    className="play-animation-button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        onPlayAnimation(segment.name);
                                                                    }}
                                                                    title={`播放 ${segment.name} 动画`}
                                                                >
                                                                    ▶
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="segment-time-editor">
                                                        <div className="time-input-group">
                                                            <label>开始时间 (s)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                max={clipConfig.duration}
                                                                value={segment.start.toFixed(2)}
                                                                onChange={(e) => {
                                                                    const newStart = parseFloat(e.target.value);
                                                                    if (!isNaN(newStart) && newStart >= 0 && newStart < segment.end) {
                                                                        updateSegmentTime(clipName, idx, 'start', newStart);
                                                                    }
                                                                }}
                                                                className="time-input"
                                                            />
                                                        </div>
                                                        <div className="time-separator">-</div>
                                                        <div className="time-input-group">
                                                            <label>结束时间 (s)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min={segment.start}
                                                                max={clipConfig.duration}
                                                                value={segment.end.toFixed(2)}
                                                                onChange={(e) => {
                                                                    const newEnd = parseFloat(e.target.value);
                                                                    if (!isNaN(newEnd) && newEnd > segment.start && newEnd <= clipConfig.duration) {
                                                                        updateSegmentTime(clipName, idx, 'end', newEnd);
                                                                    }
                                                                }}
                                                                className="time-input"
                                                            />
                                                        </div>
                                                        <div className="segment-duration">
                                                            时长: {(segment.end - segment.start).toFixed(2)}s
                                                        </div>
                                                    </div>
                                                    <div className="segment-confidence">
                                                        置信度: {(segment.confidence * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="no-segments">未识别到片段</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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

