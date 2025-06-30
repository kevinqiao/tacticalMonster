import { getAllPropTypes, getPropEffect, getPropType, getPropsByGameType, hasPropType, isPropCompatibleWithGame } from "./propManager";

// ===== 静态数据访问示例（客户端直接调用，无需网络请求） =====

/**
 * 示例：在客户端直接获取道具信息
 * 这些调用是同步的，没有网络开销
 */
export function clientSidePropUsage() {
    // 1. 获取特定道具信息
    const hintProp = getPropType("hint");
    console.log("提示道具:", hintProp);
    // 输出: { id: "hint", name: "提示", description: "显示下一步最佳移动", ... }

    // 2. 获取纸牌游戏的所有道具
    const solitaireProps = getPropsByGameType("solitaire");
    console.log("纸牌游戏道具:", solitaireProps);
    // 输出: [hint, undo, shuffle, time_freeze, coin_multiplier, exp_boost]

    // 3. 获取所有道具类型
    const allProps = getAllPropTypes();
    console.log("所有道具数量:", allProps.length);

    // 4. 检查道具是否存在
    const hasHint = hasPropType("hint"); // true
    const hasInvalid = hasPropType("invalid_prop"); // false

    // 5. 检查道具兼容性
    const isHintForSolitaire = isPropCompatibleWithGame("hint", "solitaire"); // true
    const isHintForLudo = isPropCompatibleWithGame("hint", "ludo"); // false
    const isCoinMultiplierForAll = isPropCompatibleWithGame("coin_multiplier", "solitaire"); // true

    return {
        hintProp,
        solitaireProps,
        allPropsCount: allProps.length,
        hasHint,
        hasInvalid,
        isHintForSolitaire,
        isHintForLudo,
        isCoinMultiplierForAll
    };
}

/**
 * 示例：在游戏逻辑中使用静态函数
 */
export function gameLogicExample() {
    const gameType = "solitaire";
    const availableProps = getPropsByGameType(gameType);

    // 过滤出可用的道具
    const usableProps = availableProps.filter(prop => {
        // 这里可以添加更多游戏状态相关的过滤逻辑
        return prop.isConsumable;
    });

    // 构建道具选择界面
    const propOptions = usableProps.map(prop => ({
        id: prop.id,
        name: prop.name,
        description: prop.description,
        gameType: prop.gameType,
        isConsumable: prop.isConsumable,
        maxQuantity: prop.maxQuantity
    }));

    return propOptions;
}

/**
 * 示例：道具验证逻辑
 */
export function propValidationExample(propType: string, gameType: string) {
    // 1. 检查道具是否存在
    if (!hasPropType(propType)) {
        return { valid: false, reason: "道具不存在" };
    }

    // 2. 检查道具是否适用于当前游戏
    if (!isPropCompatibleWithGame(propType, gameType)) {
        return { valid: false, reason: "道具不适用于当前游戏" };
    }

    // 3. 获取道具详细信息
    const propInfo = getPropType(propType);

    return {
        valid: true,
        propInfo,
        canUse: propInfo?.isConsumable
    };
}

// ===== 与 Convex 函数结合使用的示例 =====

/**
 * 示例：在 Convex 函数中使用静态函数
 * 这样可以减少重复的静态数据查询
 */
export async function convexFunctionExample(ctx: any, uid: string, propType: string, gameType: string) {
    // 使用静态函数进行快速验证
    if (!hasPropType(propType)) {
        throw new Error(`未知道具类型: ${propType}`);
    }

    if (!isPropCompatibleWithGame(propType, gameType)) {
        throw new Error(`道具 ${propType} 不适用于游戏类型 ${gameType}`);
    }

    // 获取道具信息（无需数据库查询）
    const propInfo = getPropType(propType);
    const effect = getPropEffect(propType);

    // 只对需要数据库的操作使用 Convex 函数
    // 例如：检查玩家库存、记录使用日志等
    const inventory = await ctx.db
        .query("player_inventory")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .first();

    // 后续处理...
    return {
        propInfo,
        effect,
        inventory
    };
}

/**
 * 示例：性能对比
 */
export function performanceComparison() {
    console.log("=== 性能对比 ===");

    // 静态函数调用（同步，无网络开销）
    const start1 = performance.now();
    for (let i = 0; i < 1000; i++) {
        getPropType("hint");
        getPropsByGameType("solitaire");
        hasPropType("undo");
    }
    const staticTime = performance.now() - start1;

    console.log(`静态函数 1000 次调用耗时: ${staticTime.toFixed(2)}ms`);

    // 注意：Convex 函数调用需要网络请求，这里只是演示
    console.log("Convex 函数调用需要网络请求，延迟通常在 50-200ms");

    return {
        staticFunctionTime: staticTime,
        recommendation: "对于静态数据，优先使用静态函数"
    };
}

/**
 * 示例：错误处理
 */
export function errorHandlingExample() {
    try {
        // 安全的道具获取
        const prop = getPropType("nonexistent_prop");
        if (!prop) {
            console.log("道具不存在，使用默认道具");
            return getPropType("hint"); // 使用默认道具
        }
        return prop;
    } catch (error) {
        console.error("获取道具时出错:", error);
        return null;
    }
}

/**
 * 示例：道具配置验证
 */
export function validatePropConfiguration() {
    const allProps = getAllPropTypes();
    const errors = [];

    for (const prop of allProps) {
        // 检查必需字段
        if (!prop.id || !prop.name || !prop.description) {
            errors.push(`道具 ${prop.id} 缺少必需字段`);
        }

        // 检查游戏类型
        if (!["solitaire", "ludo", "rummy"].includes(prop.gameType)) {
            errors.push(`道具 ${prop.id} 有无效的游戏类型: ${prop.gameType}`);
        }

        // 检查最大数量
        if (prop.maxQuantity <= 0) {
            errors.push(`道具 ${prop.id} 有无效的最大数量: ${prop.maxQuantity}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        totalProps: allProps.length
    };
} 