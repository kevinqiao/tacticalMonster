/**
 * Tactical Monster 事件监听器
 */

import { useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
import useActionProcessor from "./processor/useActionProcessor";
import usePhaseProcessor from "./processor/usePhaseProcessor";

const useEventListener = () => {
    const { user } = useUserManager();
    const {
        eventQueue,
        characters,
        gridCells,
        hexCell,
        resourceLoad
    } = useCombatManager();

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

    const processEvent = useCallback(() => {
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;

        const onComplete = () => {
            eventQueue.shift();
        };

        event.initTime = event.initTime || Date.now();
        if (Date.now() - event.initTime > 5000) {
            eventQueue.shift();
            return;
        }

        const { name, status, data } = event;

        if (!status) {
            switch (name) {
                case "attack":
                    event.status = 1;
                    console.log("attack", data);
                    if (event.uid !== user.uid) {
                        processAttack({ data, onComplete });
                    } else {
                        onComplete();
                    }
                    break;
                case "walk":
                    event.status = 1;
                    if (event.uid !== user.uid) {
                        processWalk({ data, onComplete });
                    } else {
                        onComplete();
                    }
                    break;
                case "gameInit":
                    event.status = 1;
                    processGameInit({ data, onComplete });
                    break;
                case "roundStart":
                case "new_round":
                    event.status = 1;
                    processRoundStart({ data, onComplete });
                    break;
                case "turnStart":
                    event.status = 1;
                    processTurnStart({ data, onComplete });
                    break;
                case "turnSecond":
                    event.status = 1;
                    processTurnSecond({ data, onComplete });
                    break;
                case "turnEnd":
                    event.status = 1;
                    processTurnEnd({ data, onComplete });
                    break;
                case "roundEnd":
                case "end_round":
                    event.status = 1;
                    processRoundEnd({ data, onComplete });
                    break;
                case "skillSelect":
                    event.status = 1;
                    if (event.uid !== user.uid) {
                        processSkillSelect({ data, onComplete });
                    } else {
                        onComplete();
                    }
                    break;
                default:
                    console.log("unknown event", event);
                    eventQueue.shift();
                    break;
            }
        }
    }, [user, eventQueue, processRoundStart, processTurnStart, processTurnSecond, processWalk, resourceLoad, processAttack, processGameInit, processRoundEnd, processTurnEnd, processSkillSelect]);

    useEffect(() => {
        if (!characters || !gridCells || !hexCell || Object.values(resourceLoad).some(v => v === 0)) return;

        const intervalId = setInterval(() => {
            processEvent();
        }, 100);

        return () => clearInterval(intervalId);
    }, [user, characters, gridCells, hexCell, resourceLoad, processEvent]);
};

export default useEventListener;


