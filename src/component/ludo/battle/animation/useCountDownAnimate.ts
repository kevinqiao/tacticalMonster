import { useConvex } from "convex/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../convex/ludo/convex/_generated/api";
import { useCombatManager } from "../service/CombatManager";
const useCountDownAnimate = () => {
    const countDownAniRef = useRef<gsap.core.Timeline | null>(null);
    const { game, boardDimension } = useCombatManager();
    const {user}=useUserManager()
    const convex = useConvex();

    const playCountStart = useCallback(() => {
        const seatNo = game?.currentAction?.seat;
        if(game?.actDue){
            console.log("playCountStart:", game?.currentAction,game.actDue-Date.now())
        }
        if (!game || !seatNo || !game.actDue || game.actDue < Date.now() || !game.currentAction) return;
        console.log("playCountStart:", seatNo,game.actDue-Date.now())
        const seat = game.seats.find((s: any) => s.no === seatNo);
        // if (!seat || !seat.countDownEle) return;
        const perimeter = seat?.countDownEle?.getTotalLength();
        if (!perimeter) return;

        // 先停止之前的动画
        if (countDownAniRef.current) {
            countDownAniRef.current.kill();
            countDownAniRef.current = null;
        }

        const tl = gsap.timeline({
            onComplete: () => {
                console.log("playCountStart onComplete:", seatNo)
                convex.action(api.service.gameProxy.timeout, {uid:user?.uid,token:user?.token,gameId:game?.gameId});
            }
        });
        const duration = game.actDue - Date.now();
        const startOffset = (15000 - duration) * perimeter / 15000;
        console.log("playCountStart offset:", game.actDue,duration,startOffset)
        if(seat?.countDownEle&&startOffset >= 0){
            tl.fromTo(seat.countDownEle,{strokeDashoffset:-startOffset}, {
                strokeDashoffset: -perimeter,  // 动画到：完全隐藏
                duration: duration/1000,
                ease: "linear"
            });
        }

        countDownAniRef.current = tl;
    }, [game,user]);

    const playCountStop = useCallback(() => {
        if (countDownAniRef.current) {
            countDownAniRef.current.kill();
            countDownAniRef.current = null;
        }

        const seatNo = game?.currentAction?.seat;
        if (!game || !seatNo) return;
        const seat = game.seats.find((s: any) => s.no === seatNo);
        if (!seat || !seat.countDownEle) return;
        const perimeter = seat.countDownEle?.getTotalLength();
        if (!perimeter) return;
        gsap.set(seat.countDownEle, {
            strokeDashoffset: -perimeter
        });
    }, [game]);

    // 重置所有非活动座位的倒计时
    useEffect(() => {
        if (!game) return;
        game.seats.forEach((s: any) => {
            if (s.countDownEle && 
                (s.no !== game.currentAction?.seat || 
                (game.actDue && game.actDue < Date.now()))) {
                gsap.set(s.countDownEle, {
                    strokeDashoffset: -s.countDownEle.getTotalLength()
                });
            }
        });
    }, [game, boardDimension]);

    // 窗口大小改变时重启动画
    useEffect(() => {
        if (countDownAniRef.current) {
            playCountStart();
        }
    }, [boardDimension, playCountStart]);

    return { playCountStart, playCountStop };
};

export default useCountDownAnimate;   


