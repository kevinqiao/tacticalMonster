import { useCallback } from "react";
import { playTurnStart } from "../../animation/playPhase";
import { getWalkableNodes } from "../../utils/PathFind";
import { useCombatManager } from "../CombatManager";

const usePhaseProcessor = () => {
    const {characters,gridCells,hexCell,eventQueue} = useCombatManager()
    console.log("characters",characters)
    const processTurnStart = useCallback((data:any) => {
        console.log("processTurnStart",data)
        if(!characters)return;
        const activeCharacter = characters[0]
        console.log("activeCharacter",activeCharacter)  
        console.log("gridCells",gridCells)
        if(activeCharacter&&gridCells){
            const nodes = getWalkableNodes(gridCells,
                { x: activeCharacter.q, y: activeCharacter.r },
                activeCharacter.move_range || 2
            );                   
            activeCharacter.walkables = nodes;
            playTurnStart(activeCharacter,gridCells);
            eventQueue.shift();
        }               
    }, [ characters, gridCells, hexCell])    
    const processRoundStart = useCallback((data:any) => {
        console.log("processRoundStart",data)
    }, [characters,gridCells,hexCell])    
    return {processRoundStart,processTurnStart}
}
export default usePhaseProcessor