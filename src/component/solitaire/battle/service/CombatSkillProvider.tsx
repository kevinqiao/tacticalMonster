import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { useSSAManager } from "service/SSAManager";
import { ISkillContext } from "../types/CombatTypes";
import { CardRank } from "../types/PlayerTypes";
import { skillDefs } from "../types/skillData";
import { useCombatManager } from "./CombatManager";
export const enum SkillStatus {
    INIT = 0,
    CONFIRMED = 1,
    IN_PROGRESS = 2,
    COMPLETED = 3,
}
const enum SkillCategory {
    DEFEND = "defend",
    ATTACK = "attack",
    HEAL = "heal",
    BUFF = "buff",
    DEBUFF = "debuff",
    CONTROL = "control",
    OTHER = "other",
}
const skillCategoryMap: { [k: string]: SkillCategory } = {
    "steal": SkillCategory.ATTACK,
    "cover": SkillCategory.DEFEND,
    "lock": SkillCategory.CONTROL,
}
export const CombatSkillContext = createContext<ISkillContext>({
    activeSkill: null,
    canTriggerSkill: () => { return undefined },
    triggerSkill: () => { },
    updateActiveSkill: () => { },
    completeActiveSkill: () => { }
});
const CombatSkillProvider = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { player } = useSSAManager();
    const { game } = useCombatManager();
    const [activeSkill, setActiveSkill] = useState<{ skillId: string, status: number, data: any } | null>(null);

    const updateActiveSkill = useCallback((data: any) => {
        setActiveSkill(data);
    }, []);
    const completeActiveSkill = useCallback(() => {
        setActiveSkill(null);
    }, []);

    const canTriggerSkill = useCallback((triggerCard: CardRank): { id: string, talentLevel: number } | undefined => {
        if (!player || !player.activeSkills) return;
        const seat = game?.seats?.find((s) => s.uid === player.uid);
        if (!seat) return;
        const activeSkill = player.activeSkills.find((s: { id: string, talentLevel: number }) => {

            const skill = skillDefs.find((skill) => s.id === skill.id && skill.triggerCard === triggerCard);
            if (!skill) return false;
            const skillUse = seat.skillUses?.find((su) => su.id === s.id);
            if (skill.maxUsesPerGame && (!skillUse || skillUse.currentUses < skill.maxUsesPerGame))
                return true;
        })
        return activeSkill;

    }, [game, player]);

    const triggerSkill = useCallback(async ({ skillId, data }: { skillId: string, data: any }) => {
        console.log("triggerSkill", skillId, data)
        setActiveSkill({ skillId, status: 0, data });

    }, []);
    useEffect(() => {
        if (game && game.skillUse) {
            setActiveSkill(game.skillUse)
        }
    }, [game])

    const value = {
        activeSkill,
        canTriggerSkill,
        triggerSkill,
        updateActiveSkill,
        completeActiveSkill
    };
    return <CombatSkillContext.Provider value={value}>{children}</CombatSkillContext.Provider>
}
export const useSkillManager = () => {
    const context = useContext(CombatSkillContext);
    if (!context) {
        throw new Error("useSkillManager must be used within a CombatSkillProvider");
    }
    return context;
};

export default CombatSkillProvider

