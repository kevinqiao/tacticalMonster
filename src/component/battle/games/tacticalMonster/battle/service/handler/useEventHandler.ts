/**
 * Tactical Monster 事件处理器
 * 参考 solitaireSolo 的事件处理模式
 */

import { useCallback } from "react";
import { MatchEvent } from "../EventProvider";
import useActionProcessor from "../processor/useActionProcessor";
import usePhaseProcessor from "../processor/usePhaseProcessor";

const useEventHandler = () => {
    const {
        processWalk,
        processAttack,
        processSkill,
        processDefend,
        processStandby,
        processSkillSelect
    } = useActionProcessor();

    const {
        processGameInit,
        processRoundStart,
        processTurnStart,
        processTurnEnd,
        processRoundEnd,
        processTurnSecond
    } = usePhaseProcessor();

    const handleEvent = useCallback((event: MatchEvent, onComplete: (eventId: string) => void) => {
        const { name, data, id } = event;

        const onFinish = () => {
            onComplete(id);
        };

        switch (name) {
            case "attack":
                processAttack({ data, onComplete: onFinish });
                break;
            case "walk":
                processWalk({ data, onComplete: onFinish });
                break;
            case "gameInit":
                processGameInit({ data, onComplete: onFinish });
                break;
            case "roundStart":
            case "new_round":
                processRoundStart({ data, onComplete: onFinish });
                break;
            case "turnStart":
                processTurnStart({ data, onComplete: onFinish });
                break;
            case "turnSecond":
                processTurnSecond({ data, onComplete: onFinish });
                break;
            case "turnEnd":
                processTurnEnd({ data, onComplete: onFinish });
                break;
            case "roundEnd":
            case "end_round":
                processRoundEnd({ data, onComplete: onFinish });
                break;
            case "skillSelect":
                processSkillSelect({ data, onComplete: onFinish });
                break;
            case "defend":
                processDefend({ data, onComplete: onFinish });
                break;
            case "standby":
                processStandby({ data, onComplete: onFinish });
                break;
            default:
                console.log("unknown event", event);
                onFinish();
                break;
        }
    }, [processWalk, processAttack, processGameInit, processRoundStart, processTurnStart, processTurnEnd, processRoundEnd, processTurnSecond, processSkillSelect, processDefend, processStandby]);

    return { handleEvent };
};

export default useEventHandler;


