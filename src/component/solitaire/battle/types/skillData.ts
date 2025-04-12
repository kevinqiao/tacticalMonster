import { Skill } from "./PlayerTypes";

export const skillDefs: Skill[] = [
    {
        id: "steal",
        name: "偷牌",
        triggerCard: "Q",
        class: "SkillSteal",
        baseEffect: { description: "随机偷对手1张暴露牌", instant: true },
        talents: [
            { level: 1, description: "可选择目标列", cost: { coins: 100 } },
            { level: 2, description: "偷后可移至基础堆", cost: { coins: 150 } },
            { level: 3, description: "对手移动次数-1", cost: { coins: 200, diamonds: 20 } },
        ],
        maxUsesPerGame: 2,
        unlockLevel: 1,
        unlockCost: { experience: 0 },
      
    },
    {
        id: "lock",
        name: "锁定",
        triggerCard: "J",
        baseEffect: { description: "锁定对手1列，持续1回合", instant: true },
        talents: [
            { level: 1, description: "持续2回合", cost: { coins: 100 } },
            { level: 2, description: "可锁定废牌堆顶部", cost: { coins: 150 } },
            { level: 3, description: "基础得分+1/张", cost: { coins: 200, diamonds: 20 } },
        ],
        maxUsesPerGame: 2,
        unlockLevel: 3,
        unlockCost: { experience: 150, diamonds: 20 },     

    },
    // 其他技能省略
];
