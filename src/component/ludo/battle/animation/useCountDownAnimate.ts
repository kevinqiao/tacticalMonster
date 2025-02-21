import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { useCombatManager } from "../service/CombatManager";

const useCountDownAnimate = () => {
    const countDownAniRef = useRef<gsap.core.Timeline | null>(null);
    const { game, boardDimension } = useCombatManager();

    const playCountStart = useCallback(() => {
        const seatNo = game?.currentAction?.seat;
        if (!game || !seatNo || !game.actDue || game.actDue < Date.now() || !game.currentAction) return;
        const seat = game.seats.find((s: any) => s.no === seatNo);
        if (!seat || !seat.countDownEle) return;
        const perimeter = seat.countDownEle?.getTotalLength();
        if (!perimeter) return;

        // 先停止之前的动画
        if (countDownAniRef.current) {
            countDownAniRef.current.kill();
        }

        const tl = gsap.timeline();
        gsap.set(seat.countDownEle, {
            strokeDashoffset: 0  // 初始状态：完全显示
        });
        tl.fromTo(seat.countDownEle,{strokeDashoffset:0}, {
            strokeDashoffset: perimeter,  // 动画到：完全隐藏
            duration: (game.actDue - Date.now()) / 1000,
            ease: "linear"
        });

        countDownAniRef.current = tl;
    }, [game]);

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
            strokeDashoffset: perimeter
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
                    strokeDashoffset: s.countDownEle.getTotalLength()
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


