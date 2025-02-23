import gsap from "gsap";
import { useCallback } from "react";
import { useCombatManager } from "../service/CombatManager";

const useTokenAnimate = () => {
        const {game,tokens,seatRoutes,boardDimension} = useCombatManager();
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
                        onComplete: () => {
                            token.x = route[route.length - 1].x;
                            token.y = route[route.length - 1].y;
                            onComplete();   
                            tl.kill();
                        }
                });
                     
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

        const playTokenSelectable =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {    
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
        
        return { playTokenMove,playTokenSelectable,playTokenSelected,playTokenReleased}       
}
export default useTokenAnimate;   


