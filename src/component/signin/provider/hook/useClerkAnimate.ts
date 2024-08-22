
import { AuthInit } from "component/signin/SSOController";
import { gsap } from "gsap";
import { useCallback, useEffect, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { usePageManager } from "service/PageManager";
export interface ClerkAniProps {
    loadingRef: React.MutableRefObject<HTMLDivElement | null>;
    maskRef: React.MutableRefObject<HTMLDivElement | null>;
    controllerRef: React.MutableRefObject<HTMLDivElement | null>;
    closeBtnRef: React.MutableRefObject<HTMLDivElement | null>;
    authInit: AuthInit | null,
}

const useClerkAnimate = ({ loadingRef, maskRef, controllerRef, closeBtnRef, authInit }: ClerkAniProps) => {

    const [value, setValue] = useState(1);
    const { event } = useEventSubscriber(["signin"], ["account"]);
    const { getPrePage } = usePageManager();

    useEffect(() => {

        if (authInit) {
            if (authInit.params?.redirect) {
                playRedirectOpen(null);
            } else if (authInit.open === 1)
                playForceOpen(null)
        }
    }, [authInit]);

    useEffect(() => {
        if (closeBtnRef.current) {
            const handleClick = () => {
                playClose(null)
            };

            // 添加 click 事件监听
            closeBtnRef.current.addEventListener('click', handleClick);

            // 清理函数，确保组件卸载时移除事件监听
            return () => {
                closeBtnRef.current?.removeEventListener('click', handleClick);
            };
        }
    }, [closeBtnRef]);
    useEffect(() => {
        console.log(event)
        if (event) playOpen(null)
    }, [event]);

    const playOpen = useCallback((timeline: any) => {

        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }

        // tl.to(loadingRef.current, { autoAlpha: 0, duration: 0 })
        tl.fromTo(maskRef.current, { autoAlpha: 0, backgroundColor: "black" }, { autoAlpha: 0.3, duration: 0.8 }, "<");
        tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1.0, scale: 1.0, duration: 0.8 }, "<=+0.3");
        tl.to(closeBtnRef.current, { autoAlpha: 1, duration: 0.2 }, ">=-0.2");
        tl.play();
    }, []);

    const playRedirectOpen = useCallback((timeline: any) => {
        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }
        tl.to(loadingRef.current, { autoAlpha: 1, duration: 0 })
        tl.fromTo(maskRef.current, { backgroundColor: "blue" }, { autoAlpha: 1.0, duration: 0.2 }, "<");
        tl.play();
    }, []);
    const playForceOpen = useCallback((timeline: any) => {
        console.log("playing direct open");
        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }
        // tl.to(loadingRef.current, { autoAlpha: 0, duration: 0 })
        if (getPrePage() !== null) {
            tl.fromTo(maskRef.current, { autoAlpha: 0, backgroundColor: "black" }, { autoAlpha: 0.3, duration: 0.8 });
            tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0.3, }, { autoAlpha: 1, scale: 1.0, duration: 0.8 }, "<=+0.3");
        } else {
            tl.fromTo(maskRef.current, { backgroundColor: "blue" }, { autoAlpha: 1.0, duration: 0.1 }, "<");
            tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1.0, duration: 0.7 }, ">=+0.7");
        }
        tl.play();
    }, [getPrePage]);

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


    return value
}
export default useClerkAnimate