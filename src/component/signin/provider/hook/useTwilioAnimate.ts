
import { AuthInit } from "component/signin/SSOController";
import { gsap } from "gsap";
import { useCallback, useEffect } from "react";
import useEventSubscriber from "service/EventManager";
export interface TwilioAnimateProps {
    maskRef: React.MutableRefObject<HTMLDivElement | null>;
    controllerRef: React.MutableRefObject<HTMLDivElement | null>;
    closeBtnRef: React.MutableRefObject<HTMLDivElement | null>;
    authInit: AuthInit | undefined,
}

const useTwilioAnimate = ({ maskRef, controllerRef, closeBtnRef, authInit }: TwilioAnimateProps) => {

    const { event } = useEventSubscriber(["signin"], ["account"]);
    // useEffect(() => {

    //     if (authInit) {
    //         if (authInit.open > 0)
    //             playOpen(null, true)
    //         else
    //             playClose(null)

    //     }
    // }, [authInit]);

    useEffect(() => {
        if (closeBtnRef.current) {
            const handleClick = () => {
                const tl = gsap.timeline({
                    onComplete: () => {
                        if (authInit?.open === 1) {
                            console.log("window history go back")
                            window.history.back();
                        }
                        tl.kill();
                    },
                });

                playClose(tl)
            };

            // 添加 click 事件监听
            closeBtnRef.current.addEventListener('click', handleClick);

            // 清理函数，确保组件卸载时移除事件监听
            return () => {
                closeBtnRef.current?.removeEventListener('click', handleClick);
            };
        }
    }, [closeBtnRef, authInit]);
    useEffect(() => {
        console.log(event)
        if (event) playOpen(null, true)
    }, [event]);

    const playOpen = useCallback((timeline: any, canClose: boolean) => {

        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }

        tl.fromTo(maskRef.current, { autoAlpha: 0, backgroundColor: "black" }, { autoAlpha: 0.3, duration: 0.8 }, "<");
        tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1.0, scale: 1.0, duration: 0.8 }, "<=+0.3");
        if (canClose) tl.to(closeBtnRef.current, { autoAlpha: 1, duration: 0.2 }, ">=-0.2");
        tl.play();
    }, []);


    const playClose = useCallback((timeline: any) => {
        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }
        tl.to(maskRef.current, { autoAlpha: 0, duration: 0.4 });
        tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.4 }, "<");
        tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.8, duration: 0.4 }, "<");
        tl.play();
    }, []);


    return { playOpen, playClose }
}
export default useTwilioAnimate