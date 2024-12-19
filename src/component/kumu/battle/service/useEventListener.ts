import { useCallback, useEffect } from "react";
import { CombatEvent } from "../model/CombatModels";
import { useCombatManager } from "./CombatManager";
import useActionProcessor from "./processor/useActionProcessor";
import usePhaseProcessor from "./processor/usePhaseProcessor";

const useEventListener = () => {

    const {eventQueue,characters,gridCells,hexCell} = useCombatManager();
    const {processWalk,processAttack,processSkill,processDefend,processStandby} = useActionProcessor();     
    const {processRoundStart,processTurnStart} = usePhaseProcessor();
   
    const processEvent = useCallback(() => {
       
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;
        const { type, name,status, gameId, time, data } = event;
        if (!status) {
            console.log("processEvent",event)
            event.status = 1;
            switch(name){
                case "walk":        
                    processWalk(data);
                   break;
                case "roundStart":
                    processRoundStart(data);
                    eventQueue.shift();
                    break;
                case "turnStart":
                    processTurnStart(data); 
                    // eventQueue.shift();
                    break;
                default:
                    console.log("unknown event",event)
                    eventQueue.shift();
                    break;
            }

        }

    }, [ eventQueue,processRoundStart,processTurnStart,processWalk])


    useEffect(() => {
        if(!characters||!gridCells||!hexCell)return;
        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [characters,gridCells,hexCell]);


}
export default useEventListener

