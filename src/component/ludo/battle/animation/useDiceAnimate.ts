import { gsap } from "gsap";
import { useCallback, useRef } from "react";
import { useCombatManager } from "../service/CombatManager";
export const faceTransforms: { [key: number]: { rotationX: number; rotationY: number } } = {
    1: { rotationX: 0, rotationY: 0 },
    2: { rotationX: 0, rotationY: -90 },
    3: { rotationX: 0, rotationY: -180 },
    4: { rotationX: 0, rotationY: 90 },
    5: { rotationX: -90, rotationY: 0 },
    6: { rotationX: 90, rotationY: 0 },
};
const useDiceAnimate = () => {
         const countDownAniRef = useRef<{[k:number]:gsap.core.Timeline | null}>({});
         const animationRef = useRef<{[k:number]:gsap.core.Timeline | null}>({});
         const currentRotationRef = useRef<{[k:number]:{ x: number, y: number }}>({}); // 跟踪当前旋转值
         const {game} = useCombatManager();

         const playCountDown = useCallback((seatNo:number)=>{
            if(!game) return;
            const seat  = game.seats.find((s:any)=>s.no === seatNo);
            if(!seat||!seat.countDownEle) return;
            const perimeter = seat.countDownEle.getTotalLength();
            const tl = gsap.timeline()
            tl.to(seat.countDownEle, {
                strokeDashoffset: perimeter,
                duration: 10,
                repeat: -1,
                ease: "linear",
            }) 
            countDownAniRef.current[seatNo] = tl;
        },[game])   


        const playRollStart =useCallback((data:any) => {
            console.log("playRollStart",data)
            if(!game) return;
            const seat  = game.seats.find((s:any)=>s.no === data.seatNo);
            if(!seat||!seat.diceEle) return; 
             // 重置当前位置，确保新动画从当前位置开始
             console.log("seat",seat)
            const currentX = gsap.getProperty(seat.diceEle, "rotationX") as number;
            const currentY = gsap.getProperty(seat.diceEle, "rotationY") as number;
            gsap.set(seat.diceEle, {
                rotationX: currentX % 360,
                rotationY: currentY % 360
            });
            const diceEle = seat.diceEle;
            if(!diceEle) return;
            const tl = gsap.timeline({
                repeat: -1,
                repeatDelay: 0,
                ease: 'none',
                onUpdate: () => {
                    const rotationX = gsap.getProperty(diceEle, "rotationX") as number;
                    const rotationY = gsap.getProperty(diceEle, "rotationY") as number;
                    currentRotationRef.current[seat.no] = {
                        x: rotationX,
                        y: rotationY
                    };
                }
            });

            tl.to(diceEle, {
                duration: 2,
                rotationX: '+=720',
                rotationY: '+=720'
            });
            animationRef.current[seat.no] = tl;
        },[game]);

        const playRollDone =useCallback(({data,onComplete}:{data:any,onComplete:()=>void}) => {   
            console.log("playRollDone",data)
            if(!game||!data.seatNo) return;
            const seat  = game.seats.find((s:any)=>s.no === data.seatNo);
            console.log("seat",seat)
            if(!seat||!seat.diceEle) return; 
            const diceEle = seat.diceEle;
            animationRef.current[seat.no]?.kill();
            animationRef.current[seat.no] = null;
            const finalRotation = faceTransforms[data.value];
        //     const { x, y } = currentRotationRef.current[seat.no];
          
        //     console.log(finalRotation,x,y)
        // // 计算最近的完整旋转圈数

            const x = gsap.getProperty(diceEle, "rotationX") as number;
            const y = gsap.getProperty(diceEle, "rotationY") as number;
            const fullRotationsX = Math.floor(x / 360) * 360;
            const fullRotationsY = Math.floor(y / 360) * 360;
            const tl = gsap.timeline();   
            // 确保最终旋转至少多转一圈
            tl.to(diceEle, {
                duration: 1.5,
                rotationX: fullRotationsX + finalRotation.rotationX + 360,
                rotationY: fullRotationsY + finalRotation.rotationY + 360,
                ease: "power3.out"
            });
            tl.call(onComplete,[],"-=0.5");
            tl.play();
        },[game]);
        const playAskRoll=useCallback((seatNo:number,onComplete:()=>void)=>{
            console.log("playAskRoll",seatNo);
            onComplete();
  
        },[game])
        const playDiceInit=useCallback(()=>{
            if(!game) return;
            game.seats.forEach((seat:any)=>{
                if(!seat||!seat.diceEle) return; 
                const diceValue = seat.dice??1;
                const finalRotation = faceTransforms[diceValue];    
                gsap.set(seat.diceEle, {
                    rotationX: finalRotation.rotationX,
                    rotationY: finalRotation.rotationY
                });
            });
        },[game])
        
        return { playRollStart,playRollDone,playCountDown,playDiceInit,playAskRoll}       
}
export default useDiceAnimate;   


