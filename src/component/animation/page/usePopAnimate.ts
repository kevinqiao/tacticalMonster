
import gsap from "gsap";
import { useCallback } from "react";
import { useTerminal } from "service/TerminalManager";
import { PopAnimateConfigs } from "./PopAnimateConfigs";
interface PopAnimProps {
    containerRef: React.MutableRefObject<HTMLDivElement | null>,
    maskRef: React.MutableRefObject<HTMLDivElement | null>,
    exitRef: React.MutableRefObject<HTMLDivElement | null>,
    pop?: { open: number; close: number, exit?: number }
}
const usePopAnimate = ({ containerRef, maskRef, exitRef, pop }: PopAnimProps) => {

    const { terminal, direction } = useTerminal();
    const playOpen = useCallback((zIndex: number) => {
        console.log(pop)
        if (!pop) return;
        const device = direction + "-" + terminal;
        // console.log(device)
        const animate = PopAnimateConfigs.find((c) => c.id === pop.open && c.terminals.includes(device));
        // console.log(animate)
        const tl = gsap.timeline({
            onComplete: () => {
                tl.kill();
            },
        });
        if (animate) {
            if (animate.from) {
                tl.fromTo(containerRef.current, { ...animate.from, zIndex }, { ...animate.to })
            } else
                tl.to(containerRef.current, { ...animate.to, zIndex })
            tl.fromTo(maskRef.current, { autoAlpha: 0, zIndex: zIndex - 1 }, { autoAlpha: 0.6, duration: 0.3 }, "<");
        }
        tl.play();
        return;
    }, [terminal, direction]);

    const playClose = useCallback(() => {
        // console.log(pop)
        if (!pop) return;
        const device = direction + "-" + terminal;
        // console.log(PopAnimateConfigs)
        const animate = PopAnimateConfigs.find((c) => c.id === pop.close && c.terminals.includes(device));
        const tl = gsap.timeline({
            onComplete: () => {
                tl.kill();
            },
        });
        if (animate) {
            // console.log(animate)
            if (animate.from) {
                tl.fromTo(containerRef.current, { ...animate.from }, { ...animate.to })
            } else
                tl.to(containerRef.current, { ...animate.to })
            tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 }, "<");
        }
        tl.play();
        return;
    }, [terminal, direction]);


    return { playOpen, playClose }
}
export default usePopAnimate