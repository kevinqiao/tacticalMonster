import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import usePlayAttack from "../../animation/usePlayAttack";
import usePlaySkillSelect from "../../animation/usePlaySkillSelect";
import usePlayWalk from "../../animation/usePlayWalk";
import { useCombatManager } from "../CombatManager";

const useActionProcessor = () => {
    const {user} = useUserManager();    
    const {characters,gridCells,hexCell,currentRound,game,resourceLoad} = useCombatManager()
    const {playWalk} = usePlayWalk();
    const { playSkillSelect } = usePlaySkillSelect();
    const { playAttack } = usePlayAttack();
    const processSkillSelect = useCallback(({data,onComplete}:{data:any,onComplete:()=>void})  => {
        const {uid,character_id,skillId} = data;
        const currentTurn = currentRound?.turns?.find((t:any)=>t.uid===uid&&t.character_id===character_id);
        if(!currentTurn)return;
        currentTurn.skillSelect = skillId;
        playSkillSelect({uid,character_id,skillId},onComplete);     
        
    }, [resourceLoad,characters,gridCells,hexCell,currentRound]) 
    const processWalk = useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
        if(!characters||!gridCells||!hexCell)return;
   
        const {uid,character_id,path} = data;
        const character = characters.find((c) => c.character_id === character_id&&c.uid===uid);    
        const {x,y} = path[path.length-1];
   
        if(character&&(character.q!==x||character.r!==y)){   
            character.q=x;
            character.r=y;         
            playWalk(character,path,onComplete);                    
        }else{
            onComplete();
        }   
    }, [user,resourceLoad,characters, gridCells, hexCell])  

    const processAttack = useCallback(({data, onComplete}: {data: any, onComplete: () => void}) => {
        const {attacker, target} = data;
        playAttack(attacker, target, onComplete);
    }, [characters, gridCells, hexCell]);
    const processSkill = useCallback((data:any) => {
        
    }, [characters,gridCells,hexCell])     
    const processDefend = useCallback((data:any) => {
        
    }, [characters,gridCells,hexCell])   
    const processStandby = useCallback((data:any) => {
        
    }, [characters,gridCells,hexCell])   
    return {processWalk,processAttack,processSkill,processDefend,processStandby,processSkillSelect}
}
export default useActionProcessor