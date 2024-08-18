
import { gsap } from "gsap";
import { useCallback } from "react";
export interface ClerkAniProps {
    loadingRef: React.MutableRefObject<HTMLDivElement | null>;
    maskRef: React.MutableRefObject<HTMLDivElement | null>;
    controllerRef: React.MutableRefObject<HTMLDivElement | null>;
    closeBtnRef: React.MutableRefObject<HTMLDivElement | null>;
}

const useClerkAnimate = ({ loadingRef, maskRef, controllerRef, closeBtnRef }: ClerkAniProps) => {


    const playOpen = useCallback((timeline: any) => {
        console.log("playing open");
        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }
        tl.to(loadingRef.current, { autoAlpha: 0, duration: 0 })
        tl.fromTo(maskRef.current, { backgroundColor: "black" }, { autoAlpha: 0.7, duration: 0.8 }, "<");
        tl.to(controllerRef.current, { autoAlpha: 1, scale: 1.0, duration: 0.8 }, "<=+0.3");
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
    const playDirectOpen = useCallback((timeline: any) => {
        console.log("playing direct open");
        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }
        tl.to(loadingRef.current, { autoAlpha: 0, duration: 0 })
        tl.fromTo(maskRef.current, { backgroundColor: "blue" }, { autoAlpha: 1.0, duration: 0.1 }, "<");
        tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1.0, duration: 0.7 }, ">=+0.7");
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
        tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.6, duration: 0.4 }, "<");
        tl.play();
    }, []);


    return { playOpen, playRedirectOpen, playDirectOpen, playClose }
}
export default useClerkAnimate