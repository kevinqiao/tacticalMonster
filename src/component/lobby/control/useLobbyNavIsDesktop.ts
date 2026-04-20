import { useEffect, useState } from "react";

/** 精细指针 + 可 hover → 桌面图标栏；否则触摸条导航 */
export function useLobbyNavIsDesktop(): boolean {
  const [yes, setYes] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    const apply = () => setYes(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return yes;
}
