import { gsap } from "gsap";
import React, { ReactNode, createContext, useCallback, useContext, useState } from "react";
import { useTerminal } from "service/TerminalManager";
import { PopConfig } from "../RegisterHome";
import { PopAnimateConfigs } from "../animate/PopAnimateConfigs";
export interface NavChildComponent {
  name: string;
  data: any;
}
interface INavChildContext {
  ground: NavChildComponent | null;
  stacks: NavChildComponent[];
  exit: () => void;
  closePop: (name: string) => void;
  openPop: (name: string, data: any) => void;
}
const NavChildContext = createContext<INavChildContext>({
  ground: null,
  stacks: [],
  exit: () => null,
  closePop: (name: string) => null,
  openPop: (name: string, data: any) => null,
});

const PageChildProvider = ({ children, visible }: { children: ReactNode; visible: number }) => {
  const [ground, setGround] = useState<NavChildComponent | null>(null);
  const [stacks, setStacks] = useState<NavChildComponent[]>([]);
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
    ground,
    stacks,
    exit,
    closePop,
    openPop,
  };
  return <NavChildContext.Provider value={value}> {children} </NavChildContext.Provider>;
};
export const usePageChildManager = (
  containerRef: React.MutableRefObject<HTMLDivElement | null> | null,
  maskRef: React.MutableRefObject<HTMLDivElement | null> | null,
  popConfig: PopConfig | null
) => {
  const { terminal, direction } = useTerminal();
  const ctx = useContext(NavChildContext);
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
export default PageChildProvider;
