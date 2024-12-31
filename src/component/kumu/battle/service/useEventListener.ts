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
    const { 
        processRoundStart, 
        processTurnOn, 
        processTurnEnd, 
        processRoundEnd,
        processTurnLast
    } = usePhaseProcessor();
   
   
    const processEvent = useCallback(() => {
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;
        const onComplete = ()=>{
            eventQueue.shift();
        }
        console.log("processEvent",event)
        event.initTime = event.initTime||Date.now();
        if(Date.now()-event.initTime>15000){
            eventQueue.shift();
            return;
        }   
        const {  name,status, gameId, time, data } = event;
        if (!status) {      
            
            switch(name){
                case "walk":     
                     event.status = 1;   
                    processWalk({data,onComplete});
                   break;
                case "roundStart":
                    event.status = 1;
                    processRoundStart({data,onComplete});
                    break;
                case "turnStart":
                    event.status = 1;
                    processTurnOn({data,onComplete}); 
                    break;
                case "turnLast":
                    event.status = 1;
                    processTurnLast({data,onComplete}); 
                    break;
                case "turnEnd":
                    event.status = 1;
                    processTurnEnd({data,onComplete}); 
                    break;
                case "roundEnd":
                    event.status = 1;
                    processRoundEnd({data,onComplete}); 
                    break;

                default:
                    console.log("unknown event",event)
                    eventQueue.shift();
                    break;
            }

        }

    }, [ eventQueue,processRoundStart,processTurnOn,processWalk,resourceLoad])


    useEffect(() => {
        
        if(!user.uid||!characters||!gridCells||!hexCell||Object.values(resourceLoad).some(v=>v===0))return;

        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [user,characters,gridCells,hexCell,resourceLoad]);


}
export default useEventListener

