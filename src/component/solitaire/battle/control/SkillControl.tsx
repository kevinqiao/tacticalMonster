import React, { FunctionComponent, lazy, Suspense, useMemo } from 'react';
import { useSkillManager } from '../service/CombatSkillProvider';
import { skillDefs } from '../types/skillData';

/** Vite 要求动态 import 含静态路径；按 skillData.class 显式映射 */
const SKILL_LOADERS: Record<string, () => Promise<{ default: React.ComponentType }>> = {
    SkillSteal: () => import("./skill/SkillSteal.tsx"),
};

const SkillControl: React.FC = () => {
    const { activeSkill } = useSkillManager();

    const skillClass = useMemo(() => {
        if (activeSkill) {
            const skill = skillDefs.find((s) => s.id === activeSkill.skillId);
            return skill?.class;
        }
        return;
    }, [activeSkill]);

    const SelectedComponent: FunctionComponent | null = useMemo(() => {
        if (!skillClass) return null;
        const load = SKILL_LOADERS[skillClass];
        if (!load) {
            console.warn(`[SkillControl] No loader for skill class "${skillClass}"`);
            return null;
        }
        return lazy(load);
    }, [skillClass]);


    return (
        <>
            {SelectedComponent && <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 4000 }}>
                <Suspense fallback={<div />}>
                    <SelectedComponent />
                </Suspense>
            </div>}
        </>
    );
};


export default SkillControl;


