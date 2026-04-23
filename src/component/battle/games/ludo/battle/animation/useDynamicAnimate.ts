import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Token } from "../types/CombatTypes";
const useDynamicAnimate = () => {
        const {game,tokens,seatRoutes,boardDimension,boardContainerEleRef} = useCombatManager();
        const groupingTokens=useCallback((groupTokens:Token[])=>{
                if(!tokens || !boardDimension) return;
                const tlength = groupTokens.length;
                if(tlength===0) return;
                const tl = gsap.timeline({
                        onComplete: () => {}
                });
                const tx = groupTokens[0].x / 15 * boardDimension.width;
                const ty = groupTokens[0].y / 15 * boardDimension.height;
                const scale = tlength>1?0.6:1;
                const tileSize = boardDimension.width/15/tlength/2;
                groupTokens.forEach((t:any,index:number)=>{
                    const offset = index-(tlength-1)/2;
                    tl.to(t.ele, {
                        x: tx+tileSize*offset,
                        y: ty+tileSize*offset,
                        scale: scale,
                        duration: 0, ease: "power2.inOut"  
                    })
                })
               
        },[tokens,boardDimension]);

        const playTeleport =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
                console.log("playTeleport",data)
                if(!tokens || !seatRoutes || !boardDimension!||!game) return;
                const {seatNo,tokenId,targetTile} = data;      
                const seat = game.seats.find((s)=>s.no===seatNo);
                console.log("seat",seat)
                if(!seat) return;
                const token = seat.tokens.find((t)=>t.id===tokenId);
                console.log("token",token)
                if(!token) return;  
                const teleportTile = game.tiles?.find((t)=>t.x===token.x&&t.y===token.y);
                const tl = gsap.timeline({                       
                        onComplete: () => {  
                            token.x=targetTile.x;
                            token.y=targetTile.y;                          
                            onComplete() 
                            tl.kill();
                        }
                }); 
                if(teleportTile?.ele){
                    tl.to(teleportTile?.ele, {
                        alpha: 0,
                        duration: 0.3, ease: "power2.inOut"  
                    })
                }  
               
                if (token.ele) {
                        token.ele.style.zIndex="1000";
                        tl.to(token.ele, {
                            scale: 1,
                            x: targetTile.x / 15 * boardDimension.width,
                            y: targetTile.y / 15 * boardDimension.height,
                            duration: 0.5, ease: "power2.inOut"  
                        }, "<")
               }
               
        },[game,tokens,seatRoutes,boardDimension]);      
         
        
        return { playTeleport,groupingTokens}       
}
export default useDynamicAnimate;   


