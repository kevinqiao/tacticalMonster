import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { CharacterUnit, GridCell } from "../types/CombatTypes";
const usePhasePlay = () => {
 const {hexCell,map} = useCombatManager(); 
 const playGameInit= useCallback((characters: CharacterUnit[],  gridCells: GridCell[][],timeline:gsap.core.Timeline) => {
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
 const playTurnStart= useCallback((character: CharacterUnit,  gridCells: GridCell[][],timeline:gsap.core.Timeline|null) => {
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
    playTurnStart
}
}
export default usePhasePlay;    
