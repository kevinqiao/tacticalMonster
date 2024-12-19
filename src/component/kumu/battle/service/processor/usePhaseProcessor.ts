import { useCallback } from "react";
import { playTurnStart } from "../../animation/playPhase";
import { getWalkableNodes } from "../../utils/PathFind";
import { useCombatManager } from "../CombatManager";

const usePhaseProcessor = () => {
    const {characters,gridCells,hexCell,eventQueue} = useCombatManager()
    const processTurnStart = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        console.log("processTurnStart",data)
        if(!characters)return;
        const activeCharacter = characters[0]
        if(activeCharacter&&gridCells){
            const nodes = getWalkableNodes(gridCells,
                { x: activeCharacter.q, y: activeCharacter.r },
                activeCharacter.move_range || 2
            );                   
            activeCharacter.walkables = nodes;
            playTurnStart(activeCharacter,gridCells);
            onComplete();
        }               
    }, [ characters, gridCells, hexCell])    
    const processRoundStart = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        console.log("processRoundStart",data)
        onComplete();
    }, [characters,gridCells,hexCell])    
    return {processRoundStart,processTurnStart}
}
export default usePhaseProcessor