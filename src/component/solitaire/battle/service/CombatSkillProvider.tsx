import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { useConvex } from "convex/react";
import { api } from "convex/solitaire/convex/_generated/api";
import { useSSAManager } from "service/SSAManager";
import { ISkillContext } from "../types/CombatTypes";
import { SkillState } from "../types/PlayerTypes";
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
    updateActiveSkill: () => { },
    completeActiveSkill: () => { }
});
const CombatSkillProvider = ({ children }: { children: ReactNode }): React.ReactElement => {
    const { player } = useSSAManager();
    const { game } = useCombatManager();
    const [activeSkill, setActiveSkill] = useState<SkillState | null>(null);
    const convex = useConvex();

    const updateActiveSkill = useCallback((data: any) => {
        setActiveSkill(data);
    }, []);

    const completeActiveSkill = useCallback(async () => {
        if (!game || !activeSkill || !game.gameId) return;
        const res: any = await convex.mutation(api.service.gameProxy.completeSkill, {
            uid: player?.uid ?? "",
            token: player?.token ?? "",
            gameId: game.gameId,
            skillId: activeSkill.skillId,
            data: activeSkill.data.completed
        });
        setActiveSkill(null);
    }, [activeSkill, convex, game]);




    useEffect(() => {
        if (game && game.skillUse) {
            setActiveSkill(game.skillUse)
        }
    }, [game])

    const value = {
        activeSkill,
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

    return context
};

export default CombatSkillProvider

