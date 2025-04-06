import React from 'react';
import { useSSAManager } from 'service/SSAManager';
import { useCombatManager } from '../service/CombatManager';
import { useSkillManager } from '../service/CombatSkillProvider';



const SkillControl: React.FC = () => {
    const { player } = useSSAManager();
    const { game } = useCombatManager();
    const { activeSkill, canTriggerSkill, triggerSkill, updateActiveSkill, completeActiveSkill } = useSkillManager();
    return (
        <></>
    );
};


export default SkillControl;


