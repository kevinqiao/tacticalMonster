import gsap from "gsap";
import { useCallback } from "react";
import { getLinePath } from "../../util/mapUtils";
import { useCombatManager } from "../service/CombatManager";
import { Token } from "../types/CombatTypes";
const useTokenAnimate = () => {
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
                // console.log("token",token)
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
                            if(token.ele){
                                token.ele.style.zIndex="100";
                            }
                            tl.kill();
                        }
                });
                // console.log("board dimension:",boardDimension)  
                route.forEach((p:any) => {
                    if (token.ele) {
                        token.ele.style.zIndex="1000";
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
            // console.log("playTokenSelectable",data)
            if(!tokens) return;
            const {seat:seatNo,tokens:tokenIds} = data;
            if(!seatNo||!tokenIds) return;
            const tokensToSelect=tokens.filter((t:any)=>t.seatNo===seatNo&&tokenIds.includes(t.id));
            // console.log("tokensToSelect",tokensToSelect)    
            tokensToSelect.forEach((t:any)=>{
                t.selectEle.style.opacity=1;    
                t.selectEle.style.visibility="visible";
            })  
            onComplete();
        },[tokens]);

         const playTokenAttacked =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {   
          
            const {seatNo,tokenId}=data
            //    console.log("playTokenSelected",seatNo,tokenId)
            if(seatNo===undefined||tokenId===undefined||!tokens||!game||!boardContainerEleRef) return;
            const seatRoute = seatRoutes[seatNo];
            if(!seatRoute) return;
            const token = tokens.find((t:any)=>t.seatNo===seatNo&&t.id===tokenId);
            if(!token) return;
            const index = seatRoute.findIndex((r:any)=>r.x===token.x&&r.y===token.y);
            if(index===-1) return;
            const route = seatRoute.slice(0,index+1).reverse();

            const linePath = getLinePath(route);
            const tl = gsap.timeline({  
                onStart: () => {
                    const group = tokens.filter((t:any)=>t.x===token.x&&t.y===token.y&&t.id!==tokenId);
                    console.log("group",group)
                    if(group.length===1){
                        const groupEle = group[0].ele;
                        if(groupEle){
                            gsap.set(groupEle,{
                                scale:1,
                                x:token.x / 15 * boardDimension.width,
                                y:token.y / 15 * boardDimension.height
                            })
                        }
                    }   
                },
                onComplete: () => {
                    token.x=-1;
                    token.y=-1;
                    if (token.ele) {
                        token.ele.style.zIndex = "auto";
                    }
                    onComplete();
                }
            });

            for(let i=1;i<linePath.length;i++){
                const p = linePath[i];
                if (token.ele) {
                        const duration = Math.max(Math.abs(linePath[i].x-linePath[i-1].x),Math.abs(linePath[i].y-linePath[i-1].y))*0.04;
                        token.ele.style.zIndex="1000";
                        tl.to(token.ele, {
                            scale: 1,
                            x: p.x / 15 * boardDimension.width,
                            y: p.y / 15 * boardDimension.height,
                            duration,ease: "linear" 
                        }, ">")
                }
            }
            const seat = game.seats.find(seat => seat.no === token.seatNo);
            if (!seat) return;
            const station = seat.stationEles[token.id];
            const stationRect = station?.getBoundingClientRect();
            if (!stationRect || !token.ele) return;
            const containerRect = boardContainerEleRef.current?.getBoundingClientRect();
            if (!containerRect) return;
            const x = stationRect.left - containerRect.left
            const y = stationRect.top - containerRect.top
            tl.to(token.ele, {
                x: x,
                y: y,
                duration: 0.1 
            }, ">") 

            tl.play();
        },[game,tokens,seatRoutes,boardDimension,boardContainerEleRef]);
        
         const playTokenSelected =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {   
          
            const {seatNo,tokenId}=data
            if(seatNo===undefined||tokenId===undefined||!tokens) return;
            tokens.filter((t:any)=>t.seatNo===seatNo).forEach((t:any)=>{              
                t.selectEle.style.opacity=0;    
                t.selectEle.style.visibility="hidden";  
            })
            onComplete();
        },[tokens]);

        
        return { playTokenMove,playTokenToSelect,playTokenSelected,playTokenReleased,playTokenAttacked,groupingTokens}       
}
export default useTokenAnimate;   


