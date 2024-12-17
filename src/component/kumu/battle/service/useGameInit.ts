import { useEffect } from "react";

import { playInitCharacters, playInitPlaza } from "../animation/playCombatInit";
import { playWalkable } from "../animation/playPhase";
import { getMovableNodes } from "../utils/PathFind";
import { useCombatManager } from "./CombatManager";

const useGameInit = () => {
    const { gridCells, resourceLoad,currentRound,characters} = useCombatManager();
    const {gridGround,character:characterReady}=resourceLoad
   
    useEffect(() => {

        if (gridCells &&gridGround) {
            console.log("game init")
            playInitPlaza(gridCells)
        }
    }, [gridGround, gridCells]);
    useEffect(() => {
        if (characters && characterReady) {
            console.log("character init")
           playInitCharacters(characters)
        }
    }, [characterReady, characters]);

    useEffect(() => {
  
        if (gridCells && characters && currentRound?.status === 1&&currentRound.currentTurn) {
           const {uid,character:character_id}=currentRound.currentTurn
           if(uid&&character_id){
            const character=characters.find(c=>c.character_id===character_id)
            if(character&&gridCells){
                const nodes = getMovableNodes(gridCells,
                    { x: character.q, y: character.r },
                    character.move_range || 2
                );
                setTimeout(()=>playWalkable(character,nodes,gridCells),2000);
            }
           }          
         
        }
    }, [currentRound, characters,gridCells]);
}
export default useGameInit