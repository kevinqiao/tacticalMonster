import { useCallback } from "react";
import usePhasePlay from "../../animation/playPhase";
import { useCombatManager } from "../CombatManager";

const usePhaseProcessor = () => {
    const {characters,gridCells,hexCell,currentRound,resourceLoad,game,setActiveSkills} = useCombatManager();
    const {playTurnOn   } = usePhasePlay();    

  
    const processTurnStart = useCallback(async ({data,onComplete}:{data:{character_id:string,uid:string,status?:number},onComplete:()=>void}) => {
        // console.log("processTurnStart",data)
        const {character_id,uid} = data
        if(!characters||!currentRound)return;
        const currentTurn = currentRound.turns.find((t)=>t.uid===uid&&t.character_id===character_id);
        if(!currentTurn)return;
        Object.assign(currentTurn,data);
         currentTurn.status = 1;
        // console.log("currentRound",currentRound);
        playTurnOn(currentTurn,onComplete);
           
    }, [resourceLoad,characters, gridCells, hexCell,currentRound])    
    const processTurnSecond = useCallback(async ({data,onComplete}:{data:{character_id:string,uid:string,status?:number},onComplete:()=>void}) => {
        // console.log("processTurnStart",data)
        const {character_id,uid} = data
        if(!characters||!currentRound)return;
        const currentTurn = currentRound.turns.find((t)=>t.uid===uid&&t.character_id===character_id);
        if(!currentTurn)return;
        Object.assign(currentTurn,data);
        currentTurn.status = 2;
        // console.log("currentRound",currentRound);
        playTurnOn(currentTurn,onComplete);   

    }, [resourceLoad,characters, gridCells, hexCell,currentRound])  
    const processRoundStart = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!currentRound) return;
        currentRound.status = 1;    
        Object.assign(currentRound, data);   
        onComplete();
    }, [currentRound]);    
    const processTurnEnd = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!currentRound) return;
        const currentTurn = currentRound.turns.find((t)=>t.status===1||t.status===2);
        if(!currentTurn)return;
        currentTurn.status = 3; 
        onComplete();
    }, [currentRound]);   
    const processRoundEnd = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!currentRound) return;
        Object.assign(currentRound, data);   
        currentRound.status = 2;
        onComplete();
    }, [currentRound]);   

  
   
    return { processRoundStart,processRoundEnd,processTurnStart,processTurnEnd,processTurnSecond   }
}
export default usePhaseProcessor