import { useCallback } from "react";
import { playWalk } from "../../animation/playAction";
import { CombatAction } from "../../model/CombatModels";
import { useCombatManager } from "../CombatManager";

const useActionProcessor = () => {
    const {eventQueue,characters,gridCells,hexCell} = useCombatManager()

    const processWalk = useCallback((data:any) => {
        if(!characters)return;
        const action = data as CombatAction;
        const character = characters.find((c) => c.character_id === action.character);
        console.log("character",character)  
        console.log("action",action)
        console.log("gridCells",gridCells)
        console.log("hexCell",hexCell)  
        if(character&&action.data.path&&gridCells){          
            playWalk(character,action.data.path,hexCell,gridCells);                    
        }
        eventQueue.shift();
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