import gsap from "gsap";
import { CharacterUnit, GridCell } from "../model/CombatModels";
import { MovableNode } from "../utils/PathFind";

export const playWalkable = (character:CharacterUnit,nodes: MovableNode[],gridCells:GridCell[][]) => {

    const tl = gsap.timeline();
    nodes.forEach((node)=>{
        const {x,y} = node;
        const gridCell = gridCells[y][x];
        if(!gridCell?.gridWalk||node.distance===0)return;
        tl.to(gridCell.gridWalk, {
            autoAlpha:node.distance===character.move_range?0.4:0.8,
            duration:0.5,
            ease:"power2.inOut"
        },"<");

    });

    return tl.play();
};


