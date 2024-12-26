import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { CharacterUnit } from "../types/CombatTypes";
import { coordToPixel } from "../utils/hexUtil";
const useActionPlay = () => {
        const {characters,gridCells,hexCell,map} = useCombatManager();
        const playWalk =useCallback((character: CharacterUnit, path: {x:number,y:number}[]) => {

            const container = character.container;    
            const spine = character.skeleton;
            if (!spine||!container||!gridCells||!hexCell||!map) return;

            // 记录初始朝向
            const initialScale = character.scaleX??1;
            const tl = gsap.timeline({
                onStart: () => {
                    spine.state.setAnimation(0, "walk", true);
                },
                onComplete: () => {
                    spine.state.setAnimation(0, "stand", true);
                }
            });
            if(character.standEle){
                gsap.set(character.standEle, {autoAlpha:0});
            }
            const {cols,direction} = map;   
            character.walkables?.forEach((node)=>{
                const {x,y} = node;
                const col = direction === 1 ? cols - x - 1 : x;
                const gridCell = gridCells[y][col];
                if(gridCell?.gridWalk){
                    gsap.set(gridCell.gridWalk, {autoAlpha:0});
                }
            
            })
            character.walkables = [];
            const positions = path.map(node => { 
                return  coordToPixel(node.x, node.y, hexCell,map)
            });
            // console.log(positions)
            gsap.set(container, {x:positions[0].x,y:positions[0].y});
            // 从第二个点开始移动（跳过起始点）
            const movementPath = positions.slice(1);
            let currentScale = initialScale;    
            // let currentScale = container.style.transform.includes('scaleX(-1)') ? -1 : 1;
            // console.log("currentScale",currentScale)    
            movementPath.forEach(node => {
                const col = direction === 1 ? cols - node.q - 1 : node.q;
                const cell = gridCells[node.r][col];
                if(cell?.gridGround){
                    gsap.set(cell.gridGround, {autoAlpha:0.7});
                }
            });
            movementPath.forEach((pos, i) => {
                const prevPos = positions[i];
                const targetScale =pos.x > prevPos.x ?1 :-1
                const isLastStep = i === movementPath.length - 1;
                
                const stepTl = gsap.timeline({
                    onComplete: () => {
                        const col =  direction === 1 ? cols - pos.q - 1 : pos.q;
                        const cell = gridCells[pos.r][col];
                        if(cell?.gridGround){
                            gsap.set(cell.gridGround, {fill:"black", autoAlpha:0.1});
                        }
                    }
                });
                
                // 处理朝向
                if (currentScale !== targetScale || isLastStep) {
                    console.log("targetScale",targetScale)
                    stepTl.to(container, {
                        scaleX: isLastStep ? initialScale : targetScale,
                        duration: 0.15,
                        ease: "power1.inOut",
                        overwrite: "auto"
                    }, 0);
                    currentScale = isLastStep ? initialScale : targetScale;
                }
                
                // 移动
                stepTl.to(container, {
                    x:  pos.x,
                    y: pos.y,
                    duration: 0.3,
                    ease: "power1.inOut",
                    overwrite: "auto"
                }, 0);

                tl.add(stepTl, i > 0 ? ">-0.1" : "+=0");
            });

            return tl.play();
        },[characters,gridCells,hexCell,map]);
        return { playWalk}       
}
export default useActionPlay;   


