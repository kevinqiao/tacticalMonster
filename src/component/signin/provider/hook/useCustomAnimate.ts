
import { gsap } from "gsap";
import { useCallback } from "react";
export interface ClerkAnimateProps {
    loadingRef: React.MutableRefObject<HTMLDivElement | null>;
    maskRef: React.MutableRefObject<HTMLDivElement | null>;
    controllerRef: React.MutableRefObject<HTMLDivElement | null>;
    closeBtnRef: React.MutableRefObject<HTMLDivElement | null>;
}

const useCustomAnimate = ({ loadingRef, maskRef, controllerRef, closeBtnRef }: ClerkAnimateProps) => {

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
        tl.fromTo(controllerRef.current, { autoAlpha: 0 }, { autoAlpha: 1.0, duration: 0.8 }, "<=+0.3");
        if (closeBtnRef.current)
            tl.to(closeBtnRef.current, { autoAlpha: 1, duration: 0.2 }, ">=-0.2");
        tl.play();
    }, []);



    const playClose = useCallback((timeline: any) => {
        console.log("close custom authenticator")
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
        if (closeBtnRef.current)
            tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.4 }, "<");
        tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.8, duration: 0.4 }, "<");
        tl.play();
    }, []);


    return { playClose, playOpen }
}
export default useCustomAnimate