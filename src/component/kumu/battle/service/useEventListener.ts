import { useCallback, useEffect } from "react";
import { playWalk } from "../animation/playAction";
import { playTurnStart } from "../animation/playPhase";
import { CombatAction, CombatEvent } from "../model/CombatModels";
import { getWalkableNodes } from "../utils/PathFind";
import { useCombatManager } from "./CombatManager";

const useEventListener = () => {

    const combat = useCombatManager();
    const {characters, eventQueue,gridCells,hexCell } = combat;

    const processEvent = useCallback(() => {
       
        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event || !characters) return;
        const { type, name,status, gameId, time, data } = event;
        if (!status) {
            console.log("processEvent",event)
            event.status = 1;
            switch(name){
                case "walk":        
                   const action = event.data as CombatAction;
                   const character = characters.find((c) => c.character_id === action.character);
                   if(character&&action.data.path&&gridCells){          
                        playWalk(character,action.data.path,hexCell,gridCells);                    
                   }
                   eventQueue.shift();
                   break;
                case "roundStart":
                    const activeCharacter = characters[0]
                    if(activeCharacter&&gridCells){
                        const nodes = getWalkableNodes(gridCells,
                            { x: activeCharacter.q, y: activeCharacter.r },
                            activeCharacter.move_range || 2
                        );                   
                        activeCharacter.walkables = nodes;
                        playTurnStart(activeCharacter,gridCells);
                        eventQueue.shift();
                    }
                    break;
                case "turnStart":
                    eventQueue.shift();
                    break;
                default:
                    console.log("unknown event",event)
                    eventQueue.shift();
                    break;
            }

        }

    }, [characters, eventQueue,hexCell,gridCells])


    useEffect(() => {
        const intervalId = setInterval(() => {
            processEvent();
        }, 100); // 每秒检查一次消息队列

        return () => clearInterval(intervalId);
    }, [hexCell,gridCells]);


}
export default useEventListener