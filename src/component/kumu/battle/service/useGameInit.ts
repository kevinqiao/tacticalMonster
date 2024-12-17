import { useEffect } from "react";

import { playGameInit, playTurnStart } from "../animation/playPhase";
import { getWalkableNodes } from "../utils/PathFind";
import { useCombatManager } from "./CombatManager";

const useGameInit = () => {
    const { gridCells, resourceLoad,currentRound,characters} = useCombatManager();
    const {gridGround,character:characterReady}=resourceLoad
   
    useEffect(() => {

        if (characterReady&&gridCells &&gridGround&&characters) {
            console.log("game init")
            playGameInit(characters,gridCells)  
        }
    }, [gridGround,characterReady, gridCells,characters]);


    useEffect(() => {
        // 当加载战斗数据后初始化当前角色的移动范围和可攻击目标
        if (gridCells && characters && currentRound?.status === 1&&currentRound.currentTurn) {
           const {uid,character:character_id}=currentRound.currentTurn
           if(uid&&character_id){
            const character=characters.find(c=>c.character_id===character_id)
            if(character&&gridCells){
                const nodes = getWalkableNodes(gridCells,
                    { x: character.q, y: character.r },
                    character.move_range || 2
                );
                character.walkables = nodes;
                setTimeout(()=>playTurnStart(character,gridCells),2000);
            }
           } 
        }
    }, [currentRound, characters,gridCells]);
}
export default useGameInit