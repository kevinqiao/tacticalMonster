import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";

const useSeatAnimate = () => {
        
         const {game} = useCombatManager();

         const playBotOn = useCallback((seatNo:number)=>{
            const seat = game?.seats.find((s)=>s.no==seatNo);
            console.log("bot on seat", seat);
            if(!seat||!seat.botOnEle) return;
            seat.botOnEle.style.opacity="1";    
            seat.botOnEle.style.visibility="visible";
        },[game])
         const playBotOff = useCallback((seatNo:number)=>{
            const seat = game?.seats.find((s)=>s.no==seatNo);
            console.log("bot off seat", seat);
            if(!seat||!seat.botOnEle) return;
            seat.botOnEle.style.opacity="0";    
            seat.botOnEle.style.visibility="hidden";
         },[game])
        return { playBotOn,playBotOff}       
}
export default useSeatAnimate;   


