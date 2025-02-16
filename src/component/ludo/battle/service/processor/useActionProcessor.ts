import gsap from "gsap";
import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { useCombatManager } from "../CombatManager";

const useActionProcessor = () => {
    const {user} = useUserManager();    
    const {tokens,seatRoutes,boardDimension} = useCombatManager()
    // console.log("tokens",tokens)
    const processRoll = useCallback((seatNo:number,onFinish:()=>void) => {
     
            if (!tokens || !boardDimension) return;
                const token = tokens.find((t) => t.seatNo == seatNo && t.x >= 0);
            const route = seatRoutes[seatNo];

            if (!route || !token) return;
            const cpos = route.findIndex((c) => c.x === token.x && c.y === token.y);
            const path = route.slice(cpos, cpos + 4 > route.length ? route.length : cpos + 4);

            if (token.ele && path.length > 0) {
            const tl = gsap.timeline({
                onComplete: () => {
                    token.x = path[path.length - 1].x;
                    token.y = path[path.length - 1].y;
                    onFinish();
                }
            });
            path.forEach((p) => {
                if (token.ele) {
                tl.to(token.ele, {
                    x: p.x / 15 * boardDimension.width,
                    y: p.y / 15 * boardDimension.height,
                    duration: 0.3, ease: "power2.inOut"
                }, ">")
                }
            })
            tl.play();

            }
    }, [tokens,seatRoutes,boardDimension])     
    const processTokenSelect = useCallback((data:any) => {
        
    }, [])   
    const processSkillSelect = useCallback((data:any) => {
        
    }, [])   
    return {processRoll,processTokenSelect,processSkillSelect}
}
export default useActionProcessor