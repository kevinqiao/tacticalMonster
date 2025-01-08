import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Skill } from "../types/CharacterTypes";
import { CombatTurn, GameCharacter } from "../types/CombatTypes";
import { getAttackableNodes, getWalkableNodes } from "../utils/PathFind";

const usePlayPhase   = () => {
 const {gridCells,characters,hexCell,map,setActiveSkill} = useCombatManager(); 

 const playTurnOn= useCallback(async (currentTurn:CombatTurn,onComplete:()=>void) => {
    if(!characters||!gridCells||!map)return;  
    const character = characters.find((c)=>c.uid===currentTurn.uid&&c.character_id===currentTurn.character_id);
    if(!character)return;
    // console.log("playTurnOn",currentTurn)
    const moveRange = currentTurn.status === 1 ? (character.move_range ?? 2) : 1;
    const grid = gridCells.map((row)=>row.map((cell)=>{
        // if(cell.x===character.q&&cell.y===character.r) return {x:cell.x,y:cell.y,walkable:false};
        const char = characters.find((c)=>c.q===cell.x&&c.r===cell.y)
        return {
            x: cell.x,
            y: cell.y,
            walkable: char?false:cell.walkable
        }
    }))

    const walkableNodes = getWalkableNodes(
        grid, 
        { x: character.q ?? 0, y: character.r ?? 0 }, 
        moveRange
    );
    character.walkables = walkableNodes;
    const enemies = characters.filter((c) => c.uid !== character.uid && c.character_id !== character.character_id)
        .map(c => ({
            uid: c.uid,
            character_id: c.character_id,
            q: c.q ?? 0,
            r: c.r ?? 0,
        }));

    const skillId = currentTurn.skillSelect||currentTurn.skills?.[0];
    const skill:Skill|undefined = character.skills?.find((s)=>skillId===s.id);

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

//    console.log("attackableNodes",attackableNodes)
    character.attackables = attackableNodes;
    const tl = gsap.timeline({
           onComplete:()=>{
                    setActiveSkill(skill??null);                     
                    onComplete();
            }
            
    });

    if(character.standEle){
        tl.to(character.standEle, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut"
        },"<");
    }
    const {cols,direction} = map;
    if(walkableNodes){
        walkableNodes.forEach((node) => {
            const { x, y } = node;
            const col = direction === 1 ? cols - x - 1 : x; 
            const gridCell = gridCells[y][col];
            if(!gridCell?.gridWalk||node.distance===0)return;
            tl.to(gridCell.gridWalk, {
                autoAlpha:node.distance===character.move_range?0.4:0.8,
                duration:0.5,
                ease:"power2.inOut"
            },"<");
        });
    }
    if(character.attackables){
        character.attackables.forEach((node) => {
            const {uid,character_id,distance} = node;
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


},[characters,gridCells,hexCell,map]);
 const playTurnStart= useCallback((character: GameCharacter,timeline:gsap.core.Timeline|null) => {
    // console.log("playTurnStart",character)
    if(!map||!gridCells)return;
    const {cols,direction} = map;
    const tl = gsap.timeline();
    if(character?.standEle){    
        tl.to(character.standEle, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut"
        });
    }
    // tl.to({},{},">")
    if(character.walkables){
        character.walkables.forEach((node) => {
            const { x, y } = node;
            const col = direction === 1 ? cols - x - 1 : x; 
            const gridCell = gridCells[y][col];
            if(!gridCell?.gridWalk||node.distance===0)return;
            tl.to(gridCell.gridWalk, {
                autoAlpha:node.distance===character.move_range?0.4:0.8,
                duration:0.5,
                ease:"power2.inOut"
            },"<");
        });
    }
    if(timeline)timeline.add(tl,"<");
    else tl.play(); 

},[gridCells,hexCell,map]);

const playTurnInit= useCallback(() => {
    // console.log("playTurnStart",character)
    if(!map||!gridCells)return;


},[hexCell,map]);
return {    
    playTurnInit,
    playTurnOn    
}
}
export default usePlayPhase;    
