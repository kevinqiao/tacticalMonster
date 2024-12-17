import gsap from "gsap";
import { CharacterUnit, GridCell } from "../model/CombatModels";
import { hexToPixel } from "../utils/hexUtil";

export const playWalk = (character: CharacterUnit, path: {x:number,y:number}[], hexCell:{width:number,height:number},gridCells:GridCell[][]) => {
    console.log("playWalk",character.walkables)
    const container = character.container;    
    const spine = character.skeleton;
    if (!spine||!container) return;

    // 记录初始朝向
    const initialScale = container.style.transform.includes(`scaleX(-1)`) ? -1 : 1;
   
    const tl = gsap.timeline({
        onStart: () => {
            spine.state.setAnimation(0, "walk", true);
        },
        onComplete: () => {
            spine.state.setAnimation(0, "stand", true);
            gsap.to(container, {
                scaleX: initialScale,
                duration: 0.8,
                ease: "power2.inOut"
            });
        }
    });
    if(character.standEle){
        gsap.set(character.standEle, {autoAlpha:0});
    }
    character.walkables?.forEach((node)=>{
        const {x,y} = node;
        const gridCell = gridCells[y][x];
        if(gridCell?.gridWalk){
            gsap.set(gridCell.gridWalk, {autoAlpha:0});
        }
      
    })

    const positions = path.map(node => hexToPixel(node.x, node.y, hexCell.width, hexCell.height));
    gsap.set(container, {x:positions[0].x,y:positions[0].y});
    // 从第二个点开始移动（跳过起始点）
    const movementPath = positions.slice(1);
    let currentScale = container.style.transform.includes('scaleX(-1)') ? -1 : 1;
    movementPath.forEach(node => {
        const cell = gridCells[node.r][node.q];
        if(cell?.gridGround){
            gsap.set(cell.gridGround, {autoAlpha:0.7});
        }
    });
    movementPath.forEach((pos, i) => {
        const prevPos = positions[i];
        const targetScale = pos.x > prevPos.x ? 1 : -1;
        
        const stepTl = gsap.timeline({
           onComplete:()=>{
            const cell = gridCells[pos.r][pos.q];
            if(cell?.gridGround){
                gsap.set(cell.gridGround, {fill:"black",autoAlpha:0.1});
            }
           }
        });
        
        if (currentScale !== targetScale) {
            stepTl.to(container, {
                scaleX: targetScale,
                duration: 0.15,
                ease: "power1.inOut",  // 使用平滑的缓动
                overwrite: "auto"  // 防止动画冲突
            }, 0);
            currentScale = targetScale;
        }
        
        stepTl.to(container, {
            x: pos.x,
            y: pos.y,
                duration: 0.3,
            ease: "power1.inOut",  // 使用平滑的缓动
            overwrite: "auto"  // 防止动画冲突
        }, 0);

        tl.add(stepTl, i > 0 ? ">-0.1" : "+=0");
    });

    return tl.play();
};


