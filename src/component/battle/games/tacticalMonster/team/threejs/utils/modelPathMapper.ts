/**
 * 3D 模型路径映射工具
 * 将 monsterId 映射到对应的 GLB 模型文件路径
 */


/**
 * 获取怪物的 3D 模型路径
 * @param monsterId 怪物 ID（如 "monster_001"）
 * @returns GLB 模型文件路径，如果找不到则返回 null
 */
export const getMonsterModelPath = (monsterId: string): string | null => {
    return "/assets/3d/glb/characters/tiger/model/tiger.glb";
    // 从怪物配置中查找
    // const monsterConfig = MONSTER_CONFIGS.find((m) => m.monsterId === monsterId);

    // if (monsterConfig?.assetPath) {
    //     // 如果配置中有 assetPath，需要调整路径
    //     // 配置中的路径可能是 /assets/3d/characters/...，需要改为 /assets/3d/glb/characters/...
    //     let modelPath = monsterConfig.assetPath;

    //     // 替换路径：/assets/3d/characters/ -> /assets/3d/glb/characters/
    //     if (modelPath.includes("/assets/3d/characters/")) {
    //         modelPath = modelPath.replace("/assets/3d/characters/", "/assets/3d/glb/characters/");
    //     }

    //     return modelPath;
    // }

    // // 如果配置中没有 assetPath，尝试从 monsterId 推断
    // // 例如：monster_001 -> 需要查看配置中的 name 或其他字段来推断
    // // 这里我们返回 null，让组件使用默认占位符
    // return null;
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
    return `/assets/3d/glb/characters/${characterName}/model/${characterName}.glb`;
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
    const configPath = getMonsterModelPath(monsterId);

    if (configPath) {
        return configPath;
    }

    // 如果配置中没有，尝试使用回退名称
    if (fallbackCharacterName) {
        return getDefaultModelPath(fallbackCharacterName);
    }

    // 最后的回退：使用 "tiger" 作为默认模型
    return getDefaultModelPath("tiger");
};
