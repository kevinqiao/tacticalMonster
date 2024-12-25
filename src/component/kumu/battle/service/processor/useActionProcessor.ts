import { useCallback } from "react";
import useActionPlay from "../../animation/playAction";
import { useCombatManager } from "../CombatManager";

const useActionProcessor = () => {
    
    const {eventQueue,characters,gridCells,hexCell} = useCombatManager()
    const {playWalk} = useActionPlay();
    const processWalk = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!characters||!gridCells||!hexCell)return;
        console.log(data);
        const {uid,character_id,path} = data;
        const character = characters.find((c) => c.character_id === character_id&&c.uid===uid);
    
        const {x,y} = path[path.length-1];
 
        if(character&&(character.q!==x||character.r!==y)){   
            character.q=x;
            character.r=y;         
            playWalk(character,path);                    
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