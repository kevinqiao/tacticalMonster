import { v } from "convex/values";
import { mutation } from "../../_generated/server";

// 道具类型定义
export interface PropType {
    id: string;
    name: string;
    description: string;
    gameType: string;
    isConsumable: boolean;
    maxQuantity: number;
}

// 道具效果定义
export interface PropEffect {
    id: string;
    name: string;
    description: string;
    effect: (gameState: any, params?: any) => any;
}

// 道具类型数据
export const propTypes: Record<string, PropType> = {
    hint: {
        id: "hint",
        name: "提示",
        description: "提供游戏提示",
        gameType: "solitaire",
        isConsumable: true,
        maxQuantity: 10
    },
    undo: {
        id: "undo",
        name: "撤销",
        description: "撤销上一步操作",
        gameType: "solitaire",
        isConsumable: true,
        maxQuantity: 5
    },
    shuffle: {
        id: "shuffle",
        name: "洗牌",
        description: "重新洗牌",
        gameType: "solitaire",
        isConsumable: true,
        maxQuantity: 3
    },
    dice_boost: {
        id: "dice_boost",
        name: "骰子增强",
        description: "增加骰子点数",
        gameType: "ludo",
        isConsumable: true,
        maxQuantity: 5
    },
    double_move: {
        id: "double_move",
        name: "双倍移动",
        description: "移动距离翻倍",
        gameType: "ludo",
        isConsumable: true,
        maxQuantity: 3
    },
    shield: {
        id: "shield",
        name: "护盾",
        description: "保护棋子不被攻击",
        gameType: "ludo",
        isConsumable: true,
        maxQuantity: 2
    },
    peek: {
        id: "peek",
        name: "偷看",
        description: "查看对手手牌",
        gameType: "rummy",
        isConsumable: true,
        maxQuantity: 3
    },
    swap: {
        id: "swap",
        name: "换牌",
        description: "交换手牌",
        gameType: "rummy",
        isConsumable: true,
        maxQuantity: 2
    },
    joker: {
        id: "joker",
        name: "万能牌",
        description: "可以替代任何牌",
        gameType: "rummy",
        isConsumable: true,
        maxQuantity: 1
    }
};

// 道具效果数据
const propEffects: Record<string, PropEffect> = {
    hint: {
        id: "hint",
        name: "提示效果",
        description: "提供下一步最佳移动建议",
        effect: (gameState: any) => {
            // 简单的提示逻辑
            return {
                ...gameState,
                hint: "建议移动这张牌"
            };
        }
    },
    undo: {
        id: "undo",
        name: "撤销效果",
        description: "撤销上一步操作",
        effect: (gameState: any) => {
            // 简单的撤销逻辑
            return {
                ...gameState,
                canUndo: true
            };
        }
    },
    shuffle: {
        id: "shuffle",
        name: "洗牌效果",
        description: "重新洗牌",
        effect: (gameState: any) => {
            // 简单的洗牌逻辑
            return {
                ...gameState,
                shuffled: true
            };
        }
    }
};

// 获取道具类型
export const getPropType = (propType: string): PropType | null => {
    return propTypes[propType] || null;
};

// 获取道具效果
export const getPropEffect = (propType: string): PropEffect | null => {
    return propEffects[propType] || null;
};

// 获取所有道具类型
export const getAllPropTypes = (): PropType[] => {
    return Object.values(propTypes);
};

// 根据游戏类型获取道具
export const getPropsByGameType = (gameType: string): PropType[] => {
    return Object.values(propTypes).filter((prop: any) => prop.gameType === gameType);
};

// 检查道具类型是否存在
export const hasPropType = (propType: string): boolean => {
    return propType in propTypes;
};

// 检查道具是否与游戏兼容
export const isPropCompatibleWithGame = (propType: string, gameType: string): boolean => {
    const prop = getPropType(propType);
    return prop ? prop.gameType === gameType : false;
};

// 验证道具使用（Convex 函数）
export const validatePropUsage = (mutation as any)({
    args: {
        uid: v.string(),
        gameType: v.string(),
        propType: v.string(),
        gameState: v.any()
    },
    handler: async (ctx: any, args: any) => {
        const { uid, gameType, propType, gameState } = args;

        // 1. 检查道具类型是否存在
        const propTypeInfo = getPropType(propType);
        if (!propTypeInfo) {
            throw new Error(`未知道具类型: ${propType}`);
        }

        // 2. 检查道具是否适用于当前游戏
        if (!isPropCompatibleWithGame(propType, gameType)) {
            throw new Error(`道具 ${propType} 不适用于游戏类型 ${gameType}`);
        }

        // 3. 检查玩家是否有该道具
        const inventory = await ctx.db
            .query("player_inventory")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();

        if (!inventory) {
            throw new Error("玩家库存不存在");
        }

        const playerProp = inventory.props.find((p: any) =>
            p.gameType === gameType && p.propType === propType
        );

        if (!playerProp || playerProp.quantity < 1) {
            throw new Error(`道具 ${propType} 数量不足`);
        }

        return {
            success: true,
            propType: propTypeInfo,
            availableQuantity: playerProp.quantity
        };
    }
}); 