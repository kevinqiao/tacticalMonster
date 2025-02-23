import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";
import { Token } from "../types/CombatTypes";

const useTokenAnimate = () => {
        const {game,tokens,seatRoutes,boardDimension} = useCombatManager();
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
                        duration: 0.3, ease: "power2.inOut"  
                    })
                })
               
        },[tokens,boardDimension]);
        const playTokenReleased =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
                console.log("playTokenReleased",data)
                if(!tokens  || !boardDimension) return;
                const {seat:seatNo,token} = data;
                if(!token) return;  
                const seatToken = tokens.find((t:any)=>t.seatNo==seatNo&&t.id==token.id);
                if(!seatToken) return;
                const tl = gsap.timeline({
                        onComplete: () => {
                            seatToken.x =token.x;
                            seatToken.y =token.y;
                            const group = tokens.filter((t:any)=>t.x===token.x&&t.y===token.y);
                            groupingTokens(group);
                            onComplete();   
                            tl.kill();
                        }
                });
                     
                if (seatToken.ele) {
                    console.log("seatToken",seatToken)
                    const x = token.x / 15 * boardDimension.width;
                    const y = token.y / 15 * boardDimension.height;
                    console.log("released token",x,y)
                    tl.to(seatToken.ele, {
                        x: x,
                        y: y,
                        duration: 0.3, ease: "power2.inOut"  
                    })                    
                }
        },[tokens,boardDimension]);
        const playTokenMove =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {
                console.log("playTokenMove",data)
                if(!tokens || !seatRoutes || !boardDimension) return;
                const {seat:seatNo,token:tokenId,route} = data;
                if(!route || route.length==0||seatNo===undefined||tokenId===undefined) return;
                const token = tokens.find((t) => t.seatNo == seatNo && t.id == tokenId);
                console.log("token",token)
                if(!token) return;  
                const tl = gsap.timeline({
                        onStart: () => {
                            const group = tokens.filter((t:any)=>t.x===token.x&&t.y===token.y&&t.id!==token.id);
                            groupingTokens(group);                           
                        },
                        onComplete: () => {
                            token.x = route[route.length - 1].x;
                            token.y = route[route.length - 1].y;
                            const group = tokens.filter((t:any)=>t.x===token.x&&t.y===token.y);
                            groupingTokens(group);
                            onComplete();   
                            tl.kill();
                        }
                });
                     
                route.forEach((p:any) => {
                    if (token.ele) {
                    tl.to(token.ele, {
                        scale: 1,
                        x: p.x / 15 * boardDimension.width,
                        y: p.y / 15 * boardDimension.height,
                        duration: 0.3, ease: "power2.inOut"  
                    }, ">")
                    }
                })
        },[tokens,seatRoutes,boardDimension]);

        const playTokenToSelect =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {    
            console.log("playTokenSelectable",data)
            if(!tokens) return;
            const {seat:seatNo,tokens:tokenIds} = data;
            if(!seatNo||!tokenIds) return;
            const tokensToSelect=tokens.filter((t:any)=>t.seatNo==seatNo&&tokenIds.includes(t.id));
            console.log("tokensToSelect",tokensToSelect)    
            tokensToSelect.forEach((t:any)=>{
                t.selectEle.style.opacity=1;    
                t.selectEle.style.visibility="visible";
            })  
            onComplete();
        },[tokens]);

         const playTokenSelected =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {   
          
            const {seatNo,tokenId}=data
            if(seatNo===undefined||tokenId===undefined||!tokens) return;
            tokens.filter((t:any)=>t.seatNo==seatNo).forEach((t:any)=>{              
                t.selectEle.style.opacity=0;    
                t.selectEle.style.visibility="hidden";  
                // t.selectEle.style.pointerEvents="none";
            })
            onComplete();
        },[tokens]);
        
        return { playTokenMove,playTokenToSelect,playTokenSelected,playTokenReleased}       
}
export default useTokenAnimate;   


