import { useCallback, useEffect } from "react";
import { CombatEvent } from "../types/CombatTypes";
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
            event.status = 1;
            switch(name){
                case "walk":        
                    processWalk({data,onComplete:()=>{
                        console.log("processWalk onComplete",event)
                        eventQueue.shift();
                    }});
                   break;
                case "roundStart":
                    processRoundStart({data,onComplete:()=>{
                        console.log("processRoundStart onComplete",event)
                        eventQueue.shift();
                    }});
                    break;
                case "turnStart":
                    processTurnStart({data,onComplete:()=>{
                        console.log("processTurnStart onComplete",event)
                        eventQueue.shift();
                    }}); 
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

