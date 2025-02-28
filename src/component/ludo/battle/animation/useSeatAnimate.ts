import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";

const useSeatAnimate = () => {
        
         const {tokens,game} = useCombatManager();

         const playBotOn = useCallback((seatNo:number)=>{
            const seat = game?.seats[seatNo];
            if(!seat) return;
            if(!seat.botOnEle) return;
            seat.botOnEle.style.opacity="1";    
            seat.botOnEle.style.visibility="visible";
        },[game])
        
        return { playBotOn}       
}
export default useSeatAnimate;   


