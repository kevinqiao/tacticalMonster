import gsap from "gsap";
import { CharacterUnit, GridCell } from "../model/CombatModels";

export const playGameInit= (characters: CharacterUnit[],  gridCells: GridCell[][]) => {
 const tl = gsap.timeline();
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
    tl.play();

}
export const playTurnStart= (character: CharacterUnit,  gridCells: GridCell[][]) => {

    const tl = gsap.timeline();
    if(character?.standEle){    
        tl.to(character.standEle, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut"
        });
    }
    tl.to({},{},">")
    if(character.walkables){
        character.walkables.forEach((node) => {
            const { x, y } = node;
            const gridCell = gridCells[y][x];
            if(!gridCell?.gridWalk||node.distance===0)return;
            tl.to(gridCell.gridWalk, {
                autoAlpha:node.distance===character.move_range?0.4:0.8,
                duration:0.5,
                ease:"power2.inOut"
            },"<");
        });
    }

    return tl.play();
};

