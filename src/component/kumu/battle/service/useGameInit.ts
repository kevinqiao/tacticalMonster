import { useEffect, useState } from "react";

import { useCombatManager } from "./CombatManager";

const useGameInit = () => {
    const [initComplete,setInitComplete] = useState(false);
    const { gridCells, resourceLoad,currentRound,characters} = useCombatManager();
    const {gridGround,character:characterReady}=resourceLoad
   
    useEffect(() => {

        if (characterReady&&gridCells &&gridGround&&characters) {
            console.log("game init")
            const tl = gsap.timeline({
                onComplete:()=>{
                    setInitComplete(true);
                }
            });
            // playGameInit(characters,gridCells,tl)  
            tl.play();
        }
    }, [gridGround,characterReady, gridCells,characters]);
    useEffect(()=>{
        if(initComplete&&currentRound){ 
          const currentTurn = currentRound.turns.find((t)=>t.status===0||t.status===1);
           if(currentTurn){
            const tl = gsap.timeline({
                onComplete:()=>{
                    setInitComplete(true);
                }
            });
            // playTurnStart(currentTurn,gridCells,tl)  
            tl.play();
           }
        }
    },[initComplete,currentRound])
}
export default useGameInit