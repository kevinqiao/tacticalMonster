import { gsap } from "gsap";
import React, { ReactNode, createContext, useCallback, useContext, useState } from "react";
import { useTerminal } from "service/TerminalManager";
import { PopConfig } from "../RegisterHome";
import { PopAnimateConfigs } from "../animate/PopAnimateConfigs";
export interface PopComponent {
  name: string;
  data: any;
}
interface IPopContext {
  stacks: PopComponent[];
  exit: () => void;
  closePop: (name: string) => void;
  openPop: (name: string, data: any) => void;
}
const PopContext = createContext<IPopContext>({
  stacks: [],
  exit: () => null,
  closePop: (name: string) => null,
  openPop: (name: string, data: any) => null,
});

const PopProvider = ({ children, visible }: { children: ReactNode; visible: number }) => {
  const [stacks, setStacks] = useState<PopComponent[]>([]);
  const exit = useCallback(() => {
    setStacks([]);
  }, [stacks]);
  const closePop = useCallback(
    (name: string) => {
      setStacks((pre) => {
        const index = pre.findIndex((p) => p.name === name);
        if (index >= 0) {
          pre.splice(index, 1);
          return [...pre];
        } else return pre;
      });
    },
    [stacks]
  );
  const openPop = useCallback(
    (name: string, data: any) => {
      setStacks((pre) => {
        pre.push({ name, data });
        return [...pre];
      });
    },
    [stacks]
  );
  const value = {
    stacks,
    exit,
    closePop,
    openPop,
  };
  return <PopContext.Provider value={value}> {children} </PopContext.Provider>;
};
export const usePopManager = (
  containerRef: React.MutableRefObject<HTMLDivElement | null> | null,
  maskRef: React.MutableRefObject<HTMLDivElement | null> | null,
  popConfig: PopConfig | null
) => {
  const { terminal, direction } = useTerminal();
  const ctx = useContext(PopContext);
  const playOpen = useCallback(() => {
    if (popConfig === null || containerRef === null) return;
    const sindex = ctx.stacks.findIndex((s) => s.name === popConfig.name);
    const zIndex = sindex * 10 + 1000;
    const device = direction + "-" + terminal;
    const animate = PopAnimateConfigs.find(
      (c) => c.targets.includes(popConfig.name) && c.terminals.includes(device) && c.type === 0
    );
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    if (animate) {
      tl.fromTo(containerRef.current, { ...animate["from"], zIndex }, { ...animate["to"] });
    } else tl.fromTo(containerRef.current, { top: "100%", autoAlpha: 1, zIndex: zIndex }, { top: 0, duration: 0.3 });
    if (maskRef)
      tl.fromTo(maskRef.current, { autoAlpha: 0, zIndex: zIndex - 1 }, { autoAlpha: 0.6, duration: 0.3 }, "<");
    tl.play();
    return;
  }, [ctx.stacks, terminal, direction]);

  const playClose = useCallback(() => {
    if (containerRef === null || popConfig === null) return;
    const device = direction + "-" + terminal;
    const animate = PopAnimateConfigs.find(
      (c) => c.targets.includes(popConfig.name) && c.terminals.includes(device) && c.type === 1
    );
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    if (animate) tl.to(containerRef.current, animate["to"]);
    else tl.to(containerRef.current, { top: "100%", duration: 0.3 });
    if (maskRef) tl.to(maskRef.current, { autoAlpha: 0, duration: 0.3 }, "<");
    tl.play();
    return;
  }, [ctx.stacks, terminal, direction]);
  return { ...ctx, playOpen, playClose };
};
export default PopProvider;
