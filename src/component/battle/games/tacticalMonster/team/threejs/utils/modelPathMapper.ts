/**
 * 3D 模型路径映射工具
 * 将 monsterId 映射到对应的 GLB 模型文件路径（每个角色可对应不同模型文件）
 */

import { MONSTER_CONFIGS_MAP } from "../../../config/monsterConfigs";

/** 配置里可能是 /assets/3d/characters/...，实际 GLB 放在 /assets/3d/glb/characters/... */
const CHARACTER_PATH_PREFIX = "/assets/3d/characters/";
const GLB_CHARACTER_PATH_PREFIX = "/assets/3d/glb/characters/";

/**
 * 将配置中的 assetPath 转为实际可用的 GLB 路径
 */
const toGlbPath = (assetPath: string): string => {

    if (assetPath.includes(CHARACTER_PATH_PREFIX)) {

        return assetPath.replace(CHARACTER_PATH_PREFIX, GLB_CHARACTER_PATH_PREFIX);
    }
    return assetPath;
};

/**
 * 获取怪物的 3D 模型路径（每个 monsterId 对应配置中的 assetPath，即不同角色可对应不同模型文件）
 * @param monsterId 怪物 ID（如 "monster_001"）
 * @returns GLB 模型文件路径，如果配置中无该怪物则返回 null
 */
export const getMonsterModelPath = (monsterId: string): string | null => {
    const config = MONSTER_CONFIGS_MAP[monsterId];
    if (config?.assetPath) {
        return toGlbPath(config.assetPath);
    }
    return null;
};

/**
 * 从模型路径中提取角色名称
 * 例如：/assets/3d/glb/characters/tiger/model/tiger.glb -> tiger
 */
export const extractCharacterNameFromPath = (path: string): string | null => {
    const match = path.match(/\/characters\/([^\/]+)\//);
    return match ? match[1] : null;
};

/**
 * 根据角色名称生成默认模型路径
 * @param characterName 角色名称（如 "tiger"）
 * @returns GLB 模型文件路径
 */
export const getDefaultModelPath = (characterName: string): string => {
    return `/assets/3d/characters/${characterName}/model/${characterName}.glb`;
};

/**
 * 获取怪物模型路径（带回退机制）
 * @param monsterId 怪物 ID
 * @param fallbackCharacterName 如果配置中没有找到，使用的回退角色名称
 * @returns GLB 模型文件路径
 */
export const getMonsterModelPathWithFallback = (
    monsterId: string,
    fallbackCharacterName?: string
): string => {
    // const configPath = getMonsterModelPath(monsterId);

    // if (configPath) {
    //     return configPath;
    // }

    // // 如果配置中没有，尝试使用回退名称
    // if (fallbackCharacterName) {
    //     return getDefaultModelPath(fallbackCharacterName);
    // }

    // 最后的回退：使用 "tiger" 作为默认模型
    return getDefaultModelPath("wukong");
};

/**
 * 获取所有配置中出现的角色 GLB 路径（去重），用于统一预加载
 * 每个角色单独模型时，在布局层（如 TeamLayout3D）调用 useGLTF.preload(path) 预加载
 */
export const getAllMonsterGlbPaths = (): string[] => {
    const set = new Set<string>();
    Object.values(MONSTER_CONFIGS_MAP).forEach((config) => {
        if (config?.assetPath) {
            set.add(toGlbPath(config.assetPath));
        }
    });
    set.add(getDefaultModelPath("wukong"));
    return Array.from(set);
};
