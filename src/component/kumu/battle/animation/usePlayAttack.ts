import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";

const usePlayAttack = () => {
        const {characters,gridCells,hexCell,currentRound,map} = useCombatManager();
        const playAttack =useCallback((attacker:{uid:string,character_id:string,skillId:string}, target:{uid:string,character_id:string},onComplete:()=>void) => {
            console.log("playAttack",attacker,target);
            if (!gridCells||!hexCell||!map||!characters) return;
            const attackerCharacter = characters.find((c)=>c.uid===attacker.uid&&c.character_id===attacker.character_id);
            const targetCharacter = characters.find((c)=>c.uid===target.uid&&c.character_id===target.character_id);
            if(!attackerCharacter||!targetCharacter) return;

            const tl = gsap.timeline({                
                onComplete
            });
   
            const {cols,direction} = map;   
            attackerCharacter.walkables?.forEach((node)=>{
                const {x,y} = node;
                const col = direction === 1 ? cols - x - 1 : x;
                const gridCell = gridCells[y][col];
                if(gridCell?.gridWalk){
                    tl.to(gridCell.gridWalk, {autoAlpha:0,duration:0.5},"<");
                }
            })
            if(attackerCharacter.standEle){
                tl.to(attackerCharacter.standEle, {autoAlpha:0,duration:0.5},"<");
            }
 
            if(targetCharacter.attackEle){
                tl.to(targetCharacter.attackEle, {autoAlpha:0,duration:0.5},"<");
            }
            return tl.play();
        },[characters,gridCells,hexCell,map]);

        
        return { playAttack}       
}
export default usePlayAttack;   


