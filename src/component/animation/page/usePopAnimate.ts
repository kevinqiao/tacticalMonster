
import gsap from "gsap";
import { useCallback } from "react";
import { useTerminal } from "service/TerminalManager";
import { AnimateConfig, POP_DIRECTION, PopAnimates } from "./PopAnimateConfigs";
interface PopAnimProps {
    containerRef: React.MutableRefObject<HTMLDivElement | null>,
    maskRef: React.MutableRefObject<HTMLDivElement | null>,
    exitRef: React.MutableRefObject<HTMLDivElement | null>,
    pop?: { init?: any; animates: { terminals: string[]; id: number }[]; exit?: number }
}
const usePopAnimate = ({ containerRef, maskRef, exitRef, pop }: PopAnimProps) => {

    const { terminal, direction } = useTerminal();

    const getOpenProps = useCallback((animateCfg: AnimateConfig): { from?: any; to?: any } => {
        const { width, height } = animateCfg.init;
        const w = window.innerWidth * (parseFloat(width) / 100);
        const h = window.innerHeight * (parseFloat(height) / 100);
        const prop: { from?: any; to?: any } = {};
        switch (animateCfg.direction) {
            case POP_DIRECTION.TOP:

                break;
            case POP_DIRECTION.RIGHT:
                {
                    prop['from'] = { x: window.innerWidth, autoAlpha: 1 };
                    prop['to'] = { x: window.innerWidth - w, duration: 0.3 }
                    break;
                }
            case POP_DIRECTION.BOTTOM:
                {
                    prop['from'] = { y: window.innerHeight, autoAlpha: 1 };
                    prop['to'] = { y: window.innerHeight - h, duration: 0.3 }
                    break;
                }
            case POP_DIRECTION.LEFT:
                {
                    prop['from'] = { x: -w, autoAlpha: 1 };
                    prop['to'] = { x: 0, duration: 0.3 }
                    break;
                }

            default:
                break;
        }
        return prop
    }, [])

    const getCloseProps = useCallback((animateCfg: AnimateConfig): { from?: any; to?: any } => {
        const { width, height } = animateCfg.init;
        const w = window.innerWidth * (parseFloat(width) / 100);
        const h = window.innerHeight * (parseFloat(height) / 100);
        const prop: { from?: any; to?: any } = {};
        switch (animateCfg.direction) {
            case POP_DIRECTION.TOP:

                break;
            case POP_DIRECTION.RIGHT:
                {
                    prop['to'] = { x: window.innerWidth, duration: 0.3 }
                    break;
                }
            case POP_DIRECTION.BOTTOM:
                {
                    prop['to'] = { y: window.innerHeight, duration: 0.3 }
                    break;
                }
            case POP_DIRECTION.LEFT:
                {
                    prop['to'] = { x: - w, duration: 0.3 }
                    break;
                }

            default:
                break;
        }
        return prop
    }, [])
    const playOpen = useCallback((zIndex: number) => {

        if (!pop) return;
        const device = direction + "-" + terminal;
        const animate = pop.animates.find((a) => a.terminals.includes(device) || a.terminals.length === 0);
        // console.log(device)
        const animateCfg: AnimateConfig | undefined = PopAnimates.find((c) => c.id === animate?.id);
        console.log(animateCfg)
        if (animateCfg) {
            const props = getOpenProps(animateCfg)
            const tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
            if (props.from) {
                tl.fromTo(containerRef.current, { ...props.from, zIndex }, { ...props.to })
            } else
                tl.to(containerRef.current, { ...props?.to, zIndex })
            tl.fromTo(maskRef.current, { autoAlpha: 0, zIndex: zIndex - 1 }, { autoAlpha: 0.6, duration: 0.3 }, "<");
            tl.play();
        }
        return;
    }, [terminal, direction]);

    const playClose = useCallback(() => {
        console.log(pop)
        if (!pop) return;
        const device = direction + "-" + terminal;
        const animate = pop.animates.find((a) => a.terminals.includes(device) || a.terminals.length === 0);
        // console.log(device)
        const animateCfg = PopAnimates.find((c) => c.id === animate?.id);
        if (animateCfg) {
            const tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
            const props = getCloseProps(animateCfg)
            if (props.from) {
                tl.fromTo(containerRef.current, { ...props.from }, { ...props.to })
            } else
                tl.to(containerRef.current, { ...props?.to })
            tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 }, "<");
            tl.to(containerRef.current, { autoAlpha: 0 }, ">")
            tl.play();
            return;
        }
    }, [terminal, direction]);
    const playInit = useCallback(() => {

        const device = direction + "-" + terminal;
        const animate = pop?.animates.find((a) => a.terminals.includes(device) || a.terminals.length === 0);
        // console.log(device)
        const animateCfg = PopAnimates.find((c) => c.id === animate?.id);
        if (animateCfg?.init)
            gsap.set(containerRef.current, { ...animateCfg.init })
    }, [terminal, direction]);

    return { playInit, playOpen, playClose }
}
export default usePopAnimate