import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Skill } from "../types/CharacterTypes";
import { getAttackableNodes } from "../utils/PathFind";
const usePlaySkillSelect = () => {
         const {characters,gridCells,hexCell,currentRound,map} = useCombatManager();    

    
         const playSkillSelect= useCallback(async (skillSelect:{skillId:string;uid:string;character_id:string},onComplete:()=>void) => {
                if(!characters||!gridCells||!map||!currentRound)return;  
                console.log("playSkillSelect",skillSelect)
                const {uid,character_id} = skillSelect;
                const character = characters.find((c)=>c.uid===uid&&c.character_id===character_id);
                if(!character)return;    
                const currentTurn = currentRound.turns.find((t)=>t.uid===uid&&t.character_id===character_id);
                if(!currentTurn)return;
                // console.log("character",character)
                const skill:Skill|null= character.skills?.find((s)=>s.id===skillSelect.skillId)??null;
                if(!skill)return;   
                // console.log("skill",skill)
                const grid = gridCells.map((row)=>row.map((cell)=>{
                        const char = character.q===cell.x&&character.r===cell.y?null:characters.find((c)=>c.q===cell.x&&c.r===cell.y)
                        return {
                                    x: cell.x,
                                    y: cell.y,
                                    walkable: char?false:cell.walkable
                                }
                }))

            
                character.attackables?.forEach((node) => {
                    const {uid,character_id,distance} = node;
                    const enemy = characters.find((c)=>c.uid===uid&&c.character_id===character_id);
                    if(!enemy)return;           
                    if(!enemy?.attackEle)return;
                    gsap.set(enemy.attackEle, {autoAlpha:0});
                });

                const enemies = characters.filter((c) => c.uid !== character.uid && c.character_id !== character.character_id)
                    .map(c => ({
                        uid: c.uid,
                        character_id: c.character_id,
                        q: c.q ?? 0,
                        r: c.r ?? 0,
                    }));
    
               
                // console.log("skill",skill)
                const attackableNodes = getAttackableNodes(
                    grid,
                    {
                        q: character.q ?? 0,
                        r: character.r ?? 0,
                        uid: character.uid,
                        character_id: character.character_id,
                        moveRange: character.move_range ?? 2,
                        attackRange: character.attack_range || { min: 1, max: 2 }
                    },
                    enemies, 
                    skill??null 
                );

                // console.log("attackableNodes",attackableNodes)
                character.attackables = attackableNodes;
                const tl = gsap.timeline({onComplete});

                if(character.standEle){
                    tl.to(character.standEle, {
                        autoAlpha: 1,
                        duration: 0.5,
                        ease: "power2.inOut"
                    });
                }

                if(character.attackables){
                    character.attackables.forEach((node) => {
                        const {x,y,uid,character_id,distance} = node;
                        const enemy = characters.find((c)=>c.uid===uid&&c.character_id===character_id);
                        if(!enemy)return;
                    
                        if(!enemy?.attackEle)return;
                        tl.to(enemy.attackEle, {
                            autoAlpha:1,
                            duration:0.5,
                            ease:"power2.inOut"
                        },"<");
                    });
                }
            
                tl.play();

         },[characters,gridCells,hexCell,currentRound,map]);
         return {playSkillSelect}   
}
export default usePlaySkillSelect;   


