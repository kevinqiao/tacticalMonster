/**
 * Tactical Monster 3D 角色视图
 */

import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ThreeDModelAnimator } from "../animation/model/ThreeDModelAnimator";
import { loadAnimationSegments as loadAnimationSegmentsFromConfig, loadModelConfig, type ModelConfig } from "../config/modelConfig";
import { ASSET_TYPE } from "../types/CharacterTypes";
import { ICharacterProps } from "./CharacterGrid";

// 深合并函数（用于合并配置）
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
                result[key] = deepMerge(targetValue, sourceValue);
            } else if (sourceValue !== undefined) {
                result[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }
    }
    return result;
}

/**
 * 动画片段分析结果
 */
interface AnimationSegment {
    name: string;  // 片段名称：'stand', 'move', 'attack'等
    start: number;  // 开始时间（秒）
    end: number;    // 结束时间（秒）
    confidence: number;  // 置信度（0-1）
}

/**
 * 动画片段缓存数据
 */
interface AnimationSegmentCache {
    modelPath: string;  // 模型路径（作为key）
    clipName: string;   // 动画clip名称
    clipDuration: number;  // clip总时长（用于验证）
    segments: AnimationSegment[];  // 识别到的片段
    timestamp: number;  // 保存时间戳
    version: string;    // 缓存版本（用于兼容性检查）
}

/**
 * 动画片段缓存管理
 */
const ANIMATION_CACHE_VERSION = '1.0.0';
const ANIMATION_CACHE_PREFIX = 'tactical_monster_animation_segments_';

/**
 * 生成缓存key
 */
function getCacheKey(modelPath: string, clipName: string): string {
    // 使用模型路径和clip名称生成唯一的key
    const key = `${modelPath}::${clipName}`;
    // 使用简单的hash避免key过长
    return `${ANIMATION_CACHE_PREFIX}${btoa(key).replace(/[+/=]/g, '')}`;
}

/**
 * 保存动画片段到localStorage
 */
function saveAnimationSegments(
    modelPath: string,
    clipName: string,
    clipDuration: number,
    segments: AnimationSegment[]
): void {
    try {
        const cache: AnimationSegmentCache = {
            modelPath,
            clipName,
            clipDuration,
            segments,
            timestamp: Date.now(),
            version: ANIMATION_CACHE_VERSION
        };

        const key = getCacheKey(modelPath, clipName);
        localStorage.setItem(key, JSON.stringify(cache));
        console.log(`✓ 已保存动画片段缓存: ${clipName} (${segments.length}个片段)`);
    } catch (error) {
        console.warn('保存动画片段缓存失败:', error);
    }
}

/**
 * 动画片段配置文件类型
 */
interface AnimationSegmentsConfig {
    version: string;
    segments: {
        [modelPath: string]: {
            [clipName: string]: {
                duration: number;
                segments: AnimationSegment[];
            };
        };
    };
}

/**
 * 全局配置缓存（避免重复加载）
 */
let globalSegmentsConfig: AnimationSegmentsConfig | null = null;
let configLoadPromise: Promise<AnimationSegmentsConfig | null> | null = null;

/**
 * 从JSON配置文件加载动画片段配置
 */
async function loadSegmentsConfigFromFile(): Promise<AnimationSegmentsConfig | null> {
    // 如果已经加载过，直接返回
    if (globalSegmentsConfig) {
        return globalSegmentsConfig;
    }

    // 如果正在加载，返回现有的promise
    if (configLoadPromise) {
        return configLoadPromise;
    }

    // 开始加载配置
    configLoadPromise = fetch('/assets/3d/characters/animation_segments.json')
        .then(response => {
            if (!response.ok) {
                console.log('动画片段配置文件不存在，将使用localStorage缓存');
                return null;
            }
            return response.json();
        })
        .then((config: AnimationSegmentsConfig | null) => {
            if (config) {
                globalSegmentsConfig = config;
                console.log('✓ 已加载动画片段配置文件');
            }
            return config;
        })
        .catch(error => {
            console.warn('加载动画片段配置文件失败:', error);
            return null;
        });

    return configLoadPromise;
}

/**
 * 从配置文件或localStorage加载动画片段（同步版本，优先使用新配置文件）
 * 向后兼容：如果新配置文件没有，则尝试旧配置文件和localStorage
 */
function loadAnimationSegments(
    modelPath: string,
    clipName: string,
    clipDuration: number
): AnimationSegment[] | null {
    // 1. 先尝试从全局配置缓存加载（旧的 animation_segments.json，向后兼容）
    if (globalSegmentsConfig?.segments[modelPath]?.[clipName]) {
        const clipConfig = globalSegmentsConfig.segments[modelPath][clipName];
        // 验证clip时长是否匹配（允许0.1秒的误差）
        if (Math.abs(clipConfig.duration - clipDuration) <= 0.1) {
            console.log(`✓ 从旧配置文件加载动画片段: ${clipName} (${clipConfig.segments.length}个片段)`);
            return clipConfig.segments;
        }
    }

    // 2. 如果旧配置文件没有或时长不匹配，尝试从localStorage加载
    try {
        const key = getCacheKey(modelPath, clipName);
        const cached = localStorage.getItem(key);

        if (!cached) {
            // 3. 如果localStorage也没有，尝试异步加载旧配置文件（向后兼容）
            loadSegmentsConfigFromFile().then(config => {
                if (config?.segments[modelPath]?.[clipName]) {
                    const clipConfig = config.segments[modelPath][clipName];
                    if (Math.abs(clipConfig.duration - clipDuration) <= 0.1) {
                        console.log(`✓ 异步加载旧配置文件成功: ${clipName} (${clipConfig.segments.length}个片段)`);
                        // 保存到localStorage作为缓存
                        saveAnimationSegments(modelPath, clipName, clipDuration, clipConfig.segments);
                    }
                }
            });

            // 同时尝试异步加载新配置文件
            loadAnimationSegmentsFromConfig(modelPath, clipName, clipDuration).then(segments => {
                if (segments) {
                    console.log(`✓ 从新配置文件异步加载动画片段: ${clipName} (${segments.length}个片段)`);
                }
            });

            return null;
        }

        const cache: AnimationSegmentCache = JSON.parse(cached);

        // 验证缓存有效性
        if (cache.version !== ANIMATION_CACHE_VERSION) {
            console.log('动画片段缓存版本不匹配，将重新分析');
            return null;
        }

        // 验证clip时长是否匹配（允许0.1秒的误差）
        if (Math.abs(cache.clipDuration - clipDuration) > 0.1) {
            console.log('动画片段缓存时长不匹配，将重新分析', {
                缓存时长: cache.clipDuration,
                实际时长: clipDuration
            });
            return null;
        }

        // 验证模型路径是否匹配
        if (cache.modelPath !== modelPath || cache.clipName !== clipName) {
            console.log('动画片段缓存路径不匹配，将重新分析');
            return null;
        }

        console.log(`✓ 从localStorage加载动画片段: ${clipName} (${cache.segments.length}个片段, 缓存时间: ${new Date(cache.timestamp).toLocaleString()})`);
        return cache.segments;
    } catch (error) {
        console.warn('加载动画片段缓存失败:', error);
        return null;
    }
}

/**
 * 清除指定模型的动画片段缓存
 */
function clearAnimationSegmentsCache(modelPath: string, clipName?: string): void {
    try {
        if (clipName) {
            // 清除指定clip的缓存
            const key = getCacheKey(modelPath, clipName);
            localStorage.removeItem(key);
            console.log(`已清除动画片段缓存: ${clipName}`);
        } else {
            // 清除该模型的所有缓存
            const prefix = getCacheKey(modelPath, '');
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(ANIMATION_CACHE_PREFIX)) {
                    const cached = localStorage.getItem(key);
                    if (cached) {
                        const cache: AnimationSegmentCache = JSON.parse(cached);
                        if (cache.modelPath === modelPath) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            }
            console.log(`已清除模型的所有动画片段缓存: ${modelPath}`);
        }
    } catch (error) {
        console.warn('清除动画片段缓存失败:', error);
    }
}

/**
 * 导出动画片段配置到JSON格式（用于保存到配置文件）
 * 由于浏览器无法直接写文件，这个函数会输出JSON字符串，可以复制保存到文件
 */
function exportAnimationSegmentsToJSON(
    modelPath: string,
    clipName: string,
    clipDuration: number,
    segments: AnimationSegment[]
): string {
    // 尝试从现有的全局配置加载
    const config: AnimationSegmentsConfig = globalSegmentsConfig || {
        version: '1.0.0',
        segments: {}
    };

    // 添加或更新当前模型的片段信息
    if (!config.segments[modelPath]) {
        config.segments[modelPath] = {};
    }

    config.segments[modelPath][clipName] = {
        duration: clipDuration,
        segments: segments
    };

    // 返回格式化的JSON字符串
    return JSON.stringify(config, null, 2);
}

/**
 * 导出所有localStorage中的动画片段到JSON配置
 */
function exportAllAnimationSegmentsToJSON(): string {
    const config: AnimationSegmentsConfig = {
        version: '1.0.0',
        segments: {}
    };

    // 遍历localStorage中的所有动画片段缓存
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(ANIMATION_CACHE_PREFIX)) {
            const cached = localStorage.getItem(key);
            if (cached) {
                try {
                    const cache: AnimationSegmentCache = JSON.parse(cached);
                    if (!config.segments[cache.modelPath]) {
                        config.segments[cache.modelPath] = {};
                    }
                    config.segments[cache.modelPath][cache.clipName] = {
                        duration: cache.clipDuration,
                        segments: cache.segments
                    };
                } catch (error) {
                    console.warn('解析缓存失败:', key, error);
                }
            }
        }
    }

    // 返回格式化的JSON字符串
    return JSON.stringify(config, null, 2);
}

/**
 * 导出动画片段为 model_config.json 格式（用于手动添加到配置文件）
 */
function exportAnimationSegmentsToModelConfig(
    modelPath: string,
    clipName: string,
    clipDuration: number,
    segments: AnimationSegment[]
): { [clipName: string]: { duration: number; segments: AnimationSegment[] } } {
    return {
        [clipName]: {
            duration: clipDuration,
            segments: segments
        }
    };
}

/**
 * 将JSON配置字符串下载为文件（用于保存到本地）
 */
function downloadAnimationSegmentsJSON(jsonString: string, filename: string = 'animation_segments.json'): void {
    try {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`✓ 已下载动画片段配置文件: ${filename}`);
    } catch (error) {
        console.error('下载配置文件失败:', error);
    }
}

/**
 * 分析动画clip，识别不同的动画片段
 * 主要方法：
 * 1. 分析位置轨道，找出循环模式（idle通常是循环的）
 * 2. 分析位置变化速度，识别移动和静止
 * 3. 分析位置变化模式，区分idle/walk/attack
 */
/**
 * 只计算网格对象（Mesh）的包围盒，排除骨骼、辅助对象等
 * @param object 要计算包围盒的对象
 * @returns 包围盒
 */
function getMeshBoundingBox(object: THREE.Object3D): THREE.Box3 {
    const box = new THREE.Box3();
    let hasMesh = false;

    object.traverse((child) => {
        // 只计算可见的网格对象，排除骨骼（Bone）、辅助对象等
        if (child instanceof THREE.Mesh && child.visible) {
            // 更新矩阵，确保世界坐标正确
            child.updateMatrixWorld(true);
            // 使用几何体的包围盒（在世界空间中）
            if (child.geometry) {
                const childBox = new THREE.Box3();
                childBox.setFromObject(child);
                if (childBox.isEmpty() === false) {
                    if (!hasMesh) {
                        box.copy(childBox);
                        hasMesh = true;
                    } else {
                        box.union(childBox);
                    }
                }
            }
        }
    });

    // 如果没有找到网格，返回一个空包围盒
    if (!hasMesh) {
        console.warn("⚠ 未找到可见的网格对象，返回空包围盒");
        return new THREE.Box3();
    }

    return box;
}

function analyzeAnimationSegments(clip: THREE.AnimationClip): AnimationSegment[] {
    const segments: AnimationSegment[] = [];
    const duration = clip.duration;

    // 1. 找到位置相关的轨道（通常是根骨骼或角色的位置）
    // 支持多种命名约定：root.position, character.position, darkhunter.position, 等
    const positionTracks = clip.tracks.filter(track => {
        const name = track.name.toLowerCase();
        // 查找位置轨道：包含 'position' 且：
        // - 包含 'root' 或 'character'（常见命名）
        // - 或者是以 '.position' 结尾（如 'darkhunter.position'）
        // - 或者是第一个轨道且名称包含 'position'（可能是主角色）
        return name.includes('position') &&
            (name.includes('root') ||
                name.includes('character') ||
                name.endsWith('.position') ||
                (clip.tracks.indexOf(track) < 3 && name.includes('position'))); // 前3个轨道中包含position的也可能是主角色
    });

    if (positionTracks.length === 0) {
        // 如果没找到标准的位置轨道，尝试查找任何包含 'position' 的轨道
        const allPositionTracks = clip.tracks.filter(track => {
            const name = track.name.toLowerCase();
            return name.includes('position');
        });

        if (allPositionTracks.length > 0) {
            console.log(`未找到标准位置轨道，但找到 ${allPositionTracks.length} 个包含'position'的轨道，使用第一个: ${allPositionTracks[0].name}`);
            positionTracks.push(allPositionTracks[0]);
        } else {
            console.warn('未找到位置轨道，无法分析动画片段。可用轨道:', clip.tracks.slice(0, 5).map(t => t.name));
            return segments;
        }
    }

    // 2. 分析第一个位置轨道（通常是根骨骼）
    const mainTrack = positionTracks[0] as any;
    console.log(`找到位置轨道: ${mainTrack.name}, 轨道类型: ${mainTrack.constructor.name}`);
    const times = mainTrack.times;
    const values = mainTrack.values;

    if (!times || times.length < 10) {
        console.warn('轨道数据不足，无法分析动画片段');
        return segments;
    }

    // 3. 计算每个时间点的位置（3D向量：x, y, z）
    const positions: Array<{ time: number; x: number; y: number; z: number; magnitude: number }> = [];
    const stride = mainTrack.getValueSize?.() || 3; // 通常是3（x, y, z）

    for (let i = 0; i < times.length; i++) {
        const time = times[i];
        const idx = i * stride;
        const x = values[idx] || 0;
        const y = values[idx + 1] || 0;
        const z = values[idx + 2] || 0;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        positions.push({ time, x, y, z, magnitude });
    }

    // 4. 分析位置变化，识别不同的动画片段

    // 4.1 计算每个时间段的位置变化（速度）
    const segmentSize = 0.5; // 每0.5秒分析一次
    const segmentCount = Math.ceil(duration / segmentSize);
    const segmentData: Array<{
        startTime: number;
        endTime: number;
        avgSpeed: number;      // 平均速度
        maxDisplacement: number; // 最大位移
        isCyclic: boolean;      // 是否循环（回到起点附近）
    }> = [];

    for (let i = 0; i < segmentCount; i++) {
        const startTime = i * segmentSize;
        const endTime = Math.min((i + 1) * segmentSize, duration);

        // 找到该时间段内的位置数据
        const segmentPositions = positions.filter(p => p.time >= startTime && p.time < endTime);

        if (segmentPositions.length < 2) continue;

        // 计算平均速度（位置变化率）
        let totalDistance = 0;
        let maxDisp = 0;
        const startPos = segmentPositions[0];
        const endPos = segmentPositions[segmentPositions.length - 1];

        for (let j = 1; j < segmentPositions.length; j++) {
            const prev = segmentPositions[j - 1];
            const curr = segmentPositions[j];
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dz = curr.z - prev.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            totalDistance += dist;
        }

        const avgSpeed = totalDistance / (endTime - startTime);

        // 计算最大位移（从起始位置的偏移）
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const dz = endPos.z - startPos.z;
        const displacement = Math.sqrt(dx * dx + dy * dy + dz * dz);
        maxDisp = Math.max(...segmentPositions.map(p => {
            const dxx = p.x - startPos.x;
            const dyy = p.y - startPos.y;
            const dzz = p.z - startPos.z;
            return Math.sqrt(dxx * dxx + dyy * dyy + dzz * dzz);
        }));

        // 判断是否循环（结束位置接近起始位置）
        const isCyclic = displacement < 0.1; // 如果位移小于0.1，认为是循环的

        segmentData.push({
            startTime,
            endTime,
            avgSpeed,
            maxDisplacement: maxDisp,
            isCyclic
        });
    }

    // 5. 根据分析结果识别动画片段

    // 5.1 找到stand片段（速度低且循环）
    // stand通常在前几秒，速度低，且位置循环
    // 方法1：自动分析提取stand动作
    let standEnd = 0;
    let standConfidence = 0;

    // 策略1：查找连续的低速度循环片段（最可靠的方法）
    let continuousStandEnd = segmentSize;
    let continuousCount = 0; // 连续满足条件的片段数
    const minContinuousSegments = 2; // 至少连续2个片段（1秒）才认为是stand

    for (const seg of segmentData) {
        if (seg.startTime > 5) break; // 只检查前5秒

        // 判断是否是stand片段的条件：
        // 1. 速度低（< 0.5）
        // 2. 循环（位移 < 0.1）
        // 3. 最大位移小（< 0.5），说明没有大幅移动
        const isStandSegment = seg.avgSpeed < 0.5 &&
            seg.isCyclic &&
            seg.maxDisplacement < 0.5;

        if (isStandSegment) {
            continuousCount++;
            continuousStandEnd = seg.endTime;

            // 如果连续满足条件，提高置信度
            if (continuousCount >= minContinuousSegments) {
                standEnd = continuousStandEnd;
                standConfidence = Math.min(0.9, 0.6 + continuousCount * 0.1);
            }
        } else {
            // 如果不满足条件，检查是否是速度突然增加（stand结束）
            if (seg.avgSpeed >= 0.5 && continuousCount >= minContinuousSegments) {
                // 已经找到了有效的stand片段，stand在这里结束
                break;
            } else if (seg.avgSpeed >= 0.5) {
                // 速度突然增加，但没有足够的连续片段，重置计数
                continuousCount = 0;
                continuousStandEnd = segmentSize;
            }
        }
    }

    // 策略2：如果策略1失败，使用更宽松的条件
    if (standEnd <= segmentSize) {
        let relaxedStandEnd = segmentSize;
        let relaxedConfidence = 0.5;

        for (const seg of segmentData) {
            if (seg.startTime > 5) break;

            // 更宽松的条件：速度较低即可（不要求循环）
            if (seg.avgSpeed < 0.3 && seg.maxDisplacement < 1.0) {
                relaxedStandEnd = seg.endTime;
                relaxedConfidence = 0.6;
            } else if (seg.avgSpeed >= 0.5) {
                // 速度增加，stand结束
                break;
            }
        }

        if (relaxedStandEnd > segmentSize) {
            standEnd = relaxedStandEnd;
            standConfidence = relaxedConfidence;
        }
    }

    // 策略3：如果前两个策略都失败，使用默认值（clip前10%或2秒，取较小值）
    if (standEnd <= segmentSize) {
        const defaultStandEnd = Math.min(
            duration * 0.1,  // clip的10%
            2.0              // 或2秒
        );

        // 确保默认值至少是 segmentSize
        if (defaultStandEnd > segmentSize) {
            standEnd = defaultStandEnd;
            standConfidence = 0.3; // 低置信度
            console.log(`⚠ 使用默认stand时间范围: 0-${standEnd.toFixed(2)}s (置信度: ${standConfidence.toFixed(2)})`);
        } else {
            // 如果默认值太小，至少使用 segmentSize
            standEnd = segmentSize * 2; // 至少1秒
            standConfidence = 0.25; // 更低置信度
            console.log(`⚠ 使用最小stand时间范围: 0-${standEnd.toFixed(2)}s (置信度: ${standConfidence.toFixed(2)})`);
        }
    }

    // 验证stand片段的合理性并添加到结果中
    if (standEnd > 0 && standEnd <= duration && standEnd >= 0.5) {
        // 计算置信度调整因子
        let confidenceAdjustment = 1.0;

        // 如果stand片段太短（< 1秒），降低置信度
        if (standEnd < 1.0) {
            confidenceAdjustment *= 0.7;
        }

        // 如果stand片段太长（> 10秒），可能是识别错误，降低置信度
        if (standEnd > 10.0) {
            confidenceAdjustment *= 0.6;
        }

        standConfidence = Math.max(0.3, standConfidence * confidenceAdjustment);

        segments.push({
            name: 'stand',
            start: 0,
            end: standEnd,
            confidence: standConfidence
        });

        console.log(`✓ Stand片段识别成功: 0.00s - ${standEnd.toFixed(2)}s (置信度: ${standConfidence.toFixed(2)})`);
    } else {
        console.warn(`⚠ Stand片段识别失败: end=${standEnd.toFixed(2)}s, duration=${duration.toFixed(2)}s`);
    }

    // 5.2 找到move片段（速度高且持续向前）
    // move通常从stand结束后开始
    const standEndTime = standEnd > 0 ? standEnd : segmentSize;
    let moveStart = standEndTime;
    let moveEnd = moveStart;
    for (const seg of segmentData) {
        if (seg.startTime < moveStart) continue;
        if (seg.avgSpeed > 1.0 && !seg.isCyclic) {
            // 高速度且不循环，可能是move
            if (moveStart === standEndTime) {
                moveStart = seg.startTime;
            }
            moveEnd = seg.endTime;
        } else if (seg.avgSpeed < 0.3 && seg.isCyclic) {
            // 如果速度降低且循环，可能是move结束了
            break;
        }
    }

    if (moveEnd > moveStart) {
        segments.push({
            name: 'move',
            start: moveStart,
            end: moveEnd,
            confidence: 0.7
        });
    }

    // 5.3 找到attack片段（速度中等，短暂前冲后回到原点）
    // 通常attack在move之后，或在clip的后面部分
    const attackStart = Math.max(moveEnd, duration * 0.6); // 从60%位置开始查找
    let attackEnd = attackStart;

    for (const seg of segmentData) {
        if (seg.startTime < attackStart) continue;
        if (seg.avgSpeed > 0.5 && seg.avgSpeed < 2.0 && seg.maxDisplacement > 0.2) {
            // 中等速度，有位移，可能是attack
            if (attackEnd === attackStart) {
                attackEnd = seg.endTime;
            } else {
                attackEnd = Math.max(attackEnd, seg.endTime);
            }
        }
    }

    if (attackEnd > attackStart && attackEnd < duration) {
        segments.push({
            name: 'attack',
            start: attackStart,
            end: attackEnd,
            confidence: 0.6
        });
    }

    // 输出分析结果
    console.log('========== 动画片段分析结果 ==========');
    console.log(`总时长: ${duration.toFixed(2)}s, 分析片段数: ${segmentData.length}`);
    if (segments.length > 0) {
        console.log('识别到的动画片段:');
        segments.forEach(seg => {
            console.log(`  - ${seg.name}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s (置信度: ${seg.confidence.toFixed(2)})`);
        });
    } else {
        console.log('未识别到动画片段');
    }
    console.log('片段数据详情（前10个）:', segmentData.slice(0, 10));
    console.log('=====================================');

    return segments;
}


const Character3D = ({ character, width, height, onAnimatorReady, overrideConfig, onConfigReady }: ICharacterProps) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene>();
    const cameraRef = useRef<THREE.PerspectiveCamera>();
    const rendererRef = useRef<THREE.WebGLRenderer>();
    const modelRef = useRef<THREE.Group>();
    const animationFrameRef = useRef<number>();
    const mixerRef = useRef<THREE.AnimationMixer>();
    const clockRef = useRef(new THREE.Clock());
    const actionsRef = useRef<{ [key: string]: THREE.AnimationAction }>({});  // 存储所有动作
    const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number }>({ top: 0, left: 0, width: 0, height: 0 });
    const isDraggingRef = useRef(false);
    const previousMouseXRef = useRef(0);


    // 初始化场景 - 只在组件挂载时执行一次
    useEffect(() => {
        if (!mountRef.current) return;

        // 创建场景
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // 创建相机 - 调整视角和距离
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 4); // 调整相机位置
        camera.lookAt(0, 0, 0);  // 看向原点（模型中心），确保水平居中

        cameraRef.current = camera;

        // 创建渲染器
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            precision: 'highp',    // 使用高精度
            powerPreference: 'high-performance'  // 优先使用高性能GPU
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最大像素比
        renderer.setSize(width * 2, height * 2, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;  // 使用sRGB颜色空间
        renderer.toneMapping = THREE.ACESFilmicToneMapping;  // 使用电影级色调映射
        renderer.toneMappingExposure = 1.0;  // 调整曝光
        renderer.shadowMap.enabled = true;  // 启用阴影
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // 使用软阴影
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 添加灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);  // 增加环境光强度
        scene.add(ambientLight);

        // 添加多个方向光以提供更好的照明
        const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
        frontLight.position.set(0, 2, 5);
        frontLight.castShadow = true;  // 启用阴影投射
        frontLight.shadow.mapSize.width = 1024;  // 增加阴影贴图分辨率
        frontLight.shadow.mapSize.height = 1024;
        scene.add(frontLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
        backLight.position.set(0, 2, -5);
        scene.add(backLight);

        const leftLight = new THREE.DirectionalLight(0xffffff, 0.6);
        leftLight.position.set(-5, 2, 0);
        scene.add(leftLight);

        const rightLight = new THREE.DirectionalLight(0xffffff, 0.6);
        rightLight.position.set(5, 2, 0);
        scene.add(rightLight);

        // 动画循环
        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);

            // 更新动画混合器
            if (mixerRef.current) {
                const delta = clockRef.current.getDelta();
                mixerRef.current.update(delta);
            }

            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        // 清理
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (mountRef.current && rendererRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
            }
            rendererRef.current?.dispose();
        };
    }, []); // 空依赖数组，只在挂载时执行

    // 处理尺寸变化
    useEffect(() => {
        // 容器居中：将渲染器放在容器中心
        // 容器大小是 width x height（60x60），渲染器大小是 width*2 x height*2（120x120）
        // 要让渲染器的中心点在容器的中心点(0,0)：
        // - 渲染器左上角应该在 (-width, -height)，这样渲染器中心就在(0,0)
        // 但如果我们想用top和left，应该是 (-width/2, -height/2)
        // 注意：top是垂直方向（Y轴），left是水平方向（X轴）
        // 如果角色看起来偏右，可能需要向左调整left值
        const top = -height / 2;  // 垂直居中：渲染器中心在容器垂直中心
        let left = -width / 2;  // 水平居中：渲染器中心在容器水平中心

        // 水平位置微调：使用相对于格子大小的偏移，确保在不同窗口大小下保持一致
        // 使用格子大小的百分比，而不是固定像素值
        // 不同角色可能需要不同的偏移，但这里统一调整
        // 当前设置：向右偏移格子大小的20%（对于akedia），wukong的3D模型偏移会单独处理
        const horizontalOffset = width * 0.2;
        left = left + horizontalOffset;  // 向右移动（增大left值）

        console.log("Character3D位置计算:", {
            容器尺寸: `${width}x${height}`,
            渲染器尺寸: `${width * 2}x${height * 2}`,
            位置: { top, left },
            "容器中心": "(0, 0)",
            "渲染器左上角": `(${left}, ${top})`,
            "渲染器中心": `(${left + width}, ${top + height})`,
            "水平偏移调整": left - (-width / 2),
            "说明": "left值更负 = 向左移动，left值更正 = 向右移动"
        });
        setPosition({ top, left, width: width * 2, height: height * 2 });
    }, [width, height]);
    useEffect(() => {
        if (!rendererRef.current || !cameraRef.current) return;
        rendererRef.current.setSize(position.width, position.height, false);
        cameraRef.current.aspect = position.width / position.height;
        cameraRef.current.updateProjectionMatrix();
    }, [position]);

    // 存储 overrideConfig 引用，用于在 processModel 中访问
    const overrideConfigRef = useRef<Partial<ModelConfig> | undefined>(overrideConfig);
    const modelConfigRef = useRef<ModelConfig | null>(null); // 存储当前模型配置，用于重新应用配置
    const modelPathRef = useRef<string | undefined>(undefined); // 存储当前模型路径
    const baseScaleRef = useRef<number>(1.0); // 存储基础缩放值（用于重新计算scale）
    const originalBoundingBoxCenterRef = useRef<THREE.Vector3 | null>(null); // 存储原始包围盒中心（缩放前）
    const originalBoundingBoxSizeRef = useRef<THREE.Vector3 | null>(null); // 存储原始包围盒尺寸（缩放前）
    const originalConfigScaleRef = useRef<number | null>(null); // 存储原始配置中的 scale（用于绝对缩放计算）
    const originalCameraDistanceRef = useRef<number | null>(null); // 存储初始加载时的相机距离（用于还原）
    const lastAppliedConfigRef = useRef<string>(''); // 存储上次应用的配置，用于避免重复应用

    useEffect(() => {
        overrideConfigRef.current = overrideConfig;
    }, [overrideConfig]);

    // 当 overrideConfig 改变时，重新应用配置到已加载的模型
    useEffect(() => {
        // 只在模型已加载且配置真的改变时才重新应用
        // 如果 overrideConfig 为空对象，说明是重置配置，不需要重新应用
        if (!modelRef.current || !modelConfigRef.current) return;
        if (!overrideConfig || Object.keys(overrideConfig).length === 0) {
            lastAppliedConfigRef.current = '';
            return;
        }

        // 使用 JSON.stringify 比较配置是否真的改变
        const configString = JSON.stringify(overrideConfig);
        if (configString === lastAppliedConfigRef.current) {
            // 配置没有变化，跳过
            return;
        }

        // 使用防抖，避免频繁更新导致无限循环
        const timeoutId = setTimeout(() => {
            // 再次检查配置是否改变（防抖期间可能又变了）
            const currentConfigString = JSON.stringify(overrideConfig);
            if (currentConfigString === lastAppliedConfigRef.current) {
                return; // 配置又变回去了，不需要应用
            }

            // 记录即将应用的配置
            lastAppliedConfigRef.current = currentConfigString;

            // 加载当前配置和覆盖配置，合并后重新应用
            const applyOverrideConfig = async () => {
                const modelPath = modelPathRef.current;
                if (!modelPath) return;

                // 获取当前角色的模型路径，确保配置应用到正确的模型
                const resources = character.asset?.resource;
                const fbxPath = resources?.fbx;
                const gltfPath = resources?.gltf || resources?.glb;
                const currentModelPath = character.asset?.type === ASSET_TYPE.GLTF
                    ? (gltfPath || fbxPath)
                    : (fbxPath || gltfPath);

                // 如果模型路径不匹配，说明切换了角色，不应该应用配置
                if (currentModelPath !== modelPath) {
                    console.log("⚠ 模型路径不匹配，跳过配置重新应用:", {
                        currentModelPath,
                        modelPathRef: modelPath,
                        "说明": "可能是角色切换中，等待新模型加载完成"
                    });
                    return;
                }

                try {
                    // 重新加载基础配置
                    const baseConfig = await loadModelConfig(modelPath, false);
                    const currentOverrideConfig = overrideConfigRef.current || overrideConfig;

                    // 合并配置
                    if (!modelConfigRef.current) {
                        console.warn("⚠ 模型配置未初始化，无法重新应用配置");
                        return;
                    }

                    const mergedConfig: ModelConfig = currentOverrideConfig
                        ? deepMerge(baseConfig || modelConfigRef.current, currentOverrideConfig)
                        : (baseConfig || modelConfigRef.current);

                    const model = modelRef.current!;

                    console.log("========== 重新应用配置（overrideConfig变化） ==========");
                    console.log("overrideConfig:", overrideConfig);
                    console.log("合并后的配置:", mergedConfig);
                    console.log("模型是否已加载:", !!modelRef.current);
                    console.log("模型配置是否已加载:", !!modelConfigRef.current);
                    console.log("模型路径:", modelPath);

                    // 重新应用缩放 - 使用更简单的直接缩放方法
                    if (mergedConfig.scale !== undefined && mergedConfig.scale !== null) {
                        // 获取当前保存的 scale（从 modelConfigRef 中获取，这是上次应用后的值）
                        // 优先从 modelConfigRef 获取，因为它保存的是上次应用后的值
                        // 如果没有保存的值，从当前模型的 scale 推导出来
                        let currentModelScale = modelConfigRef.current?.scale;
                        if (currentModelScale === undefined || currentModelScale === null) {
                            // 如果没有保存的值，尝试从当前模型的 scale 推导
                            // 当前模型的 scale = baseScale * modelScale
                            if (baseScaleRef.current && baseScaleRef.current > 0) {
                                const currentAbsScale = Math.abs(model.scale.x);
                                currentModelScale = currentAbsScale / baseScaleRef.current;
                                console.warn("⚠ 未找到保存的 scale，从模型 scale 推导:", currentModelScale);
                            } else {
                                currentModelScale = 1.0;
                                console.warn("⚠ 未找到保存的 scale，使用默认值:", currentModelScale);
                            }
                        }
                        const newModelScale = mergedConfig.scale;

                        console.log("========== 重新应用缩放调试 ==========");
                        console.log("当前保存的 scale:", currentModelScale);
                        console.log("新的 scale:", newModelScale);
                        console.log("当前模型 scale:", model.scale);
                        console.log("baseScaleRef.current:", baseScaleRef.current);

                        // 如果 scale 没有变化，不需要重新应用
                        if (Math.abs(currentModelScale - newModelScale) < 0.001) {
                            console.log(`缩放值未变化，跳过重新应用: ${currentModelScale}`);
                            console.log("=====================================");
                        } else {
                            // 简化：直接计算缩放比例
                            // 由于配置中的 scale 是相对于 baseScale 的倍数
                            // 我们直接用 newModelScale / currentModelScale 计算比例
                            const scaleRatio = newModelScale / currentModelScale;

                            console.log("缩放比例计算:", {
                                currentModelScale: currentModelScale.toFixed(3),
                                newModelScale: newModelScale.toFixed(3),
                                scaleRatio: scaleRatio.toFixed(3)
                            });

                            // 关键修复：使用绝对缩放而不是相对缩放
                            // 目标 scale = baseScale * newModelScale（与初始加载时的逻辑一致）
                            // 而不是 currentScale * scaleRatio
                            if (!baseScaleRef.current || baseScaleRef.current <= 0) {
                                console.error(`⚠ baseScaleRef.current 无效: ${baseScaleRef.current}, 无法应用缩放`);
                                console.log("=====================================");
                            } else {
                                // 计算目标绝对 scale
                                const targetAbsoluteScale = baseScaleRef.current * newModelScale;

                                // 保存镜像状态
                                const mirrorSign = model.scale.x < 0 ? -1 : 1;

                                // 直接设置目标 scale（保留镜像状态）
                                model.scale.set(
                                    targetAbsoluteScale * mirrorSign,
                                    targetAbsoluteScale,
                                    targetAbsoluteScale
                                );

                                // 更新保存的配置中的 scale（必须在缩放应用后立即更新，确保下次能正确获取）
                                if (modelConfigRef.current) {
                                    modelConfigRef.current.scale = newModelScale;
                                    console.log(`✓ 已更新 modelConfigRef.current.scale: ${currentModelScale.toFixed(3)} → ${newModelScale.toFixed(3)}`);
                                    console.log(`   下次调整时，currentModelScale 将读取为: ${newModelScale.toFixed(3)}`);
                                } else {
                                    console.warn("⚠ modelConfigRef.current 为空，无法更新 scale");
                                    modelConfigRef.current = { scale: newModelScale } as ModelConfig;
                                    console.log(`✓ 已创建 modelConfigRef.current 并设置 scale: ${newModelScale.toFixed(3)}`);
                                }

                                console.log(`✓ 缩放应用成功（绝对缩放）: ${currentModelScale.toFixed(3)} → ${newModelScale.toFixed(3)}`);
                                console.log(`  baseScale: ${baseScaleRef.current.toFixed(3)}`);
                                console.log(`  目标绝对scale: ${targetAbsoluteScale.toFixed(3)}`);
                                console.log(`  实际模型scale: x=${model.scale.x.toFixed(3)}, y=${model.scale.y.toFixed(3)}, z=${model.scale.z.toFixed(3)}`);
                                console.log(`  验证: ${Math.abs(model.scale.x).toFixed(3)} = ${baseScaleRef.current.toFixed(3)} × ${newModelScale.toFixed(3)}`);

                                // 关键：缩放后必须重新计算位置和相机
                                console.log("开始重新计算位置和相机（缩放后）...");

                                // 使用保存的原始包围盒信息，根据缩放比例计算新尺寸
                                const originalSize = originalBoundingBoxSizeRef.current;
                                const originalCenter = originalBoundingBoxCenterRef.current;

                                if (!originalSize || !originalCenter) {
                                    console.warn("⚠ 未找到原始包围盒信息，将重新计算");
                                    const currentPos = model.position.clone();
                                    model.position.set(0, 0, 0);
                                    const box = getMeshBoundingBox(model);
                                    const calculatedSize = box.getSize(new THREE.Vector3());
                                    const calculatedCenter = box.getCenter(new THREE.Vector3());
                                    originalBoundingBoxSizeRef.current = calculatedSize.clone();
                                    originalBoundingBoxCenterRef.current = calculatedCenter.clone();
                                    model.position.copy(currentPos);
                                }

                                // 根据绝对缩放计算新尺寸（用于位置和相机计算）
                                // originalSize 是在初始加载时保存的，对应的是配置文件中的 scale（例如 0.2）
                                // 现在要计算 scale = newModelScale 时的尺寸
                                // 尺寸比例 = newModelScale / 原始配置 scale
                                const originalConfigScale = originalConfigScaleRef.current ?? 0.2; // 从保存的 ref 获取原始配置 scale

                                // 保存当前旋转（缩放不会改变旋转）
                                const currentRotation = {
                                    x: model.rotation.x,
                                    y: model.rotation.y,
                                    z: model.rotation.z
                                };

                                // 使用保存的原始包围盒信息，根据缩放比例计算新尺寸
                                // 包围盒中心不会因缩放而改变（相对于模型原点）
                                // 包围盒尺寸会按缩放比例变化
                                const sizeRatio = newModelScale / originalConfigScale;
                                const size = originalSize!.clone().multiplyScalar(sizeRatio);
                                const center = originalCenter!.clone(); // 中心不会因缩放而改变（相对于模型原点）

                                console.log("缩放后的包围盒（基于原始尺寸计算）:", {
                                    originalConfigScale: originalConfigScale.toFixed(3),
                                    newModelScale: newModelScale.toFixed(3),
                                    sizeRatio: sizeRatio.toFixed(3),
                                    originalSize: originalSize,
                                    calculatedSize: size,
                                    originalCenter: originalCenter,
                                    calculatedCenter: center,
                                    sizeX: size.x.toFixed(3),
                                    sizeY: size.y.toFixed(3),
                                    sizeZ: size.z.toFixed(3),
                                    centerX: center.x.toFixed(3),
                                    centerY: center.y.toFixed(3),
                                    centerZ: center.z.toFixed(3),
                                    "说明": `尺寸 = 原始尺寸 × (${newModelScale.toFixed(3)} / ${originalConfigScale.toFixed(3)}), 中心不变`
                                });

                                // 验证尺寸是否合理（不应该异常大）
                                // 注意：即使尺寸很大，也应该重新计算位置和相机，只是需要确保计算合理
                                const maxSize = Math.max(size.x, size.y, size.z);
                                if (maxSize > 10000) {
                                    console.warn(`⚠ 警告：计算出的包围盒尺寸很大: ${maxSize.toFixed(3)}`);
                                    console.warn(`   原始尺寸: x=${originalSize!.x.toFixed(3)}, y=${originalSize!.y.toFixed(3)}, z=${originalSize!.z.toFixed(3)}`);
                                    console.warn(`   尺寸比例: ${sizeRatio.toFixed(3)}`);
                                    console.warn(`   计算出的尺寸: x=${size.x.toFixed(3)}, y=${size.y.toFixed(3)}, z=${size.z.toFixed(3)}`);
                                    console.warn(`   模型scale: x=${model.scale.x.toFixed(3)}, y=${model.scale.y.toFixed(3)}, z=${model.scale.z.toFixed(3)}`);
                                    console.warn(`   将继续重新计算位置和相机，但相机距离可能会很大`);
                                    // 不再跳过，继续计算位置和相机
                                }

                                // 重置位置到原点（用于后续计算）
                                model.position.set(0, 0, 0);

                                // 重新计算位置（基于原始中心点）
                                // center是包围盒中心相对于模型原点的偏移（此时模型在原点）
                                // 设置position为 -center，这样包围盒中心就在(0,0,0)
                                let modelX = -center.x;
                                let modelY = -center.y;
                                let modelZ = -center.z;

                                console.log("位置重新计算（缩放后）:", {
                                    原始包围盒中心: {
                                        x: originalCenter!.x.toFixed(6),
                                        y: originalCenter!.y.toFixed(6),
                                        z: originalCenter!.z.toFixed(6)
                                    },
                                    当前包围盒中心: {
                                        x: center.x.toFixed(6),
                                        y: center.y.toFixed(6),
                                        z: center.z.toFixed(6)
                                    },
                                    基础位置: {
                                        x: modelX.toFixed(6),
                                        y: modelY.toFixed(6),
                                        z: modelZ.toFixed(6)
                                    },
                                    "说明": "基于原始包围盒中心计算的位置（中心不变，因为缩放是均匀的）",
                                    "验证": `center 应该等于 originalCenter: ${center.equals(originalCenter!) ? '✓ 一致' : '✗ 不一致'}`,
                                    "差异": {
                                        x: Math.abs(center.x - originalCenter!.x).toFixed(6),
                                        y: Math.abs(center.y - originalCenter!.y).toFixed(6),
                                        z: Math.abs(center.z - originalCenter!.z).toFixed(6)
                                    },
                                    "初始加载时的位置参考": "初始位置应为 x=-13.954, y=-19.203, z=-2.304"
                                });

                                // 应用位置偏移
                                const positionOffset = mergedConfig.positionOffset || modelConfigRef.current?.positionOffset || {
                                    horizontal: 0.2,
                                    vertical: -5.0
                                };

                                // 应用水平偏移
                                if (width && height) {
                                    const horizontalOffsetPercent = positionOffset.horizontal || 0.2;
                                    const horizontalOffset = -(width * horizontalOffsetPercent);
                                    modelX += horizontalOffset;
                                    console.log("水平偏移应用:", {
                                        horizontalOffsetPercent,
                                        width,
                                        horizontalOffset,
                                        "说明": `水平偏移 = -(width × ${horizontalOffsetPercent}) = ${horizontalOffset}`
                                    });
                                }

                                // 应用垂直偏移
                                const verticalOffset = positionOffset.vertical || -5.0;
                                const originalModelY = modelY;
                                modelY += verticalOffset;

                                // 如果是飞行单位，加上飞行高度
                                if (character.isFlying) {
                                    const flightHeight = character.flightHeight ?? 0.5;
                                    modelY += flightHeight;
                                    console.log("飞行单位高度:", {
                                        verticalOffset,
                                        flightHeight,
                                        最终modelY: modelY,
                                        "说明": `最终Y = ${originalModelY} + ${verticalOffset} + ${flightHeight} = ${modelY}`
                                    });
                                }

                                model.position.set(modelX, modelY, modelZ);
                                model.userData.verticalOffset = verticalOffset;

                                console.log(`✓ 位置重新计算完成: x=${modelX.toFixed(3)}, y=${modelY.toFixed(3)}, z=${modelZ.toFixed(3)}`);
                                console.log("位置偏移详情:", {
                                    水平偏移百分比: positionOffset.horizontal,
                                    垂直偏移: verticalOffset,
                                    是否飞行单位: character.isFlying,
                                    模型scale: `x=${model.scale.x.toFixed(3)}, y=${model.scale.y.toFixed(3)}, z=${model.scale.z.toFixed(3)}`,
                                    是否镜像: model.scale.x < 0,
                                    "说明": "如果位置偏移了，请检查这些值是否与初始加载时一致。镜像状态（scale.x<0）可能影响视觉位置"
                                });

                                // 重新调整相机以适应新的模型尺寸
                                if (cameraRef.current) {
                                    const cameraConfig = mergedConfig.camera || modelConfigRef.current?.camera || {
                                        lookAtHeight: 0.25,
                                        baseDistanceMultiplier: 2.0
                                    };

                                    const modelHeight = size.y;
                                    const modelWidth = Math.max(size.x, size.z);

                                    // 验证尺寸是否合理
                                    if (modelHeight > 1000 || modelWidth > 1000) {
                                        console.error(`✗ 错误：缩放后模型尺寸异常大，跳过相机调整`);
                                        console.error(`   modelHeight: ${modelHeight.toFixed(3)}, modelWidth: ${modelWidth.toFixed(3)}`);
                                        console.error(`   包围盒尺寸: x=${size.x.toFixed(3)}, y=${size.y.toFixed(3)}, z=${size.z.toFixed(3)}`);
                                        console.error(`   模型scale: x=${model.scale.x.toFixed(3)}, y=${model.scale.y.toFixed(3)}, z=${model.scale.z.toFixed(3)}`);
                                        return; // 跳过相机调整，避免模型消失
                                    }

                                    // 保持相机距离不变，确保当模型变大时视觉上能明显看到变化
                                    // 如果相机距离也按比例缩放，模型变大时视觉上看起来几乎没变化
                                    let baseDistance: number;
                                    if (originalCameraDistanceRef.current !== null && originalConfigScaleRef.current !== null) {
                                        // 保持初始相机距离不变
                                        baseDistance = originalCameraDistanceRef.current;

                                        const scaleRatio = newModelScale / originalConfigScaleRef.current;
                                        console.log(`✓ 相机距离保持不变（确保视觉变化可见）:`, {
                                            初始相机距离: originalCameraDistanceRef.current.toFixed(3),
                                            初始scale: originalConfigScaleRef.current.toFixed(3),
                                            当前scale: newModelScale.toFixed(3),
                                            scale比例: scaleRatio.toFixed(3),
                                            调整后相机距离: baseDistance.toFixed(3),
                                            "说明": "相机距离保持不变，模型变大时视觉上能明显看到变化"
                                        });
                                    } else {
                                        // Fallback: 基于模型尺寸计算
                                        baseDistance = 6;
                                        if (width && height) {
                                            const cellSize = Math.min(width, height);
                                            const multiplier = cameraConfig.baseDistanceMultiplier || 2.0;
                                            baseDistance = Math.max(modelHeight * multiplier, modelWidth * 1.5, cellSize * 0.8);
                                        } else {
                                            baseDistance = Math.max(modelHeight * 3.5, modelWidth * 3, 6);
                                        }
                                        console.log(`⚠ 未找到初始相机距离，使用基于模型尺寸的计算: ${baseDistance.toFixed(3)}`);
                                    }

                                    // 限制相机距离的最大值，避免异常大的距离
                                    // 提高限制，确保大 scale 时也能看到完整模型
                                    const maxDistance = width && height ? Math.max(width, height) * 20 : 2000;
                                    if (baseDistance > maxDistance) {
                                        console.warn(`⚠ 警告：计算出的相机距离 ${baseDistance.toFixed(3)} 过大，限制为 ${maxDistance.toFixed(3)}`);
                                        baseDistance = maxDistance;
                                    }

                                    const lookAtHeight = modelHeight * (cameraConfig.lookAtHeight || 0.25);

                                    if (character.isFlying) {
                                        const flightHeight = character.flightHeight ?? 0.5;
                                        const baseYWithoutOffset = model.position.y - flightHeight - verticalOffset;
                                        const referenceTargetY = baseYWithoutOffset + flightHeight + lookAtHeight;
                                        const cameraY = referenceTargetY + 2;

                                        cameraRef.current.position.set(0, cameraY, baseDistance);
                                        cameraRef.current.lookAt(0, referenceTargetY, 0);
                                    } else {
                                        const baseY = model.position.y - verticalOffset;
                                        const targetY = baseY + lookAtHeight;
                                        const cameraY = targetY + 1.5;

                                        cameraRef.current.position.set(0, cameraY, baseDistance);
                                        cameraRef.current.lookAt(model.position.x, targetY, model.position.z);
                                    }

                                    cameraRef.current.updateProjectionMatrix();

                                    // 计算并显示相机的lookAt目标位置
                                    const lookAtTarget = new THREE.Vector3();
                                    if (character.isFlying) {
                                        const flightHeight = character.flightHeight ?? 0.5;
                                        const baseYWithoutOffset = model.position.y - flightHeight - verticalOffset;
                                        const referenceTargetY = baseYWithoutOffset + flightHeight + lookAtHeight;
                                        lookAtTarget.set(0, referenceTargetY, 0);
                                    } else {
                                        const baseY = model.position.y - verticalOffset;
                                        const targetY = baseY + lookAtHeight;
                                        lookAtTarget.set(model.position.x, targetY, model.position.z);
                                    }

                                    console.log(`✓ 相机重新调整完成: distance=${baseDistance.toFixed(3)}, modelHeight=${modelHeight.toFixed(3)}, modelWidth=${modelWidth.toFixed(3)}`);
                                    console.log(`  相机位置: (${cameraRef.current.position.x.toFixed(3)}, ${cameraRef.current.position.y.toFixed(3)}, ${cameraRef.current.position.z.toFixed(3)})`);
                                    console.log(`  模型位置: (${model.position.x.toFixed(3)}, ${model.position.y.toFixed(3)}, ${model.position.z.toFixed(3)})`);
                                    console.log(`  相机lookAt目标: (${lookAtTarget.x.toFixed(3)}, ${lookAtTarget.y.toFixed(3)}, ${lookAtTarget.z.toFixed(3)})`);
                                    console.log(`  相机到模型距离: ${cameraRef.current.position.distanceTo(model.position).toFixed(3)}`);
                                }

                                console.log("=====================================");

                                // 标记已经重新计算过位置和相机，避免后续再次重新计算包围盒
                                // 将计算出的尺寸保存到 model.userData 中，供后续使用
                                model.userData.lastCalculatedSize = size.clone();
                                model.userData.lastCalculatedCenter = center.clone();
                            }
                        }
                    }

                    // 重新应用镜像
                    if (mergedConfig.mirror !== undefined) {
                        const shouldMirror = mergedConfig.mirror === true;
                        const currentIsMirrored = model.scale.x < 0;
                        if (shouldMirror !== currentIsMirrored) {
                            model.scale.x = -model.scale.x;
                            console.log(`✓ 重新应用镜像: ${currentIsMirrored} → ${shouldMirror}`);
                        }
                    }

                    // 重新应用旋转
                    if (mergedConfig.rotation) {
                        const defaultRotation = {
                            x: 0,
                            y: Math.PI,
                            z: 0
                        };
                        const rotationConfig = mergedConfig.rotation;
                        model.rotation.set(
                            rotationConfig.x !== undefined ? rotationConfig.x : defaultRotation.x,
                            rotationConfig.y !== undefined ? rotationConfig.y : defaultRotation.y,
                            rotationConfig.z !== undefined ? rotationConfig.z : defaultRotation.z
                        );
                        console.log(`✓ 重新应用旋转: x=${model.rotation.x.toFixed(3)}, y=${model.rotation.y.toFixed(3)}, z=${model.rotation.z.toFixed(3)}`);
                    }

                    // 重新应用位置偏移
                    // 检查 currentOverrideConfig 中是否包含 positionOffset 的变化
                    // 需要检查 positionOffset 是否真的改变了，而不是仅仅存在
                    const hasPositionOffsetChange = currentOverrideConfig &&
                        currentOverrideConfig.positionOffset !== undefined &&
                        (currentOverrideConfig.positionOffset.horizontal !== undefined ||
                            currentOverrideConfig.positionOffset.vertical !== undefined);
                    const hasScaleChangeInOverride = currentOverrideConfig && currentOverrideConfig.scale !== undefined;

                    console.log("位置偏移检查:", {
                        hasPositionOffsetChange,
                        hasScaleChangeInOverride,
                        overrideConfig: overrideConfig,
                        currentOverrideConfig: currentOverrideConfig,
                        "overrideConfig.positionOffset": overrideConfig?.positionOffset,
                        "currentOverrideConfig.positionOffset": currentOverrideConfig?.positionOffset,
                        mergedConfigPositionOffset: mergedConfig.positionOffset
                    });

                    // 如果只调整了位置偏移（没有同时调整 scale），才单独处理位置偏移
                    // 如果同时调整了 scale，位置偏移会在缩放调整的部分一起应用
                    if (hasPositionOffsetChange && !hasScaleChangeInOverride) {
                        // 只有在单独调整位置偏移时才执行（没有同时调整 scale）
                        // 如果同时调整了 scale，位置偏移会在 scale 调整的部分应用
                        // 使用 mergedConfig 中的 positionOffset，因为它包含了完整的配置（合并了基础配置和覆盖配置）
                        const positionOffset = mergedConfig.positionOffset!;

                        // 尝试使用之前保存的尺寸和中心，如果没有则重新计算
                        let center: THREE.Vector3;
                        if (originalBoundingBoxCenterRef.current) {
                            // 使用原始包围盒中心（缩放前的）
                            center = originalBoundingBoxCenterRef.current.clone();
                            console.log("使用原始包围盒中心（缩放前的）");
                        } else if (model.userData.lastCalculatedCenter) {
                            center = model.userData.lastCalculatedCenter.clone();
                            console.log("使用之前计算的包围盒中心（避免重新计算）");
                        } else {
                            // 重新计算包围盒和中心（只计算网格对象）
                            const currentPos = model.position.clone();
                            model.position.set(0, 0, 0);
                            const box = getMeshBoundingBox(model);
                            center = box.getCenter(new THREE.Vector3());
                            model.position.copy(currentPos);
                            console.log("重新计算包围盒中心");
                        }

                        // 计算基础位置（居中）
                        let modelX = -center.x;
                        let modelY = -center.y;
                        let modelZ = -center.z;

                        // 应用水平偏移
                        if (width && height) {
                            const horizontalOffsetPercent = positionOffset.horizontal ?? 0.2;
                            const horizontalOffset = -(width * horizontalOffsetPercent);
                            modelX += horizontalOffset;
                            console.log("水平偏移应用:", {
                                horizontalOffsetPercent,
                                width,
                                height,
                                horizontalOffset,
                                "说明": `水平偏移 = -(width × ${horizontalOffsetPercent}) = ${horizontalOffset}`,
                                "模型X变化": `从 ${(modelX - horizontalOffset).toFixed(3)} 到 ${modelX.toFixed(3)}`
                            });
                        } else {
                            console.warn("⚠ 无法应用水平偏移：width 或 height 未定义", { width, height });
                        }

                        // 应用垂直偏移
                        const verticalOffset = positionOffset.vertical ?? -5.0;
                        const originalModelY = modelY;
                        modelY += verticalOffset;

                        // 如果是飞行单位，加上飞行高度
                        if (character.isFlying) {
                            const flightHeight = character.flightHeight ?? 0.5;
                            modelY += flightHeight;
                            console.log("飞行单位高度:", {
                                verticalOffset,
                                flightHeight,
                                最终modelY: modelY,
                                "说明": `最终Y = ${originalModelY} + ${verticalOffset} + ${flightHeight} = ${modelY}`
                            });
                        }

                        model.position.set(modelX, modelY, modelZ);
                        model.userData.verticalOffset = verticalOffset;

                        console.log(`✓ 重新应用位置偏移: horizontal=${positionOffset.horizontal}, vertical=${positionOffset.vertical}`);
                        console.log(`  模型位置: x=${modelX.toFixed(3)}, y=${modelY.toFixed(3)}, z=${modelZ.toFixed(3)}`);

                        // 位置偏移改变后，需要更新相机的 lookAt 目标，确保相机仍然看向模型
                        if (cameraRef.current) {
                            const cameraConfig = mergedConfig.camera || modelConfigRef.current?.camera || {
                                lookAtHeight: 0.25,
                                baseDistanceMultiplier: 2.0
                            };
                            const modelHeight = model.userData.lastCalculatedSize?.y || 12.7;
                            const lookAtHeight = modelHeight * (cameraConfig.lookAtHeight || 0.25);

                            if (character.isFlying) {
                                const flightHeight = character.flightHeight ?? 0.5;
                                const baseYWithoutOffset = model.position.y - flightHeight - verticalOffset;
                                const referenceTargetY = baseYWithoutOffset + flightHeight + lookAtHeight;
                                cameraRef.current.lookAt(model.position.x, referenceTargetY, model.position.z);
                            } else {
                                const baseY = model.position.y - verticalOffset;
                                const targetY = baseY + lookAtHeight;
                                cameraRef.current.lookAt(model.position.x, targetY, model.position.z);
                            }
                            cameraRef.current.updateProjectionMatrix();
                            console.log(`✓ 相机 lookAt 已更新以跟随模型新位置`);
                        }
                    } else if (hasPositionOffsetChange && hasScaleChangeInOverride) {
                        // 如果同时调整了 scale 和 positionOffset，位置偏移会在 scale 调整的部分应用
                        console.log("位置偏移将在缩放调整时一起应用");
                    } else if (!hasPositionOffsetChange) {
                        console.log("位置偏移未改变，跳过位置偏移应用");
                    }

                    // 重新调整相机位置（仅相机配置改变时）
                    if (mergedConfig.camera && cameraRef.current && !mergedConfig.scale && !hasPositionOffsetChange) {
                        // 如果已经因为缩放重新计算过相机，就不需要再次重新计算包围盒
                        // 只有在单独调整相机配置时才需要重新计算
                        const cameraConfig = mergedConfig.camera;

                        // 尝试使用之前保存的尺寸，如果没有则重新计算
                        let size: THREE.Vector3;
                        if (model.userData.lastCalculatedSize) {
                            size = model.userData.lastCalculatedSize.clone();
                            console.log("使用之前计算的包围盒尺寸（避免重新计算）");
                        } else {
                            // 重新计算包围盒（只计算网格对象）
                            const box = getMeshBoundingBox(model);
                            size = box.getSize(new THREE.Vector3());
                            console.log("重新计算包围盒尺寸");
                        }

                        const modelHeight = size.y;
                        const modelWidth = Math.max(size.x, size.z);

                        // 验证尺寸是否合理
                        if (modelHeight > 1000 || modelWidth > 1000) {
                            console.error(`✗ 错误：模型尺寸异常大，跳过相机调整`);
                            console.error(`   modelHeight: ${modelHeight.toFixed(3)}, modelWidth: ${modelWidth.toFixed(3)}`);
                            console.error(`   包围盒尺寸: x=${size.x.toFixed(3)}, y=${size.y.toFixed(3)}, z=${size.z.toFixed(3)}`);
                            console.error(`   模型scale: x=${model.scale.x.toFixed(3)}, y=${model.scale.y.toFixed(3)}, z=${model.scale.z.toFixed(3)}`);
                            return; // 跳过相机调整，避免模型消失
                        }

                        let baseDistance = 6;
                        if (width && height) {
                            const cellSize = Math.min(width, height);
                            const multiplier = cameraConfig.baseDistanceMultiplier || 2.0;
                            baseDistance = Math.max(modelHeight * multiplier, modelWidth * 1.5, cellSize * 0.8);
                        } else {
                            baseDistance = Math.max(modelHeight * 3.5, modelWidth * 3, 6);
                        }

                        // 限制相机距离的最大值，避免异常大的距离
                        const maxDistance = width && height ? Math.max(width, height) * 10 : 1000;
                        if (baseDistance > maxDistance) {
                            console.warn(`⚠ 警告：计算出的相机距离 ${baseDistance.toFixed(3)} 过大，限制为 ${maxDistance.toFixed(3)}`);
                            baseDistance = maxDistance;
                        }

                        const lookAtHeight = modelHeight * (cameraConfig.lookAtHeight || 0.25);
                        const targetY = model.position.y + lookAtHeight;

                        if (character.isFlying) {
                            const flightHeight = character.flightHeight ?? 0.5;
                            const verticalOffset = model.userData.verticalOffset || 0;
                            const baseYWithoutOffset = model.position.y - flightHeight - verticalOffset;
                            const referenceTargetY = baseYWithoutOffset + flightHeight + lookAtHeight;
                            const cameraY = referenceTargetY + 2;

                            cameraRef.current.position.set(0, cameraY, baseDistance);
                            cameraRef.current.lookAt(0, referenceTargetY, 0);
                        } else {
                            const verticalOffset = model.userData.verticalOffset || 0;
                            const baseY = model.position.y - verticalOffset;
                            const targetY = baseY + lookAtHeight;
                            const cameraY = targetY + 1.5;

                            cameraRef.current.position.set(0, cameraY, baseDistance);
                            cameraRef.current.lookAt(model.position.x, targetY, model.position.z);
                        }

                        cameraRef.current.updateProjectionMatrix();
                        console.log(`✓ 重新应用相机配置`);
                    }

                    console.log("==========================================");

                } catch (error) {
                    console.error("重新应用配置时出错:", error);
                }
            };

            applyOverrideConfig();
        }, 100); // 100ms 防抖

        return () => {
            clearTimeout(timeoutId);
        };
    }, [overrideConfig, character.isFlying, character.flightHeight, width, height]);

    // 加载模型 - 当 modelPath 改变时执行
    useEffect(() => {
        if (!sceneRef.current || !cameraRef.current) return;

        const resources = character.asset?.resource;
        const fbxPath = resources?.fbx;
        const gltfPath = resources?.gltf || resources?.glb;

        // 根据asset.type决定优先使用哪个格式
        let modelPath: string | undefined;
        if (character.asset?.type === ASSET_TYPE.GLTF) {
            // GLTF格式优先
            modelPath = gltfPath || fbxPath;
        } else {
            // FBX格式优先（或默认）
            modelPath = fbxPath || gltfPath;
        }

        if (!modelPath) {
            console.warn("没有找到模型路径，FBX:", fbxPath, "GLTF:", gltfPath);
            return;
        }

        console.log("加载模型:", modelPath, "类型:", character.asset?.type === ASSET_TYPE.GLTF ? "GLTF" : "FBX");
        const isGLTF = modelPath.endsWith('.gltf') || modelPath.endsWith('.glb');

        // 通用的模型处理函数
        const processModel = async (model: THREE.Group | THREE.Object3D) => {
            // 保存模型路径，供后续重新应用配置使用
            modelPathRef.current = modelPath;

            // 重置所有 ref，确保每次加载新模型时都会重新保存初始值
            originalCameraDistanceRef.current = null;
            originalConfigScaleRef.current = null;
            originalBoundingBoxSizeRef.current = null;
            originalBoundingBoxCenterRef.current = null;
            console.log(`重置所有 ref，准备保存新模型的初始值`);

            // 加载模型配置（使用实际加载的模型路径）
            console.log("========== 加载模型配置 ==========");
            console.log("模型路径:", modelPath);
            // 在开发环境中，每次都强制重新加载配置以避免缓存问题
            const forceReload = process.env.NODE_ENV === 'development' || true; // 总是强制重新加载以避免缓存
            const modelConfig = await loadModelConfig(modelPath, forceReload);
            console.log("配置加载结果:", modelConfig ? "成功" : "失败");
            if (modelConfig) {
                console.log("✓ 配置中的 scale 值:", modelConfig.scale);
            }

            if (modelConfig) {
                console.log("✓ 成功加载模型配置:", {
                    scale: modelConfig.scale,
                    useFullClip: modelConfig.animationExtraction?.useFullClip,
                    strategy: modelConfig.animationExtraction?.strategy,
                    positionOffset: modelConfig.positionOffset,
                    camera: modelConfig.camera,
                    "位置偏移详情": {
                        horizontal: modelConfig.positionOffset?.horizontal,
                        vertical: modelConfig.positionOffset?.vertical,
                        "说明": "vertical正值向上，负值向下"
                    }
                });
            } else {
                console.warn("⚠ 未找到模型配置，使用默认值");
            }

            // 使用配置或默认值
            const baseConfig: ModelConfig = modelConfig || {
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

            // 合并 overrideConfig（编辑器中的配置优先级最高）
            const currentOverrideConfig = overrideConfigRef.current || overrideConfig;
            const config: ModelConfig = currentOverrideConfig
                ? deepMerge(baseConfig, currentOverrideConfig)
                : baseConfig;

            // 保存当前配置，供后续重新应用配置使用
            modelConfigRef.current = { ...config }; // 深拷贝避免引用问题
            modelPathRef.current = modelPath;

            // 通知父组件配置已加载完成
            if (onConfigReady) {
                onConfigReady({ ...config });
            }

            if (overrideConfig) {
                console.log("✓ 应用配置覆盖（编辑器配置）:", overrideConfig);
            }

            // 验证配置中的 positionOffset 是否正确
            if (config.positionOffset) {
                console.log("✓ 配置中的 positionOffset 已加载:", {
                    horizontal: config.positionOffset.horizontal,
                    vertical: config.positionOffset.vertical,
                    "来源": modelConfig ? "模型特定配置" : "默认配置"
                });
            } else {
                console.warn("⚠ 配置中没有 positionOffset，使用默认值");
            }

            // 关键：在加载新模型前，先清理旧的动画混合器和所有 actions
            if (mixerRef.current) {
                console.log('清理旧的动画混合器...');
                // 停止所有动画
                mixerRef.current.stopAllAction();
                // 停止并重置所有注册的 actions
                Object.values(actionsRef.current).forEach(action => {
                    if (action) {
                        action.stop();
                        action.reset();
                        action.setEffectiveWeight(0);
                        action.enabled = false;
                    }
                });
                // 清理 actions 引用
                actionsRef.current = {};
                // 注意：AnimationMixer 没有 dispose 方法，但我们可以停止所有 action 并清空引用
                mixerRef.current = undefined;
                console.log('✓ 旧的动画混合器已清理');
            }

            if (modelRef.current) {
                // 清理之前的模型
                if (modelRef.current.userData?.hoverAnimation) {
                    modelRef.current.userData.hoverAnimation.kill();
                }
                sceneRef.current?.remove(modelRef.current);
            }

            // 创建动画混合器
            // GLTF格式：动画可能在userData中或直接访问
            const animations = (model as any).animations || model.userData?.animations || [];

            if (animations && animations.length > 0) {
                console.log("创建动画混合器，动画数量:", animations.length);
                console.log("可用动画列表:", animations.map((clip: THREE.AnimationClip) => clip.name || "未命名"));

                const mixer = new THREE.AnimationMixer(model);
                mixerRef.current = mixer;

                // 动画名称映射：将GLB中的动画名称映射到标准动作名称
                // 扩展映射规则，支持更多可能的动画名称
                const animationNameMap: { [key: string]: string[] } = {
                    'move': ['move', 'walk', 'run', 'running', 'move_forward', 'locomotion', 'walking', 'run_forward', '前进', '移动'],
                    'stand': ['stand', 'idle', 'Idle', 'IDLE', 'idle_loop', 'stand_idle', 'wait', 'waiting', '待机', '静止'],
                    'attack': ['attack', 'Attack', 'ATTACK', 'attack1', 'attack_01', 'combat', 'hit', 'strike', '攻击', '打击']
                };

                // 存储所有动画，并使用标准名称
                // 重要：创建action时不要自动播放，只注册
                // 关键修复：每个标准名称应该使用独立的action，避免多个标准名称指向同一个action
                // 关键修复2：不要创建原始名称的action，只创建标准名称的action，避免干扰
                animations.forEach((clip: THREE.AnimationClip, index: number) => {
                    const originalName = clip.name || `animation_${index}`;

                    // 不再创建原始名称的action，避免干扰
                    // 只用于查找和映射到标准名称
                    const allTrackNames = clip.tracks.map(t => t.name);
                    console.log(`发现动画clip（原始名称）: ${originalName}`, {
                        时长: clip.duration,
                        轨道数: clip.tracks.length,
                        前10个轨道名称: allTrackNames.slice(0, 10), // 显示前10个轨道
                        所有轨道名称: allTrackNames // 显示所有轨道名称用于调试
                    });

                    // 检查轨道名称，看是否能识别出不同的动画片段
                    // FBX模型通常轨道名称包含骨骼名称，如果模型有多个动画片段混合，可能需要使用subclip
                    const hasIdleTrack = allTrackNames.some(name => name.toLowerCase().includes('idle'));
                    const hasWalkTrack = allTrackNames.some(name => name.toLowerCase().includes('walk') || name.toLowerCase().includes('run'));
                    const hasAttackTrack = allTrackNames.some(name => name.toLowerCase().includes('attack'));
                    console.log('轨道分析:', { hasIdleTrack, hasWalkTrack, hasAttackTrack });

                    // 尝试映射到标准名称
                    // 重要：每个标准名称只映射一次，如果已经映射过就跳过
                    for (const [standardName, possibleNames] of Object.entries(animationNameMap)) {
                        if (possibleNames.some(name => originalName.toLowerCase().includes(name.toLowerCase()))) {
                            // 如果映射到标准名称，且该标准名称还没有被映射，才进行映射
                            // 这样可以避免多个标准名称指向同一个action
                            if (!actionsRef.current[standardName]) {
                                // 为每个标准名称创建独立的action（即使它们来自同一个clip）
                                const standardAction = mixer.clipAction(clip);
                                standardAction.stop();
                                standardAction.reset();
                                standardAction.setEffectiveWeight(0);
                                standardAction.enabled = false;

                                actionsRef.current[standardName] = standardAction;
                                console.log(`映射动画: ${originalName} -> ${standardName} (创建独立action)`);
                            } else {
                                console.log(`跳过映射: ${originalName} -> ${standardName} (${standardName}已存在)`);
                            }
                            break; // 一个clip只能映射到一个标准名称
                        }
                    }
                });

                // 如果没有找到标准名称的动画，使用索引映射（适用于FBX格式的动画名称）
                // FBX格式通常：第一个动画可能是idle/base，其他是动作动画
                if (!actionsRef.current['stand'] || !actionsRef.current['move']) {
                    console.log("未找到标准动画名称，尝试索引映射...");

                    // 存储分析结果，供后续使用（用于提取move和attack）
                    let analyzedSegments: AnimationSegment[] = [];
                    let analyzedClip: THREE.AnimationClip | null = null;

                    // 使用配置中的动画提取策略
                    const useFullClip = config.animationExtraction?.useFullClip || false;
                    const extractionStrategy = config.animationExtraction?.strategy || "auto";
                    const fps = config.animationExtraction?.fps || 30;
                    const thresholds = config.animationExtraction?.autoExtractionThresholds || {
                        minDuration: 5.0,
                        minTracks: 50,
                        defaultStandEnd: 2.0,
                        defaultStandEndPercent: 0.1,
                        minFrameCount: 10
                    };

                    console.log("动画提取配置:", {
                        useFullClip,
                        extractionStrategy,
                        fps,
                        thresholds,
                        modelPath
                    });

                    // 选择主动画clip：优先选择轨道数最多的（包含完整骨骼动画），而不是仅按时长
                    // 因为有些模型的根节点动画（只有3个轨道）可能和主动画时长相同
                    // 排序策略：1. 轨道数最多 2. 时长最长
                    const sortedByTracks = [...animations].sort((a, b) => {
                        if (b.tracks.length !== a.tracks.length) {
                            return b.tracks.length - a.tracks.length; // 轨道数多的优先
                        }
                        return b.duration - a.duration; // 轨道数相同时，时长长的优先
                    });

                    console.log("动画clip排序（按轨道数和时长）:", sortedByTracks.map(clip => ({
                        name: clip.name,
                        duration: clip.duration.toFixed(2),
                        tracks: clip.tracks.length,
                        trackNames: clip.tracks.slice(0, 3).map((t: THREE.KeyframeTrack) => t.name)
                    })));

                    // 优先选择轨道数最多的clip作为主动画（包含完整骨骼动画）
                    // 对于GLB格式，通常有多个clip（root、root1、IK链等），应该使用轨道数最多的
                    if (!actionsRef.current['stand'] && sortedByTracks.length > 0) {
                        const standClip = sortedByTracks[0];
                        console.log(`✓ 选择主动画clip: ${standClip.name} (${standClip.tracks.length}个轨道, ${standClip.duration.toFixed(2)}秒)`);

                        // 关键：为stand创建独立的action，即使它可能和move来自同一个clip

                        // 关键修复：如果clip时长很长（>5秒）且有很多轨道，可能包含多个动画片段
                        // 使用轨道数据分析识别动画片段
                        let actionClip = standClip;
                        let standStart = 0;
                        let standEnd = standClip.duration;

                        // 如果动画时长很长且有很多轨道，可能包含多个动画片段
                        // 但为了确保动画有效，如果提取失败或无效，使用完整clip
                        if (!useFullClip && standClip.duration > thresholds.minDuration && standClip.tracks.length > thresholds.minTracks) {
                            console.log(`检测到长动画clip，尝试分析片段: ${standClip.name}, 时长: ${standClip.duration.toFixed(2)}s, 轨道数: ${standClip.tracks.length}`);
                            // 尝试从配置加载动画片段
                            let cachedSegments: AnimationSegment[] | null = null;

                            // 优先从新配置文件加载（异步）
                            if (config.animationExtraction?.useCachedSegments !== false) {
                                cachedSegments = await loadAnimationSegmentsFromConfig(modelPath, standClip.name, standClip.duration);
                            }

                            // 如果新配置文件没有，尝试从旧配置或localStorage加载（同步）
                            if (!cachedSegments || cachedSegments.length === 0) {
                                cachedSegments = loadAnimationSegments(modelPath, standClip.name, standClip.duration);
                            }

                            if (cachedSegments && cachedSegments.length > 0) {
                                // 使用缓存的片段
                                analyzedSegments = cachedSegments;
                                analyzedClip = standClip;
                                console.log(`✓ 使用缓存的动画片段分析结果 (${analyzedSegments.length}个片段)`);
                            } else {
                                // 缓存不存在或无效，重新分析
                                console.log(`开始分析动画片段: ${standClip.name}, 时长: ${standClip.duration.toFixed(2)}s, 轨道数: ${standClip.tracks.length}`);
                                analyzedSegments = analyzeAnimationSegments(standClip);
                                analyzedClip = standClip;

                                // 保存分析结果到缓存
                                if (analyzedSegments.length > 0) {
                                    saveAnimationSegments(modelPath, standClip.name, standClip.duration, analyzedSegments);
                                    console.log(`✓ 已保存分析结果到缓存 (${analyzedSegments.length}个片段)`);

                                    // 导出为 model_config.json 格式，方便手动添加到配置文件
                                    const configFormat = exportAnimationSegmentsToModelConfig(
                                        modelPath,
                                        standClip.name,
                                        standClip.duration,
                                        analyzedSegments
                                    );
                                    console.log(`========== 动画片段配置（可复制到 model_config.json）==========`);
                                    console.log(`模型路径: ${modelPath}`);
                                    console.log(`Clip名称: ${standClip.name}`);
                                    console.log(JSON.stringify(configFormat, null, 2));
                                    console.log(`========================================================`);

                                    // 同时在全局对象中暴露，方便手动复制
                                    (window as any).__akedia_animation_segments__ = configFormat;
                                    console.log(`✓ 动画片段配置已保存到 window.__akedia_animation_segments__，可在控制台查看`);
                                } else {
                                    console.warn(`⚠ 动画片段分析未识别到任何片段，将使用完整clip或经验值`);
                                }
                            }

                            // 查找stand片段
                            const standSegment = analyzedSegments.find(s => s.name === 'stand');
                            if (standSegment && standSegment.confidence > 0.5) {
                                standStart = standSegment.start;
                                standEnd = standSegment.end;
                                console.log(`✓ 通过轨道分析识别stand片段: ${standStart.toFixed(2)}s - ${standEnd.toFixed(2)}s (置信度: ${standSegment.confidence.toFixed(2)})`);

                                // 立即使用subclip提取stand动画片段
                                try {
                                    const startFrame = Math.floor(standStart * fps);
                                    const endFrame = Math.floor(standEnd * fps);

                                    // 验证提取范围是否合理
                                    if (endFrame > startFrame && endFrame - startFrame >= thresholds.minFrameCount) {
                                        actionClip = THREE.AnimationUtils.subclip(
                                            standClip,
                                            'stand_idle',
                                            startFrame,
                                            endFrame,
                                            fps
                                        );
                                        console.log(`✓ 使用subclip提取stand动画: ${standStart.toFixed(2)}s-${standEnd.toFixed(2)}s (${startFrame}-${endFrame}帧, ${actionClip.duration.toFixed(2)}s, ${actionClip.tracks.length}个轨道) (${standClip.name})`);

                                        // 验证提取的clip是否有效（至少有一些轨道）
                                        if (actionClip.tracks.length === 0) {
                                            console.warn('提取的clip没有轨道，使用完整clip');
                                            actionClip = standClip;
                                        }
                                    } else {
                                        console.warn(`提取范围不合理 (${startFrame}-${endFrame}帧)，使用完整clip`);
                                        actionClip = standClip;
                                    }
                                } catch (error) {
                                    console.warn('subclip提取失败，使用完整clip:', error);
                                    actionClip = standClip; // 如果subclip失败，使用完整clip
                                }
                            } else {
                                // 如果分析失败，使用配置中的经验值
                                standEnd = Math.min(thresholds.defaultStandEnd, standClip.duration * thresholds.defaultStandEndPercent);
                                console.log(`⚠ 轨道分析未找到stand片段，使用经验值: 0-${standEnd.toFixed(2)}s`);

                                // 如果经验值范围太小（<1秒），直接使用完整clip
                                if (standEnd < 1.0) {
                                    console.log(`⚠ 经验值范围太小，直接使用完整clip (${standClip.duration.toFixed(2)}s)`);
                                    actionClip = standClip;
                                } else {
                                    // 使用subclip提取stand动画
                                    try {
                                        const startFrame = Math.floor(standStart * fps);
                                        const endFrame = Math.floor(standEnd * fps);

                                        // 验证提取范围是否合理
                                        if (endFrame <= startFrame || endFrame - startFrame < thresholds.minFrameCount) {
                                            console.warn(`提取范围不合理 (${startFrame}-${endFrame}帧)，使用完整clip`);
                                            actionClip = standClip;
                                        } else {
                                            actionClip = THREE.AnimationUtils.subclip(
                                                standClip,
                                                'stand_idle',
                                                startFrame,
                                                endFrame,
                                                fps
                                            );
                                            console.log(`✓ 使用subclip提取stand动画: ${standStart.toFixed(2)}s-${standEnd.toFixed(2)}s (${startFrame}-${endFrame}帧, ${actionClip.duration.toFixed(2)}s, ${actionClip.tracks.length}个轨道) (${standClip.name})`);

                                            // 验证提取的clip是否有效（至少有一些轨道）
                                            if (actionClip.tracks.length === 0) {
                                                console.warn('提取的clip没有轨道，使用完整clip');
                                                actionClip = standClip;
                                            }
                                        }
                                    } catch (error) {
                                        console.warn('subclip提取失败，使用完整clip:', error);
                                        actionClip = standClip; // 如果subclip失败，使用完整clip
                                    }
                                }
                            }

                            // 如果actionClip仍未设置，使用完整clip
                            if (!actionClip) {
                                actionClip = standClip;
                                console.log(`使用完整clip作为stand动画: ${standClip.name}, 时长: ${standClip.duration.toFixed(2)}s, 轨道数: ${standClip.tracks.length}`);
                            }
                        } else if (useFullClip) {
                            // 对于 akedia 模型，直接使用完整 clip，只创建 stand action
                            actionClip = standClip;
                            console.log(`✓ 对于 ${modelPath}，直接使用完整clip，跳过片段提取`);
                            console.log(`  完整clip: ${standClip.name}, 时长: ${standClip.duration.toFixed(2)}s, 轨道数: ${standClip.tracks.length}`);
                            // 重要：对于 useFullClip 的模型，只使用 stand action，不创建 move 或 attack action
                            // 因为完整 clip 包含了所有动画片段，如果创建多个 action 会导致冲突
                        }

                        // 确保 actionClip 已设置
                        if (!actionClip) {
                            actionClip = standClip;
                            console.warn(`⚠ actionClip未设置，使用完整clip: ${standClip.name}`);
                        }

                        const idleAction = mixer.clipAction(actionClip);
                        // 确保新创建的action被停止和重置
                        idleAction.stop();
                        idleAction.reset();
                        idleAction.setEffectiveWeight(0);
                        idleAction.enabled = false; // 禁用action
                        actionsRef.current['stand'] = idleAction;

                        // 调试：检查动画轨道是否匹配模型对象
                        const trackNames = actionClip.tracks.slice(0, 5).map((t: THREE.KeyframeTrack) => t.name);
                        const modelObjectNames: string[] = [];
                        model.traverse((child) => {
                            if (child instanceof THREE.Object3D) {
                                modelObjectNames.push(child.name);
                            }
                        });
                        console.log(`✓ 创建stand action: ${actionClip.name}, 时长: ${actionClip.duration.toFixed(2)}s, 轨道数: ${actionClip.tracks.length}, 原始clip: ${standClip.name}`);
                        console.log(`  动画轨道示例 (前5个):`, trackNames);
                        console.log(`  模型对象名称 (前10个):`, modelObjectNames.slice(0, 10));

                        // 检查轨道名称是否能匹配模型对象
                        const matchingObjects = modelObjectNames.filter((name: string) =>
                            trackNames.some((trackName: string) => trackName.includes(name) || name.includes(trackName.split('.')[0]))
                        );
                        if (matchingObjects.length > 0) {
                            console.log(`  ✓ 找到匹配的对象:`, matchingObjects);
                        } else {
                            console.warn(`  ⚠ 未找到匹配的对象，动画可能无法应用！`);
                        }
                    }

                    // 对于 useFullClip 的模型（如 akedia），只使用 stand action，不创建 move 或 attack action
                    // 因为完整 clip 包含了所有动画片段，如果创建多个 action 会导致冲突
                    if (useFullClip) {
                        console.log(`⚠ useFullClip=true，跳过创建 move 和 attack action，只使用 stand action`);
                    }

                    if (!useFullClip) {
                        // 如果有多个动画，第二个或后续的动画可能是移动动画
                        if (!actionsRef.current['move'] && sortedByTracks.length > 1) {
                            // 尝试找一个轨道数较多的动画（不是第一个，通常第一个是stand）
                            // 优先选择轨道数较多的动画作为移动动画
                            const moveCandidate = sortedByTracks.find((clip, idx) => {
                                if (idx === 0) return false; // 跳过第一个（通常是stand）
                                // 选择轨道数较多的动画（至少要有一定数量的轨道才能包含动画）
                                return clip.tracks.length >= 10; // 至少10个轨道才可能是有效的动画
                            }) || sortedByTracks[1]; // 如果没找到，使用第二个

                            if (moveCandidate) {
                                // 关键：为move创建独立的action，即使它可能和stand来自同一个clip
                                const moveAction = mixer.clipAction(moveCandidate);
                                // 确保新创建的action被停止和重置
                                moveAction.stop();
                                moveAction.reset();
                                moveAction.setEffectiveWeight(0);
                                moveAction.enabled = false; // 禁用action
                                actionsRef.current['move'] = moveAction;
                                console.log(`使用动画作为move (${moveCandidate.name}, 时长: ${moveCandidate.duration.toFixed(2)}s, 轨道数: ${moveCandidate.tracks.length})`);
                            }
                        }

                        // 如果只有一个动画clip，但通过分析识别到了move片段，尝试提取move片段
                        // 或者如果有多个clip但都是同一个长动画的不同部分，也需要从分析结果中提取
                        if (!actionsRef.current['move'] && analyzedClip && analyzedSegments.length > 0) {
                            console.log('尝试从分析结果中提取move片段...', {
                                hasAnalyzedClip: !!analyzedClip,
                                analyzedSegmentsCount: analyzedSegments.length,
                                analyzedSegments: analyzedSegments.map(s => `${s.name}(${s.start.toFixed(2)}s-${s.end.toFixed(2)}s, 置信度:${s.confidence.toFixed(2)})`)
                            });

                            const moveSegment = analyzedSegments.find(s => s.name === 'move');
                            console.log('查找move片段:', moveSegment);

                            if (moveSegment && moveSegment.confidence > 0.5) {
                                // 使用subclip提取move动画片段
                                try {
                                    const startFrame = Math.floor(moveSegment.start * fps);
                                    const endFrame = Math.floor(moveSegment.end * fps);

                                    if (endFrame > startFrame && endFrame - startFrame >= thresholds.minFrameCount) {
                                        const moveClip = THREE.AnimationUtils.subclip(
                                            analyzedClip,
                                            'move_walk',
                                            startFrame,
                                            endFrame,
                                            fps
                                        );

                                        // 验证提取的clip是否有效
                                        if (moveClip.tracks.length > 0) {
                                            const moveAction = mixer.clipAction(moveClip);
                                            moveAction.stop();
                                            moveAction.reset();
                                            moveAction.setEffectiveWeight(0);
                                            moveAction.enabled = false;
                                            actionsRef.current['move'] = moveAction;
                                            console.log(`✓ 通过轨道分析提取move片段: ${moveSegment.start.toFixed(2)}s-${moveSegment.end.toFixed(2)}s (${startFrame}-${endFrame}帧, ${moveClip.duration.toFixed(2)}s, ${moveClip.tracks.length}个轨道, 置信度: ${moveSegment.confidence.toFixed(2)})`);
                                        } else {
                                            console.warn('提取的move clip没有轨道，跳过');
                                        }
                                    } else {
                                        console.warn(`move片段范围不合理 (${startFrame}-${endFrame}帧)，跳过提取`);
                                    }
                                } catch (error) {
                                    console.warn('subclip提取move片段失败:', error);
                                }
                            } else {
                                console.log(`move片段未识别到或置信度不足`, moveSegment ? `置信度: ${moveSegment.confidence}` : '片段不存在');
                            }
                        }

                        // 同样尝试提取 attack 片段
                        if (!actionsRef.current['attack'] && analyzedClip && analyzedSegments.length > 0) {
                            const attackSegment = analyzedSegments.find(s => s.name === 'attack');
                            if (attackSegment && attackSegment.confidence > 0.5) {
                                try {
                                    const startFrame = Math.floor(attackSegment.start * fps);
                                    const endFrame = Math.floor(attackSegment.end * fps);

                                    if (endFrame > startFrame && endFrame - startFrame >= thresholds.minFrameCount) {
                                        const attackClip = THREE.AnimationUtils.subclip(
                                            analyzedClip,
                                            'attack',
                                            startFrame,
                                            endFrame,
                                            fps
                                        );

                                        if (attackClip.tracks.length > 0) {
                                            const attackAction = mixer.clipAction(attackClip);
                                            attackAction.stop();
                                            attackAction.reset();
                                            attackAction.setEffectiveWeight(0);
                                            attackAction.enabled = false;
                                            actionsRef.current['attack'] = attackAction;
                                            console.log(`✓ 通过轨道分析提取attack片段: ${attackSegment.start.toFixed(2)}s-${attackSegment.end.toFixed(2)}s (${startFrame}-${endFrame}帧, ${attackClip.duration.toFixed(2)}s, ${attackClip.tracks.length}个轨道, 置信度: ${attackSegment.confidence.toFixed(2)})`);
                                        }
                                    }
                                } catch (error) {
                                    console.warn('subclip提取attack片段失败:', error);
                                }
                            }
                        }

                        // 如果分析完成且有结果，导出为 model_config.json 格式
                        if (analyzedClip && analyzedSegments.length > 0 && !useFullClip) {
                            const configFormat = exportAnimationSegmentsToModelConfig(
                                modelPath,
                                analyzedClip.name,
                                analyzedClip.duration,
                                analyzedSegments
                            );
                            console.log(`========== 动画片段配置（可复制到 model_config.json）==========`);
                            console.log(`模型路径: ${modelPath}`);
                            console.log(`Clip名称: ${analyzedClip.name}`);
                            console.log(`识别到的片段: ${analyzedSegments.map(s => `${s.name}(${s.start.toFixed(2)}s-${s.end.toFixed(2)}s, 置信度:${s.confidence.toFixed(2)})`).join(', ')}`);
                            console.log(`\n复制以下内容到 model_config.json 的 "animationSegments" 字段:`);
                            console.log(JSON.stringify(configFormat, null, 2));
                            console.log(`========================================================`);

                            // 同时在全局对象中暴露，方便手动复制
                            (window as any).__animation_segments_config__ = configFormat;
                            (window as any).__animation_segments_modelPath__ = modelPath;
                            (window as any).__animation_segments_clipName__ = analyzedClip.name;
                            console.log(`✓ 动画片段配置已保存到全局对象:`);
                            console.log(`  - window.__animation_segments_config__ (配置对象)`);
                            console.log(`  - window.__animation_segments_modelPath__ (模型路径)`);
                            console.log(`  - window.__animation_segments_clipName__ (clip名称)`);
                            console.log(`  可在控制台使用 copy(JSON.stringify(window.__animation_segments_config__, null, 2)) 复制`);
                        } else if (!actionsRef.current['move'] && animations.length > 0) {
                            // 如果只有一个动画clip，且已经映射到stand了，就不应该再映射到move
                            // 因为同一个clip的多个action实例在Three.js中可能会互相影响
                            // 解决方案：当只有一个动画时，只映射到stand，move留空
                            if (actionsRef.current['stand']) {
                                console.log(`只有一个动画clip，已映射到stand，move将不映射（避免冲突）`);
                                console.warn(`警告：只有一个动画clip "${actionsRef.current['stand'].getClip().name}"，move未映射。如果需要移动动画，请使用stand动画或添加更多动画clip。`);
                                // move不映射，留空
                                // 这样在播放stand时，不会有move的action干扰
                            } else {
                                // 如果stand不存在（这不应该发生），才设为move
                                const onlyClip = animations[0];
                                const onlyAction = mixer.clipAction(onlyClip);
                                onlyAction.stop();
                                onlyAction.reset();
                                onlyAction.setEffectiveWeight(0);
                                onlyAction.enabled = false;
                                actionsRef.current['move'] = onlyAction;
                                console.log(`只有一个动画，设为move: ${onlyClip.name}`);
                            }
                        }
                    } else {
                        // useFullClip 为 true 时，只使用 stand action，不创建 move 或 attack action
                        console.log(`✓ 对于 ${modelPath}（useFullClip=true），只使用 stand action，跳过 move 和 attack action 的创建`);
                    }
                }

                // 重要：在创建animator之前，确保所有action都被完全停止
                // 多次停止以确保所有actions都被停止（包括mixer中未注册的）
                for (let i = 0; i < 5; i++) {
                    mixer.stopAllAction();
                    Object.values(actionsRef.current).forEach(action => {
                        if (action) {
                            action.stop();
                            action.reset();
                            action.setEffectiveWeight(0);
                            action.enabled = false;
                        }
                    });
                }

                mixer.stopAllAction(); // 最后一次确保停止

                // 创建animator并设置给角色
                // 关键修复：只传递标准名称的actions给animator，不包括原始名称的actions
                // 这样可以避免原始名称的action（如'Take 001'）干扰标准名称的action（如'stand'）
                // 原始名称的action只用于查找和映射，不应该传递给animator
                const standardActions: { [key: string]: THREE.AnimationAction } = {};
                ['stand', 'move', 'attack'].forEach(name => {
                    if (actionsRef.current[name]) {
                        standardActions[name] = actionsRef.current[name];
                    }
                });

                // 确保原始名称的actions也被停止（虽然不传递给animator，但它们可能仍在运行）
                Object.keys(actionsRef.current).forEach(key => {
                    if (!['stand', 'move', 'attack'].includes(key)) {
                        const originalAction = actionsRef.current[key];
                        if (originalAction) {
                            originalAction.stop();
                            originalAction.reset();
                            originalAction.setEffectiveWeight(0);
                            originalAction.enabled = false;
                            console.log(`停止原始名称的action: ${key}`);
                        }
                    }
                });

                // 最后再次确保所有action都被停止（包括mixer中所有未注册的actions）
                mixer.stopAllAction();

                console.log("传递给animator的actions（仅标准名称）:", Object.keys(standardActions));
                console.log("所有actions（包括原始名称）:", Object.keys(actionsRef.current));

                // 验证move action是否存在
                if (standardActions['move']) {
                    console.log('✓ move action已准备好，将传递给animator');
                } else {
                    console.warn('⚠ move action不存在，animator将没有move动画');
                    console.warn('  - actionsRef.current中的keys:', Object.keys(actionsRef.current));
                    console.warn('  - standardActions中的keys:', Object.keys(standardActions));
                }

                character.animator = new ThreeDModelAnimator(mixer, standardActions);

                // 验证animator中的actions
                if (character.animator) {
                    console.log('✓ animator已创建');
                    console.log('  - animator中的actions:', Object.keys((character.animator as any).actions || {}));

                    // 通知父组件animator已就绪
                    if (onAnimatorReady) {
                        onAnimatorReady(character.animator);
                        console.log('✓ 已通知父组件animator已就绪');
                    }
                }

                // 默认播放待机动画（角色初始状态应该是站立）
                // 延迟一下确保模型已经添加到场景，然后使用animator统一管理动画
                // 注意：这个setTimeout只在模型首次加载时执行，不会在移动过程中执行
                const initStandTimeout = setTimeout(() => {
                    if (character.animator && mixer) {
                        // 关键修复：在播放stand之前，确保mixer中所有action都被完全停止
                        // 包括原始名称的action（如'Take 001'），即使它们不在animator的actions中
                        mixer.stopAllAction();

                        // 再次停止所有actionsRef中的action（包括原始名称的）
                        Object.values(actionsRef.current).forEach(action => {
                            if (action) {
                                action.stop();
                                action.reset();
                                action.setEffectiveWeight(0);
                                action.enabled = false;
                            }
                        });

                        // 最后一次确保mixer中所有action都被停止
                        mixer.stopAllAction();

                        // 验证：检查mixer中是否有action在运行
                        console.log("初始化播放stand前验证:");
                        console.log("- actionsRef中的actions:", Object.keys(actionsRef.current));

                        // 检查所有actionsRef中的action状态
                        Object.entries(actionsRef.current).forEach(([name, action]) => {
                            if (action) {
                                console.log(`- action "${name}": isRunning=${action.isRunning()}, enabled=${action.enabled}, weight=${action.getEffectiveWeight()}, clip=${action.getClip().name}`);
                            }
                        });

                        // 使用animator的stand方法，确保只播放站立动画，不会同时播放其他动画
                        character.animator.stand();
                        console.log("✓ 初始化：播放待机动画");

                        // 延迟验证：检查播放后是否有其他action在运行
                        setTimeout(() => {
                            console.log("初始化播放stand后验证（100ms后）:");
                            Object.entries(actionsRef.current).forEach(([name, action]) => {
                                if (action) {
                                    const isRunning = action.isRunning();
                                    const enabled = action.enabled;
                                    const weight = action.getEffectiveWeight();
                                    const clipName = action.getClip().name;
                                    if (isRunning || weight > 0) {
                                        console.log(`- action "${name}": isRunning=${isRunning}, enabled=${enabled}, weight=${weight}, clip=${clipName}`);
                                    }
                                }
                            });
                        }, 200);
                    } else {
                        console.warn("⚠ 角色没有animator，无法播放动画");
                    }
                }, 100);

                // 输出最终的动画映射结果
                console.log("最终动画映射:", {
                    stand: actionsRef.current['stand'] ? actionsRef.current['stand'].getClip().name : "未找到",
                    move: actionsRef.current['move'] ? actionsRef.current['move'].getClip().name : "未找到",
                    attack: actionsRef.current['attack'] ? actionsRef.current['attack'].getClip().name : "未找到"
                });

                // 检查是否有重复映射（多个标准名称指向同一个action）
                const actionMap = new Map();
                ['stand', 'move', 'attack'].forEach(name => {
                    const action = actionsRef.current[name];
                    if (action) {
                        const clipName = action.getClip().name;
                        if (!actionMap.has(clipName)) {
                            actionMap.set(clipName, []);
                        }
                        actionMap.get(clipName).push(name);
                    }
                });

                // 检查是否有重复
                actionMap.forEach((names, clipName) => {
                    if (names.length > 1) {
                        console.warn(`警告：多个标准名称映射到同一个动画clip "${clipName}":`, names);
                        console.warn('这可能导致播放一个动画时看起来所有动画都在播放');
                    }
                });

                // animator已在上面创建，这里不需要重复创建
            } else if (model instanceof THREE.Group && (model as any).animations) {
                // FBX模型的动画处理
                const mixer = new THREE.AnimationMixer(model);
                mixerRef.current = mixer;
                const animations = (model as any).animations;
                if (animations && animations.length) {
                    animations.forEach((clip: THREE.AnimationClip, index: number) => {
                        const action = mixer.clipAction(
                            THREE.AnimationUtils.subclip(clip, 'idle', 300, 330, 30)
                        );
                        actionsRef.current["move"] = action;
                        character.animator = new ThreeDModelAnimator(mixer, actionsRef.current);
                    });
                } else {
                    console.warn('No animations found in model!');
                }
            }

            // 计算缩放和位置
            let box = new THREE.Box3().setFromObject(model);
            let size = box.getSize(new THREE.Vector3());
            let center = box.getCenter(new THREE.Vector3());

            console.log("模型尺寸:", size);
            console.log("模型中心:", center);

            const maxDim = Math.max(size.x, size.y, size.z);
            // 根据使用场景调整缩放比例
            // Character3DDemo使用默认缩放，CharacterWalkDemo需要更大的模型以适应60px的格子
            let targetSize = 3; // 默认目标尺寸（适合独立展示）

            if (width && height) {
                // 如果在格子地图上使用，使用格子大小的更大比例作为目标尺寸
                const cellSize = Math.min(width, height);
                // 显著增大目标尺寸，使模型占据格子的更大比例
                // 使用适中的倍数，让模型清晰可见但不会超出视野
                // 格子60px，目标90px（1.5倍），这样模型会清晰可见
                targetSize = cellSize * 1.5; // 模型占据格子的150%，清晰可见
                console.log("地图场景 - 格子大小:", cellSize, "目标尺寸:", targetSize, "期望模型尺寸为格子的1.5倍");
            }

            const scale = maxDim > 0 ? targetSize / maxDim : 1;
            console.log("计算缩放:", scale, "目标尺寸:", targetSize, "原始尺寸:", maxDim, "场景:", width && height ? "地图" : "独立");

            if (maxDim > 0) {
                model.scale.multiplyScalar(scale);

                // 重新计算缩放后的尺寸用于验证
                box = new THREE.Box3().setFromObject(model);
                const scaledSize = box.getSize(new THREE.Vector3());
                console.log("缩放后模型尺寸:", scaledSize, "缩放后最大尺寸:", Math.max(scaledSize.x, scaledSize.y, scaledSize.z));
            }

            // 如果有scaleX属性，应用额外缩放（用于角色数据中的scaleX）
            // scaleX用于在地图上调整角色显示大小
            // 使用配置文件中的 scale（优先）或 character.scaleX（向后兼容）
            const modelScale = config.scale !== undefined ? config.scale : (character.scaleX ?? 1.0);
            const baseScale = scale;

            // 保存基础缩放值，供后续重新应用配置使用
            baseScaleRef.current = baseScale;

            // 保存原始配置中的 scale 值（用于绝对缩放计算）
            if (originalConfigScaleRef.current === null) {
                originalConfigScaleRef.current = modelScale;
                console.log(`✓ 保存原始配置 scale: ${modelScale.toFixed(3)}`);
            }

            console.log("========== 模型缩放配置检查 ==========");
            console.log("配置中的 scale:", config.scale, typeof config.scale);
            console.log("character.scaleX:", character.scaleX, typeof character.scaleX);
            console.log("最终使用的 modelScale:", modelScale, typeof modelScale);
            console.log("基础缩放（baseScale）:", baseScale);
            console.log("缩放来源:", config.scale !== undefined && config.scale !== null ? "配置文件" : (character.scaleX !== undefined && character.scaleX !== null ? "character.scaleX" : "默认值1.0"));
            console.log("=====================================");

            if (modelScale !== 1.0) {
                // 保存应用缩放前的尺寸
                box = new THREE.Box3().setFromObject(model);
                const beforeScaleSize = box.getSize(new THREE.Vector3());
                const beforeMaxDim = Math.max(beforeScaleSize.x, beforeScaleSize.y, beforeScaleSize.z);

                model.scale.multiplyScalar(modelScale);
                const finalScaleMultiplier = baseScale * modelScale;

                // 计算应用缩放后的尺寸
                box = new THREE.Box3().setFromObject(model);
                const afterScaleSize = box.getSize(new THREE.Vector3());
                const afterMaxDim = Math.max(afterScaleSize.x, afterScaleSize.y, afterScaleSize.z);

                console.log("✓ 应用模型缩放:", {
                    配置中的scale: modelScale,
                    基础缩放倍数: baseScale.toFixed(2),
                    最终缩放倍数: finalScaleMultiplier.toFixed(2),
                    缩放前模型尺寸: beforeMaxDim.toFixed(2),
                    缩放后模型尺寸: afterMaxDim.toFixed(2),
                    格子大小: width && height ? Math.min(width, height).toFixed(2) : "N/A",
                    相对格子大小: width && height ? (afterMaxDim / Math.min(width, height)).toFixed(2) + "倍" : "N/A",
                    来源: config.scale !== undefined && config.scale !== null ? "配置文件" : "character.scaleX",
                    "说明": `模型将被缩放 ${modelScale} 倍 (${(modelScale * 100).toFixed(0)}%)`
                });
            } else {
                console.log("未应用模型缩放（scale=1.0），基础缩放:", baseScale);
            }

            // 应用镜像处理（水平翻转）
            const shouldMirror = config.mirror === true;
            if (shouldMirror) {
                // 水平镜像：将 scale.x 设置为负值
                model.scale.x = Math.abs(model.scale.x) * -1;
                console.log("✓ 应用模型镜像（水平翻转）:", {
                    镜像前scale: new THREE.Vector3(Math.abs(model.scale.x), model.scale.y, model.scale.z),
                    镜像后scale: model.scale,
                    "说明": "scale.x 已设置为负值，模型将水平翻转"
                });
            }

            // 重新计算最终尺寸用于验证
            box = new THREE.Box3().setFromObject(model);
            const finalSize = box.getSize(new THREE.Vector3());
            const finalMaxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
            console.log("最终模型尺寸:", finalSize, "最终最大尺寸:", finalMaxDim, "格子大小:", width && height ? Math.min(width, height) : "N/A");

            // 先重置模型位置和旋转，确保中心点计算准确
            model.position.set(0, 0, 0);

            // 应用配置文件中的旋转设置（默认绕Y轴旋转180度，面向相机）
            const defaultRotation = {
                x: 0,
                y: Math.PI,  // 默认180度，面向相机
                z: 0
            };

            const rotationConfig = config.rotation || {};
            model.rotation.set(
                rotationConfig.x !== undefined ? rotationConfig.x : defaultRotation.x,
                rotationConfig.y !== undefined ? rotationConfig.y : defaultRotation.y,
                rotationConfig.z !== undefined ? rotationConfig.z : defaultRotation.z
            );

            if (config.rotation) {
                console.log(`✓ 应用模型旋转配置: x=${(rotationConfig.x || 0).toFixed(3)}, y=${(rotationConfig.y !== undefined ? rotationConfig.y : Math.PI).toFixed(3)}, z=${(rotationConfig.z || 0).toFixed(3)}`);
            }

            // 重新计算缩放后的包围盒和中心点（在重置位置后计算，确保准确）
            box = new THREE.Box3().setFromObject(model);
            size = box.getSize(new THREE.Vector3());
            center = box.getCenter(new THREE.Vector3());

            // 保存原始包围盒中心（相对于模型原点的偏移），用于后续重新应用配置
            originalBoundingBoxCenterRef.current = center.clone();
            // 保存原始包围盒尺寸，用于后续根据缩放比例计算新尺寸
            originalBoundingBoxSizeRef.current = size.clone();

            console.log("缩放后重置位置前的包围盒信息:", {
                尺寸: size,
                中心: center,
                说明: "此时模型在原点(0,0,0)，center是包围盒中心相对于模型原点的偏移"
            });

            // 将模型中心移动到原点
            // center是包围盒中心相对于模型原点的偏移（此时模型在原点）
            // 设置position为 -center，这样包围盒中心就在(0,0,0)
            let modelX = -center.x;
            let modelY = -center.y;
            let modelZ = -center.z;

            console.log("计算的模型位置（居中前）:", {
                modelX: modelX,
                modelY: modelY,
                modelZ: modelZ,
                center: center,
                说明: "modelX/Y/Z = -center.x/y/z，这样模型中心会在原点"
            });

            // 使用配置文件中的位置偏移
            const positionOffset = config.positionOffset || {
                horizontal: 0.2,
                vertical: -5.0
            };

            console.log("========== 位置偏移配置检查 ==========");
            console.log("配置文件中的 positionOffset:", config.positionOffset);
            console.log("最终使用的 positionOffset:", positionOffset);
            console.log("horizontal:", positionOffset.horizontal, "vertical:", positionOffset.vertical);
            console.log("=====================================");

            // 微调水平位置：确保模型水平居中
            // 使用相对于格子大小的偏移，确保在不同窗口大小下保持一致
            const horizontalOffsetPercent = positionOffset.horizontal;
            const horizontalOffset = width && height ? -(width * horizontalOffsetPercent) : -30.0;
            modelX = modelX + horizontalOffset;

            // 微调垂直位置：如果模型位置偏上，向下调整（减小y值，因为在Three.js中Y向上为正）
            // 注意：对于飞行单位，这个偏移需要在后续代码中应用
            const verticalOffset = positionOffset.vertical;

            // 注意：这个偏移会应用到所有单位（飞行和非飞行），但视觉上可能需要根据相机位置调整
            const originalModelY = modelY;
            modelY = modelY + verticalOffset;

            model.position.set(modelX, modelY, modelZ);

            console.log("========== 垂直偏移应用 ==========");
            console.log("原始modelY:", originalModelY);
            console.log("配置中的verticalOffset:", verticalOffset);
            console.log("调整后modelY:", modelY);
            console.log("实际modelPositionY:", model.position.y);
            console.log("偏移量:", verticalOffset, verticalOffset > 0 ? "(向上)" : "(向下)");
            console.log("=====================================");

            // 保存 verticalOffset 到模型 userData，供飞行单位代码使用
            model.userData.verticalOffset = verticalOffset;

            // 验证：重新计算，确认中心在原点附近
            box = new THREE.Box3().setFromObject(model);
            const finalCenter = box.getCenter(new THREE.Vector3());

            console.log("模型中心调整:", {
                原始中心偏移: center,
                计算出的X: -center.x,
                调整后的X: modelX,
                X偏移: modelX - (-center.x),
                模型实际位置: model.position,
                最终包围盒中心: finalCenter,
                模型尺寸: size,
                "说明": "finalCenter的x应该接近0，如果偏左说明需要向右调整"
            });

            console.log("模型位置:", model.position);
            console.log("模型旋转:", model.rotation);

            // 调整相机位置以看到完整模型
            // 根据模型高度调整相机，确保能看到完整角色
            const modelHeight = size.y;
            const modelWidth = Math.max(size.x, size.z);

            // 使用配置文件中的相机配置
            const cameraConfig = config.camera || {
                lookAtHeight: 0.25,
                baseDistanceMultiplier: 2.0
            };

            // 根据使用场景调整相机距离
            // 在地图上使用时，使用较小的距离以适应格子大小
            let baseDistance = 6; // 默认距离
            if (width && height) {
                // 地图场景：相机距离应该与格子大小相匹配
                const cellSize = Math.min(width, height);
                const multiplier = cameraConfig.baseDistanceMultiplier || 2.0;
                baseDistance = Math.max(modelHeight * multiplier, modelWidth * 1.5, cellSize * 0.8);
            } else {
                // 独立展示：使用较大的距离
                baseDistance = Math.max(modelHeight * 3.5, modelWidth * 3, 6);
            }

            const cameraDistance = baseDistance;

            // 保存初始相机距离（基于初始 scale 的相机距离）
            // 后续调整 scale 时，可以根据 scale 比例调整相机距离
            if (originalCameraDistanceRef.current === null) {
                originalCameraDistanceRef.current = cameraDistance;
                console.log(`✓ 保存初始相机距离: ${cameraDistance.toFixed(3)} (scale: ${config.scale ?? 1.0})`);
            }

            // 看向模型中心偏上一点（能看到头部）
            const lookAtHeight = modelHeight * (cameraConfig.lookAtHeight || 0.25);

            console.log("相机距离计算:", {
                模型高度: modelHeight,
                模型宽度: modelWidth,
                基础距离: baseDistance,
                最终距离: cameraDistance,
                场景: width && height ? "地图" : "独立"
            });

            // 定义targetY在外部，让所有分支都能访问
            let targetY: number;

            // 飞行单位：调整高度并添加悬浮动画
            if (character.isFlying) {
                const flightHeight = character.flightHeight ?? 0.5;
                const verticalOffset = model.userData.verticalOffset || 0;  // 获取垂直偏移
                // baseY 已经包含了 verticalOffset（因为在设置 model.position 时已经应用了）
                // 但我们需要在应用飞行高度之前明确计算，确保垂直偏移被保留
                const baseYWithOffset = model.position.y;  // 这个值已经包含 verticalOffset
                // 最终的 Y 位置 = baseY (已包含 verticalOffset) + flightHeight
                const finalY = baseYWithOffset + flightHeight;
                model.position.y = finalY;

                console.log("飞行单位位置调整:", {
                    verticalOffset: verticalOffset,
                    baseYWithOffset: baseYWithOffset,
                    flightHeight: flightHeight,
                    finalY: finalY,
                    "验证": `finalY应该等于 baseY(${baseYWithOffset}) + flightHeight(${flightHeight}) = ${baseYWithOffset + flightHeight}`,
                    "说明": "垂直偏移应该已经包含在baseYWithOffset中"
                });

                // 调整相机位置以适应飞行单位，确保能看到完整模型
                // 关键修复：相机的lookAt目标不应该跟随垂直偏移，而是固定在一个相对位置
                // 这样当模型向下移动时，视觉上能够看到变化
                // 计算不包含垂直偏移的基准位置（用于相机lookAt和相机位置）
                const baseYWithoutOffset = baseYWithOffset - verticalOffset;  // 移除垂直偏移，得到原始位置
                const referenceBaseY = baseYWithoutOffset + flightHeight;  // 基准位置（不包含垂直偏移，但包含飞行高度）
                const referenceTargetY = referenceBaseY + lookAtHeight;  // 相机lookAt的参考位置（不跟随垂直偏移）
                const cameraY = referenceTargetY + 2;  // 相机位置基于参考位置（不跟随垂直偏移）

                // 相机的lookAt也使用参考位置，这样相机角度固定，模型向下移动时视觉上能看到明显变化
                targetY = referenceTargetY;  // 使用参考位置，不跟随垂直偏移

                // 确保相机位置和lookAt都相对于模型中心(0,0,0)
                // 优先使用配置文件中的绝对位置
                if (cameraRef.current) {
                    if (cameraConfig.position && cameraConfig.lookAt) {
                        // 使用配置文件中的绝对位置
                        cameraRef.current.position.set(
                            cameraConfig.position.x ?? 0,
                            cameraConfig.position.y ?? cameraY,
                            cameraConfig.position.z ?? cameraDistance
                        );
                        cameraRef.current.lookAt(
                            cameraConfig.lookAt.x ?? 0,
                            cameraConfig.lookAt.y ?? targetY,
                            cameraConfig.lookAt.z ?? 0
                        );
                    } else {
                        // 使用自动计算的位置
                        cameraRef.current.position.set(0, cameraY, cameraDistance);
                        // lookAt使用参考位置（不跟随垂直偏移），这样当模型向下移动时，视觉上能看到明显变化
                        cameraRef.current.lookAt(0, targetY, 0);
                    }
                }

                console.log("相机位置调整:", {
                    模型finalY: finalY,
                    baseYWithoutOffset: baseYWithoutOffset,
                    referenceBaseY: referenceBaseY,
                    referenceTargetY: referenceTargetY,
                    targetY: targetY,
                    cameraY: cameraY,
                    verticalOffset: verticalOffset,
                    "说明": "相机位置和lookAt都不跟随垂直偏移，这样模型向下移动时视觉上能看到明显变化"
                });

                // 悬浮动画：必须使用 finalY 作为基础，这样垂直偏移会被保持
                // 使用 fromTo 确保动画明确从 finalY 开始，到 finalY + 0.2 结束
                // yoyo动画会在 finalY 和 finalY + 0.2 之间循环
                // 重要的是：finalY 已经包含了 verticalOffset
                const hoverAnimation = gsap.fromTo(model.position,
                    { y: finalY },  // 明确指定起始值
                    {
                        y: finalY + 0.2,  // 目标位置：最终位置 + 悬浮幅度
                        duration: 2,
                        yoyo: true,
                        repeat: -1,
                        ease: "sine.inOut"
                    }
                );

                console.log("悬浮动画设置:", {
                    起始Y: finalY,
                    目标Y: finalY + 0.2,
                    "动画范围": `[${finalY}, ${finalY + 0.2}]`,
                    "说明": "fromTo确保明确从finalY开始，yoyo会在[finalY, finalY+0.2]之间循环",
                    "verticalOffset已包含": verticalOffset
                });

                model.userData.hoverAnimation = hoverAnimation;
            } else {
                // 非飞行单位：根据模型高度调整相机位置
                // 相机在模型前方，稍微向上，距离更远，能看到完整模型包括头部
                // lookAt应该指向模型的实际位置
                // 重要：对于垂直偏移，我们需要使用不包含垂直偏移的基准位置来计算相机lookAt
                // 这样垂直偏移改变时，视觉上能看到明显变化
                const baseY = model.position.y - verticalOffset;  // 移除垂直偏移，得到基准位置
                targetY = baseY + lookAtHeight;  // 基于基准位置计算lookAt目标
                const cameraY = targetY + 1.5;  // 相机位置也基于基准位置
                // lookAt的x和z应该使用模型的实际位置（因为水平偏移不需要移除）
                // 优先使用配置文件中的绝对位置
                if (cameraRef.current) {
                    if (cameraConfig.position && cameraConfig.lookAt) {
                        // 使用配置文件中的绝对位置
                        cameraRef.current.position.set(
                            cameraConfig.position.x ?? 0,
                            cameraConfig.position.y ?? cameraY,
                            cameraConfig.position.z ?? cameraDistance
                        );
                        cameraRef.current.lookAt(
                            cameraConfig.lookAt.x ?? model.position.x,
                            cameraConfig.lookAt.y ?? targetY,
                            cameraConfig.lookAt.z ?? model.position.z
                        );
                    } else {
                        // 使用自动计算的位置（基于基准位置，不包含垂直偏移）
                        cameraRef.current.position.set(0, cameraY, cameraDistance);
                        cameraRef.current.lookAt(model.position.x, targetY, model.position.z);  // lookAt使用基准位置
                    }
                    console.log("非飞行单位相机位置:", {
                        cameraPosition: cameraRef.current.position,
                        lookAt: new THREE.Vector3(model.position.x, targetY, model.position.z),
                        baseY: baseY,
                        verticalOffset: verticalOffset,
                        modelY: model.position.y,
                        "说明": "相机基于基准位置（不包含垂直偏移），这样垂直偏移改变时视觉上能看到明显变化"
                    });
                }
            }

            if (cameraRef.current) {
                console.log("相机位置:", cameraRef.current.position);
                console.log("相机lookAt目标:", model.position.x, targetY, model.position.z);
            }
            console.log("模型位置:", model.position);
            console.log("模型尺寸 - 高度:", modelHeight, "宽度:", modelWidth, "相机距离:", cameraDistance);

            // 最终验证：模型是否准备好显示
            const finalBox = new THREE.Box3().setFromObject(model);
            const finalBoxSize = finalBox.getSize(new THREE.Vector3());
            const finalBoxCenter = finalBox.getCenter(new THREE.Vector3());

            console.log("========== 模型最终状态检查 ==========");
            console.log("模型位置:", model.position);
            console.log("模型旋转:", model.rotation);
            console.log("模型缩放:", model.scale);
            console.log("包围盒尺寸:", finalBoxSize);
            console.log("包围盒中心:", finalBoxCenter);
            console.log("相机位置:", cameraRef.current?.position);
            // 正确显示相机lookAt目标位置（不是方向向量）
            if (cameraRef.current) {
                const lookAtTarget = new THREE.Vector3();
                cameraRef.current.getWorldDirection(lookAtTarget);
                // 从相机位置沿lookAt方向找到目标点
                lookAtTarget.multiplyScalar(10).add(cameraRef.current.position);
                console.log("相机lookAt目标位置:", lookAtTarget);
            }

            if (finalBoxSize.x === 0 && finalBoxSize.y === 0 && finalBoxSize.z === 0) {
                console.error("⚠ 警告：模型最终尺寸为0！模型可能没有正确加载或缩放！");
            }

            if (!model.visible) {
                console.warn("⚠ 警告：模型不可见！");
            }

            // 检查模型是否在相机视野内
            if (cameraRef.current) {
                const distance = model.position.distanceTo(cameraRef.current.position);
                console.log("模型到相机距离:", distance);
                if (distance > 1000) {
                    console.warn("⚠ 警告：模型距离相机过远（>1000），可能看不到！");
                }
            }

            console.log("====================================");

            modelRef.current = model as THREE.Group;
            sceneRef.current?.add(model);

            console.log("✓ 模型已添加到场景");
            console.log("场景中的对象数量:", sceneRef.current?.children.length);
        };

        if (isGLTF) {
            // ========== GLTF/GLB 加载逻辑 ==========
            const gltfLoader = new GLTFLoader();

            console.log("开始加载GLB模型:", modelPath);

            gltfLoader.load(
                modelPath,
                (gltf) => {
                    console.log("GLB模型加载成功:", modelPath);
                    console.log("模型对象:", gltf.scene);
                    console.log("动画数量:", gltf.animations?.length || 0);
                    console.log("场景子对象:", gltf.scene.children.length);

                    // ========== 检查动画分段信息 ==========
                    console.log("========== GLB模型信息检查 ==========");
                    console.log("模型路径:", modelPath);

                    // 1. 检查gltf对象的metadata
                    if (gltf.parser && (gltf.parser as any).json) {
                        const gltfJson = (gltf.parser as any).json;
                        console.log("GLTF JSON结构:", {
                            hasAnimations: !!gltfJson.animations,
                            hasMetadata: !!gltfJson.asset?.extras,
                            animations: gltfJson.animations?.length || 0
                        });

                        // 检查animations数组中的extras
                        if (gltfJson.animations) {
                            gltfJson.animations.forEach((anim: any, index: number) => {
                                if (anim.extras) {
                                    console.log(`动画 ${index} (${anim.name}) extras:`, anim.extras);
                                }
                            });
                        }
                    }

                    // 2. 检查模型的userData
                    const model = gltf.scene;
                    console.log("模型userData:", model.userData);
                    if (model.userData && Object.keys(model.userData).length > 0) {
                        console.log("✓ 模型包含userData:", Object.keys(model.userData));
                    } else {
                        console.log("✗ 模型不包含userData");
                    }

                    // GLTF格式：动画在gltf.animations中，需要手动附加到模型
                    if (gltf.animations && gltf.animations.length > 0) {
                        // 检查每个动画clip的userData
                        gltf.animations.forEach((clip, index) => {
                            const clipAny = clip as any;
                            console.log(`GLB动画 ${index} (${clip.name}):`, {
                                duration: clip.duration,
                                tracks: clip.tracks.length,
                                userData: clipAny.userData,
                                trackNames: clip.tracks.slice(0, 5).map((t: THREE.KeyframeTrack) => t.name)
                            });
                        });

                        // 将动画附加到模型的userData中，供processModel使用
                        (model as any).animations = gltf.animations;
                        model.userData.animations = gltf.animations;
                        console.log(`✓ 已附加 ${gltf.animations.length} 个动画到模型`);
                    } else {
                        console.warn("⚠ GLB模型没有动画，可能导致动画无法播放");
                    }

                    // 3. 检查是否有动画分段相关的属性
                    const hasAnimationSegments = model.userData?.animationSegments ||
                        model.userData?.animationTimeline ||
                        model.userData?.animationClips;
                    if (hasAnimationSegments) {
                        console.log("✓ 找到动画分段信息:", hasAnimationSegments);
                    } else {
                        console.log("✗ 未找到动画分段信息");
                    }
                    console.log("====================================");

                    // 确保模型可见，并修复材质
                    let meshCount = 0;
                    let materialCount = 0;
                    model.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.visible = true;
                            meshCount++;

                            // 确保材质是可见的
                            if (Array.isArray(child.material)) {
                                child.material.forEach((mat) => {
                                    if (mat instanceof THREE.Material) {
                                        mat.visible = true;
                                        materialCount++;
                                    }
                                });
                            } else if (child.material instanceof THREE.Material) {
                                child.material.visible = true;
                                materialCount++;
                            }

                            // 确保材质不透明
                            if (Array.isArray(child.material)) {
                                child.material.forEach((mat) => {
                                    if (mat instanceof THREE.MeshStandardMaterial ||
                                        mat instanceof THREE.MeshBasicMaterial ||
                                        mat instanceof THREE.MeshPhongMaterial) {
                                        mat.transparent = false;
                                        mat.opacity = 1.0;
                                    }
                                });
                            } else if (child.material instanceof THREE.MeshStandardMaterial ||
                                child.material instanceof THREE.MeshBasicMaterial ||
                                child.material instanceof THREE.MeshPhongMaterial) {
                                child.material.transparent = false;
                                child.material.opacity = 1.0;
                            }

                            if (meshCount <= 5) { // 只记录前5个，避免日志过多
                                console.log("网格对象:", child.name || "未命名", "可见性:", child.visible, "材质:", child.material);
                            }
                        }
                    });
                    console.log(`✓ GLB模型包含 ${meshCount} 个网格对象, ${materialCount} 个材质`);

                    // 检查模型是否有内容
                    if (model.children.length === 0 && meshCount === 0) {
                        console.error("⚠ GLB模型没有子对象和网格，可能加载失败");
                    }

                    // 检查模型包围盒
                    const initialBox = new THREE.Box3().setFromObject(model);
                    const initialSize = initialBox.getSize(new THREE.Vector3());
                    const initialCenter = initialBox.getCenter(new THREE.Vector3());
                    console.log("GLB模型初始尺寸:", initialSize);
                    console.log("GLB模型初始中心:", initialCenter);

                    if (initialSize.x === 0 && initialSize.y === 0 && initialSize.z === 0) {
                        console.error("⚠ GLB模型尺寸为0，可能加载失败或模型为空");
                    }

                    processModel(model).catch(error => {
                        console.error('处理GLTF模型失败:', error);
                    });
                },
                (progress) => {
                    // 加载进度
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total) * 100;
                        console.log(`GLB加载进度: ${percent.toFixed(2)}%`);
                    }
                },
                (error) => {
                    console.error('GLTF加载失败:', error);
                    console.error('失败路径:', modelPath);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('错误详情:', errorMessage);
                }
            );
        } else {
            // ========== FBX 加载逻辑（向后兼容） ==========
            const loader = new FBXLoader();

            // 注意：FBXLoader 的 setPath() 会影响所有资源的加载路径
            // 如果 modelPath 是绝对路径（以 / 开头），不应该使用 setPath()
            // 因为 setPath() 会与 load() 的路径拼接，导致路径重复
            // 对于纹理路径，FBXLoader 会自动相对于模型文件所在目录查找
            // 所以这里不需要设置 setPath()

            loader.load(
                modelPath,
                (fbx) => {
                    // ========== 检查动画分段信息 ==========
                    console.log("========== FBX模型信息检查 ==========");
                    console.log("模型路径:", modelPath);

                    // 1. 检查模型的userData
                    console.log("模型userData:", fbx.userData);
                    if (fbx.userData && Object.keys(fbx.userData).length > 0) {
                        console.log("✓ 模型包含userData:", Object.keys(fbx.userData));
                    } else {
                        console.log("✗ 模型不包含userData");
                    }

                    // 2. 检查animations数组
                    console.log("动画数量:", fbx.animations?.length || 0);
                    if (fbx.animations && fbx.animations.length > 0) {
                        fbx.animations.forEach((clip, index) => {
                            const clipAny = clip as any;
                            console.log(`动画 ${index} (${clip.name}):`, {
                                duration: clip.duration,
                                tracks: clip.tracks.length,
                                userData: clipAny.userData,  // 检查clip的userData
                                // 检查clip对象的所有属性
                                clipKeys: Object.keys(clip)
                            });

                            // 检查clip的tracks中是否有分段信息
                            if (clip.tracks && clip.tracks.length > 0) {
                                const firstTrack = clip.tracks[0] as any;
                                console.log(`  第一个轨道:`, {
                                    name: firstTrack.name,
                                    times: firstTrack.times?.slice(0, 10),  // 前10个时间点
                                    values: firstTrack.values?.slice(0, 10),  // 前10个值
                                    userData: firstTrack.userData
                                });
                            }
                        });
                    }

                    // 3. 检查模型对象的所有属性（排除Three.js内部属性）
                    const fbxKeys = Object.keys(fbx).filter(key =>
                        !key.startsWith('_') &&
                        !['uuid', 'name', 'type', 'matrix', 'matrixWorld', 'parent', 'children'].includes(key)
                    );
                    console.log("模型对象的主要属性:", fbxKeys);

                    // 4. 检查是否有动画分段相关的属性
                    const hasAnimationSegments = fbx.userData?.animationSegments ||
                        fbx.userData?.animationTimeline ||
                        fbx.userData?.animationClips;
                    if (hasAnimationSegments) {
                        console.log("✓ 找到动画分段信息:", hasAnimationSegments);
                    } else {
                        console.log("✗ 未找到动画分段信息");
                    }
                    console.log("====================================");

                    // 确保FBX模型可见，并修复材质（解决"全身黑色"问题）
                    let meshCount = 0;
                    let materialCount = 0;
                    fbx.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.visible = true;
                            meshCount++;

                            // 确保材质是可见的
                            if (Array.isArray(child.material)) {
                                child.material.forEach((mat) => {
                                    if (mat instanceof THREE.Material) {
                                        mat.visible = true;
                                        materialCount++;

                                        // 对于各种材质类型，确保属性正确
                                        if (mat instanceof THREE.MeshPhongMaterial ||
                                            mat instanceof THREE.MeshStandardMaterial ||
                                            mat instanceof THREE.MeshLambertMaterial) {
                                            mat.transparent = false;
                                            mat.opacity = 1.0;

                                            // 检查材质的颜色
                                            const currentColor = mat.color ? mat.color.getHex() : 0x000000;
                                            console.log(`材质颜色检查 [${child.name}]:`, {
                                                color: `#${currentColor.toString(16)}`,
                                                hasMap: !!mat.map,
                                                hasDiffuseMap: !!(mat as any).diffuseMap
                                            });

                                            // 如果材质颜色是黑色或非常暗，尝试修复
                                            if (currentColor === 0x000000 || currentColor < 0x222222) {
                                                console.warn("发现黑色/过暗材质，尝试修复:", child.name, `原颜色: #${currentColor.toString(16)}`);
                                                // 设置为浅灰色，让材质可见
                                                mat.color.setHex(0xcccccc);
                                                // 增加环境光反射
                                                if ('ambient' in mat && mat.ambient) {
                                                    (mat.ambient as THREE.Color).setHex(0xffffff);
                                                }
                                            }

                                            // 确保材质能够接收光照
                                            mat.flatShading = false;
                                            mat.needsUpdate = true;

                                            // 增加emissive亮度，让材质更明显
                                            if (mat.emissive) {
                                                mat.emissive.setHex(0x111111); // 轻微的自发光，让材质更明显
                                            } else if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshStandardMaterial) {
                                                mat.emissive = new THREE.Color(0x111111);
                                            }
                                        }
                                    }
                                });
                            } else if (child.material instanceof THREE.Material) {
                                child.material.visible = true;
                                materialCount++;

                                // 处理单个材质
                                const mat = child.material;
                                if (mat instanceof THREE.MeshPhongMaterial ||
                                    mat instanceof THREE.MeshStandardMaterial ||
                                    mat instanceof THREE.MeshLambertMaterial) {
                                    mat.transparent = false;
                                    mat.opacity = 1.0;

                                    // 检查材质的颜色和纹理
                                    const currentColor = mat.color ? mat.color.getHex() : 0x000000;
                                    const hasMap = !!mat.map;

                                    // 检查纹理是否加载成功
                                    let textureLoaded = false;
                                    if (hasMap && mat.map instanceof THREE.Texture) {
                                        const texture = mat.map;
                                        if (texture.image) {
                                            if (texture.image.complete && texture.image.width > 0 && texture.image.height > 0) {
                                                textureLoaded = true;
                                            } else if (texture.image.complete && texture.image.width === 0) {
                                                // 纹理加载失败
                                                console.warn(`纹理加载失败 [${child.name}]，纹理尺寸为0`);
                                                textureLoaded = false;
                                            } else {
                                                // 纹理正在加载
                                                texture.image.onload = () => {
                                                    texture.needsUpdate = true;
                                                    mat.needsUpdate = true;
                                                    console.log(`纹理加载完成 [${child.name}]`);
                                                };
                                                texture.image.onerror = () => {
                                                    console.warn(`纹理加载错误 [${child.name}]，使用备用颜色`);
                                                    mat.map = null;
                                                    mat.color.setHex(0x888888);
                                                    mat.needsUpdate = true;
                                                };
                                            }
                                        }
                                    }

                                    console.log(`材质颜色检查 [${child.name}]:`, {
                                        color: `#${currentColor.toString(16)}`,
                                        hasMap: hasMap,
                                        textureLoaded: textureLoaded,
                                        hasDiffuseMap: !!(mat as any).diffuseMap
                                    });

                                    // 如果材质显示为黑色，可能是纹理未加载或光照问题
                                    // 增加自发光，让模型更明显
                                    if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshStandardMaterial) {
                                        // 增加自发光，即使纹理未加载也能看到模型
                                        if (!mat.emissive) {
                                            mat.emissive = new THREE.Color(0x333333); // 增强自发光
                                        } else {
                                            mat.emissive.setHex(0x333333);
                                        }

                                        // 确保有足够的反射
                                        if (mat instanceof THREE.MeshPhongMaterial) {
                                            mat.shininess = 30;
                                            mat.specular.setHex(0x222222);
                                        }

                                        // 如果纹理未加载，使用备用颜色
                                        if (!textureLoaded && !mat.map) {
                                            if (currentColor === 0x000000 || currentColor < 0x222222) {
                                                console.warn("材质颜色过暗，设置为备用颜色:", child.name);
                                                mat.color.setHex(0x888888);
                                            }
                                        }
                                    }

                                    // 确保材质能够接收光照
                                    mat.flatShading = false;
                                    mat.needsUpdate = true;
                                }
                            }

                            if (meshCount <= 5) { // 只记录前5个，避免日志过多
                                console.log("FBX网格对象:", child.name || "未命名", "可见性:", child.visible, "材质:", child.material);
                            }
                        }
                    });
                    console.log(`✓ FBX模型包含 ${meshCount} 个网格对象, ${materialCount} 个材质`);

                    processModel(fbx).catch(error => {
                        console.error('处理FBX模型失败:', error);
                    });
                },
                undefined,
                (error) => {
                    console.error('FBX加载失败:', error);
                }
            );
        }

        // 清理函数
        return () => {
            if (modelRef.current?.userData?.hoverAnimation) {
                modelRef.current.userData.hoverAnimation.kill();
            }
        };
        // 只依赖模型路径，而不是整个character对象
        // 这样当character的其他属性（如q、r）改变时，不会重新加载模型
    }, [character.asset?.resource?.fbx, character.asset?.resource?.glb, character.asset?.resource?.gltf, character.asset?.type]);

    // 添加点击事件处理
    const handleClick = useCallback((event: React.MouseEvent) => {
        console.log('handleClick');
        const canvas = rendererRef.current?.domElement;
        if (!canvas || !modelRef.current || !cameraRef.current || !sceneRef.current) return;

        // 获取鼠标点击位置
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // 创建射线
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

        // 检测点击是否命中模型
        const intersects = raycaster.intersectObject(modelRef.current, true);
        console.log('Intersects:', intersects.length); // 调试信息

        if (intersects.length > 0) {
            if (!mixerRef.current) return;

            const action = actionsRef.current[0];
            if (!action) return;

            const clip = action.getClip();
            const newAction = mixerRef.current.clipAction(clip);
            // 重置动画状态
            newAction.reset();
            newAction.setLoop(THREE.LoopOnce, 1);
            newAction.play();

        }
    }, []);

    // 添加鼠标事件处理
    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        isDraggingRef.current = true;
        previousMouseXRef.current = event.clientX;
    }, []);

    const handleMouseMove = useCallback((event: React.MouseEvent) => {
        if (!isDraggingRef.current || !modelRef.current) return;

        const deltaX = event.clientX - previousMouseXRef.current;
        modelRef.current.rotation.y += deltaX * 0.01; // 调整旋转速度
        previousMouseXRef.current = event.clientX;
    }, []);

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    return (
        <div
            ref={mountRef}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}  // 鼠标离开时也停止拖动
            style={{
                width: `${position.width}px`,
                height: `${position.height}px`,
                position: 'absolute',
                top: position.top + 'px',
                left: position.left + 'px',
                pointerEvents: 'none',
                cursor: isDraggingRef.current ? 'grabbing' : 'grab'  // 根据状态改变鼠标样式
            }}
        />
    );


};

export default Character3D;

