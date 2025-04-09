import { useCallback } from "react";
import { useCombatManager } from "../../service/CombatManager";
import { useSkillManager } from "../../service/CombatSkillProvider";
import { CombatEvent } from "../../types/CombatTypes";
const useSkillHandler = () => {

    const { game, eventQueue, boardDimension, direction } = useCombatManager();
    const { triggerSkill } = useSkillManager();
    const handleEvent = useCallback((event: CombatEvent, onComplete: () => void) => {
        const { name, status, data } = event;
        console.log("skillTriggered", event)
        switch (name) {

            case "skillTriggered":
                triggerSkill(data);
                onComplete();
                break;

            case "gameOver":
                console.log("gameOver", event)
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


