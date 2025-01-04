import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Skill } from "../types/CharacterTypes";
import { CombatTurn, GameCharacter, GridCell } from "../types/CombatTypes";
import { getAttackableNodes, getWalkableNodes } from "../utils/PathFind";
const usePhasePlay = () => {
 const {gridCells,characters,hexCell,map,game,setActiveSkills} = useCombatManager(); 
 const playGameInit= useCallback((characters: GameCharacter[],  gridCells: GridCell[][],timeline:gsap.core.Timeline) => {
    const {width,height} = hexCell;
    const tl =gsap.timeline();
    // [1,3,5,7].forEach((row)=>{
    //     gsap.set(rowContainers[row], {marginLeft:`${width/2}px`});
    // })
    tl.to({}, {}, ">1")
    for (let row = 0; row < gridCells.length; row++) {
        for (let col = 0; col < gridCells[row].length; col++) {
            const cell = gridCells[row][col];
            if (cell.walkable || (cell.type && cell.type < 2))
                tl.to(cell.gridGround, { autoAlpha: 0.1, duration: 0.1 }, "<")
        }
    }
    characters.forEach(character => {
        if (character.container) {
            tl.to(character.container, {
                autoAlpha: 1,
                duration: 0.7,
            },">");
        }
    });
    if(timeline)timeline.add(tl);
    else tl.play();
    
},[hexCell]);
const playTurnOn= useCallback(async (currentTurn:CombatTurn,onComplete:()=>void) => {
    if(!characters||!gridCells||!map)return;  
    const character = characters.find((c)=>c.uid===currentTurn.uid&&c.character_id===currentTurn.character_id);
    if(!character)return;
    console.log("playTurnOn",currentTurn)
    const moveRange = currentTurn.status === 1 ? (character.move_range ?? 2) : 1;
    const walkableNodes = getWalkableNodes(gridCells, { x: character.q ?? 0, y: character.r ?? 0     }, moveRange);
    character.walkables = walkableNodes;
    const enemies = characters.filter((c) => c.uid !== character.uid && c.character_id !== character.character_id)
        .map(c => ({
            uid: c.uid,
            character_id: c.character_id,
            q: c.q ?? 0,
            r: c.r ?? 0,
        }));
   
    const skill:Skill|null|undefined = currentTurn.skills&&character.skills?character.skills.find((s)=>s.id===currentTurn.skills?.[0]):null;
    const attackableNodes = getAttackableNodes(
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
    console.log("attackableNodes",attackableNodes)
    character.attackables = attackableNodes;
    const tl = gsap.timeline({
           onComplete:()=>{
                    console.log("onComplete",currentTurn.skills)
                    const skills = currentTurn.skills;                
                    const activeSkills = character.skills?.filter((s)=>skills?.includes(s.id));    
                    if(activeSkills){
                        setActiveSkills(activeSkills);
                    }
                    onComplete();
            }
            
    });

    if(character.standEle){
        tl.to(character.standEle, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut"
        });
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
    characters.filter((c)=>c.uid===character.uid&&c.character_id===character.character_id).forEach((c)=>{
        if(c.standEle)
            tl.to(c.standEle, {
                        autoAlpha:10,
                        duration:0.5,
                ease:"power2.inOut"
            },"<");
            if(c.attackEle){    
                tl.to(c.attackEle, {
                    autoAlpha:0,
                    duration:0.5,
                    ease:"power2.inOut"
                },"<");
            }         
        
    })  
    tl.play();  
    //  if(game){
    //         const character = characters.find(c=>c.character_id===currentTurn.character_id);
    //         if(character){              
    //             const skillService = new SkillManager(character,game);                 
    //             const skills = await skillService.getAvailableSkills();  
    //             console.log("skills",skills)    
    //             if(skills){
    //                 setActiveSkills(skills);
    //             }
    //         } 
    //     }

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

const playTurnLast= useCallback((character: GameCharacter,  gridCells: GridCell[][],timeline:gsap.core.Timeline|null) => {
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

},[hexCell,map]);
return {    
    playGameInit,
    playTurnStart,
    playTurnLast,
    playTurnOn    
}
}
export default usePhasePlay;    
