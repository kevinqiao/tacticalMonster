import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";

const usePlayAttack = () => {
    const {characters, gridCells, hexCell, map} = useCombatManager();
    
    const playAttack = useCallback((attacker:{uid:string,character_id:string,skillId:string}, 
        target:{uid:string,character_id:string}, onFinish:()=>void ) => {
        console.log("playAttack", attacker, target);
        if (!gridCells || !hexCell || !map || !characters) return;
        const attackerChar = characters.find(c => c.uid === attacker.uid && c.character_id === attacker.character_id);
        const targetChar = characters.find(c => c.uid === target.uid && c.character_id === target.character_id);
        if (!attackerChar || !targetChar || !attackerChar.container) return;

        const initialScale = attackerChar.scaleX ?? 1;

        // 计算朝向
        const shouldFaceRight = (targetChar.q ?? 0) > (attackerChar.q ?? 0);
        const targetScale = shouldFaceRight ? 1 : -1;

        // 创建动画序列
        const tl = gsap.timeline({
            onComplete: () => {
                if (attackerChar.container) {
                    gsap.set(attackerChar.container, {scaleX: targetScale});
                    if (attackerChar.skeleton) {
                        const track = attackerChar.skeleton.state.setAnimation(0, "melee", true);
                        if (track) {
                            track.listener = {
                                complete: () => {                                    
                                    attackerChar.skeleton?.state.setAnimation(0, "stand", true);
                                    if (attackerChar.container) {
                                        gsap.to(attackerChar.container, {
                                            scaleX: initialScale,
                                            duration: 0.2,                                               
                                            onComplete: onFinish
                                        });
                                    }
                                    const hurtTrack = targetChar.skeleton?.state.setAnimation(0, "hurt", false);
                                    if (hurtTrack) {
                                        hurtTrack.listener = {
                                            complete: () => {
                                                targetChar.skeleton?.state.setAnimation(0, "stand", true);
                                                tl.kill();
                                            }
                                        };
                                    }
                                }
                            };
                        }
                    }
                }
            },
          
        });

        // 清除可行走格子和攻击者的UI元素
        const {cols, direction} = map;   
        attackerChar.walkables?.forEach(node => {
            const {x,y} = node;
            const col = direction === 1 ? cols - x - 1 : x;
            const gridCell = gridCells[y][col];
            if (gridCell?.gridWalk) {
                tl.to(gridCell.gridWalk, {autoAlpha:0, duration:0.5}, "<");
            }
        });

        if (attackerChar.standEle) {
            tl.to(attackerChar.standEle, {autoAlpha:0, duration:0.5}, "<");
        }
         if (targetChar.attackEle) 
             tl.to(targetChar.attackEle, {autoAlpha: 0, duration: 0.5},"<");             
        tl.play();
    }, [characters, gridCells, hexCell, map]);

    return { playAttack };
}

export default usePlayAttack;   


