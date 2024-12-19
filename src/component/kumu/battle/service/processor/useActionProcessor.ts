import { useCallback } from "react";
import { playWalk } from "../../animation/playAction";
import { CombatAction } from "../../types/CombatTypes";
import { useCombatManager } from "../CombatManager";

const useActionProcessor = () => {
    const {eventQueue,characters,gridCells,hexCell} = useCombatManager()
    
    const processWalk = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!characters||!gridCells||!hexCell)return;
        const action = data as CombatAction;
        const character = characters.find((c) => c.character_id === action.character);
        if(character&&action.data.path){          
            playWalk(character,action.data.path,hexCell,gridCells);                    
        }
        eventQueue.shift();
        onComplete();
    }, [eventQueue, characters, gridCells, hexCell])    
    const processAttack = useCallback((data:any) => {
        
    }, [characters,gridCells,hexCell])  
    const processSkill = useCallback((data:any) => {
        
    }, [characters,gridCells,hexCell])     
    const processDefend = useCallback((data:any) => {
        
    }, [characters,gridCells,hexCell])   
    const processStandby = useCallback((data:any) => {
        
    }, [characters,gridCells,hexCell])   
    return {processWalk,processAttack,processSkill,processDefend,processStandby}
}
export default useActionProcessor