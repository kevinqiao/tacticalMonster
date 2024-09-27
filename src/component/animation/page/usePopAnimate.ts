
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTerminal } from "service/TerminalManager";
import { AnimateConfig, POP_DIRECTION, PopAnimates } from "./PopAnimateConfigs";
interface PopAnimProps {
    containerRef: React.MutableRefObject<HTMLDivElement | null>,
    maskRef: React.MutableRefObject<HTMLDivElement | null>,
    exitRef: React.MutableRefObject<HTMLDivElement | null>,
    pop?: { init?: any; animates: { terminals: string[]; id: number }[]; exit?: number }
}
const usePopAnimate = ({ containerRef, maskRef, exitRef, pop }: PopAnimProps) => {
    // const [action, setAction] = useState<{ type: number; zIndex: number, complete: number } | null>(null)
    const { width, height, terminal, direction } = useTerminal();
    const actionRef = useRef<{ type: number; zIndex: number; width: number; height: number; complete: number } | null>(null);
    const [actionCompleted, setActionCompleted] = useState<{ type: number; zIndex: number; width: number; height: number; complete: number } | null>(null)

    const getOpenProps = useCallback((animateCfg: AnimateConfig, width: number, height: number): { from?: any; to?: any } => {
        const { width: vw, height: vh } = animateCfg.init;
        const w = width * (parseFloat(vw) / 100);
        const h = height * (parseFloat(vh) / 100);
        const prop: { from?: any; to?: any } = {};
        switch (animateCfg.direction) {
            case POP_DIRECTION.TOP:

                break;
            case POP_DIRECTION.RIGHT:
                {
                    prop['from'] = { x: width, autoAlpha: 1 };
                    prop['to'] = { x: width - w, duration: 0.3 }
                    break;
                }
            case POP_DIRECTION.BOTTOM:
                {
                    prop['from'] = { y: height, autoAlpha: 1 };
                    prop['to'] = { y: height - h, duration: 0.3 }
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
        if (animateCfg) {
            const props = getOpenProps(animateCfg, width, height)
            const tl = gsap.timeline({
                onComplete: () => {
                    if (!actionRef.current)
                        actionRef.current = { type: 1, zIndex, width, height, complete: 1 }
                    else
                        actionRef.current.complete = 1
                    setActionCompleted({ ...actionRef.current })
                    tl.kill();
                },
            });

            if ((!actionRef.current || actionRef.current.type !== 1) && props.from) {
                tl.fromTo(containerRef.current, { ...props.from, zIndex }, { ...props.to })
                tl.fromTo(maskRef.current, { autoAlpha: 0, zIndex: zIndex - 1 }, { autoAlpha: 0.6, duration: 0.3 }, "<");
            } else {
                tl.to(containerRef.current, { ...props?.to, zIndex });
                // tl.to(maskRef.current, { autoAlpha: 0.6, duration: 0.3 }, "<");
            }

            tl.play();
        }
        return;
    }, [terminal, direction, width, height]);

    const playClose = useCallback(() => {

        if (!pop) return;
        // setAction({ type: 0, zIndex: -1, complete: 0 })
        const device = direction + "-" + terminal;
        const animate = pop.animates.find((a) => a.terminals.includes(device) || a.terminals.length === 0);
        // console.log(device)
        const animateCfg = PopAnimates.find((c) => c.id === animate?.id);
        if (animateCfg) {
            const tl = gsap.timeline({
                onComplete: () => {
                    actionRef.current = null;
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
    useEffect(() => {
        const action = actionRef.current;
        if (action && (action.width !== width || action.height !== height) && action.complete === 1) {
            action.width = width;
            action.height = height;
            action.complete = 0;
            if (action.type === 1) {
                playOpen(action.zIndex)
            }
        }
    }, [width, height, actionCompleted])
    return { playInit, playOpen, playClose }
}
export default usePopAnimate