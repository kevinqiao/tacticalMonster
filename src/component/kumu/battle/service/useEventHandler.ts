import { useCallback, useEffect } from "react";
import { playWalk } from "../animation/playAction";
import { playWalkable } from "../animation/playPhase";
import { CombatAction, CombatEvent, EVENT_TYPE } from "../model/CombatModels";
import { getMovableNodes } from "../utils/PathFind";
import { useCombatManager } from "./CombatManager";

const useEventHandler = () => {

    const combat = useCombatManager();
    const {characters, eventQueue,gridCells,hexCell } = combat;

    const processEvent = useCallback(() => {
        // console.log(eventQueue

        const event: CombatEvent | null = eventQueue.length > 0 ? eventQueue[0] : null;
        if (!event) return;
        const { type, name,status, gameId, time, data } = event;
        if (status === 0) {
            console.log(hexCell)
            event.status = 1;
            if (type === EVENT_TYPE.ACTION) {
                if (name === "walk") {
                   console.log("walk",data);
                   const action = event.data as CombatAction;
                   const character = characters?.find((c) => c.id === action.character);
                   if(character&&action.data.path&&gridCells){          
                        playWalk(character,action.data.path,hexCell,gridCells);                    
                   }
                   eventQueue.shift();
                }
            }else if(type === EVENT_TYPE.PHASE){
                if(name === "round"&&characters){
                    const character = characters[0]
                    console.log(character)
                    if(character&&gridCells){
                        const nodes = getMovableNodes(gridCells,
                            { x: character.q, y: character.r },
                            character.move_range || 2
                        );
                        console.log(nodes);
                        playWalkable(character,nodes,gridCells);
                        eventQueue.shift();
                    }
                }
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
export default useEventHandler