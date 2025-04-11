import { useCallback } from "react";
import { useCombatManager } from "../../service/CombatManager";
import { useSkillManager } from "../../service/CombatSkillProvider";
import { CombatEvent } from "../../types/CombatTypes";
const useSkillHandler = () => {

    const { game, eventQueue, boardDimension, direction } = useCombatManager();
    const { updateActiveSkill } = useSkillManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, data } = event;
        console.log("skillTriggered", event)
        switch (name) {
            case "skillTriggered":
                updateActiveSkill(data);
                onComplete();
                break;

            case "skillCompleted":
                updateActiveSkill(data);
                onComplete();
                break;
            default:
                onComplete();
                break;
        }

    }, [game, eventQueue, boardDimension, direction]);


    return { handleEvent };
};

export default useSkillHandler;


