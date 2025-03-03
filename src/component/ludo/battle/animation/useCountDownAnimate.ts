import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/ludo/convex/_generated/api";
import { useCombatManager } from "../service/CombatManager";

const useCountDownAnimate = () => {
    const animationRef = useRef<number>();
    const startTimeRef = useRef<number>(0);
    const { game, boardDimension } = useCombatManager();
    const {user} = useUserManager();
    const convex = useConvex();

    const animate = useCallback((element: SVGPathElement, startOffset: number, perimeter: number, duration: number) => {
        const startTime = performance.now();
        startTimeRef.current = startTime;

        const animation = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentOffset = startOffset + (perimeter - startOffset) * progress;
            element.style.strokeDashoffset = `-${currentOffset}px`;

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animation);
            } else {
                // 动画完成
                if (game?.gameId && user?.uid) {
                    console.log("timeout",game.gameId,user.uid);
                    convex.mutation(api.service.gameProxy.timeout, {
                        uid: user.uid,
                        token: user.token,
                        gameId: game.gameId
                    });
                }
            }
        };
        animation(startTime);
        // animationRef.current = requestAnimationFrame(animation);
    }, [game, user, convex]);

    const playCountStart = useCallback(() => {
        const seatNo = game?.currentSeat;

        if (!game || !seatNo || !game.actDue || game.actDue < Date.now() || !game.currentAction) {
            console.log("playCountStart",game?.gameId,user?.uid);
            if(game?.actDue && game.actDue < Date.now()){
                convex.mutation(api.service.gameProxy.timeout, {
                    uid: user.uid,
                    token: user.token,
                    gameId: game.gameId
               });
            }
            return;
        }
        
        const seat = game.seats.find((s: any) => s.no === seatNo);
        const element = seat?.countDownEle;
        if (!element) return;

        const perimeter = element.getTotalLength();
        if (!perimeter) return;

        // 停止当前动画
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            game.seats.filter((s: any) => s.no !== seatNo).forEach((s: any) => {
                if(s.countDownEle)
                s.countDownEle.style.strokeDashoffset = `-${s.countDownEle.getTotalLength()}px`;
            });
        }

        const duration = game.actDue - Date.now();
        const startOffset = (15000 - duration) * perimeter / 15000;
        
        if (startOffset >= 0) {
            element.style.strokeDashoffset = `-${startOffset}px`;
            animate(element, startOffset, perimeter, duration);
        }
    }, [game,user,convex, animate]);

    const playCountStop = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        const seatNo = game?.currentSeat;
        if (!game || !seatNo) return;
        const seat = game.seats.find((s: any) => s.no === seatNo);
        if (!seat?.countDownEle) return;
        const perimeter = seat.countDownEle.getTotalLength();
        if (!perimeter) return;
        
        seat.countDownEle.style.strokeDashoffset = `-${perimeter}px`;
    }, [game]);

    // 重置所有非活动座位的倒计时
    useEffect(() => {
        if (!game) return;
        game.seats.forEach((s: any) => {
            if (s.countDownEle && 
                (s.no !== game.currentSeat || 
                (game.actDue && game.actDue < Date.now()))) {
                s.countDownEle.style.strokeDashoffset = `-${s.countDownEle.getTotalLength()}px`;
            }
        });
    }, [game, boardDimension]);

    // 清理动画
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // 窗口大小改变时重启动画
    useEffect(() => {
        if (animationRef.current) {
            playCountStart();
        }
    }, [boardDimension, playCountStart]);

    return { playCountStart, playCountStop };
};

export default useCountDownAnimate;   


