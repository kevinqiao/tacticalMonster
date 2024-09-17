
import { gsap } from "gsap";
import { useCallback } from "react";
export interface TwilioAnimateProps {
    maskRef: React.MutableRefObject<HTMLDivElement | null>;
    controllerRef: React.MutableRefObject<HTMLDivElement | null>;
    closeBtnRef: React.MutableRefObject<HTMLDivElement | null>;
}

const useTwilioAnimate = ({ maskRef, controllerRef, closeBtnRef }: TwilioAnimateProps) => {



    const playOpen = useCallback((timeline: any, canClose: boolean) => {
        console.log("play open twilio")
        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }

        tl.fromTo(maskRef.current, { autoAlpha: 0, backgroundColor: "black" }, { autoAlpha: 0.7, duration: 0.8 }, "<");
        tl.fromTo(controllerRef.current, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1.0, scale: 1.0, duration: 0.8 }, "<=+0.3");
        if (canClose) tl.fromTo(closeBtnRef.current, { zIndex: 2000 }, { autoAlpha: 1, duration: 0.2 }, ">=-0.2");
        tl.play();
    }, []);


    const playClose = useCallback((timeline: any) => {
        console.log("play close twilio")
        let tl = timeline;
        if (timeline == null) {
            tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
        }
        tl.to(maskRef.current, { autoAlpha: 0, duration: 0.4 });
        if (closeBtnRef.current)
            tl.to(closeBtnRef.current, { autoAlpha: 0, duration: 0.4 }, "<");
        tl.to(controllerRef.current, { autoAlpha: 0, scale: 0.8, duration: 0.4 }, "<");
        tl.play();
    }, []);


    return { playOpen, playClose }
}
export default useTwilioAnimate