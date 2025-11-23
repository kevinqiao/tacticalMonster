/**
 * 模型配置管理系统
 * 统一管理每个角色模型的配置：动画片段、提取参数、尺寸、位置、相机等
 */

/**
 * 动画片段
 */
export interface AnimationSegment {
    name: string;  // 片段名称：'stand', 'move', 'attack'等
    start: number;  // 开始时间（秒）
    end: number;    // 结束时间（秒）
    confidence: number;  // 置信度（0-1）
}

/**
 * 动画提取阈值配置
 */
export interface AutoExtractionThresholds {
    minDuration: number;  // 判断为长动画的最小时长（默认5.0秒）
    minTracks: number;    // 判断为复杂动画的最小轨道数（默认50）
    defaultStandEnd: number;  // 默认stand片段结束时间（默认2.0秒）
    defaultStandEndPercent: number;  // 默认stand片段结束时间百分比（默认0.1，即10%）
    minFrameCount: number;  // subclip提取的最小帧数（默认10帧）
}

/**
 * 动画提取配置
 */
export interface AnimationExtractionConfig {
    strategy: "auto" | "fullClip" | "manual";  // 提取策略
    useFullClip: boolean;  // 是否使用完整clip（不提取片段）
    useCachedSegments: boolean;  // 是否使用缓存的片段分析结果
    fps?: number;  // 动画帧率（用于subclip提取，默认30）
    autoExtractionThresholds?: AutoExtractionThresholds;  // 自动提取的阈值参数
}

/**
 * 位置偏移配置
 */
export interface PositionOffsetConfig {
    horizontal: number;  // 水平偏移（相对于宽度的比例，默认0.2）
    vertical: number;    // 垂直偏移（Y轴偏移，默认-5.0）
}

/**
 * 旋转配置（欧拉角，单位：弧度）
 */
export interface RotationConfig {
    x?: number;  // X轴旋转（俯仰角，默认0）
    y?: number;  // Y轴旋转（偏航角，默认Math.PI，即180度，用于面向相机）
    z?: number;  // Z轴旋转（翻滚角，默认0）
}

/**
 * 相机位置配置（可选，用于绝对定位）
 */
export interface CameraPosition {
    x?: number;
    y?: number;
    z?: number;
}

/**
 * 相机配置
 */
export interface CameraConfig {
    lookAtHeight?: number;  // lookAt相对于模型中心的高度偏移（默认0.25，即模型高度的25%）
    baseDistanceMultiplier?: number;  // 基础距离倍数（默认2.0）
    position?: CameraPosition;  // 相机绝对位置（可选，如果设置则覆盖自动计算）
    lookAt?: CameraPosition;  // 相机看向的绝对位置（可选，如果设置则覆盖自动计算）
}

/**
 * 动画片段时间段配置
 */
export interface AnimationSegmentClipConfig {
    duration: number;  // clip的总时长（秒），用于验证配置是否匹配
    segments: AnimationSegment[];  // 识别到的动画片段数组
}

/**
 * 单个模型的完整配置
 */
export interface ModelConfig {
    scale?: number;  // 模型尺寸调整倍数
    mirror?: boolean;  // 是否水平镜像（翻转）模型（默认false）
    rotation?: RotationConfig;  // 模型旋转（欧拉角，单位：弧度）
    animationExtraction?: AnimationExtractionConfig;  // 动画提取策略和参数
    positionOffset?: PositionOffsetConfig;  // 位置偏移
    camera?: CameraConfig;  // 相机配置
    animationSegments?: {  // 动画片段时间段配置（合并自 animation_segments.json）
        [clipName: string]: AnimationSegmentClipConfig;
    };
}

/**
 * 完整配置文件结构
 */
export interface ModelConfigFile {
    version: string;  // 配置文件版本号
    default: ModelConfig;  // 默认配置
    models: {  // 每个模型的特定配置
        [modelPath: string]: ModelConfig;
    };
}

/**
 * 全局配置缓存（避免重复加载）
 */
let globalModelConfig: ModelConfigFile | null = null;
let configLoadPromise: Promise<ModelConfigFile | null> | null = null;

/**
 * 深合并对象
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = result[key];

            if (
                sourceValue !== null &&
                typeof sourceValue === 'object' &&
                !Array.isArray(sourceValue) &&
                targetValue !== null &&
                typeof targetValue === 'object' &&
                !Array.isArray(targetValue)
            ) {
                // 递归合并对象
                result[key] = deepMerge(targetValue, sourceValue);
            } else if (sourceValue !== undefined) {
                // 覆盖或新增属性（明确的值会覆盖默认值，包括 null）
                result[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }
    }

    return result;
}

/**
 * 从JSON配置文件加载模型配置
 */
/**
 * 清除配置缓存（用于开发时强制重新加载）
 */
export function clearModelConfigCache(): void {
    globalModelConfig = null;
    configLoadPromise = null;
    console.log('✓ 已清除模型配置缓存');
}

async function loadModelConfigFromFile(forceReload: boolean = false): Promise<ModelConfigFile | null> {
    // 如果强制重新加载，清除缓存
    if (forceReload) {
        globalModelConfig = null;
        configLoadPromise = null;
        console.log('✓ 强制重新加载模型配置，已清除缓存');
    }

    // 如果已经加载过且不需要强制重新加载，直接返回
    if (globalModelConfig && !forceReload) {
        console.log('使用已缓存的模型配置');
        return globalModelConfig;
    }

    // 如果正在加载，等待加载完成（除非强制重新加载）
    if (configLoadPromise && !forceReload) {
        console.log('配置正在加载中，等待加载完成...');
        return configLoadPromise;
    }

    // 开始加载配置（添加时间戳防止浏览器缓存，开发环境或强制重新加载时总是重新加载）
    const isDev = process.env.NODE_ENV === 'development';
    const cacheBuster = (isDev || forceReload) ? `?t=${Date.now()}` : '';
    const configUrl = '/assets/3d/characters/model_config.json' + cacheBuster;
    console.log('开始加载模型配置文件:', configUrl, forceReload ? '(强制重新加载)' : '');

    configLoadPromise = fetch(configUrl, {
        cache: (forceReload || isDev) ? 'no-cache' : 'default',
        headers: (forceReload || isDev) ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        } : {}
    })
        .then(response => {
            if (!response.ok) {
                console.log('模型配置文件不存在，将使用默认配置');
                return null;
            }
            return response.json();
        })
        .then((config: ModelConfigFile | null) => {
            if (config) {
                globalModelConfig = config;
                console.log('✓ 已加载模型配置文件，版本:', config.version);
                // console.log('可用模型配置路径:', Object.keys(config.models || {}));
                // 输出当前加载的配置中的 scale 值，方便调试
                Object.keys(config.models || {}).forEach(path => {
                    const modelConfig = config.models[path];
                    // if (modelConfig?.scale !== undefined) {
                    //     console.log(`  - ${path}: scale=${modelConfig.scale}`);
                    // }
                });
            }
            return config;
        })
        .catch(error => {
            console.warn('加载模型配置文件失败:', error);
            return null;
        });

    return configLoadPromise;
}

/**
 * 加载指定模型的配置（合并默认配置和模型特定配置）
 * @param modelPath 模型路径
 * @param forceReload 是否强制重新加载配置文件（清除缓存）
 */
export async function loadModelConfig(modelPath: string, forceReload: boolean = false): Promise<ModelConfig | null> {
    // 加载配置文件
    const configFile = await loadModelConfigFromFile(forceReload);

    if (!configFile) {
        return null;
    }

    // 获取默认配置
    const defaultConfig: ModelConfig = {
        scale: 1.0,
        animationExtraction: {
            strategy: "auto",
            useFullClip: false,
            useCachedSegments: true,
            fps: 30,
            autoExtractionThresholds: {
                minDuration: 5.0,
                minTracks: 50,
                defaultStandEnd: 2.0,
                defaultStandEndPercent: 0.1,
                minFrameCount: 10
            }
        },
        positionOffset: {
            horizontal: 0.2,
            vertical: -5.0
        },
        camera: {
            lookAtHeight: 0.25,
            baseDistanceMultiplier: 2.0
        }
    };

    // 合并默认配置
    const mergedDefault = deepMerge(defaultConfig, configFile.default || {});

    // 获取模型特定配置
    // 尝试精确匹配，如果失败则尝试模糊匹配（忽略大小写和路径分隔符）
    let modelConfig = configFile.models[modelPath];

    if (!modelConfig) {
        // 尝试模糊匹配：查找所有可能的路径变体
        const normalizedPath = modelPath.toLowerCase().replace(/\\/g, '/');
        const matchingKey = Object.keys(configFile.models).find(key => {
            const normalizedKey = key.toLowerCase().replace(/\\/g, '/');
            return normalizedKey === normalizedPath ||
                normalizedKey.includes(normalizedPath) ||
                normalizedPath.includes(normalizedKey);
        });

        if (matchingKey) {
            console.log(`配置路径模糊匹配: "${modelPath}" -> "${matchingKey}"`);
            modelConfig = configFile.models[matchingKey];
        }
    }

    if (!modelConfig) {
        // 如果没有模型特定配置，返回默认配置
        console.log(`未找到模型配置: "${modelPath}"，使用默认配置`);
        console.log(`可用配置路径:`, Object.keys(configFile.models));
        return mergedDefault;
    }

    // 合并默认配置和模型特定配置
    const finalConfig = deepMerge(mergedDefault, modelConfig);

    console.log(`✓ 成功加载模型配置: "${modelPath}"`, {
        scale: finalConfig.scale,
        "scale来源": modelConfig.scale !== undefined ? "模型特定配置" : "默认配置",
        useFullClip: finalConfig.animationExtraction?.useFullClip,
        strategy: finalConfig.animationExtraction?.strategy,
        positionOffset: finalConfig.positionOffset,
        camera: finalConfig.camera,
        "注意": modelConfig.scale !== undefined ?
            `模型将使用配置文件中的 scale=${finalConfig.scale}` :
            "模型将使用默认配置 scale=1.0"
    });

    return finalConfig;
}

/**
 * 从旧的 animation_segments.json 文件加载动画片段（向后兼容）
 */
async function loadLegacyAnimationSegments(modelPath: string, clipName: string): Promise<AnimationSegment[] | null> {
    try {
        const response = await fetch('/assets/3d/characters/animation_segments.json');
        if (!response.ok) {
            return null;
        }

        const legacyConfig = await response.json();

        if (legacyConfig?.segments?.[modelPath]?.[clipName]) {
            const clipConfig = legacyConfig.segments[modelPath][clipName];
            console.log(`✓ 从旧配置文件加载动画片段: ${clipName} (${clipConfig.segments.length}个片段)`);
            return clipConfig.segments;
        }

        return null;
    } catch (error) {
        console.warn('加载旧动画片段配置文件失败:', error);
        return null;
    }
}

/**
 * 加载动画片段（优先从新配置文件，向后兼容旧文件）
 */
export async function loadAnimationSegments(
    modelPath: string,
    clipName: string,
    clipDuration: number
): Promise<AnimationSegment[] | null> {
    // 1. 优先从新配置文件加载
    const modelConfig = await loadModelConfig(modelPath);

    if (modelConfig?.animationSegments?.[clipName]) {
        const clipConfig = modelConfig.animationSegments[clipName];

        // 验证clip时长是否匹配（允许0.1秒的误差）
        if (Math.abs(clipConfig.duration - clipDuration) <= 0.1) {
            console.log(`✓ 从模型配置加载动画片段: ${clipName} (${clipConfig.segments.length}个片段)`);
            return clipConfig.segments;
        } else {
            console.log('模型配置中的clip时长不匹配，尝试旧配置文件', {
                配置时长: clipConfig.duration,
                实际时长: clipDuration
            });
        }
    }

    // 2. 向后兼容：从旧配置文件加载
    const legacySegments = await loadLegacyAnimationSegments(modelPath, clipName);
    if (legacySegments) {
        return legacySegments;
    }

    // 3. 最后尝试从 localStorage 缓存加载
    try {
        const ANIMATION_CACHE_VERSION = '1.0.0';
        const ANIMATION_CACHE_PREFIX = 'tactical_monster_animation_segments_';

        function getCacheKey(modelPath: string, clipName: string): string {
            const key = `${modelPath}::${clipName}`;
            return `${ANIMATION_CACHE_PREFIX}${btoa(key).replace(/[+/=]/g, '')}`;
        }

        interface AnimationSegmentCache {
            modelPath: string;
            clipName: string;
            clipDuration: number;
            segments: AnimationSegment[];
            version: string;
        }

        const key = getCacheKey(modelPath, clipName);
        const cached = localStorage.getItem(key);

        if (cached) {
            const cache: AnimationSegmentCache = JSON.parse(cached);

            // 验证缓存有效性
            if (cache.version !== ANIMATION_CACHE_VERSION) {
                return null;
            }

            // 验证clip时长是否匹配（允许0.1秒的误差）
            if (Math.abs(cache.clipDuration - clipDuration) > 0.1) {
                return null;
            }

            // 验证模型路径是否匹配
            if (cache.modelPath !== modelPath || cache.clipName !== clipName) {
                return null;
            }

            console.log(`✓ 从localStorage缓存加载动画片段: ${clipName} (${cache.segments.length}个片段)`);
            return cache.segments;
        }
    } catch (error) {
        console.warn('从localStorage加载动画片段缓存失败:', error);
    }

    return null;
}

