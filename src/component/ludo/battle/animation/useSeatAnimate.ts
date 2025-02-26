import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";

const useSeatAnimate = () => {
        
         const {tokens} = useCombatManager();

         const playBotOn = useCallback((seatNo:number)=>{
            if(!tokens) return;
            const seatTokens = tokens.filter((token:any)=>token.seat===seatNo);
          
            seatTokens.forEach((t:any)=>{
                t.selectEle.style.opacity=0;    
                t.selectEle.style.visibility="hidden";
            })
        },[tokens])
        
        return { playBotOn}       
}
export default useSeatAnimate;   


