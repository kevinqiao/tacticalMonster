export interface GamePlayer {
    uid: string;
    name?: string;
    avatar?: string;
    exp?: number;
    level?: number;
    unlockSkills?: string[];
}

export interface Effect {
    id: string;
    name: string;
    duration: number;
    remaining_duration?: number;
    modifiers?: {
        [key: string]: number;
    };
}
export interface Skill {
    id: string; // 技能的唯一标识符
    name: string; // 技能名称
    type: "master" | "active" | "passive"; // 技能类型（主动、被动、终极技能）
    description?: string; // 技能描述，提供玩家可读的信息
    unlockConditions?: {
        level?: number; // 解锁所需等级
        questsCompleted?: string[]; // 解锁所需完成的任务
    };
    resource_cost: { ep?: number; stamina?: number }; // 技能资源消耗（如能量点）
    cooldown: number; // 技能冷却时间（以回合计）
    effects: Effect[]; // 技能的直接效果（主动技能生效时触发）
}