
import { useCallback } from "react";
const usePopAnimate = () => {
    const playOpen = useCallback((container: HTMLDivElement, zIndex: number, params: any) => {

        // const zIndex = stacks.findIndex((s) => s.name === popConfig.name) + 1000;
        // console.log("play open " + popConfig.name + " zindex:" + zIndex);
        // gsap.fromTo(containerRef.current, { top: "100%", autoAlpha: 1, zIndex: zIndex }, { top: 0, duration: 0.3 });
        // return;
    }, []);


    const playClose = useCallback((container: HTMLDivElement) => {

        return
    }, []);


    return { playOpen, playClose }
}
export default usePopAnimate