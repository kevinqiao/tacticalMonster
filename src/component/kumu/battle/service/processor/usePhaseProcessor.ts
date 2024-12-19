import { useCallback } from "react";
import { playTurnStart } from "../../animation/playPhase";
import { getWalkableNodes } from "../../utils/PathFind";
import { useCombatManager } from "../CombatManager";

const usePhaseProcessor = () => {
    const {characters,gridCells,hexCell} = useCombatManager()

    const processRoundStart = useCallback((data:any) => {
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
    const processTurnStart = useCallback((data:any) => {
        
    }, [characters,gridCells,hexCell])    
    return {processRoundStart,processTurnStart}
}
export default usePhaseProcessor