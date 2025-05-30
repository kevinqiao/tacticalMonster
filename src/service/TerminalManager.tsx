import { gsap } from "gsap";
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
interface ITerminalContext {
  terminal: number; //0-desktop 1-pad 2-phone
  connect: number;
  width: number;
  height: number;
  headH: number;
  LobbyMenuH: number;
  LobbyMenuW: number;
  visible: boolean;
  direction: number; //0-horization 1-vertical
  changeConnect: (status: number) => void;
}
const TerminalContext = createContext<ITerminalContext>({
  terminal: -1,
  connect: 1,
  width: 0,
  height: 0,
  headH: 0,
  direction: 0,
  LobbyMenuH: 0,
  LobbyMenuW: 0,
  visible: true,
  changeConnect: (status: number) => {
    return;
  },
});

export const TerminalProvider = ({ children }: { children: ReactNode }) => {
  const [terminal, setTerminal] = useState<number>(-1);
  const [visible, setVisible] = useState(true);
  const [connect, setConnect] = useState(1);
  const [dimension, setDimension] = useState<{
    headH: number;
    LobbyMenuH: number;
    LobbyMenuW: number;
    width: number;
    height: number;
    direction: number;
  }>({
    width: 0,
    height: 0,
    direction: 0,
    headH: 0,
    LobbyMenuH: 0,
    LobbyMenuW: 0,
  });
  console.log("terminal provider");
  const updateCoord = () => {
    const w = window.innerWidth as number;
    const h = window.innerHeight as number;
    const t = w > 1000 && h > 1000 ? 0 : w > 768 && h > 768 ? 1 : w > 500 || h > 500 ? 2 : 3;
    const headH = Math.floor(Math.max(50, Math.min(w * 0.06, 100)));
    const LobbyMenuH = w > h ? h - headH : (50 * w) / 500;
    const LobbyMenuW = w < h ? w : Math.max(250, w * 0.14);
    const direction = w > h ? 0 : 1;
    const isMobile = w > h ? false : true;
    const v: any = {
      width: w,
      height: h,
      LobbyMenuH,
      LobbyMenuW,
      headH,
      direction,
      visible,
      isMobile,
    };
    setDimension(v);
    setTerminal(t);

    const loadMain = document.getElementById("main-loader");
    if (loadMain)
      setTimeout(
        () =>
          gsap.to(loadMain, {
            alpha: 0,
            duration: 0.3,
            onComplete: () => {
              if (loadMain?.parentNode) loadMain.parentNode.removeChild(loadMain);
            },
          }),
        300
      );
  };

  useEffect(() => {
    updateCoord();
    window.addEventListener("resize", updateCoord, true);
    return () => {
      window.removeEventListener("resize", updateCoord, true);
      // if (window.Telegram) window.Telegram.WebApp.close();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  const value = {
    terminal,
    visible,
    ...dimension,
    connect,
    changeConnect: useCallback((status: number) => {
      setConnect(status);
    }, []),
  };
  return <TerminalContext.Provider value={value}> {children} </TerminalContext.Provider>;
};

const useCoord = () => {
  return useContext(TerminalContext);
};
export const useTerminal = () => {
  return useContext(TerminalContext);
};

export default useCoord;
