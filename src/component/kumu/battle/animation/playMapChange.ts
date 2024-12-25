import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { coordToPixel } from "../utils/hexUtil";

const useMapPlay = () => {
    const {characters,gridCells,hexCell} = useCombatManager();
    const playChangeCoordDirection = useCallback((direction:number,  timeline: gsap.core.Timeline) => {
        // 实现坐标方向变化的动画
        console.log("playChangeCoordDirection",direction)   
        if(!characters||!gridCells||!hexCell)return;     
        const {width,height} = hexCell;   
        gridCells.forEach((row,r)=>{
            if(r%2!==0){
            row.forEach((cell,q)=>{
                const {x,y} = coordToPixel(cell.x,cell.y,width,height,direction);
                if(cell.gridContainer){ 
                    cell.gridContainer.style.transform = `translate(${x}px,${y}px)`;
                }
               
            })
         }
        })
       
    },[characters,gridCells,hexCell])
    return { playChangeCoordDirection };
};

export default useMapPlay;    
