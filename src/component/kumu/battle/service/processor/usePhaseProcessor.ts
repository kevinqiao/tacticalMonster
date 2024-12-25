import gsap from "gsap";
import { useCallback } from "react";
import usePhasePlay from "../../animation/playPhase";
import { CharacterUnit } from "../../types/CombatTypes";
import { getWalkableNodes } from "../../utils/PathFind";
import { useCombatManager } from "../CombatManager";

const usePhaseProcessor = () => {
    const {characters,gridCells,hexCell,currentRound,resourceLoad} = useCombatManager();
    const {playTurnStart,playGameInit} = usePhasePlay();    

    
    const processTurnStart = useCallback(({data,onComplete}:{data:{character_id:string,uid:string,status?:number},onComplete:()=>void}) => {
        // console.log("processTurnStart",data)
        const {character_id,uid} = data
        if(!characters||!currentRound)return;
        const currentTurn = currentRound.turns.find((t)=>t.uid===uid&&t.character_id===character_id);
        if(!currentTurn)return;
        currentTurn.status = 1;
        // console.log("currentRound",currentRound);
        const activeCharacter = characters.find((c)=>c.character_id===character_id&&c.uid===uid);

        if(activeCharacter&&gridCells){
            const nodes = getWalkableNodes(gridCells,
                { x: activeCharacter.q, y: activeCharacter.r },
                activeCharacter.move_range || 2
            );                   
            activeCharacter.walkables = nodes;
            const tl = gsap.timeline({
                onComplete:()=>{
                    onComplete();
                }
            });
            playTurnStart(activeCharacter,gridCells,tl);
            tl.play();
        }               
    }, [resourceLoad,characters, gridCells, hexCell,currentRound])    
    const processRoundStart = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!currentRound) return;
        currentRound.status = 1;    
        Object.assign(currentRound, data);   
        onComplete();
    }, [currentRound]);    
    const processTurnEnd = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!currentRound) return;
        const currentTurn = currentRound.turns.find((t)=>t.status===1);
        if(!currentTurn)return;
            Object.assign(currentTurn, {status:2});
        onComplete();
    }, [currentRound]);   
    const processRoundEnd = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!currentRound) return;
        Object.assign(currentRound, data);   
        currentRound.status = 2;
        onComplete();
    }, [currentRound]);   

    const processGameInit = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
     
        if(!gridCells||Object.values(resourceLoad).some(v=>v===0)) return; 
        const {characters,currentRound} = data;
        const tl = gsap.timeline({
            onComplete:()=>{
                onComplete();
            }
        });
        playGameInit(characters,gridCells,tl);
        if(!currentRound) return;   
        const currentTurn = currentRound.turns.find((t:any)=>t.status===0||t.status===1);
        if(currentTurn){
            tl.to({},{},">-=0.4")    
            const activeCharacter = characters.find((c:CharacterUnit)=>c.character_id===currentTurn.character_id&&c.uid===currentTurn.uid);
            if(activeCharacter){       
                const nodes = getWalkableNodes(gridCells, { x: activeCharacter.q, y: activeCharacter.r }, activeCharacter.move_range || 2);                   
                activeCharacter.walkables = nodes;  
                playTurnStart(activeCharacter,gridCells,tl);
            }
        }
        tl.play();

    }, [gridCells,resourceLoad]);   
   
    return {processGameInit,processRoundStart,processRoundEnd,processTurnStart,processTurnEnd}
}
export default usePhaseProcessor