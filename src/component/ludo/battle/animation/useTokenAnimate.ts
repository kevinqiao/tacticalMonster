import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";

const useTokenAnimate = () => {
    const {game,tokens,seatRoutes,boardDimension} = useCombatManager();

        const playTokenMove =useCallback(({data,timeline}:{data:any,timeline:gsap.core.Timeline}) => {
                console.log("playTokenMove",data)
                if(!tokens || !seatRoutes || !boardDimension||data.move.route.length==0) return;
                const {seatNo,move:{tokenId,route}} = data;
                const token = tokens.find((t) => t.seatNo == seatNo && t.id == tokenId);
                if(!token) return;  
                const tl = gsap.timeline({
                        onComplete: () => {
                            token.x = route[route.length - 1].x;
                            token.y = route[route.length - 1].y;
                            tl.kill();
                        }
                });
                timeline.add(tl,">-1.0");          
                route.forEach((p:any) => {
                    if (token.ele) {
                    tl.to(token.ele, {
                        x: p.x / 15 * boardDimension.width,
                        y: p.y / 15 * boardDimension.height,
                        duration: 0.3, ease: "power2.inOut"  
                    }, ">")
                    }
                })
        },[tokens,seatRoutes,boardDimension]);

        const playTokenSelectable =useCallback(({data,timeline}:{data:any,timeline?:gsap.core.Timeline}) => {    
            console.log("playTokenSelectable",data)
        },[game]);
        
        return { playTokenMove,playTokenSelectable}       
}
export default useTokenAnimate;   


