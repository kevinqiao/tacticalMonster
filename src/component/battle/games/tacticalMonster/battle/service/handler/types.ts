/**
 * 战斗操作处理器类型定义
 */

import { UseSkillResponse } from "../../types/backendResponseTypes";
import { MonsterSprite } from "../../types/CombatTypes";

/**
 * 技能同步状态
 * 用于同步主动技能动画和后端响应的完成状态
 */
export type SkillSyncState = {
    animationCompleted: boolean;
    backendResponse: UseSkillResponse | null;
    operationId?: string;
    activeSkillTimeline?: gsap.core.Timeline;  // 主动技能动画 timeline，也作为主 timeline 使用
    pendingUpdate?: { rollback: () => void };
    optimisticResult?: any;
    character?: MonsterSprite;
    target?: MonsterSprite;
    skillId?: string;
};

