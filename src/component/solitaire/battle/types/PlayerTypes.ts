export interface GamePlayer {
    uid: string;
    token: string;
    name?: string;
    avatar?: string;
    exp?: number;
    level?: number;
    activeSkills?: { id: string; talentLevel: number }[];
    effects?: { id: string; remainingDuration: number }[];
}

export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
interface SkillEffect { description: string; instant: boolean; }
interface TalentLevel { level: number; description: string; cost: { coins: number; diamonds?: number }; }
interface LegendaryEffect { name: string; visual: string; bonus?: string; cost: number; owned: boolean; }
export interface Effect {
    id: string;
    name?: string;
    description?: string;
    duration?: number;
    remainingDuration?: number;
    modifier?: { [key: string]: any };
}
export interface Skill {
    id: string;
    name: string;
    class?: string;
    triggerCard: CardRank;
    instant?: boolean;
    baseEffect?: SkillEffect;
    talents: TalentLevel[];
    maxUsesPerGame: number;
    currentUses?: number;
    unlockLevel: number;
    unlockCost: { experience: number; diamonds?: number };
    legendaryEffect?: LegendaryEffect;
    currentTalentLevel?: number; // 当前天赋等级（新增）
}
export interface SkillState {
    skillId: string;
    status: SkillStatus;
    data: any;
}
export enum SkillStatus {
    Init = 0,
    InProgress = 1,
    Completed = 2
}


