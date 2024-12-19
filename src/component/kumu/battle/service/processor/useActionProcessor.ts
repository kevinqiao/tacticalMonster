import { useCallback } from "react";
import { playTurnStart } from "../../animation/playPhase";
import { getWalkableNodes } from "../../utils/PathFind";
import { useCombatManager } from "../CombatManager";

const useActionProcessor = () => {
    const {characters,gridCells,hexCell} = useCombatManager()

    const processWalk = useCallback((data:any) => {
        if(!characters)return;
        const activeCharacter = characters[0]
        if(activeCharacter&&gridCells){
            const nodes = getWalkableNodes(gridCells,
                { x: activeCharacter.q, y: activeCharacter.r },
                activeCharacter.move_range || 2
            );                   
            activeCharacter.walkables = nodes;
            playTurnStart(activeCharacter,gridCells);
          
        }               
    }, [ characters, gridCells, hexCell])    
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