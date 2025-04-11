import React, { FunctionComponent, lazy, Suspense, useMemo } from 'react';
import { useSkillManager } from '../service/CombatSkillProvider';
import { skillDefs } from '../types/skillData';


const SkillControl: React.FC = () => {
    const { activeSkill } = useSkillManager();

    const skillClass = useMemo(() => {
        if (activeSkill) {
            const skill = skillDefs.find((s) => s.id === activeSkill.skillId);
            console.log("skill", skill)
            return skill?.class;
        }
        return;
    }, [activeSkill]);

    const SelectedComponent: FunctionComponent | null = useMemo(() => {
        if (skillClass) {
            return lazy(() => import(`./skill/${skillClass}`));
        }
        return null;
    }, [skillClass]);

    console.log("skillClass", activeSkill, skillClass, SelectedComponent)
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


