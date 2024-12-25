import { useCallback, useEffect } from "react";
import { useUserManager } from "service/UserManager";
import { CombatEvent } from "../types/CombatTypes";
import { useCombatManager } from "./CombatManager";
import useActionProcessor from "./processor/useActionProcessor";
import usePhaseProcessor from "./processor/usePhaseProcessor";

const useEventListener = () => {
    const { user } = useUserManager();  
    const {eventQueue,characters,gridCells,hexCell,resourceLoad} = useCombatManager();
    const {processWalk,processAttack,processSkill,processDefend,processStandby} = useActionProcessor();     
    const {processGameInit, processRoundStart,processTurnStart,processTurnEnd,processRoundEnd} = usePhaseProcessor();
   
   
    const processEvent = useCallback(() => {
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;
    
        const {  name,status, gameId, time, data } = event;
        if (!status) {      
            
            switch(name){
                case "walk":     
                     event.status = 1;   
                    processWalk({data,onComplete:()=>{
                        console.log("processWalk onComplete",event)
                        eventQueue.shift();
                    }});
                   break;
                case "roundStart":
                    event.status = 1;
                    processRoundStart({data,onComplete:()=>{
                        console.log("processRoundStart onComplete",event)
                        eventQueue.shift();
                    }});
                    break;
                case "turnStart":
                    event.status = 1;
                    processTurnStart({data,onComplete:()=>{
                        console.log("processTurnStart onComplete",event)
                        eventQueue.shift();
                    }}); 
                    break;
                case "turnEnd":
                    event.status = 1;
                    processTurnEnd({data,onComplete:()=>{
                        console.log("processTurnEnd onComplete",event)
                        eventQueue.shift();
                    }}); 
                    break;
                case "roundEnd":
                    event.status = 1;
                    processRoundEnd({data,onComplete:()=>{
                        console.log("processRoundEnd onComplete",event)
                        eventQueue.shift();
                    }}); 
                    break;
                // case "gameInit":
                //     event.status = 1;   
                //     processGameInit({data,onComplete:()=>{
                //         console.log("processGameInit onComplete",event)
                //         eventQueue.shift();
                //     }}); 
                //     break;  
                // case "changeCoordDirection":
                //     event.status = 1;
                //     processChangeCoordDirection({data,onComplete:()=>{
                //         console.log("processChangeCoordDirection onComplete",event)
                //         eventQueue.shift();
                //     }}); 
                //     break;
                default:
                    console.log("unknown event",event)
                    eventQueue.shift();
                    break;
            }

        }

    }, [ eventQueue,processRoundStart,processTurnStart,processWalk,resourceLoad])


    useEffect(() => {
        
        if(!user.uid||!characters||!gridCells||!hexCell||Object.values(resourceLoad).some(v=>v===0))return;
        console.log("useEffect",resourceLoad)   
        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user,characters,gridCells,hexCell,resourceLoad]);


}
export default useEventListener

