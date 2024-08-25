
import { AuthInit } from "component/signin/SSOController";
import { gsap } from "gsap";
import { useCallback, useEffect, useRef } from "react";
import useEventSubscriber from "service/EventManager";
import { getURIParam } from "util/PageUtils";
export interface ClerkAnimateProps {
    loadingRef: React.MutableRefObject<HTMLDivElement | null>;
    maskRef: React.MutableRefObject<HTMLDivElement | null>;
    controllerRef: React.MutableRefObject<HTMLDivElement | null>;
    closeBtnRef: React.MutableRefObject<HTMLDivElement | null>;
    authInit: AuthInit | undefined,
}

const useClerkAnimate = ({ loadingRef, maskRef, controllerRef, closeBtnRef, authInit }: ClerkAnimateProps) => {
    const authInitRef = useRef<AuthInit | undefined>(undefined)
    const { event } = useEventSubscriber(["signin"], ["account"]);
    useEffect(() => {
        // console.log(authInit)
        authInitRef.current = authInit;
        if (authInit) {
            const redirect = getURIParam("redirect");
            if (redirect) {
                if (authInit.open === 1)
                    playRedirectOpen(null);
                else
                    playClose(null)
            } else {
                if (authInit.open > 0)
                    playForceOpen(null)
                else
                    playClose(null)

            }
        }
    }, [authInit]);

    useEffect(() => {

        const handleClick = () => {
            const tl = gsap.timeline({
                onComplete: () => {
                    const au = authInitRef.current;
                    if (au?.open && au.open > 0)
                        window.history.back();
                    tl.kill();
                },
            });
            playClose(tl)
        };

        // 添加 click 事件监听
        closeBtnRef.current?.addEventListener('click', handleClick);

        // 清理函数，确保组件卸载时移除事件监听
        return () => {
            closeBtnRef.current?.removeEventListener('click', handleClick);
        };

    }, [closeBtnRef]);
    useEffect(() => {
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
        tl.fromTo(maskRef.current, { autoAlpha: 0, backgroundColor: "blue" }, { autoAlpha: 1.0, duration: 0.2 }, "<");
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
        tl.fromTo(maskRef.current, { backgroundColor: authInit?.cancelPage ? "black" : "blue" }, { autoAlpha: authInit?.cancelPage ? 0.4 : 1.0, duration: 0.1 }, "<");
        tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1.0, duration: 0.7 }, "<=+0.3");
        if (authInit?.cancelPage !== null) {
            tl.fromTo(closeBtnRef.current, { autoAlpha: 0 }, { autoAlpha: 1.0, duration: 0.3 }, ">=-0.3")
        }
        tl.play();
    }, [authInit]);

    const playClose = useCallback((timeline: any) => {
        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }
        tl.to(loadingRef.current, { autoAlpha: 0, duration: 0 })
        tl.to(maskRef.current, { autoAlpha: 0, duration: 0.4 });
        tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.4 }, "<");
        tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.8, duration: 0.4 }, "<");
        tl.play();
    }, [authInit]);


    return
}
export default useClerkAnimate