import gsap from "gsap";
import { CharacterUnit, GridCell, WalkableNode } from "../types/CombatTypes";


export const playWalkable = (character:CharacterUnit,nodes: WalkableNode[],gridCells:GridCell[][]) => {

    const tl = gsap.timeline();
    nodes.forEach((node)=>{
        const {x,y} = node;
        const gridCell = gridCells[y][x];
        if(!gridCell?.gridGround||node.distance===0)return;
        tl.to(gridCell.gridGround, {
            autoAlpha:node.distance===character.move_range?0.4:0.8,
            duration:0.5,
            ease:"power2.inOut"
        },"<");

    });


    return tl.play();
};


